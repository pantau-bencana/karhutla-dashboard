import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deriveDashboard, defaultRange } from "../src/lib/derive.js";
import { areaContains, assignProvince, INDONESIA_FRAME, INDONESIA_PAN_LIMIT } from "../src/lib/geo.js";
import { looksLikeCsv, parseCsv } from "../src/lib/csv.js";
import { fetchCsv, loadAll, redactFirmsUrl } from "../src/lib/loadData.js";
import { GLOSSARY } from "../src/lib/glossary.js";
import { HAZARDS } from "../src/lib/hazards.js";
import { ispuFromPm25 } from "../src/lib/ispuEstimate.js";
import {
  ISPU_EXPLANATION,
  KLH_ISPU_ANALYTIC,
  KLH_ISPU_APP,
  filterStations,
  historyRange,
  openAqMeasurements,
  stationPoints,
} from "../src/lib/ispuView.js";
import { parseLocation, parseRoute } from "../src/lib/route.js";
import { clusterCellDegrees, countHotspots, filterHotspotWindow } from "../src/lib/hotspotWindow.js";
import { insideIndonesia, parseFirmsCoordinate } from "./indonesia-land.mjs";
import { buildComparisonAttention, normalizePlaceName, PROTOTYPE_LABEL } from "../src/lib/attentionPrototype.js";
import { karhutlaRankingPlan } from "../src/lib/ranking.js";
import { REFRESH_CRON, nextScheduledRun } from "../src/lib/schedule.js";
import { monitoringSources } from "../src/lib/sourceStatus.js";
import { levelFromThresholds, statusProvinsi } from "../src/lib/warning.js";

const DISCLAIMER = "Prototipe internal Dit. PD BNPB. Jangan dipublikasikan tanpa persetujuan.";
const thresholds = {
  hotspot: { waspada: 8, siaga: 20, awas: 45 },
  fwi: { waspada: 6, siaga: 13, awas: 21 },
};

assert.equal(levelFromThresholds(7, thresholds.hotspot), "Normal");
assert.equal(levelFromThresholds(8, thresholds.hotspot), "Waspada");
assert.equal(levelFromThresholds(20, thresholds.hotspot), "Siaga");
assert.equal(levelFromThresholds(45, thresholds.hotspot), "Awas");

const fdrsOnly = statusProvinsi({ hotspotCount: 3, fwiMax: 16, thresholds });
assert.equal(fdrsOnly.status, "Siaga");
assert.equal(fdrsOnly.pemicu, "FDRS");

const parsed = parseCsv('nama,catatan\n"Riau, daratan","kutipan ""resmi"""\n');
assert.equal(parsed[0].nama, "Riau, daratan");
assert.equal(parsed[0].catatan, 'kutipan "resmi"');

const htmlCheck = looksLikeCsv("<!doctype html><html><body>login</body></html>");
assert.equal(htmlCheck.ok, false);
assert.match(htmlCheck.reason, /HTML/);

assert.equal(assignProvince(1.5, 102.1), "Riau");
assert.equal(assignProvince(-2.68, 114.22), "Kalimantan Tengah");
assert.equal(assignProvince(-3.41, 114.84), "Kalimantan Selatan");
assert.equal(assignProvince(2.1, 99.83), "Sumatera Utara");
assert.equal(assignProvince(-8.62, 122.21), "Nusa Tenggara Timur");
assert.equal(assignProvince(0, 106), "Lainnya");

assert.equal(
  redactFirmsUrl("https://firms.modaps.eosdis.nasa.gov/api/area/csv/SECRETKEY123/VIIRS_SNPP_NRT/95,-11,141,6/7"),
  "https://firms.modaps.eosdis.nasa.gov/api/area/csv/***/VIIRS_SNPP_NRT/95,-11,141,6/7",
);

const config = JSON.parse(readFileSync("public/config.json", "utf8"));
assert.equal(config.catatan, DISCLAIMER);
assert.equal(String(config.firms?.mapKey ?? "").trim(), "", "Jangan commit MAP_KEY FIRMS");
assert.deepEqual(
  config.datasets.map((dataset) => dataset.id),
  ["hotspot", "sipongi", "irbi", "bmkg", "ispu"],
);
for (const dataset of config.datasets) {
  assert.equal(dataset.contoh, true);
  assert.equal(readFileSync(dataset.csvUrl, "utf8").includes("DATA CONTOH"), true);
}

async function readFiles(url) {
  const textUrl = String(url);
  if (textUrl.includes("data/live/") || textUrl.includes("data/static/")) {
    return { ok: false, status: 404, text: async () => "missing" };
  }
  return { ok: true, status: 200, text: async () => readFileSync(textUrl, "utf8") };
}

const loaded = await loadAll(config, { resolveUrl: (url) => url, fetchImpl: readFiles });
assert.equal(loaded.find((feed) => feed.status === "gagal"), undefined);
const hotspot = loaded.find((feed) => feed.id === "hotspot");
assert.equal(hotspot.status, "contoh");
const range = defaultRange(hotspot.rows, 7);
assert.deepEqual(range, { from: "2026-10-10", to: "2026-10-16" });

const view = deriveDashboard({
  hotspots: hotspot.rows,
  sipongi: loaded.find((feed) => feed.id === "sipongi").rows,
  irbi: loaded.find((feed) => feed.id === "irbi").rows,
  bmkg: loaded.find((feed) => feed.id === "bmkg").rows,
  ispu: loaded.find((feed) => feed.id === "ispu").rows,
  province: "",
  from: range.from,
  to: range.to,
  config,
});

const byProvince = Object.fromEntries(view.warnings.map((row) => [row.provinsi, row]));
assert.equal(view.summary.hotspot, 158);
assert.equal(byProvince.Riau.jumlah, 72);
assert.equal(byProvince.Riau.status, "Awas");
assert.equal(byProvince.Riau.pemicu, "Titik panas dan FDRS");
assert.equal(byProvince["Kalimantan Tengah"].status, "Siaga");
assert.equal(byProvince["Sumatera Selatan"].jumlah, 23);
assert.equal(byProvince["Sumatera Selatan"].status, "Siaga");
assert.equal(byProvince["Sumatera Selatan"].pemicu, "Titik panas");
assert.equal(byProvince.Jambi.status, "Waspada");
assert.equal(byProvince["Kalimantan Barat"].status, "Waspada");
assert.equal(byProvince["Kalimantan Selatan"].status, "Normal");
assert.equal(byProvince["Nusa Tenggara Timur"].status, "Siaga");
assert.equal(byProvince["Nusa Tenggara Timur"].pemicu, "FDRS");
assert.equal(byProvince["Sumatera Utara"].status, "Normal");
assert.equal(view.summary.waspadaPlus, 7);
assert.equal(view.summary.siagaAwas, 4);
assert.equal(view.summary.ispuTerkini.ispu, 112);
assert.equal(view.summary.ispuTerkini.provinsi, "Riau");
assert.equal(view.summary.ispuTerkini.kota, "Pekanbaru");
assert.equal(view.summary.ispuTerkini.kategori, "Tidak Sehat");
assert.equal(view.summary.ispuTerkini.tanggal, "2026-10-16");
assert.ok(view.irbiRows.some((row) => row.kabupaten === "Pulang Pisau" && row.kelas === "Tinggi"));
assert.ok(view.hotspotSeries.includes("Lainnya"));
assert.equal(view.hotspotTrend.at(-1).tanggal, "2026-10-16");

const riau = deriveDashboard({
  hotspots: hotspot.rows,
  ispu: loaded.find((feed) => feed.id === "ispu").rows,
  bmkg: loaded.find((feed) => feed.id === "bmkg").rows,
  sipongi: [],
  irbi: loaded.find((feed) => feed.id === "irbi").rows,
  province: "Riau",
  from: range.from,
  to: range.to,
  config,
});
assert.equal(riau.summary.hotspot, 72);
assert.equal(riau.warnings.length, 1);
assert.ok(riau.irbiRows.every((row) => row.provinsi === "Riau"));

const oneDay = deriveDashboard({
  hotspots: hotspot.rows,
  ispu: loaded.find((feed) => feed.id === "ispu").rows,
  bmkg: loaded.find((feed) => feed.id === "bmkg").rows,
  sipongi: [],
  irbi: [],
  province: "",
  from: "2026-10-16",
  to: "2026-10-16",
  config,
});
assert.equal(oneDay.summary.hotspot, 19);
assert.equal(oneDay.summary.ispuTerkini.ispu, 112);

const firmsCsv = [
  "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,confidence,version,bright_ti5,frp,daynight",
  "1.50,102.10,330.2,0.4,0.4,2026-10-16,1430,N,high,2.0NRT,290.1,12.5,D",
  "-2.68,114.22,340,0.4,0.4,2026-10-16,1500,N,80,2.0NRT,295,20,D",
  "0,106,300,0.4,0.4,2026-10-16,1600,N,low,2.0NRT,280,2,D",
].join("\n");

const liveConfig = structuredClone(config);
liveConfig.firms.mapKey = "SECRETKEY123";
const live = await loadAll(liveConfig, {
  resolveUrl: (url) => url,
  fetchImpl: async (url) => {
    if (url.includes("firms.modaps.eosdis.nasa.gov")) {
      assert.equal(url.includes("SECRETKEY123"), true);
      return { ok: true, status: 200, text: async () => firmsCsv };
    }
    return readFiles(url);
  },
});
const liveHotspot = live.find((feed) => feed.id === "hotspot");
assert.equal(liveHotspot.status, "berhasil");
assert.equal(liveHotspot.contoh, false);
assert.equal(liveHotspot.rows.length, 3);
assert.equal(liveHotspot.rows[0].provinsi, "Belum terpetakan");
assert.equal(liveHotspot.rows[1].provinsi, "Belum terpetakan");
assert.equal(liveHotspot.rows[1].kelasKepercayaan, "tinggi");
assert.equal(liveHotspot.rows[2].provinsi, "Belum terpetakan");
assert.equal(liveHotspot.urlTampil.includes("SECRETKEY123"), false);
assert.match(liveHotspot.urlTampil, /\*\*\*/);

const fallback = await loadAll(liveConfig, {
  resolveUrl: (url) => url,
  fetchImpl: async (url) => {
    if (url.includes("firms.modaps.eosdis.nasa.gov")) throw new Error("CORS");
    return readFiles(url);
  },
});
const fallbackHotspot = fallback.find((feed) => feed.id === "hotspot");
assert.equal(fallbackHotspot.status, "cadangan");
assert.match(fallbackHotspot.error, /FIRMS gagal/);
assert.ok(fallbackHotspot.rows.length > 100);

const broken = structuredClone(config);
const ispu = broken.datasets.find((dataset) => dataset.id === "ispu");
ispu.csvUrl = "https://example.invalid/ispu.csv";
ispu.contoh = false;
const partial = await loadAll(broken, {
  resolveUrl: (url) => url,
  fetchImpl: async (url) => {
    if (url.includes("example.invalid")) return { ok: false, status: 404, text: async () => "missing" };
    return readFiles(url);
  },
});
assert.equal(partial.find((feed) => feed.id === "ispu").status, "gagal");
assert.match(partial.find((feed) => feed.id === "ispu").error, /404/);
assert.ok(partial.find((feed) => feed.id === "hotspot").rows.length > 100);

await assert.rejects(
  () =>
    fetchCsv("https://sheets.example/bad", async () => ({
      ok: true,
      status: 200,
      text: async () => "<html><body>Masuk ke akun Google</body></html>",
    })),
  /HTML/,
);

for (const file of ["README.md", "src/components/Footer.jsx", "public/config.json"]) {
  assert.equal(readFileSync(file, "utf8").includes(DISCLAIMER), true, file);
}

const firmsArea = { west: 95, south: -11, east: 141, north: 6 };
assert.equal(areaContains(INDONESIA_FRAME, firmsArea), true);
assert.equal(areaContains(INDONESIA_PAN_LIMIT, INDONESIA_FRAME), true);
for (const edge of ["south", "west"]) {
  const margin = INDONESIA_FRAME[edge] - INDONESIA_PAN_LIMIT[edge];
  assert.ok(margin >= 1 && margin <= 4, `${edge} ${margin}`);
}
for (const edge of ["north", "east"]) {
  const margin = INDONESIA_PAN_LIMIT[edge] - INDONESIA_FRAME[edge];
  assert.ok(margin >= 1 && margin <= 4, `${edge} ${margin}`);
}

assert.equal(parseRoute(""), "ringkasan");
assert.equal(parseRoute("#/"), "ringkasan");
assert.equal(parseRoute("#/logika"), "logika");
assert.equal(parseRoute("#/logika/"), "logika");
assert.equal(parseRoute("#/LOGIKA?x=1"), "logika");
assert.equal(parseRoute("#/lain"), "ringkasan");
assert.equal(parseRoute("#/banjir"), "ringkasan");
assert.equal(parseRoute("#/glosarium/ispu"), "glosarium");

const described = monitoringSources({ config, feeds: loaded });
assert.equal(described.find((row) => row.id === "firms-api").status, "belum terhubung");
assert.equal(described.find((row) => row.id === "hotspot").status, "contoh");
for (const id of ["sipongi", "irbi", "bmkg", "ispu"]) {
  assert.equal(described.find((row) => row.id === id).status, "contoh", id);
  assert.equal(described.find((row) => row.id === id).tautan, "", id);
}
assert.equal(JSON.stringify(described).includes("mapKey"), false);
assert.match(described.find((row) => row.id === "firms-api").catatan, /tidak menampilkan nilainya/i);

const describedLive = monitoringSources({ config: liveConfig, feeds: live });
assert.equal(describedLive.find((row) => row.id === "firms-api").status, "aktif");
assert.equal(JSON.stringify(describedLive).includes("SECRETKEY123"), false);
assert.equal(describedLive.find((row) => row.id === "hotspot").status, "contoh");
assert.match(describedLive.find((row) => row.id === "hotspot").catatan, /tidak sedang mengisi peta/i);

const describedFallback = monitoringSources({ config: liveConfig, feeds: fallback });
assert.equal(describedFallback.find((row) => row.id === "firms-api").status, "belum terhubung");
assert.match(describedFallback.find((row) => row.id === "hotspot").catatan, /FIRMS gagal|cadangan/i);

const configured = monitoringSources({
  config: {
    firms: { mapKey: "" },
    datasets: [
      {
        id: "sipongi",
        nama: "SiPongi",
        instansi: "Kementerian Kehutanan — SiPongi",
        csvUrl: "https://example.com/sipongi.csv",
        contoh: false,
      },
    ],
  },
  feeds: [{ id: "sipongi", status: "berhasil", contoh: false, asal: "csv" }],
});
assert.equal(configured.find((row) => row.id === "sipongi").status, "CSV yang dikonfigurasi");
assert.equal(configured.find((row) => row.id === "sipongi").tautan, "https://example.com/sipongi.csv");

const offline = monitoringSources({ config: null, feeds: [] });
assert.equal(offline[0].status, "belum terhubung");
assert.equal(JSON.stringify(offline).includes("mapKey"), false);

const mapSource = readFileSync("src/components/HotspotMap.jsx", "utf8");
assert.equal(mapSource.includes("setView([-2.2, 118]"), false);
assert.equal(mapSource.includes("INDONESIA_FRAME"), true);
assert.equal(mapSource.includes("fitBounds"), true);
const logicSource = readFileSync("src/components/LogicPage.jsx", "utf8");
assert.equal(logicSource.includes("Kembali ke ringkasan"), true);
assert.equal(logicSource.includes("Sumber Data → Validasi"), true);
assert.equal(logicSource.includes("mapKey"), false);
assert.equal(logicSource.includes("rencana pengembangan"), true);
assert.match(readFileSync("src/components/SiteHeader.jsx", "utf8"), /Logika Pemantauan/);
assert.match(readFileSync("src/components/SiteHeader.jsx", "utf8"), /Glosarium/);
assert.match(readFileSync("src/components/SiteHeader.jsx", "utf8"), /Ringkasan/);
assert.equal(readFileSync("index.html", "utf8").includes('href="./favicon.svg"'), true);
const viteSource = readFileSync("vite.config.js", "utf8");
assert.match(viteSource, /function siteBase/);
assert.match(viteSource, /return "\.\/"/);

assert.equal(ispuFromPm25(31.4), 70);
assert.equal(ispuFromPm25(15.5), 50);
assert.equal(REFRESH_CRON, "0 */3 * * *");
assert.match(nextScheduledRun(new Date("2026-10-17T16:30:00.000Z")), /^2026-10-17T18:00:00/);
const workflow = readFileSync(".github/workflows/refresh-data.yml", "utf8");
assert.match(workflow, /0 \*\/3 \* \* \*/);
assert.match(workflow, /FIRMS_MAP_KEY/);
assert.equal(workflow.includes("eyJ"), false);
assert.equal(karhutlaRankingPlan().dapatDisusun, false);
assert.equal(karhutlaRankingPlan().status.includes("menunggu data resmi BMKG"), true);
assert.equal(PROTOTYPE_LABEL, "Prototipe – berbasis data pembanding terbuka, bukan data resmi BMKG");
assert.equal(logicSource.includes("PROTOTYPE_LABEL"), true);
assert.equal(normalizePlaceName("Kota Lubuk Linggau"), "LUBUKLINGGAU");
assert.equal(normalizePlaceName("Kota Lubuklinggau"), "LUBUKLINGGAU");
const perhatian = buildComparisonAttention({
  irbiRows: [
    { provinsi: "Riau", kabupaten: "Pelalawan", indeks: 20, kelas: "Tinggi" },
    { provinsi: "Riau", kabupaten: "Siak", indeks: 22, kelas: "Tinggi" },
    { provinsi: "Jambi", kabupaten: "Tebo", indeks: 30, kelas: "Sedang" },
    { provinsi: "Jambi", kabupaten: "Merangin", indeks: 18, kelas: "Tinggi" },
  ],
  rainRows: [
    ...Array.from({ length: 14 }, (_, index) => ({ tanggal: `2026-10-${String(index + 1).padStart(2, "0")}`, provinsi: "Riau", kabupaten: "PELALAWAN", kode: "1405", lintang: 0.1, bujur: 102, curahHujan: index < 2 ? 0 : 5, peluang: 40, anginKmj: 10 })),
    ...Array.from({ length: 14 }, (_, index) => ({ tanggal: `2026-10-${String(index + 1).padStart(2, "0")}`, provinsi: "Riau", kabupaten: "SIAK", kode: "1408", lintang: 0.8, bujur: 102, curahHujan: 0, peluang: 10, anginKmj: 12 })),
    ...Array.from({ length: 14 }, (_, index) => ({ tanggal: `2026-10-${String(index + 1).padStart(2, "0")}`, provinsi: "Jambi", kabupaten: "TEBO", kode: "1509", lintang: -1.5, bujur: 102, curahHujan: 0, peluang: 5, anginKmj: 20 })),
    ...Array.from({ length: 11 }, (_, index) => ({ tanggal: `2026-10-${String(index + 1).padStart(2, "0")}`, provinsi: "Jambi", kabupaten: "MERANGIN", kode: "1502", lintang: -2, bujur: 102, curahHujan: 0, peluang: 5, anginKmj: 8 })),
  ],
  fwiRows: [
    { tanggal: "2026-10-01", kode: "1405", fwi: 40 },
    { tanggal: "2026-10-01", kode: "1408", fwi: 1 },
  ],
});
assert.equal(perhatian.label, PROTOTYPE_LABEL);
assert.deepEqual(perhatian.rows.map((row) => row.kabupaten), ["Siak", "Pelalawan", "Tebo"]);
assert.equal(perhatian.hariKurang, 1);
assert.equal(perhatian.rows[0].fwiRata, 1);
assert.equal(perhatian.rows[1].fwiRata, 40);
const dibalik = buildComparisonAttention({
  irbiRows: [
    { provinsi: "Riau", kabupaten: "Pelalawan", indeks: 20, kelas: "Tinggi" },
    { provinsi: "Riau", kabupaten: "Siak", indeks: 22, kelas: "Tinggi" },
  ],
  rainRows: perhatian.rows.length ? [
    ...Array.from({ length: 14 }, (_, index) => ({ tanggal: `2026-10-${String(index + 1).padStart(2, "0")}`, provinsi: "Riau", kabupaten: "PELALAWAN", kode: "1405", curahHujan: index < 2 ? 0 : 5 })),
    ...Array.from({ length: 14 }, (_, index) => ({ tanggal: `2026-10-${String(index + 1).padStart(2, "0")}`, provinsi: "Riau", kabupaten: "SIAK", kode: "1408", curahHujan: 0 })),
  ] : [],
  fwiRows: [
    { tanggal: "2026-10-01", kode: "1405", fwi: 1 },
    { tanggal: "2026-10-01", kode: "1408", fwi: 40 },
  ],
});
assert.deepEqual(dibalik.rows.map((row) => row.kabupaten), ["Siak", "Pelalawan"]);
const glossaryIds = new Set(GLOSSARY.map((item) => item.id));
for (const id of ["ispu", "fwi", "fdrs", "ffmc", "dmc", "dc", "isi", "bui", "irbi", "inarisk", "bnpb", "bmkg", "klh", "firms", "viirs", "modis", "nrt", "confidence", "hotspot", "spartan", "sipongi", "cams", "pm", "wib", "dasarian", "snapshot", "statis", "prakiraan", "observasi"]) {
  assert.equal(glossaryIds.has(id), true, id);
}
assert.equal(GLOSSARY.every((item) => item.penjelasan && item.penggunaan), true);
assert.deepEqual(HAZARDS.map((item) => item.id), ["karhutla", "banjir", "gunung-api"]);
assert.equal(parseLocation("#/gunung-api").hazard, "gunung-api");
assert.equal(parseLocation("#/karhutla/peta").page, "peta");
const summarySource = readFileSync("src/components/SummaryPage.jsx", "utf8");
assert.equal(summarySource.includes("points={[]}"), false);
assert.match(summarySource, /hotspot = deteksi satelit, bukan kebakaran terkonfirmasi/);
assert.match(summarySource, /Prakiraan kondisi \(pembanding, bukan resmi\)|ForecastPanel/);
const forecastSource = readFileSync("src/components/ForecastPanel.jsx", "utf8");
assert.match(forecastSource, /Buka Peta FWI\/Peringatan Karhutla BMKG/);
assert.match(forecastSource, /target="_blank" rel="noopener noreferrer"/);
assert.match(forecastSource, /https:\/\/www\.bmkg\.go\.id\/cuaca\/karhutla\/fwi/);
assert.match(forecastSource, /https:\/\/gis\.bmkg\.go\.id\/portal\/dataapi/);
assert.equal(forecastSource.includes("<img"), false);
const pagesWorkflow = readFileSync(".github/workflows/pages.yml", "utf8");
assert.match(pagesWorkflow, /github\.event_name != 'pull_request' && github\.ref == 'refs\/heads\/main'/);
const windowed = filterHotspotWindow([
  { tanggal: "2026-10-17", waktu: "1200", satelit: "N", kelasKepercayaan: "nominal", provinsi: "Riau" },
  { tanggal: "2026-10-16", waktu: "1200", satelit: "N", kelasKepercayaan: "tinggi", provinsi: "Aceh" },
  { tanggal: "2026-10-17", waktu: "1800", satelit: "N20", kelasKepercayaan: "rendah", provinsi: "Riau" },
], { hours: 24, provinces: ["Riau"] });
assert.equal(windowed.rows.length, 2);
assert.equal(countHotspots(windowed.rows).sensor.N, 1);
assert.equal(countHotspots(windowed.rows).sensor.N20, 1);
assert.equal(clusterCellDegrees(8), 0);
assert.equal(clusterCellDegrees(10), 0);
assert.notEqual(clusterCellDegrees(4), 0);
assert.equal(parseFirmsCoordinate("1,3521"), null);
assert.equal(parseFirmsCoordinate("1.35210").text, "1.35210");
assert.equal(parseFirmsCoordinate("1.35210").value, 1.3521);
assert.equal(insideIndonesia(106.8456, -6.2088), true);
assert.equal(insideIndonesia(101.4478, 0.5071), true);
assert.equal(insideIndonesia(103.8198, 1.3521), false);
assert.equal(insideIndonesia(101.6869, 3.139), false);
assert.equal(insideIndonesia(116.0735, 5.9804), false);
assert.equal(insideIndonesia(110.3592, 1.5533), false);
assert.equal(insideIndonesia(114.9398, 4.9031), false);
assert.equal(insideIndonesia(125.5603, -8.5569), false);
const mapComponent = readFileSync("src/components/HotspotMap.jsx", "utf8");
assert.match(mapComponent, /L\.circleMarker\(\[lat, lon\]/);
assert.match(mapComponent, /Number\(anchor\.lintang\)/);
assert.equal(mapComponent.includes("circleMarker([meanLat"), false);
const firmsFetch = readFileSync("scripts/refresh-live-data.mjs", "utf8");
assert.match(firmsFetch, /insideIndonesia/);
assert.match(firmsFetch, /records_before_boundary/);
assert.match(firmsFetch, /records_after_boundary/);
assert.equal(firmsFetch.includes("function inIndonesia"), false);
const boundary = JSON.parse(readFileSync("data/boundaries/idn-adm2.geojson", "utf8"));
assert.equal(boundary.crs.properties.name, "urn:ogc:def:crs:OGC:1.3:CRS84");
const samplePair = boundary.features[0].geometry.coordinates[0][0];
assert.ok(samplePair[0] > 90 && samplePair[1] < 20);

assert.equal(
  ISPU_EXPLANATION,
  "ISPU menggambarkan kualitas udara berdasarkan pengukuran di stasiun pemantau. Titik pada peta menunjukkan lokasi pengukuran dan tidak otomatis mewakili seluruh wilayah kabupaten/kota. Nilai ISPU bukan bukti tunggal bahwa polusi berasal dari karhutla.",
);
assert.equal(KLH_ISPU_APP, "https://ispu.kemenlh.go.id/app/#/");
assert.equal(KLH_ISPU_ANALYTIC, "https://ispu.kemenlh.go.id/kawasan/analytic");
const blockedStations = stationPoints([
  { id: "ispu", contoh: true, status: "contoh", rows: [{ lintang: 0.5, bujur: 101.4, ispu: 112, tanggal: "2026-10-17", stasiun: "Contoh" }] },
  { id: "ispu_pembanding", status: "berhasil", rows: [{ lintang: 0.5, bujur: 101.4, ispu: 70, tanggal: "2026-10-17", stasiun: "Model" }] },
  { id: "ispu_stasiun", contoh: true, status: "contoh", rows: [{ lintang: 0.5, bujur: 101.4, ispu: 80, tanggal: "2026-10-17", stasiun: "Contoh stasiun" }] },
]);
assert.equal(blockedStations.length, 0);
const officialStations = stationPoints([
  {
    id: "ispu_stasiun",
    status: "berhasil",
    contoh: false,
    rows: [
      { id: "a", stasiun: "A", kabupaten: "X", provinsi: "Riau", ispu: 90, kategori: "Sedang", parameter: "PM2.5", tanggal: "2026-10-16", sumber: "KLH", lintang: -1, bujur: 110 },
      { id: "b", stasiun: "B", kabupaten: "Y", provinsi: "Riau", ispu: 40, kategori: "Baik", parameter: "PM10", tanggal: "2026-10-17", sumber: "KLH", lintang: -2, bujur: 111 },
    ],
  },
]);
assert.equal(filterStations(officialStations, { period: "hari-ini", today: "2026-10-17" }).length, 1);
assert.equal(filterStations(officialStations, { period: "hari-ini", today: "2026-10-18" }).length, 0);
const stationHistory = historyRange(officialStations);
assert.equal(stationHistory.to, "2026-10-17");
assert.equal(filterStations(officialStations, { period: "historis", ...stationHistory }).length, 2);
const openAq = openAqMeasurements([
  { id: "openaq_stasiun", status: "berhasil", rows: [{ stasiun: "S", nilai_ugm3: 12.5, ispu: 70, kategori: "Sedang" }] },
]);
assert.equal(openAq.length, 1);
assert.equal(openAq[0].nilai, 12.5);
assert.equal(Object.hasOwn(openAq[0], "ispu"), false);
assert.equal(Object.hasOwn(openAq[0], "kategori"), false);
assert.equal(openAqMeasurements([{ id: "openaq_stasiun", status: "gagal", rows: [{ nilai_ugm3: 3 }] }]).length, 0);
const udaraSource = readFileSync("src/components/KualitasUdara.jsx", "utf8");
assert.match(udaraSource, /Kualitas Udara \(ISPU\)/);
assert.match(udaraSource, /Data Pembanding – pengukuran stasiun/);
assert.match(udaraSource, /Hari Ini/);
assert.match(udaraSource, /Historis/);
assert.equal(udaraSource.includes("Prediksi"), false);
assert.equal(udaraSource.includes("ispu_pembanding"), false);
assert.equal(udaraSource.includes("CAMS"), false);
assert.match(readFileSync("src/components/ExtraLayers.jsx", "utf8"), /Kualitas Udara \(ISPU\)/);
assert.equal(readFileSync("src/components/ExtraLayers.jsx", "utf8").includes("ISPU perkiraan"), false);
assert.equal(readFileSync("src/lib/hazards.js", "utf8").includes("ispu"), false);

console.log("Pemeriksaan prototipe lulus.");
