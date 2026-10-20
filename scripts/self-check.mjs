import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deriveDashboard, defaultRange } from "../src/lib/derive.js";
import { areaContains, assignProvince, BANJIR_FRAME, BANJIR_PAN_LIMIT, INDONESIA_FRAME, INDONESIA_PAN_LIMIT } from "../src/lib/geo.js";
import { looksLikeCsv, parseCsv } from "../src/lib/csv.js";
import { fetchCsv, loadAll, normalizeHotspotRow, normalizeRecords, redactFirmsUrl } from "../src/lib/loadData.js";
import { GLOSSARY } from "../src/lib/glossary.js";
import { HAZARDS } from "../src/lib/hazards.js";
import { ispuFromPm25 } from "../src/lib/ispuEstimate.js";
import {
  CAMS_LABEL,
  ISPU_EXPLANATION,
  KLH_ISPU_ANALYTIC,
  KLH_ISPU_APP,
  OPENAQ_BLOCKED,
  camsModelFeed,
  camsRole,
  filterCams,
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
import {
  agregasiHotspot,
  alasanKesegaran,
  ambangHotspot,
  blokHotspot,
  farthestPointSample,
  kuantilIndeks,
  nilaiKab,
  p75,
  statusDaftar,
  susunPrioritas,
  tampilanPrioritas,
} from "../src/lib/aplus.js";
import { CAP_CRON, CAP_WATCH_MINUTES, REFRESH_CRON, REFRESH_CRON_CADANGAN, nextScheduledRun } from "../src/lib/schedule.js";
import { ANALISIS_MATRIKS, ANALISIS_NAMA, ANALISIS_WARNA, analisisStatus, applyAnalisis, catWilayah, keparahanCuaca, keparahanTerburuk } from "../src/lib/analisisPantauBencana.js";
import {
  BPS_PROYEKSI_URL,
  PENDUDUK_ABSENT,
  PENDUDUK_BUKAN_TERPAPAR,
  PENDUDUK_FILE,
  PENDUDUK_HEADER,
  RUMAH_BELUM,
  angkaUtuh,
  bacaPenduduk,
  kalimatJumlahPenduduk,
  labelPenduduk,
  labelRumahTangga,
  ringkasPendudukBerstatus,
  teksRumahTangga,
} from "../src/lib/pendudukKab.js";
import { BNPB_ABSENT, BNPB_RESOURCE_URL, DAMPAK_HISTORIS_CATATAN, barisDampakHistoris } from "../src/lib/bnpbBanjir.js";
import {
  LABEL_TAK_DIKENAL,
  LABEL_TIDAK_BERPOTENSI,
  LABEL_TANPA_STATUS,
  CUACA_DISCLAIMER,
  CUACA_RUJUKAN,
  hariPunyaHujan,
  kelasCuacaSlot,
  periodeTigaHari,
  jenisHujan,
  labelSlotHujan,
  terapkanHari,
} from "../src/lib/prakiraanHujan.js";
import {
  HUJAN_GAP_MS,
  HUJAN_GPM_CATATAN,
  HUJAN_KELAS,
  HUJAN_PEMBANDING_BADGE,
  HUJAN_PEMBANDING_JENIS,
  gabungHujan,
  warnaHujan,
} from "../src/lib/hujanPembanding.js";
import { PROVINSI, SEMUA_PROVINSI } from "../src/lib/provinsi.js";
import { CAP_DATA_TERAKHIR, severityLabel } from "../src/lib/capKab.js";
import { xlsxBytes } from "../src/lib/xlsxMini.js";
import { buildHotspotTree } from "../src/lib/hotspotTree.js";
import { DIBI_LUAR_CUPLIKAN, DIBI_UNAVAILABLE, FLOOD_INFO_COLUMNS, IRBI_BANJIR_TERVERIFIKASI, IRBI_PENGGUNAAN_INTERNAL, IRBI_TIDAK_TERSEDIA, RAIN_RISK_MATRIX, buildFloodRows, kodeWilayah, legendClass, nameKey, MISSING_DIBI, peringkatTampil, urutStatusKab } from "../src/lib/floodMatrix.js";
import {
  DASARIAN_NOTE,
  MATRIX_PERMISSION,
  NOWCAST_FAIL,
  applyNowcast,
  clockWib,
  nowcastAbsent,
  nowcastCrossTab,
  nowcastExpiredText,
  warningActive,
} from "../src/lib/capKab.js";
import {
  DASARIAN_EMPTY,
  DASARIAN_EXPIRED,
  DASARIAN_FILE,
  DASARIAN_HEADER,
  DASARIAN_MANUAL_LABEL,
  DASARIAN_UNLISTED,
  applyDasarian,
  validateDasarian,
} from "../src/lib/dasarianManual.js";
import {
  assignKabupaten,
  aggregateProvinsi,
  capCsvUsable,
  capKabCsv,
  capKabMeta,
  previousCapUsable,
  queryReliable,
  ringsIntersect,
  rowsFromStoredBoundaries,
  writeCapKabFiles,
  BMKG_REQUEST_GAP_MS,
  ringsFromXml,
  rowsFromFeatures,
  targetRings,
} from "./cap-kab.mjs";
import { capRunMissed, manifestNeedsRefresh } from "./refresh-watchdog.mjs";
import { monitoringSources } from "../src/lib/sourceStatus.js";
import { aggregateCells, gfwedCsv, latestDailyStamp } from "./gfwed-kabupaten.mjs";
import { GFWED_LABEL, GFWED_UNAVAILABLE } from "../src/lib/gfwed.js";
import { GWIS_FWI_LAYER, GWIS_LABEL, GWIS_UNAVAILABLE, gwisLayerReady, gwisProbeUrl, tanggalJakarta } from "../src/lib/gwisFwi.js";
const DISCLAIMER = "Pantau Bencana v0.1 — proyek data terbuka komunitas, bukan produk BNPB, BMKG, PVMBG, atau KLH.";
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
for (const id of ["sipongi", "irbi", "ispu"]) {
  const feed = loaded.find((item) => item.id === id);
  assert.equal(feed.status, "tautan", id);
  assert.equal(feed.contoh, false, id);
  assert.equal(feed.rows.length, 0, id);
  assert.equal(feed.urlTampil, "", id);
}
assert.match(loaded.find((feed) => feed.id === "sipongi").error, /Tautan saja/);
assert.match(loaded.find((feed) => feed.id === "ispu").error, /Tidak tersedia/);
assert.match(loaded.find((feed) => feed.id === "irbi").error, /Tidak tersedia/);
const sampleHotspots = parseCsv(readFileSync("data/sample/hotspot.csv", "utf8")).map((raw) => normalizeHotspotRow(raw, { contoh: true }));
const sampleSipongi = normalizeRecords("sipongi", parseCsv(readFileSync("data/sample/sipongi.csv", "utf8")));
const sampleIrbi = normalizeRecords("irbi", parseCsv(readFileSync("data/sample/irbi.csv", "utf8")));
const sampleIspu = normalizeRecords("ispu", parseCsv(readFileSync("data/sample/ispu.csv", "utf8")));
const range = defaultRange(sampleHotspots, 7);
assert.deepEqual(range, { from: "2026-10-10", to: "2026-10-16" });

const view = deriveDashboard({
  hotspots: sampleHotspots,
  sipongi: sampleSipongi,
  irbi: sampleIrbi,
  ispu: sampleIspu,
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
  ispu: sampleIspu,
  sipongi: [],
  irbi: sampleIrbi,
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
  ispu: sampleIspu,
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
assert.deepEqual(BANJIR_FRAME, { south: -11.5, west: 94.5, north: 6.5, east: 141.5 });
assert.equal(areaContains(BANJIR_PAN_LIMIT, BANJIR_FRAME), true);
const petaBanjirSumber = readFileSync("src/components/FloodRiskMap.jsx", "utf8");
assert.match(petaBanjirSumber, /BANJIR_FRAME/);
assert.match(petaBanjirSumber, /fitBounds\(frame, \{ padding: BANJIR_PADDING/);
assert.match(petaBanjirSumber, /ResizeObserver/);
assert.equal(petaBanjirSumber.includes("setView([-2.2, 118]"), false);
assert.match(readFileSync("src/styles.css", "utf8"), /100cqw \/ 2\.6/);
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
  assert.equal(described.find((row) => row.id === id).status, "Tautan saja", id);
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
assert.equal(REFRESH_CRON, "17 */3 * * *");
assert.equal(REFRESH_CRON_CADANGAN, "47 1-23/3 * * *");
assert.equal(CAP_CRON, "12,42 * * * *");
assert.equal(CAP_WATCH_MINUTES, 50);
assert.equal(readFileSync(".github/workflows/refresh-cap.yml", "utf8").includes(`"${CAP_CRON}"`), true);
assert.equal(capRunMissed([], new Date("2026-10-20T07:07:00.000Z")), true);
assert.equal(
  capRunMissed([{ status: "completed", createdAt: "2026-10-20T06:42:00.000Z" }], new Date("2026-10-20T07:07:00.000Z")),
  false,
);
assert.equal(
  capRunMissed([{ status: "completed", createdAt: "2026-10-20T06:12:00.000Z" }], new Date("2026-10-20T07:07:00.000Z")),
  true,
);
assert.equal(
  capRunMissed([{ status: "queued", createdAt: "2026-10-20T05:12:00.000Z" }], new Date("2026-10-20T07:07:00.000Z")),
  false,
);
assert.match(nextScheduledRun(new Date("2026-10-17T16:30:00.000Z")), /^2026-10-17T16:47:00/);
assert.match(nextScheduledRun(new Date("2026-10-17T18:10:00.000Z")), /^2026-10-17T18:17:00/);
assert.match(nextScheduledRun(new Date("2026-10-17T18:20:00.000Z")), /^2026-10-17T19:47:00/);
assert.match(nextScheduledRun(new Date("2026-10-17T21:20:00.000Z")), /^2026-10-17T22:47:00/);
assert.equal(manifestNeedsRefresh("2026-10-18T06:00:00.000Z", new Date("2026-10-18T10:30:00.000Z")), true);
assert.equal(manifestNeedsRefresh("2026-10-18T08:00:00.000Z", new Date("2026-10-18T11:00:00.000Z")), false);
assert.equal(manifestNeedsRefresh(null, new Date("2026-10-18T11:00:00.000Z")), true);
const workflow = readFileSync(".github/workflows/refresh-data.yml", "utf8");
assert.match(workflow, /17 \*\/3 \* \* \*/);
assert.match(workflow, /47 1-23\/3 \* \* \*/);
assert.match(workflow, /fetch-depth:\s*0/);
assert.match(workflow, /git fetch origin/);
assert.match(workflow, /git pull --rebase/);
assert.match(workflow, /queue: max/);
assert.match(workflow, /cancel-in-progress: false/);
assert.match(workflow, /deploy-pages/);
assert.equal(workflow.includes("push --force"), false);
assert.equal(workflow.includes("git push -f"), false);
assert.match(workflow, /wilayah_gagal/);
assert.match(workflow, /big_queries/);
assert.match(workflow, /FIRMS_MAP_KEY/);
assert.match(workflow, /git reset --hard[\s\S]*npm ci/);
assert.match(workflow, /npm ci\n\s*npm run check && npm run build/);
assert.equal(workflow.includes("eyJ"), false);
const watchdog = readFileSync(".github/workflows/refresh-watchdog.yml", "utf8");
assert.match(watchdog, /7 \* \* \* \*/);
assert.match(watchdog, /actions: write/);
assert.match(watchdog, /gh workflow run refresh-data\.yml --ref main/);
assert.match(watchdog, /gh workflow run refresh-cap\.yml --ref main/);
assert.match(watchdog, /CAP_RUNS_JSON/);
assert.match(watchdog, /cancel-in-progress: false/);
assert.match(watchdog, /group: refresh-watchdog/);
assert.equal(watchdog.includes("group: pages"), false);
const refreshSource = readFileSync("scripts/refresh-live-data.mjs", "utf8");
assert.match(refreshSource, /bigQueries: annotated\.stats\.queries/);
assert.match(refreshSource, /hotspotEntry\.big_queries = result\.bigQueries/);
assert.match(refreshSource, /wilayah_gagal=\$\{countText/);
assert.match(refreshSource, /big_queries=\$\{countText/);
assert.match(refreshSource, /\/tmp\/refresh-hotspot-counts\.txt/);
assert.equal(karhutlaRankingPlan().dapatDisusun, false);
assert.match(karhutlaRankingPlan().status, /Belum tersedia – cuplikan prioritas belum ada/);
assert.equal(karhutlaRankingPlan().judul, "Prioritas kesiapsiagaan 14 hari (FWI hanya 9 hari)");
assert.equal(karhutlaRankingPlan().jenis, "pemodelan pihak ketiga");
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
for (const id of ["ispu", "fwi", "fdrs", "ffmc", "dmc", "dc", "isi", "bui", "irbi", "inarisk", "bnpb", "bmkg", "klh", "firms", "viirs", "modis", "nrt", "confidence", "hotspot", "spartan", "sipongi", "cams", "pm", "wib", "dasarian", "snapshot", "statis", "prakiraan", "observasi", "gfwed", "ensemble", "p75", "peringkat", "iku", "dibi", "nowcast", "pdcht", "kabkota", "big", "krb", "magma", "vona", "gwis"]) {
  assert.equal(glossaryIds.has(id), true, id);
}
assert.equal(GLOSSARY.every((item) => item.penjelasan && item.penggunaan), true);
assert.deepEqual(HAZARDS.map((item) => item.id), ["karhutla", "banjir", "gunung-api"]);
assert.equal(parseLocation("#/gunung-api").hazard, "gunung-api");
assert.equal(parseLocation("#/karhutla/peta").page, "peta");
assert.equal(parseLocation("#/sumber-metode/cara-hitung").page, "metode");
assert.equal(parseLocation("#/sumber-metode/cara-hitung").anchor, "cara-hitung");
assert.equal(parseLocation("#/sumber-metode/glosarium").page, "metode");
assert.equal(parseLocation("#/sumber-metode/glosarium").anchor, "glosarium");
assert.equal(parseLocation("#/sumber-metode/glosarium/fwi").term, "fwi");
assert.equal(parseRoute("#/glosarium"), "glosarium");
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
assert.match(pagesWorkflow, /queue: max/);
assert.match(pagesWorkflow, /GITHUB_TOKEN/);
assert.match(pagesWorkflow, /Ujung main sudah berpindah/);
assert.match(pagesWorkflow, /Bangun ulang dari ujung main/);
assert.match(pagesWorkflow, /steps\.head\.outputs\.rebuild == 'true'/);
assert.equal(pagesWorkflow.includes("steps.head.outputs.skip != 'true'"), false);
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
assert.equal(clusterCellDegrees(6), 0);
assert.notEqual(clusterCellDegrees(5), 0);
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
assert.match(boardSource, /Cara membaca/);
assert.match(boardSource, /Jumlah deteksi hotspot \(bukan status\)/);
assert.match(boardSource, /di dalam tanggal/);
assert.equal((boardSource.match(/<HotspotAccordion/g) || []).length, 1);
assert.match(readFileSync("src/components/HotspotAccordion.jsx", "utf8"), /Cari provinsi/);
assert.match(readFileSync("src/components/HotspotAccordion.jsx", "utf8"), /Confidence deteksi satelit/);
const hotspotTree = buildHotspotTree([
  { provinsi: "Jambi", kabupaten: "Tebo", kecamatan: "Tebo Tengah", kodeKecamatan: "15.09.01", desa: "Teluk Rendah", kelasKepercayaan: "tinggi", wilayahStatus: "desa" },
  { provinsi: "Riau", kabupaten: "Siak", kecamatan: "Siak", kodeKecamatan: "14.08.01", kelasKepercayaan: "rendah", wilayahStatus: "kecamatan" },
  { provinsi: "Riau", kabupaten: "Siak", kecamatan: "Siak", kodeKecamatan: "14.08.01", kelasKepercayaan: "nominal", wilayahStatus: "kecamatan" },
  { provinsi: "Riau", kabupaten: "Pelalawan", kecamatan: "Bandar Petalangan", kodeKecamatan: "14.05.07", desa: "Wilayah desa belum teridentifikasi", kelasKepercayaan: "tinggi", wilayahStatus: "tanpa-desa" },
  { provinsi: "Jambi", kabupaten: "Tebo", kecamatan: "Tebo Tengah", kodeKecamatan: "15.09.01", wilayahStatus: "gagal", kelasKepercayaan: "tinggi" },
]);
assert.equal(hotspotTree[0].provinsi, "Riau");
assert.equal(hotspotTree[0].jumlah, 3);
assert.equal(hotspotTree[0].rendah, 1);
assert.equal(hotspotTree[0].nominal, 1);
assert.equal(hotspotTree[0].tinggi, 1);
assert.equal(hotspotTree[0].kecamatan[0].kecamatan, "Siak");
assert.equal(hotspotTree[0].kecamatan[0].kabupaten, "Siak");
assert.equal(hotspotTree[0].kecamatan[0].kodeKecamatan, "14.08.01");
assert.equal(hotspotTree[1].kecamatan[0].desa[0].desa, "Teluk Rendah");
assert.equal(hotspotTree[0].kecamatan.find((row) => row.kecamatan === "Bandar Petalangan").desa.length, 0);
const dashSource = readFileSync("src/components/DashboardView.jsx", "utf8");
assert.equal(dashSource.includes("HotspotAccordion"), false);
assert.equal(dashSource.includes("ProvinceCounts"), false);
assert.equal(readFileSync("src/components/SummaryPage.jsx", "utf8").includes("HotspotAccordion"), false);
assert.equal(dashSource.includes("Indikator prototipe"), false);
assert.equal(dashSource.includes("Waspada"), false);
assert.equal(dashSource.includes("FIRMS langsung"), false);
assert.equal(dashSource.includes("FWI maks"), false);
assert.match(dashSource, /officialLinks\("sipongi"\)/);
assert.match(dashSource, /Tautan saja/);
assert.match(dashSource, /rel="noopener noreferrer"/);
const appSource = readFileSync("src/App.jsx", "utf8");
assert.match(appSource, /<Badge kind="tau">Tautan saja<\/Badge>/);
assert.match(appSource, /officialLinks\("ispu"\)/);
const catalogSource = readFileSync("src/lib/sourceCatalog.js", "utf8");
assert.match(catalogSource, /https:\/\/sipongi\.gakkum\.kehutanan\.go\.id\//);
assert.match(catalogSource, /https:\/\/ispu\.kemenlh\.go\.id\/app\/#\//);
assert.match(catalogSource, /https:\/\/ispu\.kemenlh\.go\.id\/kawasan\/analytic/);
assert.match(readFileSync("src/components/OfficialLinks.jsx", "utf8"), /target="_blank" rel="noopener noreferrer"/);
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
assert.equal(readFileSync("src/components/DashboardView.jsx", "utf8").includes("Data contoh sedang ditampilkan"), false);
assert.equal(readFileSync("src/components/HotspotMap.jsx", "utf8").includes("cartocdn"), false);
assert.equal(readFileSync("src/components/FloodRiskMap.jsx", "utf8").includes("cartocdn"), false);
assert.equal(readFileSync("src/components/StationMap.jsx", "utf8").includes("cartocdn"), false);
assert.match(readFileSync("src/lib/basemap.js", "utf8"), /https:\/\/tile\.openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png/);
assert.match(readFileSync("src/lib/basemap.js", "utf8"), /OpenStreetMap contributors/);
assert.match(readFileSync("src/components/HotspotMap.jsx", "utf8"), /hotspot-cluster/);
assert.match(readFileSync("src/components/HotspotMap.jsx", "utf8"), /conic-gradient/);
assert.match(readFileSync("src/components/HotspotBoard.jsx", "utf8"), /bukan kelas confidence/);
assert.match(readFileSync("src/components/HotspotBoard.jsx", "utf8"), /<ClusterLegend \/>/);
assert.match(readFileSync("src/components/SummaryPage.jsx", "utf8"), /<ClusterLegend \/>/);
assert.equal(readFileSync("src/styles.css", "utf8").includes(".hotspot-cluster span") && readFileSync("src/styles.css", "utf8").includes("background: #1e293b"), false);
assert.match(readFileSync("src/styles.css", "utf8"), /\.leaflet-tile-pane/);
assert.equal(readFileSync("src/lib/sourceCatalog.js", "utf8").includes("masih data contoh"), false);
assert.equal(readFileSync("src/lib/sourceCatalog.js", "utf8").includes("peta memakai data contoh"), false);
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
assert.equal(OPENAQ_BLOCKED, "Belum terhubung – perlu API key (persetujuan pemilik)");
assert.equal(CAMS_LABEL, "Model kualitas udara CAMS — pembanding, bukan pengukuran stasiun dan bukan ISPU KemenLH");
const camsFeed = camsModelFeed([
  {
    id: "ispu_pembanding",
    status: "berhasil",
    rows: [
      { tanggal: "2026-10-19", provinsi: "Riau", pm25: 10.2, pm10: 12 },
      { tanggal: "2026-10-20", provinsi: "Riau", pm25: 11, pm10: 13, ispu: 80, kategori: "Sedang" },
    ],
  },
]);
assert.equal(camsFeed.rows.length, 2);
assert.equal(Object.hasOwn(camsFeed.rows[1], "ispu"), false);
assert.equal(filterCams(camsFeed.rows, { period: "hari-ini", today: "2026-10-19" }).length, 1);
assert.equal(camsRole("2026-10-20", "2026-10-19"), "prakiraan model");
assert.equal(camsModelFeed([{ id: "ispu_pembanding", status: "gagal", error: "jaringan", rows: [{ pm25: 9, tanggal: "2026-10-19" }] }]).rows.length, 0);
const udaraSource = readFileSync("src/components/KualitasUdara.jsx", "utf8");
assert.match(udaraSource, /Kualitas Udara \(ISPU\)/);
assert.match(udaraSource, /Data Pembanding – pengukuran stasiun/);
assert.match(udaraSource, /Hari Ini/);
assert.match(udaraSource, /Historis/);
assert.equal(udaraSource.includes("Prediksi"), false);
assert.match(udaraSource, /Indeks Kualitas Udara 2024 \(tahunan, statis\) — bukan ISPU, bukan kondisi harian/);
assert.match(udaraSource, /Status per provinsi prioritas/);
assert.match(udaraSource, /Kenapa tidak ada angka ISPU/);
assert.match(udaraSource, /Tidak ada data stasiun/);
assert.equal(udaraSource.includes("contoh tampilan"), false);
assert.match(udaraSource, /Direktorat Perlindungan dan Pengelolaan Mutu Udara \(Satu Data KemenLH\)/);
const ikuRows = parseCsv(readFileSync("data/static/iku-2024-kabupaten.csv", "utf8"));
assert.equal(ikuRows.length, 509);
assert.deepEqual(Object.keys(ikuRows[0]), ["kode_wilayah", "kab_kota", "provinsi", "iku", "tahun", "sumber", "tanggal_akses"]);
assert.equal(ikuRows.every((row) => row.tahun === "2024" && row.tanggal_akses === "2026-10-19"), true);
assert.equal(new Set(ikuRows.map((row) => `${row.kode_wilayah}|${row.kab_kota}`)).size, 509);
assert.equal(ikuRows.some((row) => row.kab_kota === "Kabupaten Aceh Barat" && row.iku === "92.11"), true);
assert.equal(udaraSource.includes("ispu_pembanding"), false);
assert.match(udaraSource, /CAMS_LABEL/);
assert.match(udaraSource, /OPENAQ_BLOCKED/);
assert.match(udaraSource, /Data belum terhubung/);
assert.equal(udaraSource.includes("Prediksi ISPU"), false);
assert.match(readFileSync("docs/ARAHAN_KUALITAS_UDARA.md", "utf8"), /ISPU resmi dan pembanding kualitas udara/);
assert.match(readFileSync("src/components/ExtraLayers.jsx", "utf8"), /Kualitas Udara \(ISPU\)/);
assert.equal(readFileSync("src/components/ExtraLayers.jsx", "utf8").includes("ISPU perkiraan"), false);
assert.equal(readFileSync("src/lib/hazards.js", "utf8").includes("ispu"), false);

const indicatorSource = readFileSync("src/lib/priorityIndicators.js", "utf8");
const indicatorUi = readFileSync("src/components/PriorityIndicators.jsx", "utf8");
assert.match(readFileSync("src/components/SummaryPage.jsx", "utf8"), /<PriorityIndicators \/>/);
assert.match(logicSource, /<PriorityIndicators rinci \/>/);
assert.match(indicatorSource, /Indikator untuk Wilayah Prioritas/);
assert.match(indicatorSource, /Metode A\+/);
assert.match(indicatorSource, /bukan prakiraan resmi BMKG\/BNPB/);
assert.match(indicatorSource, /hingga H\+7 sesuai produk BMKG/);
assert.match(indicatorSource, /bukan prakiraan 14 hari/);
assert.match(indicatorSource, /Tidak ada data stasiun/);
assert.match(indicatorSource, /bukan peluang dalam persen/);
assert.match(indicatorUi, /target="_blank" rel="noopener noreferrer"/);
assert.equal((indicatorSource.match(/status: "Tautan saja"/g) || []).length, 3);
assert.match(indicatorSource, /BMKG Tautan saja; pembanding GWIS tersedia sebagai overlay/);
assert.equal(indicatorSource.includes("gis.bmkg.go.id"), false);
assert.equal(gwisLayerReady({ contentType: "image/png", opaque: 4 }), true);
assert.equal(gwisLayerReady({ contentType: "image/png", opaque: 0 }), false);
assert.equal(gwisLayerReady({ contentType: "text/xml", opaque: 3 }), false);
assert.equal(gwisProbeUrl("2026-10-18").includes("LAYERS=ecmwf.fwi"), true);
assert.equal(gwisProbeUrl("2026-10-18").includes("TIME=2026-10-18"), true);
assert.equal(GWIS_FWI_LAYER, "ecmwf.fwi");
assert.match(GWIS_LABEL, /Pembanding, bukan produk BMKG\/KLHK/);
assert.equal(GWIS_UNAVAILABLE, "data belum tersedia");
assert.match(tanggalJakarta(new Date("2026-10-18T17:30:00.000Z")), /^2026-10-19$/);
const gwisUi = readFileSync("src/components/GwisFwiToggle.jsx", "utf8");
const gwisMap = readFileSync("src/components/HotspotMap.jsx", "utf8");
const gwisLib = readFileSync("src/lib/gwisFwi.js", "utf8");
assert.match(gwisLib, /Kelas FWI GWIS\/EFFIS memakai skala Canadian FWI/);
assert.match(gwisLib, /EU Data License/);
assert.match(gwisLib, /© European Union, Copernicus EMS \/ JRC GWIS/);
assert.match(gwisLib, /GetLegendGraphic/);
assert.match(gwisUi, /GWIS_LABEL/);
assert.match(gwisUi, /GWIS_CLASS_NOTE/);
assert.match(gwisUi, /GWIS_UNAVAILABLE/);
assert.match(gwisUi, /GWIS_LEGEND_URL/);
assert.match(gwisUi, /GWIS_CREDIT/);
assert.match(gwisUi, /GWIS_ATTRIBUTION/);
assert.equal(gwisUi.includes("gis.bmkg.go.id"), false);
assert.match(gwisMap, /tileLayer\.wms/);
assert.match(gwisMap, /GWIS_FWI_LAYER/);
assert.match(gwisMap, /TIME|time: fwiDate/);
assert.equal(gwisMap.includes("gis.bmkg.go.id"), false);
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

assert.equal(nameKey("MUKOMUKO"), nameKey("Muko Muko"));
assert.equal(nameKey("MUKO MUKO"), nameKey("MUKOMUKO"));
assert.equal(nameKey("KOTA BANDA ACEH"), nameKey("Kota Banda Aceh"));
assert.equal(kodeWilayah(1101), "11.01");
assert.equal(legendClass("NoData").kind, "nodata");
assert.equal(legendClass("0.711889").kelas, "Tinggi");
assert.equal(legendClass("0").kelas, "Rendah");
const irbiBanjir = parseCsv(readFileSync("data/static/irbi-2025-banjir-aceh-bengkulu.csv", "utf8"));
const irbiMulti = parseCsv(readFileSync("data/static/irbi-2025-multibahaya-aceh-bengkulu.csv", "utf8"));
const dibiBanjir = parseCsv(readFileSync("data/live/dibi-banjir-2024.csv", "utf8"));
assert.equal(irbiBanjir.length, 33);
assert.equal(irbiBanjir.every((row) => Number(row.halaman) >= 212 && Number(row.halaman) <= 227), true);
assert.match(IRBI_BANJIR_TERVERIFIKASI, /510 kabupaten\/kota/);
assert.match(IRBI_BANJIR_TERVERIFIKASI, /halaman 212–227/);
assert.match(IRBI_BANJIR_TERVERIFIKASI, /Pasangkayu/);
assert.equal(IRBI_TIDAK_TERSEDIA, "IRBI tidak tersedia");
const irbiNasional = parseCsv(readFileSync("data/static/irbi-2025-banjir.csv", "utf8"));
assert.equal(irbiNasional.length, 514);
const kelasNasional = {};
for (const row of irbiNasional) kelasNasional[row.kelas || ""] = (kelasNasional[row.kelas || ""] || 0) + 1;
assert.equal(kelasNasional.TINGGI, 282);
assert.equal(kelasNasional.SEDANG, 221);
assert.equal(kelasNasional.RENDAH, 7);
assert.equal(kelasNasional[""], 4);
for (const kode of ["31.01", "51.06", "71.09", "82.71"]) {
  const kosong = irbiNasional.find((row) => row.kode_wilayah === kode);
  assert.equal(kosong.skor, "");
  assert.equal(kosong.kelas, "");
}
for (const lama of irbiBanjir) {
  const baru = irbiNasional.find((row) => row.kode_wilayah === lama.kode_wilayah);
  assert.equal(Number(baru.skor), Number(lama.skor));
  assert.equal(baru.kelas, lama.kelas);
}
assert.equal(irbiNasional.find((row) => row.kode_wilayah === "76.01").padanan.includes("Pasangkayu"), true);
assert.equal(irbiNasional.find((row) => row.kode_wilayah === "12.12").nama_big, "Toba");
assert.equal(irbiNasional.some((row) => row.skor === "0" && !row.kelas), false);
assert.match(IRBI_PENGGUNAAN_INTERNAL, /Penggunaan internal/);
assert.match(IRBI_PENGGUNAAN_INTERNAL, /tidak untuk publikasi/);
assert.match(IRBI_PENGGUNAAN_INTERNAL, /bukan status resmi/);
assert.equal(irbiMulti.length, 33);
assert.equal(dibiBanjir.length, 28);
const floodRows = buildFloodRows({ banjir: irbiBanjir, multi: irbiMulti, dibi: dibiBanjir, dibiLoaded: true });
assert.equal(floodRows.length, 33);
assert.equal(floodRows[0].kode, "11.01");
const muko = floodRows.find((row) => row.kode === "17.06");
assert.equal(muko.nama, "Muko Muko");
assert.equal(muko.banjirSkor, "17.6");
assert.equal(muko.multiKelas, "TINGGI");
assert.equal(muko.dibiTeks, "0");
assert.equal(muko.dibiNama, "MUKO MUKO");
assert.equal(floodRows.find((row) => row.kode === "11.72").dibiTeks, MISSING_DIBI);
assert.equal(floodRows.find((row) => row.kode === "11.06").dibiTeks, "0");
assert.equal(floodRows.find((row) => row.kode === "17.02").dibiTeks, MISSING_DIBI);
assert.equal(floodRows.find((row) => row.kode === "17.09").dibiTeks, MISSING_DIBI);
const floodSource = [
  "src/components/FloodRiskMap.jsx",
  "src/components/FloodPage.jsx",
  "src/components/FloodInfoTable.jsx",
  "src/lib/floodServices.js",
  "src/lib/floodMatrix.js",
].map((file) => readFileSync(file, "utf8")).join("\n");
assert.equal(floodSource.includes("apiv4"), false);
assert.equal(floodSource.toLowerCase().includes("kritis"), false);
assert.match(floodSource, /png32/);
assert.match(floodSource, /bboxSR/);
assert.match(floodSource, /imageSR/);
assert.match(floodSource, /3857/);
assert.match(floodSource, /Prototipe internal – menunggu izin tertulis BNPB/);
assert.match(floodSource, /Di luar area bahaya banjir yang dipetakan inaRISK/);
assert.match(floodSource, /Nilai tidak tersedia \(layanan BNPB tidak merespons\)/);
assert.match(floodSource, /Banjir · Indonesia/);
assert.match(floodSource, /SEMUA_PROVINSI/);
assert.match(floodSource, /IKLIM_BMKG_URL/);
assert.match(readFileSync("src/lib/dasarianManual.js", "utf8"), /iklim\.bmkg\.go\.id/);
assert.match(floodSource, /0–3 jam/);
assert.match(floodSource, /ANALISIS_NAMA/);
assert.equal(ANALISIS_NAMA, "Analisis Pantau Bencana (gabungan BMKG × IRBI BNPB)");
assert.equal(
  RAIN_RISK_MATRIX.note,
  "Sumbu hujan pada tab 0–3 jam adalah nowcast BMKG per kabupaten/kota. Pada tab Hari ini, Besok, dan Lusa sumbu hujan adalah weather_desc BMKG di satu titik sampel: tidak ada status untuk cerah, berawan, udara kabur, asap, dan kabut; hujan ringan atau hujan lokal tidak berstatus kecuali Waspada bila IRBI Tinggi dan hujan ada pada 3 hari berturut-turut; Moderate untuk hujan sedang; Severe untuk hujan lebat atau hujan petir; Extreme untuk hujan sangat lebat atau hujan ekstrem. Kode yang belum dikenali tetap abu-abu. Sumbu risiko adalah kelas banjir IRBI 2025 apa adanya. Analisis Pantau Bencana memetakan kedua sumbu menjadi Awas, Siaga, atau Waspada. Itu analisis dasbor, bukan status resmi, bukan skor angka, bukan peringatan dasarian, dan bukan peringatan resmi 3 hari. Ambang IRBI tinggi dan 3 hari berturut-turut adalah usulan proyek ini.",
);
assert.equal(RAIN_RISK_MATRIX.ready, true);
assert.deepEqual(
  RAIN_RISK_MATRIX.axes.map((axis) => axis.id),
  ["hujan", "risiko"],
);
assert.equal(DASARIAN_NOTE, DASARIAN_MANUAL_LABEL);
assert.equal(DASARIAN_EMPTY, "Belum diisi untuk dasarian ini");
assert.equal(DASARIAN_UNLISTED, "Tidak tercantum di peringatan BMKG dasarian ini");
assert.equal(DASARIAN_EXPIRED, "Kedaluwarsa – perlu diperbarui");
assert.equal(/aman/i.test(DASARIAN_EMPTY + DASARIAN_UNLISTED + DASARIAN_EXPIRED), false);
const dasarianCodes = irbiBanjir.map((row) => kodeWilayah(row.kode_wilayah));
const dasarianText = readFileSync(DASARIAN_FILE, "utf8");
assert.equal(validateDasarian(dasarianText, dasarianCodes).length, 0);
assert.equal(parseCsv(dasarianText).every((row) => !String(row.status ?? "").trim()), true);
assert.equal(parseCsv(dasarianText).length, 33);
const badStatus = validateDasarian(
  `${DASARIAN_HEADER}\n11.01,Aceh Selatan,Aceh,Aman,,,,,,,,`,
  ["11.01"],
);
assert.match(badStatus.join("\n"), /Status tidak dikenal/);
const badDate = validateDasarian(
  `${DASARIAN_HEADER}\n11.01,Aceh Selatan,Aceh,Waspada,Dasarian II,2026-10-11,18-10-2026,kutipan,https://www.bmkg.go.id/iklim/peringatan-dini-hujan-tinggi,2026-10-18,Nama`,
  ["11.01"],
);
assert.match(badDate.join("\n"), /tidak berbentuk YYYY-MM-DD/);
const missingUrl = validateDasarian(
  `${DASARIAN_HEADER}\n11.01,Aceh Selatan,Aceh,Waspada,Dasarian II,2026-10-11,2026-10-20,kutipan,,2026-10-18,Nama`,
  ["11.01"],
);
assert.match(missingUrl.join("\n"), /sumber_url wajib diisi/);
const missingName = validateDasarian(
  `${DASARIAN_HEADER}\n11.01,Aceh Selatan,Aceh,Siaga,,2026-10-11,2026-10-20,kutipan,https://www.bmkg.go.id/iklim/peringatan-dini-hujan-tinggi,2026-10-18,Nama`,
  ["11.01"],
);
assert.match(missingName.join("\n"), /dasarian wajib diisi/);
const missingAccess = validateDasarian(
  `${DASARIAN_HEADER}\n11.01,Aceh Selatan,Aceh,Awas,Dasarian II,2026-10-11,2026-10-20,kutipan,https://www.bmkg.go.id/iklim/peringatan-dini-hujan-tinggi,,Nama`,
  ["11.01"],
);
assert.match(missingAccess.join("\n"), /tanggal_akses wajib diisi/);
const manualRows = [
  {
    kode_wilayah: "11.01",
    status: "Waspada",
    dasarian: "Dasarian II",
    berlaku_sampai: "2026-10-20",
    kutipan: "kutipan",
    sumber_url: "https://www.bmkg.go.id/iklim/peringatan-dini-hujan-tinggi",
    tanggal_akses: "2026-10-18",
  },
  { kode_wilayah: "17.01", status: "", dasarian: "", berlaku_sampai: "", kutipan: "", sumber_url: "", tanggal_akses: "" },
];
const dasarianView = applyDasarian(floodRows, manualRows, { status: "ok", now: new Date("2026-10-18T00:00:00Z") });
assert.equal(dasarianView.find((row) => row.kode === "11.01").dasarianStatus, "Waspada");
assert.equal(dasarianView.find((row) => row.kode === "11.01").dasarianExpired, false);
assert.equal(dasarianView.find((row) => row.kode === "17.01").dasarianKind, "tak-tercantum");
const expiredView = applyDasarian(floodRows, manualRows, { status: "ok", now: new Date("2026-10-21T00:00:00Z") });
assert.equal(expiredView.find((row) => row.kode === "11.01").dasarianExpired, true);
const blankView = applyDasarian(floodRows, [{ kode_wilayah: "11.01", status: "" }], { status: "ok" });
assert.equal(blankView.every((row) => row.dasarianKind === "kosong"), true);
assert.equal(/paths-ignore:/.test(pagesWorkflow), false);
assert.match(pagesWorkflow, /bmkg-pdcht-dasarian\.csv/);
assert.match(pagesWorkflow, /validate-dasarian\.mjs/);
const styleText = readFileSync("src/styles.css", "utf8");
assert.match(styleText, /\.dasarian-cell\.waspada[\s\S]*#f5d76e/);
assert.match(styleText, /\.dasarian-cell\.siaga[\s\S]*#ef8f3a/);
assert.match(styleText, /\.dasarian-cell\.awas[\s\S]*#c5362b/);
assert.equal(styleText.includes(".nowcast-cross") && styleText.slice(styleText.indexOf(".nowcast-cross"), styleText.indexOf(".dasarian-status")).includes("#f5d76e"), false);
assert.equal(MATRIX_PERMISSION, "Prototipe internal – menunggu izin tertulis BNPB/BMKG");
assert.equal(NOWCAST_FAIL, "Tidak tersedia");
assert.equal(clockWib("2026-10-18T13:15:18.000Z"), "20:15");
assert.equal(nowcastAbsent("20:15"), "Tidak ada peringatan aktif pada RSS pukul 20:15 WIB");
assert.equal(/aman/i.test(nowcastAbsent("20:15")), false);
assert.equal(/aman/i.test(nowcastExpiredText("20:15")), false);
assert.equal(warningActive({ expires: "" }, new Date("2026-10-18T13:00:00Z")), false);
assert.equal(warningActive({ expires: "2026-10-18T12:00:00Z" }, new Date("2026-10-18T13:00:00Z")), false);
assert.equal(warningActive({ expires: "2026-10-18T22:00:00+07:00" }, new Date("2026-10-18T13:00:00Z")), true);
const capRings = ringsFromXml("<alert><polygon>2.923,97.515 2.930,97.520 2.910,97.530</polygon></alert>");
assert.deepEqual(capRings[0][0], [97.515, 2.923]);
assert.deepEqual(capRings[0][3], [97.515, 2.923]);
assert.equal(targetRings(capRings).length, 1);
assert.equal(targetRings([[[101, 0], [101.2, 0], [101.2, 0.2], [101, 0]]]).length, 1);
assert.equal(targetRings([[[20, 0], [20.2, 0], [20.2, 0.2], [20, 0]]]).length, 0);
const capRows = rowsFromFeatures(
  {
    id: "CAH20261018004",
    event: "Hujan Lebat dan Petir",
    deskripsi: "khususnya di Bakongan, Kluet",
    onset: "",
    effective: "2026-10-18T18:00:00+07:00",
    expires: "2026-10-18T22:00:00+07:00",
    severity: "Moderate",
    urgency: "Immediate",
    certainty: "Observed",
    url: "https://www.bmkg.go.id/alerts/nowcast/id/CAH20261018004_alert.xml",
    areaDesc: "Kantor penerbit",
  },
  [
    { attributes: { kdpkab: "11.01", wadmkk: "Aceh Selatan", wadmpr: "Aceh" } },
    { attributes: { kdpkab: "14.01", wadmkk: "Lain", wadmpr: "Riau" } },
  ],
);
assert.equal(capRows.length, 2);
assert.equal(capRows[1].provinsi, "Riau");
assert.equal(capRows[0].provinsi, "Aceh");
assert.equal(capRows[0].kabupaten, "Aceh Selatan");
assert.equal(Object.hasOwn(capRows[0], "areaDesc"), false);
assert.equal(capRows[0].deskripsi, "khususnya di Bakongan, Kluet");
const capCsv = capKabCsv(capRows);
assert.match(capCsv, /^kode,kabupaten,provinsi,cap_id,event,deskripsi,onset,effective,expires,severity,urgency,certainty,url/);
assert.equal(capCsv.includes("areaDesc"), false);
assert.equal(parseCsv(capCsv)[0].deskripsi, "khususnya di Bakongan, Kluet");
let capQueries = 0;
const assigned = await assignKabupaten(
  [
    {
      id: "LAMA",
      expires: "2020-01-01T00:00:00Z",
      rings: [[[97.5, 3.5], [97.6, 3.5], [97.6, 3.6], [97.5, 3.5]]],
    },
    {
      id: "JAUH",
      expires: "2099-01-01T00:00:00Z",
      rings: [[[20, 0], [20.2, 0], [20.2, 0.2], [20, 0]]],
    },
    {
      id: "CAH20261018004",
      event: "Hujan Lebat dan Petir",
      deskripsi: "khususnya di Bakongan",
      onset: "",
      effective: "2026-10-18T18:00:00+07:00",
      expires: "2099-01-01T00:00:00Z",
      severity: "Moderate",
      urgency: "Immediate",
      certainty: "Observed",
      url: "https://www.bmkg.go.id/alerts/nowcast/id/CAH20261018004_alert.xml",
      areaDesc: "Aceh",
      rings: capRings,
    },
  ],
  {
    now: new Date("2026-10-18T13:00:00Z"),
    query: async () => {
      capQueries += 1;
      return [{ attributes: { kdpkab: "11.01", wadmkk: "Aceh Selatan", wadmpr: "Aceh" } }];
    },
  },
);
assert.equal(capQueries, 1);
assert.equal(assigned.length, 1);
assert.equal(assigned[0].provinsi, "Aceh");
const nowcastRows = applyNowcast(
  floodRows,
  [{ kode: "11.01", expires: "2099-01-01T00:00:00Z", event: "Hujan Lebat dan Petir", cap_id: "CAH", url: "https://www.bmkg.go.id/a" }],
  { status: "ok", rss_published: "2026-10-18T13:15:18.000Z" },
  new Date("2026-10-18T13:20:00Z"),
);
assert.equal(nowcastRows.find((row) => row.kode === "11.01").nowcastAda, true);
assert.equal(nowcastRows.find((row) => row.kode === "17.06").nowcastAda, false);
assert.equal(nowcastAbsent(nowcastRows[0].nowcastJam), "Tidak ada peringatan aktif pada RSS pukul 20:15 WIB");
const nowcastTab = nowcastCrossTab(nowcastRows);
assert.equal(nowcastTab.ok, true);
const kelasAceh = nowcastRows.find((row) => row.kode === "11.01").banjirKelas;
assert.equal(nowcastTab.cell(kelasAceh, true).some((row) => row.kode === "11.01"), true);
assert.equal(nowcastTab.cell(kelasAceh, false).some((row) => row.kode === "11.01"), false);
const expiredNowcast = applyNowcast(
  floodRows,
  [{ kode: "11.01", expires: "2026-10-18T13:00:00Z" }],
  { status: "ok", rss_published: "2026-10-18T12:00:00Z" },
  new Date("2026-10-18T14:00:00Z"),
);
assert.equal(expiredNowcast.find((row) => row.kode === "11.01").nowcastAda, false);
assert.equal(expiredNowcast.find((row) => row.kode === "11.01").nowcastExpired, true);
const lampauBerwarna = applyAnalisis(expiredNowcast).find((row) => row.kode === "11.01");
assert.equal(lampauBerwarna.analisisLampau, false);
const lampauDenganSeverity = applyAnalisis(
  applyNowcast(
    floodRows,
    [{ kode: "11.01", expires: "2026-10-18T13:00:00Z", severity: "Severe" }],
    { status: "ok", rss_published: "2026-10-18T12:00:00Z" },
    new Date("2026-10-18T14:00:00Z"),
  ),
).find((row) => row.kode === "11.01");
assert.equal(lampauDenganSeverity.nowcastAda, false);
assert.equal(lampauDenganSeverity.analisisStatus, "Awas");
assert.equal(lampauDenganSeverity.analisisLampau, true);
assert.equal(
  catWilayah(lampauDenganSeverity, { tab: "cap", cakupan: "nasional", tertunda: true }).kind,
  "status",
);
assert.equal(catWilayah(lampauDenganSeverity, { tab: "cap", cakupan: "nasional", tertunda: true }).lampau, true);
assert.equal(CAP_DATA_TERAKHIR, "Data terakhir — masa berlaku sudah lewat, menunggu pembaruan BMKG");
const failedTab = nowcastCrossTab(applyNowcast(floodRows, [], { status: "gagal" }));
assert.equal(failedTab.ok, false);
assert.equal(failedTab.cell("TINGGI", false).length, 0);
const infoColumnIds = FLOOD_INFO_COLUMNS.map((column) => column.id);
assert.deepEqual(infoColumnIds, [
  "wilayah",
  "nowcast",
  "berlaku",
  "dibi",
  "irbi-banjir",
  "analisis",
  "penduduk",
  "rumah-tangga",
  "dasarian",
  "tautan",
]);
const pendudukCsv = readFileSync(PENDUDUK_FILE, "utf8");
assert.equal(pendudukCsv.split("\n")[0].trim(), PENDUDUK_HEADER.join(","));
const pendudukBerkas = parseCsv(pendudukCsv);
assert.equal(pendudukBerkas.length, 514);
const pendudukByKode = new Map(pendudukBerkas.map((row) => [row.kode, row]));
assert.equal(pendudukByKode.get("31.72").nama, "Kota Adm. Jakarta Utara");
assert.equal(pendudukByKode.get("31.74").nama, "Kota Adm. Jakarta Selatan");
assert.equal(pendudukByKode.get("31.71").nama, "Kota Adm. Jakarta Pusat");
assert.equal(pendudukByKode.get("31.73").nama, "Kota Adm. Jakarta Barat");
assert.equal(pendudukByKode.get("31.75").nama, "Kota Adm. Jakarta Timur");
assert.equal(pendudukByKode.get("31.01").nama, "Adm. Kep. Seribu");
const hotspotJakarta = readFileSync("data/live/hotspot.csv", "utf8")
  .split("\n")
  .find((line) => line.includes("DKI Jakarta,Kota Adm. Jakarta Utara"));
assert.match(hotspotJakarta, /Cilincing,31\.72\.04,31\.72,31/);
assert.match(readFileSync("scripts/self-check.mjs", "utf8"), /Kota Adm\. Jakarta Selatan/);
assert.match(readFileSync("scripts/self-check.mjs", "utf8"), /31\.74\.02/);
const rumahProv = [...new Set(pendudukBerkas.filter((row) => String(row.rumah_tangga || "").trim()).map((row) => row.kode.slice(0, 2)))].sort();
assert.deepEqual(rumahProv, ["31", "35", "36"]);
assert.equal(teksRumahTangga(bacaPenduduk([pendudukByKode.get("11.13")]).get("11.13")), RUMAH_BELUM);
assert.equal(bacaPenduduk([pendudukByKode.get("31.74")]).get("31.74").rumahTangga, 582718);
assert.equal(catWilayah({ nowcastStatus: "ok", nowcastAda: true, analisisStatus: "Awas" }, { tab: "cap", cakupan: "nasional" }).kind, "status");
assert.equal(catWilayah({ nowcastStatus: "ok", nowcastAda: false, analisisStatus: null }, { tab: "cap", cakupan: "nasional" }).kind, "kosong");
assert.equal(catWilayah({ nowcastStatus: "ok", nowcastAda: true, analisisStatus: "Awas" }, { tab: 0 }).alasan, "prakiraan");
assert.equal(catWilayah({ prakiraanAda: true, banjirKelas: "TINGGI", hariStatus: "Awas" }, { tab: 0 }).status, "Awas");
assert.equal(catWilayah({ prakiraanAda: true, banjirKelas: "", hariStatus: "Awas" }, { tab: 1 }).alasan, "irbi");
assert.equal(catWilayah({ prakiraanAda: true, banjirKelas: "RENDAH", hariStatus: null }, { tab: 2 }).kind, "kosong");
assert.equal(keparahanCuaca("Hujan Sangat Lebat"), "Extreme");
assert.equal(keparahanCuaca("Hujan Ekstrem"), "Extreme");
assert.equal(keparahanCuaca("Hujan Lebat"), "Severe");
assert.equal(keparahanCuaca("Hujan Petir"), "Severe");
assert.equal(keparahanCuaca("Hujan Sedang"), "Moderate");
assert.equal(keparahanCuaca("Hujan Ringan"), "");
assert.equal(keparahanCuaca("Cerah Berawan"), "");
assert.equal(keparahanCuaca("Udara Kabur"), "");
assert.equal(keparahanCuaca("Kabut/Asap"), "");
assert.equal(kelasCuacaSlot({ cuaca: "Cerah", kode_cuaca: "0" }).golongan, "tidak-berpotensi");
assert.equal(kelasCuacaSlot({ cuaca: "Udara Kabur", kode_cuaca: "10" }).golongan, "tidak-berpotensi");
assert.equal(kelasCuacaSlot({ cuaca: "Kabut/Asap" }).golongan, "tidak-berpotensi");
assert.equal(kelasCuacaSlot({ cuaca: "Berawan Tebal", kode_cuaca: "4" }).golongan, "tidak-berpotensi");
assert.equal(kelasCuacaSlot({ cuaca: "Hujan Ringan", kode_cuaca: "61" }).golongan, "ringan");
assert.equal(kelasCuacaSlot({ cuaca: "Hujan Ringan", kode_cuaca: "61" }).severity, "");
assert.equal(kelasCuacaSlot({ cuaca: "Hujan Sedang", kode_cuaca: "63" }).severity, "Moderate");
assert.equal(kelasCuacaSlot({ cuaca: "Hujan Lebat", kode_cuaca: "63" }).severity, "Severe");
assert.equal(kelasCuacaSlot({ cuaca: "Hujan Petir", kode_cuaca: "95" }).severity, "Severe");
assert.equal(kelasCuacaSlot({ cuaca: "Hujan Ringan", kode_cuaca: "95" }).severity, "Severe");
assert.equal(kelasCuacaSlot({ cuaca: "Petir", kode_cuaca: "97" }).severity, "Severe");
assert.equal(kelasCuacaSlot({ cuaca: "Hujan Sangat Lebat" }).severity, "Extreme");
assert.equal(kelasCuacaSlot({ kode_cuaca: "0" }).golongan, "tidak-berpotensi");
assert.equal(kelasCuacaSlot({ kode_cuaca: "60" }).golongan, "ringan");
assert.equal(kelasCuacaSlot({ kode_cuaca: "80" }).golongan, "ringan");
assert.equal(kelasCuacaSlot({ kode_cuaca: "61" }).golongan, "tak-dikenal");
assert.equal(kelasCuacaSlot({ cuaca: "Hujan Angin", kode_cuaca: "77" }).golongan, "tak-dikenal");
assert.equal(LABEL_TIDAK_BERPOTENSI, "Tidak ada status (cuaca tidak berpotensi banjir)");
assert.equal(LABEL_TAK_DIKENAL, "Tidak terklasifikasi (kode cuaca BMKG belum dikenali)");
assert.equal(/\bnormal\b/i.test(`${LABEL_TIDAK_BERPOTENSI} ${LABEL_TANPA_STATUS} ${LABEL_TAK_DIKENAL} ${CUACA_DISCLAIMER}`), false);
assert.match(CUACA_DISCLAIMER, /bukan ketentuan resmi/);
assert.equal(CUACA_RUJUKAN.some((item) => item[1] === "https://signature.bmkg.go.id/site/prakiraan-cuaca-berbasis-dampak/"), true);
assert.equal(CUACA_RUJUKAN.some((item) => item[1].includes("wmo_1150_en.pdf")), true);
const hariCuaca = ["2026-10-20", "2026-10-21", "2026-10-22"];
const indeksCuacaUji = new Map([
  [
    "11.01",
    {
      perHari: new Map([
        ["2026-10-20", [{ cuaca: "Hujan Ringan", kode_cuaca: "61" }]],
        ["2026-10-21", [{ cuaca: "Hujan Sedang", kode_cuaca: "63" }]],
        ["2026-10-22", [{ cuaca: "Hujan Lokal" }]],
      ]),
    },
  ],
]);
const dasarCuaca = [{ kode: "11.01", nama: "Aceh Selatan", banjirKelas: "TINGGI" }];
const ringanWaspada = terapkanHari(dasarCuaca, indeksCuacaUji, "2026-10-20", hariCuaca)[0];
assert.equal(ringanWaspada.hariStatus, "Waspada");
assert.equal(terapkanHari([{ ...dasarCuaca[0], banjirKelas: "SEDANG" }], indeksCuacaUji, "2026-10-20", hariCuaca)[0].hariStatus, null);
assert.equal(terapkanHari(dasarCuaca, indeksCuacaUji, "2026-10-20", ["2026-10-20", "2026-10-21"])[0].hariStatus, null);
assert.equal(terapkanHari(dasarCuaca, indeksCuacaUji, "2026-10-21", hariCuaca)[0].hariStatus, "Siaga");
assert.equal(hariPunyaHujan([{ cuaca: "Cerah" }]), false);
assert.equal(hariPunyaHujan([{ cuaca: "Hujan Ringan" }]), true);
const takDikenal = terapkanHari(
  [{ kode: "11.01", nama: "Aceh Selatan", banjirKelas: "TINGGI" }],
  new Map([["11.01", { perHari: new Map([["2026-10-20", [{ cuaca: "Hujan Angin", kode_cuaca: "77" }]]]) }]]),
  "2026-10-20",
  hariCuaca,
)[0];
assert.equal(takDikenal.cuacaLabel, LABEL_TAK_DIKENAL);
assert.equal(takDikenal.cuacaMentah[0], "77 Hujan Angin");
const catTak = catWilayah(takDikenal, { tab: 0 });
assert.equal(catTak.kind, "tak-dikenal");
assert.equal(catTak.fill, "#c5c1b8");
assert.equal(catTak.kosongLabel, LABEL_TAK_DIKENAL);
const catCerah = catWilayah(
  terapkanHari(
    [{ kode: "11.01", nama: "Aceh Selatan", banjirKelas: "" }],
    new Map([["11.01", { perHari: new Map([["2026-10-20", [{ cuaca: "Cerah", kode_cuaca: "1" }]]]) }]]),
    "2026-10-20",
    hariCuaca,
  )[0],
  { tab: 0 },
);
assert.equal(catCerah.kind, "kosong");
assert.equal(catCerah.kosongLabel, LABEL_TIDAK_BERPOTENSI);
const urutCuaca = urutStatusKab([
  { kode: "11.02", nama: "Aceh Tenggara", peta: catTak },
  { kode: "11.01", nama: "Aceh Selatan", peta: catCerah },
  { kode: "11.03", nama: "Aceh Timur", peta: { kind: "status", status: "Waspada" } },
]);
assert.deepEqual(urutCuaca.map((row) => row.kode), ["11.03", "11.01", "11.02"]);
assert.equal(peringkatTampil({ peta: catTak }), 4);
assert.equal(readFileSync("src/components/FloodRiskMap.jsx", "utf8").includes("Cuaca di luar matriks"), false);
assert.match(readFileSync("src/components/FloodRiskMap.jsx", "utf8"), /Penjelasan lapisan peringatan/);
assert.match(readFileSync("src/components/FloodRiskMap.jsx", "utf8"), /#\/sumber-metode\/petunjuk-banjir/);
const daftarSumber = readFileSync("src/components/FloodInfoTable.jsx", "utf8");
assert.match(daftarSumber, /<th scope="col">No<\/th>[\s\S]*<th scope="col">Kab\/Kota<\/th>[\s\S]*<th scope="col">Provinsi<\/th>[\s\S]*<th scope="col">Status<\/th>[\s\S]*<th scope="col">Historis<\/th>[\s\S]*<th scope="col">IRBI<\/th>/);
assert.match(daftarSumber, /tampilProvinsi \? <th scope="col">Provinsi<\/th>/);
assert.equal(daftarSumber.includes("<th scope=\"col\">Riwayat</th>"), false);
assert.match(daftarSumber, /DIBI_UNAVAILABLE/);
assert.match(daftarSumber, /Provinsi:/);
assert.match(daftarSumber, /barisDampakHistoris/);
const dampakHistoris = barisDampakHistoris();
assert.deepEqual(dampakHistoris.slice(0, 2), ["Penduduk terdampak: belum tersedia", "Rumah terdampak: belum tersedia"]);
assert.equal(dampakHistoris[2], DAMPAK_HISTORIS_CATATAN);
assert.match(DAMPAK_HISTORIS_CATATAN, /Historis, bukan prakiraan/);
assert.equal(dampakHistoris.join(" ").includes("217009"), false);
assert.equal(daftarSumber.includes('<th scope="col">Penduduk terdampak</th>'), false);
assert.equal(daftarSumber.includes('<th scope="col">Rumah terdampak</th>'), false);
assert.match(readFileSync("src/components/FloodRiskMap.jsx", "utf8"), /barisDampakHistoris/);
assert.match(readFileSync("src/components/MetodePage.jsx", "utf8"), /DAMPAK_HISTORIS_CATATAN/);
const halamanBanjir = readFileSync("src/components/FloodPage.jsx", "utf8");
assert.equal(halamanBanjir.includes("Tampilkan semua kab/kota"), false);
assert.match(halamanBanjir, /rows=\{urut\}/);
assert.match(halamanBanjir, /formatWib\(cap\.meta\.fetched_at\)/);
assert.match(readFileSync("src/lib/format.js", "utf8"), /timeZone: "Asia\/Jakarta"/);
assert.match(readFileSync("src/lib/format.js", "utf8"), /\$\{formatted\} WIB/);
const petaSumber = readFileSync("src/components/FloodRiskMap.jsx", "utf8");
assert.match(petaSumber, /Pembaruan terakhir: \{waktuLabel\}\./);
assert.equal(petaSumber.includes("Pembaruan terakhir: {waktuLabel} WIB"), false);
assert.match(readFileSync("src/components/GwisFwiToggle.jsx", "utf8"), /Penjelasan lapisan Data Pembanding/);
const hujanGabung = gabungHujan(
  [{ kode_kab: "11.01", tanggal: "2026-10-20", curah_hujan_mm: 3 }],
  [{ kode_kab: "11.02", tanggal: "2026-10-20", curah_hujan_mm: 4 }],
  ["11.01"],
);
assert.equal(hujanGabung.kept, 1);
assert.deepEqual(hujanGabung.rows.map((row) => row.kode_kab).sort(), ["11.01", "11.02"]);
const warnaAnalisis = new Set(Object.values(ANALISIS_WARNA));
for (const kelas of HUJAN_KELAS) assert.equal(warnaAnalisis.has(kelas.warna), false);
assert.equal(warnaHujan(0).startsWith("#"), true);
assert.equal(warnaHujan(null), "");
assert.equal(HUJAN_PEMBANDING_BADGE, "Pembanding (data terbuka, bukan resmi)");
assert.equal(HUJAN_GAP_MS >= 1000, true);
assert.match(readFileSync("src/components/FloodRiskMap.jsx", "utf8"), /Curah hujan model/);
assert.match(readFileSync("src/components/FloodRiskMap.jsx", "utf8"), /HUJAN_PEMBANDING_BADGE/);
assert.equal(HUJAN_PEMBANDING_JENIS, "prakiraan model, bukan BMKG");
assert.equal(readFileSync("src/lib/analisisPantauBencana.js", "utf8").includes("hujanPembanding"), false);
assert.match(readFileSync("src/components/MetodePage.jsx", "utf8"), /HUJAN_PEMBANDING_JENIS/);
assert.match(readFileSync("src/components/MetodePage.jsx", "utf8"), /HUJAN_GPM_CATATAN/);
assert.match(HUJAN_GPM_CATATAN, /tidak dipakai/i);
assert.match(readFileSync("scripts/hujan-pembanding.mjs", "utf8"), /kept_previous/);
assert.match(readFileSync("scripts/hujan-pembanding.mjs", "utf8"), /ecmwf_ifs/);
assert.equal(readFileSync("scripts/hujan-pembanding.mjs", "utf8").includes("jsimpson"), false);
assert.match(readFileSync(".github/workflows/refresh-data.yml", "utf8"), /hujan-pembanding\.mjs/);
const petunjuk = readFileSync("src/components/MetodePage.jsx", "utf8");
assert.match(petunjuk, /CUACA_RUJUKAN/);
assert.match(petunjuk, /CUACA_DISCLAIMER/);
assert.equal(CUACA_RUJUKAN.map((item) => item[1]).includes("https://gaw-bariri.bmkg.go.id/monitoring-hujan-harian/"), true);
assert.equal(CUACA_RUJUKAN.map((item) => item[1]).includes("https://link.springer.com/article/10.1007/s11069-026-08365-6"), true);
assert.equal(keparahanTerburuk(["Cerah", "Hujan Sedang", "Hujan Lebat"]), "Severe");
const sampelAdm4 = parseCsv(readFileSync("data/static/prakiraan-sampel-adm4.csv", "utf8"));
assert.equal(sampelAdm4.length, 514);
assert.equal(new Set(sampelAdm4.map((row) => row.kode_kab)).size, 514);
assert.equal(sampelAdm4.some((row) => row.adm4 === "14.71.01.1001"), false);
for (const adm4 of ["14.71.05.1001", "15.71.01.1001", "16.71.01.1001", "61.71.05.1001", "62.71.01.1001", "63.71.01.1001"]) {
  const row = sampelAdm4.find((item) => item.adm4 === adm4);
  assert.equal(row.cara, "terverifikasi");
  assert.equal(row.status, "ok");
  assert.ok(row.desa_api);
}
assert.deepEqual(
  sampelAdm4.filter((row) => row.status !== "ok").map((row) => row.kode_kab).sort(),
  ["96.02", "96.03", "96.04", "96.05"],
);
const prakiraanKab = readFileSync("data/live/bmkg-prakiraan-kab.csv", "utf8");
assert.match(prakiraanKab.split("\n")[0], /^kode_kab,tanggal,/);
assert.equal(prakiraanKab.includes("14.71.01.1001"), false);
assert.match(readFileSync("src/components/MetodePage.jsx", "utf8"), /Satu titik per kabupaten\/kota/);
assert.match(readFileSync("src/components/FloodInfoTable.jsx", "utf8"), /IRBI_TIDAK_TERSEDIA/);
assert.equal(readFileSync("src/components/FloodInfoTable.jsx", "utf8").includes("item.desa"), false);
assert.match(readFileSync(".github/workflows/refresh-cap.yml", "utf8"), /prakiraan-kab\.mjs/);
assert.match(readFileSync(".github/workflows/refresh-cap.yml", "utf8"), /12,42 \* \* \* \*/);
const luarCuplikan = buildFloodRows({
  banjir: [{ kode_wilayah: "32.01", provinsi: "Jawa Barat", nama_big: "Bogor", skor: "1", kelas: "RENDAH", halaman: "226" }],
  multi: [],
  dibi: dibiBanjir,
  dibiLoaded: true,
});
assert.equal(luarCuplikan[0].dibiTeks, DIBI_LUAR_CUPLIKAN);
const dibiKosong = buildFloodRows({
  banjir: [{ kode_wilayah: "32.01", provinsi: "Jawa Barat", nama_big: "Bogor", skor: "1", kelas: "RENDAH", halaman: "226" }],
  multi: [],
  dibi: [],
  dibiLoaded: true,
});
assert.equal(dibiKosong[0].dibiTeks, DIBI_UNAVAILABLE);
assert.match(readFileSync("src/components/MetodePage.jsx", "utf8"), /Petunjuk perhitungan banjir/);
assert.match(readFileSync("src/components/MetodePage.jsx", "utf8"), /IRBI_PENGGUNAAN_INTERNAL/);
assert.match(readFileSync("src/components/MetodePage.jsx", "utf8"), /IRBI_BANJIR_TERVERIFIKASI/);
assert.match(floodSource, /IRBI_PENGGUNAAN_INTERNAL/);
assert.match(floodSource, /petunjuk-banjir/);
assert.match(floodSource, /Hari ini/);
assert.match(floodSource, /Besok/);
assert.match(floodSource, /Lusa/);
assert.equal(RUMAH_BELUM, "belum tersedia");
assert.match(readFileSync("src/components/FloodInfoTable.jsx", "utf8"), /RUMAH_BELUM|teksRumahTangga/);
assert.equal(angkaUtuh(""), null);
assert.equal(angkaUtuh("1.234"), null);
assert.equal(angkaUtuh("100"), 100);
const pendudukKosong = bacaPenduduk([
  { kode: "11.13", nama: "Gayo Lues", penduduk: "", rumah_tangga: "", tahun_penduduk: "", sumber_rt: "" },
]);
assert.equal(pendudukKosong.get("11.13").penduduk, null);
assert.equal(pendudukKosong.get("11.13").rumahTangga, null);
const tanpaAngka = ringkasPendudukBerstatus([{ kode: "11.13", analisisStatus: "Awas" }], pendudukKosong);
assert.equal(tanpaAngka.lengkap, false);
assert.equal(tanpaAngka.penduduk, null);
assert.match(kalimatJumlahPenduduk(tanpaAngka), /belum dapat dijumlahkan/);
assert.equal(kalimatJumlahPenduduk(tanpaAngka).includes(PENDUDUK_BUKAN_TERPAPAR), true);
const pendudukIsi = bacaPenduduk([
  {
    kode: "11.13",
    nama: "Gayo Lues",
    penduduk: "100",
    tahun_penduduk: "2025",
    sumber_penduduk: "BPS",
    rumah_tangga: "25",
    tahun_rt: "2020",
    sumber_rt: "BPS SP2020",
  },
]);
assert.equal(
  ringkasPendudukBerstatus(
    [
      { kode: "11.13", analisisStatus: "Awas" },
      { kode: "11.01", analisisStatus: null },
    ],
    pendudukIsi,
  ).penduduk,
  100,
);
assert.equal(ringkasPendudukBerstatus([{ kode: "11.13", analisisStatus: null }], pendudukIsi).adaStatus, false);
assert.equal(labelPenduduk(pendudukIsi.get("11.13")), "Potensi penduduk terdampak (BPS, proyeksi 2025)");
assert.equal(labelRumahTangga(pendudukIsi.get("11.13")), "Potensi rumah terdampak (BPS SP2020, 2020)");
assert.equal(labelPenduduk(null), "Potensi penduduk terdampak (BPS, proyeksi tahun belum diisi)");
assert.match(PENDUDUK_ABSENT, /bukan estimasi jumlah terpapar/);
assert.equal(xlsxBytes([["No", "Kab/Kota"], ["1", "Aceh Selatan"]])[0], 0x50);
assert.equal(xlsxBytes([["No"]])[1], 0x4b);
assert.equal(BPS_PROYEKSI_URL, "https://sensus.bps.go.id/publikasi/index/sp2020");
assert.match(floodSource, /PENDUDUK_FILE/);
assert.match(floodSource, /Dalam pengembangan/);
assert.equal(readFileSync("src/components/FloodRiskMap.jsx", "utf8").includes("dasQueryUrl"), false);
for (const pendudukFile of ["src/lib/pendudukKab.js", "data/static/penduduk-kabkota.csv", "data/static/README.md"]) {
  const pendudukText = readFileSync(pendudukFile, "utf8").toLowerCase();
  assert.equal(pendudukText.includes("worldpop"), false, pendudukFile);
  assert.equal(pendudukText.includes("ghsl"), false, pendudukFile);
}
assert.equal(infoColumnIds.includes("hujan"), false);
const capScript = readFileSync("scripts/cap-kab.mjs", "utf8");
assert.match(capScript, /esriSpatialRelIntersects/);
assert.match(capScript, /esriGeometryPolygon/);
assert.match(capScript, /returnGeometry: "false"/);
assert.equal(capScript.includes("gis.bmkg.go.id"), false);
assert.equal(capScript.toLowerCase().includes("open-meteo"), false);
assert.match(readFileSync("scripts/refresh-live-data.mjs", "utf8"), /writeCapKabFiles/);
assert.match(capScript, /bmkg-cap-kab\.csv/);
assert.match(capScript, /bmkg-cap-prov\.csv/);
assert.match(capScript, /previousCapUsable/);
assert.match(capScript, /kept_previous/);
assert.equal(capCsvUsable("kode,kabupaten\n11.01,Aceh Selatan\n"), true);
assert.equal(capCsvUsable("kode,kabupaten\n"), false);
assert.equal(capScript.includes('if (meta?.status !== "ok") return false'), false);
const capSimpan = mkdtempSync(join(tmpdir(), "cap-keep-"));
writeFileSync(join(capSimpan, "bmkg-cap-kab.csv"), "kode,kabupaten\n11.01,Aceh Selatan\n");
writeFileSync(
  join(capSimpan, "bmkg-cap-kab-meta.json"),
  `${JSON.stringify({ status: "gagal", fetched_at: "2026-10-20T01:17:04.008Z", error: "Failed to execute query." })}\n`,
);
assert.equal(previousCapUsable(capSimpan), true);
const capSimpanHasil = writeCapKabFiles(capSimpan, {
  status: "gagal",
  rows: [],
  error: "Failed to execute query.",
  fetchedAt: "2026-10-20T06:37:17.308Z",
});
assert.equal(capSimpanHasil.kept_previous, true);
assert.equal(JSON.parse(readFileSync(join(capSimpan, "bmkg-cap-kab-meta.json"), "utf8")).fetched_at, "2026-10-20T01:17:04.008Z");
assert.equal(readFileSync(join(capSimpan, "bmkg-cap-kab.csv"), "utf8").includes("11.01"), true);
rmSync(capSimpan, { recursive: true, force: true });
const squareKab = {
  type: "Feature",
  properties: { kode: "11.01", nama: "Aceh Selatan", provinsi: "Aceh" },
  geometry: { type: "Polygon", coordinates: [[[97, 2], [98, 2], [98, 4], [97, 4], [97, 2]]] },
};
const insideRing = [[97.2, 2.2], [97.4, 2.2], [97.4, 2.5], [97.2, 2.2]];
const crossingRing = [[96.5, 3], [98.5, 3], [98.5, 3.2], [96.5, 3.2], [96.5, 3]];
const storedAlert = {
  id: "CAP-SIMPAN",
  event: "Hujan Lebat",
  deskripsi: "uji",
  onset: "",
  effective: "2026-10-18T18:00:00+07:00",
  expires: "2099-01-01T00:00:00Z",
  severity: "Moderate",
  urgency: "Immediate",
  certainty: "Observed",
  url: "https://www.bmkg.go.id/alerts/nowcast/id/CAP-SIMPAN_alert.xml",
  rings: [insideRing],
};
assert.equal(rowsFromStoredBoundaries(storedAlert, [insideRing], [squareKab]).length, 1);
assert.equal(rowsFromStoredBoundaries(storedAlert, [insideRing], [squareKab])[0].kode, "11.01");
assert.equal(rowsFromStoredBoundaries(storedAlert, [[[120, 10], [120.2, 10], [120.2, 10.2], [120, 10]]], [squareKab]).length, 0);
assert.equal(ringsIntersect(crossingRing, squareKab.geometry.coordinates[0]), true);
const fallbackRows = await assignKabupaten([storedAlert], {
  now: new Date("2026-10-18T13:00:00Z"),
  storedFeatures: [squareKab],
  query: async () => {
    throw new Error("Failed to execute query.");
  },
});
assert.equal(fallbackRows.length, 1);
assert.equal(fallbackRows.penempatan, "batas-tersimpan");
assert.equal(fallbackRows.bigError, "Failed to execute query.");
assert.match(capKabMeta({ status: "ok", rows: fallbackRows, penempatan: "batas-tersimpan" }), /batas tersimpan/);
await assert.rejects(
  () =>
    assignKabupaten([storedAlert], {
      now: new Date("2026-10-18T13:00:00Z"),
      storedFeatures: [],
      query: async () => {
        throw new Error("Failed to execute query.");
      },
    }),
  /Failed to execute query/,
);
let reliableCalls = 0;
const reliable = await queryReliable(
  [
    [[0, 0], [1, 0], [1, 1], [0, 0]],
    [[2, 0], [3, 0], [3, 1], [2, 0]],
  ],
  {
    wait: async () => {},
    query: async (rings) => {
      reliableCalls += 1;
      if (rings.length > 1 || rings[0][0][0] === 0) throw new Error("Failed to execute query.");
      return [{ attributes: { kdpkab: "11.01", wadmkk: "Aceh Selatan", wadmpr: "Aceh" } }];
    },
  },
);
assert.equal(reliable.length, 1);
assert.equal(reliableCalls >= 3, true);
const capWorkflow = readFileSync(".github/workflows/refresh-cap.yml", "utf8");
assert.match(capWorkflow, /git reset --hard[\s\S]*npm ci/);
assert.match(capWorkflow, /npm ci\n\s*npm run check && npm run build/);
assert.match(capScript, /batas-tersimpan/);
assert.match(capScript, /QUERY_BACKOFF_MS/);
const halamanBanjirLetak = readFileSync("src/components/FloodPage.jsx", "utf8");
const judulBanjir = halamanBanjirLetak.indexOf("<h1>Banjir");
const petaBanjir = halamanBanjirLetak.indexOf("<FloodRiskMap");
const sebelumPeta = halamanBanjirLetak.slice(judulBanjir, petaBanjir);
assert.equal(sebelumPeta.includes("FLOOD_PERMISSION"), false);
assert.equal(sebelumPeta.includes("Penggunaan internal"), false);
assert.match(halamanBanjirLetak, /<h1>Banjir[\s\S]*<FloodRiskMap/);
assert.match(halamanBanjirLetak, /className="card flood-disclaimer"[\s\S]*FLOOD_PERMISSION[\s\S]*Penggunaan internal/);
assert.equal(halamanBanjirLetak.includes("tidak dapat diambil pada pembaruan terakhir"), false);
assert.match(readFileSync(".github/workflows/refresh-cap.yml", "utf8"), /banjir-ringkasan\.mjs/);
assert.match(readFileSync(".github/workflows/refresh-data.yml", "utf8"), /banjir-ringkasan\.mjs/);
const batasTopo = JSON.parse(readFileSync("data/static/batas-kabkota.topojson", "utf8"));
assert.equal(batasTopo.objects.kabupaten.geometries.length, 514);
assert.equal(BMKG_REQUEST_GAP_MS >= 1000, true);
assert.equal(analisisStatus("Extreme", "Tinggi"), "Awas");
assert.equal(analisisStatus("Extreme", "Sedang"), "Awas");
assert.equal(analisisStatus("Extreme", "Rendah"), "Siaga");
assert.equal(analisisStatus("Severe", "Tinggi"), "Awas");
assert.equal(analisisStatus("Severe", "Sedang"), "Siaga");
assert.equal(analisisStatus("Severe", "Rendah"), "Waspada");
assert.equal(analisisStatus("Moderate", "Tinggi"), "Siaga");
assert.equal(analisisStatus("Moderate", "Sedang"), "Waspada");
assert.equal(analisisStatus("Moderate", "Rendah"), "Waspada");
assert.equal(analisisStatus("Minor", "Tinggi"), null);
assert.equal(analisisStatus("", "Tinggi"), null);
assert.equal(ANALISIS_MATRIKS.length, 9);
assert.equal(severityLabel("Severe"), "Parah (Severe)");
assert.equal(periodeTigaHari(new Date("2026-10-20T03:00:00.000Z")).label, "Periode: 20–22 Oktober 2026 (WIB)");
assert.equal(periodeTigaHari(new Date("2026-10-20T17:30:00.000Z")).label, "Periode: 21–23 Oktober 2026 (WIB)");
assert.equal(jenisHujan("Hujan Petir").petir, true);
assert.equal(jenisHujan("Hujan Lebat").lebat, true);
assert.equal(jenisHujan("Hujan Ringan").lebat, false);
assert.equal(labelSlotHujan({ ada: true, lebat: false, petir: false }), "Tidak ada hujan lebat atau petir pada slot ini");
assert.equal(PROVINSI.length, 38);
assert.equal(SEMUA_PROVINSI, "Semua provinsi");
assert.equal(BNPB_ABSENT.includes("data/bnpb/"), true);
assert.equal(BNPB_RESOURCE_URL.includes("a4daec53-1119-43ef-b05e-00ec3a4c42a4"), true);
const provinsiCap = aggregateProvinsi(capRows, [{ id: "CAH20261018004", headline: "Hujan di selatan" }]);
assert.equal(provinsiCap.length, 2);
assert.equal(provinsiCap[0].kode_prov, "11");
assert.equal(provinsiCap[0].headline, "Hujan di selatan");
assert.equal(provinsiCap[0].jumlah_kab, 1);
const capMeta = JSON.parse(capKabMeta({ status: "ok", rows: capRows, provRows: provinsiCap, jumlahAlert: 4, fetchedAt: "2026-10-20T01:00:00.000Z", rssPublished: "" }));
assert.equal(capMeta.cakupan, "nasional");
assert.equal(capMeta.jumlah_alert, 4);
assert.equal(capMeta.jumlah_prov, 2);
assert.match(floodSource, /DASARIAN_NOTE/);
assert.match(floodSource, /Cara membaca/);
assert.match(floodSource, /Sumber: BMKG|BMKG_ATTRIBUTION/);
assert.equal(floodSource.includes("gis.bmkg.go.id"), false);
const hazardText = readFileSync("src/lib/hazards.js", "utf8");
assert.match(hazardText, /kolom BANJIR/);
assert.equal(hazardText.includes("tidak memisahkan banjir per kabupaten"), false);
assert.equal(hazardText.toLowerCase().includes("das kritis"), false);
assert.match(readFileSync("scripts/refresh-live-data.mjs", "utf8"), /a4daec53-1119-43ef-b05e-00ec3a4c42a4/);
assert.match(readFileSync("src/App.jsx", "utf8"), /lazy\(/);
assert.equal(readFileSync("data/live/dibi-banjir-2024.csv", "utf8").includes("Latitude"), false);

assert.equal(latestDailyStamp('<a>FWI.GEOS-5.Daily.Default.20261013.nc</a><a>FWI.GEOS-5.Daily.Default.20261014.nc</a>'), "20261014");
const gfwedRows = aggregateCells([
  { kode: "32.01", kabupaten: "Bogor", provinsi: "Jawa Barat", fwi: 10 },
  { kode: "11.71", kabupaten: "Kota Banda Aceh", provinsi: "Aceh", fwi: 4 },
  { kode: "11.71", kabupaten: "Kota Banda Aceh", provinsi: "Aceh", fwi: 8 },
]);
assert.deepEqual(gfwedRows.map((row) => row.kode), ["11.71", "32.01"]);
assert.equal(gfwedRows[0].fwi_rata, 6);
assert.equal(gfwedRows[0].fwi_maks, 8);
assert.equal(gfwedRows[0].n_sel, 2);
assert.match(gfwedCsv(gfwedRows, "2026-10-14", "sumber"), /^kode,kabupaten,provinsi,fwi_rata,fwi_maks,n_sel,tanggal,sumber/);
assert.equal(GFWED_LABEL, "Pembanding model NASA GFWED (GEOS-5, analisis), bukan BMKG");
assert.equal(GFWED_UNAVAILABLE, "Tidak tersedia");
const gfwedUi = readFileSync("src/components/GfwedTable.jsx", "utf8");
assert.match(gfwedUi, /tertunda/);
assert.match(gfwedUi, /GFWED_UNAVAILABLE/);
assert.match(gfwedUi, /localeCompare\(b\.kode/);
assert.equal(gfwedUi.includes("#b42318"), false);
assert.match(readFileSync("scripts/refresh-live-data.mjs", "utf8"), /fetchGfwedKabupaten/);
assert.match(readFileSync(".github/workflows/refresh-data.yml", "utf8"), /netCDF4/);
assert.match(readFileSync("scripts/gfwed_clip.py", "utf8"), /GEOS-5_FWI/);
assert.equal(readFileSync("scripts/gfwed-kabupaten.mjs", "utf8").includes("returnGeometry: \"true\""), true);
assert.equal(readFileSync("scripts/gfwed_clip.py", "utf8").includes("geojson"), false);

const contohAplus = parseCsv(readFileSync("data/fixtures/contoh-hitung-aplus-2026-10-19.csv", "utf8")).map((row) => ({
  ...row,
  n_titik: Number(row.n_titik),
  I1: Number(row.I1),
  I2: Number(row.I2),
  I3: row.I3 === "" ? null : Number(row.I3),
  I4: Number(row.I4),
  ffmc78_hari: Number(row.ffmc78_hari),
  dc_maks: Number(row.dc_maks),
  gwis_hari: Number(row.gwis_hari),
  fwi_titik_maks: Number(row.fwi_titik_maks),
}));
const dinilai = nilaiKab(contohAplus);
assert.equal(dinilai.length, 81);
assert.equal(dinilai.filter((row) => row.lolos).length, 44);
const gagalKeringSaja = dinilai.filter((row) => row.data_ok && !row.G_kering && row.G_cuaca);
const gagalKeduanya = dinilai.filter((row) => row.data_ok && !row.G_kering && !row.G_cuaca);
const gagalCuacaSaja = dinilai.filter((row) => row.data_ok && row.G_kering && !row.G_cuaca);
assert.equal(gagalKeringSaja.length, 13);
assert.equal(gagalKeduanya.length, 23);
assert.equal(gagalCuacaSaja.length, 1);
for (const row of dinilai) {
  const sumber = contohAplus.find((item) => item.kode === row.kode);
  assert.equal(row.lolos, sumber.lolos === "True", row.kab);
  assert.equal(row.data_ok, sumber.data_ok === "True", row.kab);
  if (row.skor_tampil != null) assert.ok(Math.abs(row.skor_tampil - Number(sumber.skor)) <= 0.002, `${row.kab} ${row.skor_tampil} ${sumber.skor}`);
}
const urutan = dinilai.filter((row) => row.lolos).sort((a, b) => a.peringkat_daftar - b.peringkat_daftar);
assert.deepEqual(urutan.slice(0, 15).map((row) => row.kab), [
  "Ogan Komering Ilir",
  "Tanah Laut",
  "Kotabaru",
  "Barito Kuala",
  "Tapin",
  "Banjar",
  "Pulang Pisau",
  "Tanah Bumbu",
  "Barito Selatan",
  "Tabalong",
  "Kapuas",
  "Sukamara",
  "Katingan",
  "Banyuasin",
  "Hulu Sungai Selatan",
]);
const palembang = dinilai.find((row) => row.kab === "Kota Palembang");
assert.equal(palembang.n_titik, 1);
assert.equal(palembang.satu_titik, true);
assert.equal(palembang.lolos, true);
assert.equal(palembang.I4, 0);
assert.equal(palembang.peringkat_daftar, 19);
assert.equal(palembang.peringkat_daftar <= 15, false);
const seruyan = dinilai.find((row) => row.kab === "Seruyan");
assert.equal(seruyan.lolos, true);
assert.equal(seruyan.peringkat_daftar, 22);
assert.equal(seruyan.I4, 2635);
assert.equal(seruyan.hs_hari, "4");
const musi = dinilai.find((row) => row.kab === "Musi Banyuasin");
assert.equal(musi.lolos, false);
assert.equal(musi.G_kering, false);
const nasionalUji = [
  { kode: "93.01", kab: "Merauke", prov: "Papua Selatan", jumlah: 2979, hari: 4, berurutan: 4 },
  { kode: seruyan.kode, kab: "Seruyan", prov: "Kalimantan Tengah", jumlah: 2635, hari: 4, berurutan: 4 },
  { kode: musi.kode, kab: "Musi Banyuasin", prov: "Sumatera Selatan", jumlah: 458, hari: 4, berurutan: 4 },
  { kode: dinilai.find((row) => row.kab === "Ogan Komering Ilir").kode, kab: "Ogan Komering Ilir", prov: "Sumatera Selatan", jumlah: 1369, hari: 4, berurutan: 4 },
  { kode: "35.13", kab: "Probolinggo", prov: "Jawa Timur", jumlah: 40, hari: 2, berurutan: 2 },
];
const blok = blokHotspot(nasionalUji, dinilai, 231);
assert.deepEqual(blok.map((row) => row.kab), ["Merauke", "Seruyan", "Ogan Komering Ilir", "Musi Banyuasin"]);
assert.equal(blok.find((row) => row.kab === "Seruyan").status, "di luar 15 besar (peringkat skor 22)");
assert.equal(blok.find((row) => row.kab === "Merauke").status, "di luar cakupan pemeringkatan");
assert.equal(blok.find((row) => row.kab === "Musi Banyuasin").status, "tidak lolos syarat: kering/cuaca");
assert.equal(blok.find((row) => row.kab === "Ogan Komering Ilir").status, "peringkat 1");
assert.equal(blok.some((row) => row.kab === "Probolinggo"), false);
assert.equal(statusDaftar({ cakupan: false }), "di luar cakupan pemeringkatan");
const nasionalPadat = [
  ...nasionalUji,
  ...Array.from({ length: 100 }, (_, index) => ({ kode: `00.${index}`, kab: `Lain ${index}`, prov: "Lain", jumlah: 1, hari: 1, berurutan: 1 })),
];
const hitungUlang = susunPrioritas({
  kab: contohAplus,
  nasional: nasionalPadat,
  ensembleFetchedAt: "2026-10-19T03:00:00.000Z",
  gwisFetchedAt: "2026-10-19T03:30:00.000Z",
  gwisHari: 9,
  firmsObservedAt: "2026-10-19T02:00:00.000Z",
});
assert.equal(hitungUlang.daftar[0].kab, "Ogan Komering Ilir");
assert.equal(hitungUlang.daftar.some((row) => row.kab === "Kota Palembang"), false);
assert.equal(hitungUlang.blok.some((row) => row.kab === "Seruyan"), true);
assert.equal(hitungUlang.daftar.find((row) => row.kab === "Ogan Komering Ilir").dalam_blok, true);
const segar = tampilanPrioritas(hitungUlang, new Date("2026-10-19T10:00:00.000Z"));
assert.equal(segar.tersedia, true);
assert.equal(segar.blok.length > 0, true);
const basi = tampilanPrioritas(hitungUlang, new Date("2026-10-21T10:00:00.000Z"));
assert.equal(basi.tersedia, false);
assert.match(basi.alasan.join(" "), /36 jam/);
assert.match(basi.alasan.join(" "), /48 jam/);
const firmsLama = tampilanPrioritas(hitungUlang, new Date("2026-10-20T03:30:00.000Z"));
assert.equal(firmsLama.tersedia, true);
assert.equal(firmsLama.blok.length, 0);
assert.match(firmsLama.blok_alasan, /24 jam/);
const kurang = { ...hitungUlang, kab_lengkap: 29 };
assert.match(alasanKesegaran(kurang, new Date("2026-10-19T10:00:00.000Z")).join(" "), /kurang dari 30/);
const kosong = tampilanPrioritas({ ...hitungUlang, daftar: [], lolos: 0, blok: [], firms_observed_at: hitungUlang.firms_observed_at, kab_lengkap: 40, gwis_hari: 9 }, new Date("2026-10-19T10:00:00.000Z"));
assert.equal(kosong.tersedia, true);
assert.equal(kosong.daftar.length, 0);
assert.equal(p75([1, 2, 3, 4]), 3.25);
assert.equal(kuantilIndeks([10, 20, 30, 40], 0.95), 30);
assert.equal(ambangHotspot([1, 2, 3]), 50);
const sampel = farthestPointSample(
  [
    { lintang: 0, bujur: 0 },
    { lintang: 0, bujur: 1 },
    { lintang: 1, bujur: 0 },
    { lintang: 1, bujur: 1 },
    { lintang: 0.5, bujur: 0.5 },
  ],
  3,
);
assert.equal(sampel.length, 3);
assert.equal(sampel[0].lintang, 0.5);
const agregat = agregasiHotspot([
  { kode_kabupaten: "62.07", kabupaten: "Seruyan", provinsi: "Kalimantan Tengah", kepercayaan: "n", tanggal: "2026-10-15" },
  { kode_kabupaten: "62.07", kabupaten: "Seruyan", provinsi: "Kalimantan Tengah", kepercayaan: "h", tanggal: "2026-10-16" },
  { kode_kabupaten: "62.07", kabupaten: "Seruyan", provinsi: "Kalimantan Tengah", kepercayaan: "l", tanggal: "2026-10-16" },
  { kode_kabupaten: "16.71", kabupaten: "Kota Palembang", provinsi: "Sumatera Selatan", kepercayaan: "n", tanggal: "2026-10-15" },
]);
assert.equal(agregat.find((row) => row.kode === "62.07").jumlah, 2);
assert.equal(agregat.find((row) => row.kode === "62.07").berurutan, 2);
assert.equal(agregat.find((row) => row.kab === "Kota Palembang").berurutan, 1);
const aplusScript = readFileSync("scripts/build-prioritas-aplus.mjs", "utf8");
const aplusWorkflow = readFileSync(".github/workflows/prioritas-aplus.yml", "utf8");
assert.match(aplusWorkflow, /32 12 \* \* \*/);
assert.equal(aplusWorkflow.includes("FIRMS_MAP_KEY"), false);
assert.equal(aplusWorkflow.includes("secrets."), false);
assert.match(aplusScript, /returnGeometry: "true"/);
assert.equal(aplusScript.includes("data/boundaries"), false);
assert.equal(aplusScript.includes(".geojson"), false);
assert.match(readFileSync("src/lib/aplus.js", "utf8"), /Prioritas kesiapsiagaan 14 hari \(FWI hanya 9 hari\)/);
assert.match(readFileSync("src/lib/aplus.js", "utf8"), /bukan prakiraan resmi BMKG\/BNPB/);
assert.match(readFileSync("src/lib/aplus.js", "utf8"), /ambang literatur FDRS ASEAN diterapkan pada nilai model, bukan kelas BMKG/);
assert.match(readFileSync("src/lib/aplus.js", "utf8"), /hanya 1 titik sampel/);
assert.match(readFileSync("src/components/PrioritasPanel.jsx", "utf8"), /Aktivitas hotspot tinggi saat ini/);
assert.match(readFileSync("src/components/PrioritasPanel.jsx", "utf8"), /CATATAN_SATU_TITIK/);
assert.match(readFileSync("src/components/PrioritasPanel.jsx", "utf8"), /Cara hitung & rujukan/);
assert.match(readFileSync("src/components/PrioritasPanel.jsx", "utf8"), /Metode perhitungan dan rujukan →/);
assert.match(readFileSync("src/components/PrioritasPanel.jsx", "utf8"), /href="#\/sumber-metode\/cara-hitung"/);
assert.match(readFileSync("src/components/PrioritasPanel.jsx", "utf8"), /href="#\/sumber-metode\/rujukan"/);
assert.match(readFileSync("src/components/PrioritasPanel.jsx", "utf8"), /href="#\/sumber-metode\/glosarium"/);
assert.match(readFileSync("src/components/PrioritasPanel.jsx", "utf8"), /<Term id="fwi">FWI P75/);
assert.match(readFileSync("src/components/PrioritasPanel.jsx", "utf8"), /<Term id="ffmc">Hari FFMC/);
assert.match(readFileSync("src/components/PrioritasPanel.jsx", "utf8"), /<Term id="dc">DC maks/);
assert.match(readFileSync("src/components/PrioritasPanel.jsx", "utf8"), /<Term id="irbi">IRBI 2025/);
assert.match(readFileSync("src/components/SiteHeader.jsx", "utf8"), /#\/sumber-metode\/glosarium/);
assert.match(readFileSync("src/components/Footer.jsx", "utf8"), /#\/sumber-metode\/glosarium/);
assert.match(readFileSync("src/components/MetodePage.jsx", "utf8"), /<GlossaryPage embedded/);
assert.match(readFileSync("src/lib/route.js", "utf8"), /#\/sumber-metode\/glosarium\/\$\{id\}/);
assert.match(readFileSync("src/components/PrioritasPanel.jsx", "utf8"), />Rujukan</);
assert.match(readFileSync("src/components/PrioritasPanel.jsx", "utf8"), /bukan resmi BMKG\/BNPB/);
assert.match(readFileSync("src/App.jsx", "utf8"), /location\.anchor/);
assert.match(readFileSync("src/components/MetodeAplus.jsx", "utf8"), /Peringkat prioritas karhutla – cara menghitung/);
assert.match(readFileSync("src/components/MetodeAplus.jsx", "utf8"), /78–82/);
assert.match(readFileSync("src/components/MetodeAplus.jsx", "utf8"), /260–350/);
assert.match(readFileSync("src/components/MetodeAplus.jsx", "utf8"), /73% hotspot/);
assert.match(readFileSync("src/components/MetodeAplus.jsx", "utf8"), /bukan kelas BMKG/);
assert.match(readFileSync("src/components/MetodeAplus.jsx", "utf8"), /Apakah ini data resmi/);
assert.match(readFileSync("src/components/MetodeAplus.jsx", "utf8"), /Kenapa ISPU hanya tautan/);
assert.match(readFileSync("src/components/MetodeAplus.jsx", "utf8"), /Kenapa status dasarian diisi manual/);
const rujukanHref = [...readFileSync("src/components/MetodeAplus.jsx", "utf8").matchAll(/https?:\/\/[^"'\s]+/g)].map((item) => item[0]);
const rujukanBoleh = new Set([
  "https://doi.org/10.1007/s11027-006-9043-8",
  "http://www.columbia.edu/~rf2426/index_files/deGrootetal2006MITI.pdf",
  "https://doi.org/10.1016/j.atmosenv.2004.01.011",
  "https://doi.org/10.1007/s00267-003-0241-9",
  "https://asmc.asean.org/asmc-fire/",
  "https://asmc.asean.org/asmc-fire-dc/",
  "https://asmc.asean.org/asmc-fire-ffmc/",
  "https://asmc.asean.org/asmc-fire-fwi/",
  "https://asmc.asean.org/asmc-alerts/",
  "https://doi.org/10.1038/ngeo443",
  "https://doi.org/10.1038/nclimate3280",
  "https://doi.org/10.1071/WF24057",
  "https://gwis.jrc.ec.europa.eu/about-gwis/technical-background/fire-danger-forecast",
  "https://data.effis.emergency.copernicus.eu/effis/reports-and-publications/effis-related-publications/Camia_and_Amatulli_2010__ICFFR-2010_B04.pdf",
  "https://doi.org/10.1175/JAMC-D-15-0297.1",
  "https://doi.org/10.1038/s41597-020-0554-z",
  "http://urlib.net/sid.inpe.br/mtc-m21c/2019/11.21.11.03",
  "https://dataserver-coids.inpe.br/queimadas/queimadas/Publicacoes-Impacto/documentos/RiscoFogo_Sucinto_v11_2019.pdf",
  "https://open-meteo.com/en/licence",
]);
assert.equal(rujukanHref.length > 0, true);
for (const href of rujukanHref) assert.equal(rujukanBoleh.has(href), true, href);
assert.match(readFileSync("src/components/SummaryPage.jsx", "utf8"), /<PrioritasPanel /);
assert.match(readFileSync("scripts/refresh-live-data.mjs", "utf8"), /prioritas_aplus/);

console.log("Pemeriksaan prototipe lulus.");
