import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { deriveDashboard, defaultRange } from "../src/lib/derive.js";
import { areaContains, assignProvince, INDONESIA_FRAME, INDONESIA_PAN_LIMIT } from "../src/lib/geo.js";
import { looksLikeCsv, parseCsv } from "../src/lib/csv.js";
import { fetchCsv, loadAll, normalizeHotspotRow, redactFirmsUrl } from "../src/lib/loadData.js";
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
import { parseFirmsCoordinate } from "./indonesia-land.mjs";
import { arcGisContains, summarizeByDesa, summarizeByWilayah, unverifiedWilayahCount, DESA_UNIDENTIFIED } from "../src/lib/bigWilayah.js";
import { assessFreshness, hotspotSourceLabel } from "../src/lib/freshness.js";
import { annotatePoints } from "./big-wilayah.mjs";
import { buildComparisonAttention, normalizePlaceName, PROTOTYPE_LABEL } from "../src/lib/attentionPrototype.js";
import { karhutlaRankingPlan } from "../src/lib/ranking.js";
import { REFRESH_CRON, nextScheduledRun } from "../src/lib/schedule.js";
import { monitoringSources } from "../src/lib/sourceStatus.js";
const DISCLAIMER = "Prototipe internal Dit. PD BNPB. Jangan dipublikasikan tanpa persetujuan.";
assert.equal(readFileSync("src/lib/warning.js", "utf8").includes("statusProvinsi"), false);
assert.equal(readFileSync("src/lib/warning.js", "utf8").includes("Waspada"), false);

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
assert.equal(config.judul, "Prototipe Pemantauan Karhutla");
assert.equal(config.peringatan, undefined);
assert.equal(readFileSync("index.html", "utf8").includes("Prototipe Pemantauan Karhutla"), true);
assert.deepEqual(
  config.datasets.map((dataset) => dataset.id),
  ["hotspot", "sipongi", "irbi", "ispu"],
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
assert.deepEqual(
  loaded.filter((feed) => feed.status === "gagal").map((feed) => feed.id),
  ["hotspot"],
);
const hotspot = loaded.find((feed) => feed.id === "hotspot");
assert.equal(hotspot.status, "gagal");
assert.equal(hotspot.contoh, false);
assert.equal(hotspot.rows.length, 0);
assert.match(hotspot.error, /contoh tidak ditampilkan/i);
const sampleHotspots = parseCsv(readFileSync("data/sample/hotspot.csv", "utf8")).map((raw) => normalizeHotspotRow(raw, { contoh: true }));
const range = defaultRange(sampleHotspots, 7);
assert.deepEqual(range, { from: "2026-10-10", to: "2026-10-16" });

const view = deriveDashboard({
  hotspots: sampleHotspots,
  sipongi: loaded.find((feed) => feed.id === "sipongi").rows,
  irbi: loaded.find((feed) => feed.id === "irbi").rows,
  ispu: loaded.find((feed) => feed.id === "ispu").rows,
  province: "",
  from: range.from,
  to: range.to,
  config,
});

const byProvince = Object.fromEntries(view.provinsiDeteksi.map((row) => [row.provinsi, row]));
assert.equal(view.summary.hotspot, 158);
assert.equal(byProvince.Riau.jumlah, 72);
assert.equal(byProvince["Sumatera Selatan"].jumlah, 23);
assert.equal(Object.hasOwn(byProvince.Riau, "status"), false);
const provinceNames = view.provinsiDeteksi.map((row) => row.provinsi);
assert.deepEqual(provinceNames, [...provinceNames].sort((a, b) => a.localeCompare(b, "id")));
const irbiNames = view.irbiRows.map((row) => row.kabupaten);
assert.deepEqual(irbiNames, [...irbiNames].sort((a, b) => a.localeCompare(b, "id")));
assert.equal(view.summary.ispuTerkini.ispu, 112);
assert.equal(view.summary.ispuTerkini.provinsi, "Riau");
assert.equal(view.summary.ispuTerkini.kota, "Pekanbaru");
assert.equal(view.summary.ispuTerkini.kategori, "Tidak Sehat");
assert.equal(view.summary.ispuTerkini.tanggal, "2026-10-16");
assert.ok(view.irbiRows.some((row) => row.kabupaten === "Pulang Pisau" && row.kelas === "Tinggi"));
assert.ok(view.hotspotSeries.includes("Lainnya"));
assert.equal(view.hotspotTrend.at(-1).tanggal, "2026-10-16");

const riau = deriveDashboard({
  hotspots: sampleHotspots,
  ispu: loaded.find((feed) => feed.id === "ispu").rows,
  sipongi: [],
  irbi: loaded.find((feed) => feed.id === "irbi").rows,
  province: "Riau",
  from: range.from,
  to: range.to,
  config,
});
assert.equal(riau.summary.hotspot, 72);
assert.equal(riau.provinsiDeteksi.length, 1);
assert.ok(riau.irbiRows.every((row) => row.provinsi === "Riau"));

const oneDay = deriveDashboard({
  hotspots: sampleHotspots,
  ispu: loaded.find((feed) => feed.id === "ispu").rows,
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
assert.equal(fallbackHotspot.status, "gagal");
assert.equal(fallbackHotspot.rows.length, 0);
assert.match(fallbackHotspot.error, /FIRMS gagal/);
assert.match(fallbackHotspot.error, /contoh tidak dipakai/i);
const snapCsv = "tanggal,waktu,lintang,bujur,provinsi,kabupaten,satelit,kepercayaan\n2026-10-17,1200,0.5,101.4,Riau,Pelalawan,N,n\n";
const snap = await loadAll(liveConfig, {
  manifest: {
    datasets: {
      hotspot: {
        file: "data/live/hotspot.csv",
        status: "ok",
        fetched_at: "2026-10-17T22:00:00.000Z",
        observed_at: "2026-10-17T12:00:00.000Z",
      },
    },
  },
  resolveUrl: (url) => url,
  fetchImpl: async (url) => {
    if (String(url).includes("firms.modaps.eosdis.nasa.gov")) throw new Error("snapshot tidak boleh memanggil FIRMS");
    if (String(url).includes("data/live/hotspot.csv")) return { ok: true, status: 200, text: async () => snapCsv };
    return readFiles(url);
  },
});
const snapHotspot = snap.find((feed) => feed.id === "hotspot");
assert.equal(snapHotspot.asal, "snapshot");
assert.equal(snapHotspot.contoh, false);
assert.equal(snapHotspot.rows.length, 1);
assert.equal(snapHotspot.rows[0].provinsi, "Riau");

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
assert.equal(partial.find((feed) => feed.id === "hotspot").rows.length, 0);
assert.equal(partial.find((feed) => feed.id === "hotspot").status, "gagal");

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
assert.equal(described.find((row) => row.id === "hotspot").status, "belum terhubung");
assert.match(described.find((row) => row.id === "hotspot").catatan, /contoh tidak ditampilkan/i);
for (const id of ["sipongi", "irbi", "ispu"]) {
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
assert.match(describedFallback.find((row) => row.id === "hotspot").catatan, /FIRMS gagal/);

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
assert.equal(logicSource.includes("PROTOTYPE_LABEL"), false);
assert.equal(logicSource.includes("bukan daftar prioritas"), true);
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
assert.equal(summarySource.includes("15–20 kabupaten/kota, 14 hari"), false);
assert.equal(summarySource.includes("buildComparisonAttention"), false);
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
const square = { rings: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]] };
assert.equal(arcGisContains(square, 1, 1), true);
assert.equal(arcGisContains(square, 3, 1), false);
assert.equal(arcGisContains({ rings: [] }, 1, 1), false);
const desaRows = summarizeByDesa([
  { desa: "Hangtuah", kodeDesa: "14.01.16.2003", kecamatan: "Perhentian Raja", kabupaten: "Kampar", provinsi: "Riau", kelasKepercayaan: "nominal" },
  { desa: "Hangtuah", kodeDesa: "14.01.16.2003", kecamatan: "Perhentian Raja", kabupaten: "Kampar", provinsi: "Riau", kelasKepercayaan: "tinggi" },
  { desa: "", kodeDesa: "", kecamatan: "Setiabudi", kabupaten: "Kota Adm. Jakarta Selatan", provinsi: "DKI Jakarta", kelasKepercayaan: "rendah" },
]);
assert.equal(desaRows[0].desa, "Hangtuah");
assert.equal(desaRows[0].jumlah, 2);
assert.equal(desaRows[0].nominal, 1);
assert.equal(desaRows[0].tinggi, 1);
assert.equal(desaRows.find((row) => row.kecamatan === "Setiabudi").desa, DESA_UNIDENTIFIED);
const mapComponent = readFileSync("src/components/HotspotMap.jsx", "utf8");
assert.match(mapComponent, /L\.circleMarker\(\[lat, lon\]/);
assert.match(mapComponent, /Number\(anchor\.lintang\)/);
assert.equal(mapComponent.includes("circleMarker([meanLat"), false);
assert.match(readFileSync("src/lib/bigWilayah.js", "utf8"), /#15803d/);
function jsonResponse(payload, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => payload };
}
const jakartaRing = { rings: [[[106, -7], [107, -7], [107, -6], [106, -6], [106, -7]]] };
const mockFetch = async (url, init) => {
  const params = new URLSearchParams(init.body);
  const geometry = params.get("geometry") || "";
  if (String(url).includes("/3/query") && geometry.includes("106")) {
    return jsonResponse({ features: [{ attributes: { namobj: "Setiabudi", wadmkc: "Setiabudi", wadmkk: "Kota Adm. Jakarta Selatan", wadmpr: "DKI Jakarta", kdcpum: "31.74.02", kdppum: "31" }, geometry: jakartaRing }] });
  }
  if (String(url).includes("/4/query")) return jsonResponse({ features: [] });
  if (String(url).includes("/3/query")) return jsonResponse({ features: [] });
  return jsonResponse({ error: { message: "tak dikenal" } }, false);
};
const jakarta = await annotatePoints([{ lon: 106.8456, lat: -6.2088, lintangTeks: "-6.2088", bujurTeks: "106.8456" }], { fetchImpl: mockFetch, concurrency: 1 });
assert.equal(jakarta.rows.length, 1);
assert.equal(jakarta.rows[0].kecamatan, "Setiabudi");
assert.equal(jakarta.rows[0].kabupaten, "Kota Adm. Jakarta Selatan");
assert.equal(jakarta.rows[0].provinsi, "DKI Jakarta");
assert.equal(jakarta.rows[0].kodeKecamatan, "31.74.02");
assert.equal(jakarta.rows[0].desa, "");
assert.equal(jakarta.rows[0].wilayahStatus, "tanpa_desa");
const singapore = await annotatePoints([{ lon: 103.8198, lat: 1.3521 }], { fetchImpl: mockFetch, concurrency: 1 });
assert.equal(singapore.rows.length, 0);
assert.equal(singapore.stats.droppedOutside, 1);
const gagal = await annotatePoints([{ lon: 106.8, lat: -6.2 }], { fetchImpl: async () => { throw new Error("timeout"); }, concurrency: 1 });
assert.equal(gagal.rows.length, 1);
assert.equal(gagal.rows[0].wilayahStatus, "gagal");
const mixedWilayah = [
  { ...gagal.rows[0], kelasKepercayaan: "tinggi", provinsi: "Riau", kabupaten: "Pelalawan", tanggal: "2026-10-16", lintang: 0.5, bujur: 101.4 },
  { provinsi: "Riau", kabupaten: "Pelalawan", kecamatan: "Bandar Sei Kijang", kelasKepercayaan: "nominal", wilayahStatus: "ok", desa: "Hangtuah", tanggal: "2026-10-16", lintang: 0.5, bujur: 101.5 },
  { provinsi: "Jambi", kabupaten: "Tebo", kecamatan: "Tebo Tengah", kelasKepercayaan: "rendah", wilayahStatus: "gagal", tanggal: "2026-10-16", lintang: -1.5, bujur: 102.4 },
];
assert.equal(unverifiedWilayahCount(mixedWilayah), 2);
const kabCounts = summarizeByWilayah(mixedWilayah, "kabupaten");
assert.equal(kabCounts.length, 1);
assert.equal(kabCounts[0].kabupaten, "Pelalawan");
assert.equal(kabCounts[0].jumlah, 1);
const provinsiGagal = deriveDashboard({
  hotspots: mixedWilayah,
  from: "2026-10-16",
  to: "2026-10-16",
  config,
});
assert.equal(provinsiGagal.summary.belumTerverifikasi, 2);
assert.equal(provinsiGagal.provinsiDeteksi.find((row) => row.provinsi === "Riau").jumlah, 1);
assert.equal(provinsiGagal.provinsiDeteksi.some((row) => row.provinsi === "Jambi"), false);
const staleClock = assessFreshness({
  observedAt: "2026-10-17T19:25:00.000Z",
  nextRun: "2026-10-18T00:00:00.000Z",
  now: new Date("2026-10-18T03:30:00.000Z"),
});
assert.equal(staleClock.tertunda, true);
assert.equal(staleClock.nextVisible, false);
const freshClock = assessFreshness({
  observedAt: "2026-10-18T03:00:00.000Z",
  nextRun: "2026-10-18T06:00:00.000Z",
  now: new Date("2026-10-18T03:30:00.000Z"),
});
assert.equal(freshClock.tertunda, false);
assert.equal(freshClock.nextVisible, true);
assert.equal(hotspotSourceLabel({ asal: "snapshot", status: "berhasil" }, "VIIRS_SNPP_NRT"), "VIIRS S-NPP NRT (snapshot ±3 jam)");
const boardSource = readFileSync("src/components/HotspotBoard.jsx", "utf8");
assert.match(boardSource, /Confidence deteksi satelit/);
assert.match(boardSource, /Lintasan satelit terakhir/);
assert.match(boardSource, /nama desa tersedia untuk/);
assert.match(boardSource, /titik belum terverifikasi wilayah/);
assert.match(boardSource, /keyakinan deteksi, bukan intensitas atau bahaya/);
const dashSource = readFileSync("src/components/DashboardView.jsx", "utf8");
assert.match(dashSource, /Jumlah deteksi hotspot \(bukan status\)/);
assert.equal(dashSource.includes("Indikator prototipe"), false);
assert.equal(dashSource.includes("Waspada"), false);
assert.equal(dashSource.includes("FIRMS langsung"), false);
assert.equal(dashSource.includes("FWI maks"), false);
const extraSource = readFileSync("src/components/ExtraLayers.jsx", "utf8");
assert.equal(extraSource.includes("Batas resmi belum dipasang"), false);
assert.match(extraSource, /menunggu data resmi BMKG/);
assert.match(extraSource, /Pembanding, bukan produk BMKG\/KLHK/);
assert.equal(extraSource.includes("bmkgRows"), false);
assert.match(readFileSync("src/components/ForecastPanel.jsx", "utf8"), /Pembanding, bukan produk BMKG\/KLHK/);
assert.match(readFileSync("scripts/refresh-live-data.mjs", "utf8"), /Nama wilayah dari kueri BIG/);
assert.equal(readFileSync("scripts/refresh-live-data.mjs", "utf8").includes("Kabupaten tidak diisi"), false);
assert.equal(readFileSync("src/components/LogicPage.jsx", "utf8").includes("Batas administrasi resmi belum dipasang"), false);
assert.match(readFileSync("src/components/SummaryPage.jsx", "utf8"), /Konteks risiko jangka panjang \(IRBI 2025\)/);
assert.match(readFileSync("src/components/HotspotBoard.jsx", "utf8"), /FILTER_INCOMPLETE/);
assert.match(readFileSync("src/lib/bigWilayah.js", "utf8"), /Penyaringan wilayah dan batas Indonesia pada pembaruan ini tidak lengkap/);
assert.match(readFileSync("scripts/refresh-live-data.mjs", "utf8"), /big_filter_incomplete/);
assert.match(readFileSync("src/components/DashboardView.jsx", "utf8"), /HotspotBoard/);
const wilayahCopy = readFileSync("src/lib/bigWilayah.js", "utf8");
assert.equal(wilayahCopy.includes("Bukan tingkat bahaya"), true);
assert.equal(wilayahCopy.includes("bukan tingkat kebakaran"), true);
const firmsFetch = readFileSync("scripts/refresh-live-data.mjs", "utf8");
assert.match(firmsFetch, /annotatePoints/);
assert.match(firmsFetch, /records_before_boundary/);
assert.match(firmsFetch, /records_after_boundary/);
assert.match(firmsFetch, /kspservices\.big\.go\.id|BIG_SOURCE_LABEL|bigWilayah/);
assert.equal(firmsFetch.includes("function inIndonesia"), false);
assert.equal(firmsFetch.includes("data/boundaries"), false);
assert.equal(existsSync("data/boundaries/idn-adm2.geojson"), false);
assert.equal(existsSync("data/boundaries/idn-adm1.geojson"), false);

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

const indicatorSource = readFileSync("src/lib/priorityIndicators.js", "utf8");
const indicatorUi = readFileSync("src/components/PriorityIndicators.jsx", "utf8");
assert.match(readFileSync("src/components/SummaryPage.jsx", "utf8"), /<PriorityIndicators \/>/);
assert.match(logicSource, /<PriorityIndicators rinci \/>/);
assert.match(indicatorSource, /Indikator untuk Wilayah Prioritas/);
assert.match(indicatorSource, /menunggu data resmi BMKG \(FDRS\/potensi karhutla per kab\/kota\)/);
assert.match(indicatorSource, /hingga H\+7 sesuai produk BMKG/);
assert.match(indicatorSource, /bukan prakiraan 14 hari/);
assert.match(indicatorSource, /Tidak ada data stasiun/);
assert.match(indicatorSource, /bukan peluang dalam persen/);
assert.match(indicatorUi, /target="_blank" rel="noopener noreferrer"/);
assert.equal((indicatorSource.match(/status: "Tautan saja"/g) || []).length, 4);
for (const url of [
  "https://spartan.bmkg.go.id/",
  "https://www.bmkg.go.id/cuaca/karhutla",
  "https://ispu.kemenlh.go.id/app/#/",
  "https://www.bmkg.go.id/iklim/prediksi-hujan-dasarian",
  "https://data.bmkg.go.id/prakiraan-cuaca/",
  "https://cews.bmkg.go.id/dashboard-custom/prediksi-karhutla/",
]) {
  assert.equal(indicatorSource.includes(url), true, url);
}

console.log("Pemeriksaan prototipe lulus.");
