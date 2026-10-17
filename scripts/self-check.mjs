import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deriveDashboard, defaultRange } from "../src/lib/derive.js";
import { areaContains, assignProvince, INDONESIA_FRAME, INDONESIA_PAN_LIMIT } from "../src/lib/geo.js";
import { looksLikeCsv, parseCsv } from "../src/lib/csv.js";
import { fetchCsv, loadAll, redactFirmsUrl } from "../src/lib/loadData.js";
import { parseRoute } from "../src/lib/route.js";
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
assert.deepEqual(
  config.datasets.map((dataset) => dataset.id),
  ["hotspot", "sipongi", "irbi", "bmkg", "ispu"],
);
for (const dataset of config.datasets) {
  assert.equal(dataset.contoh, true);
  assert.equal(readFileSync(dataset.csvUrl, "utf8").includes("DATA CONTOH"), true);
}

async function readFiles(url) {
  return { ok: true, status: 200, text: async () => readFileSync(url, "utf8") };
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
assert.equal(liveHotspot.rows[0].provinsi, "Riau");
assert.equal(liveHotspot.rows[1].provinsi, "Kalimantan Tengah");
assert.equal(liveHotspot.rows[1].kelasKepercayaan, "tinggi");
assert.equal(liveHotspot.rows[2].provinsi, "Lainnya");
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

assert.equal(parseRoute(""), "dashboard");
assert.equal(parseRoute("#/"), "dashboard");
assert.equal(parseRoute("#/logika"), "logika");
assert.equal(parseRoute("#/logika/"), "logika");
assert.equal(parseRoute("#/LOGIKA?x=1"), "logika");
assert.equal(parseRoute("#/lain"), "dashboard");

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
assert.equal(logicSource.includes("Kembali ke dashboard"), true);
assert.equal(logicSource.includes("mapKey"), false);
assert.equal(logicSource.includes("rencana pengembangan"), true);
assert.match(readFileSync("src/components/SiteHeader.jsx", "utf8"), /Logika Pemantauan/);
assert.equal(readFileSync("index.html", "utf8").includes('href="./favicon.svg"'), true);
assert.equal(readFileSync("vite.config.js", "utf8").includes('base: "./"'), true);

console.log("Pemeriksaan prototipe lulus.");
