import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deriveDashboard, defaultRange } from "../src/lib/derive.js";
import { areaContains, assignProvince, BANJIR_FRAME, BANJIR_PAN_LIMIT, BATAS_KUNCI_PETA, INDONESIA_FRAME, INDONESIA_PAN_LIMIT } from "../src/lib/geo.js";
import { looksLikeCsv, parseCsv } from "../src/lib/csv.js";
import { fetchCsv, loadAll, normalizeHotspotRow, normalizeRecords, redactFirmsUrl } from "../src/lib/loadData.js";
import { GLOSSARY } from "../src/lib/glossary.js";
import { HAZARDS } from "../src/lib/hazards.js";
import { ispuFromPm25 } from "../src/lib/ispuEstimate.js";
import { hitungStatusBanjir, puncakBanjir, titikHariTerbaru } from "../src/lib/laporanHarian.js";
import { letakInfoTip } from "../src/lib/infoTipLetak.js";
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
import { kodeSipongi } from "../src/lib/sipongiHotspot.js";
import {
  REKAP_BELUM,
  REKAP_KOSONG,
  barisRekap,
  catatanParameter,
  gabungRekap,
  kelasFwiGwis,
  lembarRekap,
  nilaiParameter,
  susunCuplikan,
  tandaiHujan,
  teksHujan,
} from "../src/lib/rekapHarian.js";
import { lembarIrbiGabung, saringIrbi, susunIrbiGabung, urutIrbi } from "../src/lib/irbiGabung.js";
import { IRBI_ANCAMAN, IRBI_BELUM_BERKAS, barisUnduh, csvIrbiNasional, lembarIrbiNasional, susunIrbiNasional, teksSkorIrbi } from "../src/lib/irbiNasional.js";
import { WAKTU_CUPLIKAN_81_TEKS, csvKarhutla81, lembarKarhutla81, namaBerkasKarhutla81, susunKarhutla81 } from "../src/lib/karhutla81.js";
import { clusterCellDegrees, countHotspots, filterHotspotWindow } from "../src/lib/hotspotWindow.js";
import { parseFirmsCoordinate } from "./indonesia-land.mjs";
import { muatTitikBatas, pointInGeometry } from "./titik-dalam-batas.mjs";
import { arcGisContains, summarizeByDesa, summarizeByWilayah, unverifiedWilayahCount, DESA_UNIDENTIFIED } from "../src/lib/bigWilayah.js";
import { assessFreshness, hotspotSourceLabel, labelStatusFeed } from "../src/lib/freshness.js";
import { annotatePoints } from "./big-wilayah.mjs";
import { buildComparisonAttention, normalizePlaceName, placeFwiTable, PROTOTYPE_LABEL } from "../src/lib/attentionPrototype.js";
import { karhutlaRankingPlan } from "../src/lib/ranking.js";
import { keadaanKategori, statusRingkasan, statusRingkasanSiap } from "../src/lib/ringkasanStatus.js";
import { dekatDaratan } from "../src/lib/dekatDaratan.js";
import { analisisDampakIndonesia, bacaIkhtisar, bacaSiaranPers, bacaStatusHtml, gabungSiaran, gagalSiklonBerturut, potensiDekatIndonesia, siklonPerluTanda, siklonUsang, susunCuplikan as susunCuplikanSiklon, SIKLON_JEJAK } from "../src/lib/siklonBmkg.js";
import { bandingHitungan, bandingPeringkat, barisPeriodeAktif, chipProvinsi, JUMLAH_CHIP_PROVINSI, kelasPeringkat, namaChipProvinsi, sepuluhPrioritas, susunPeringkatHotspot } from "../src/lib/peringkatHotspot.js";
import { cariWilayahBatas, PROVINSI_TIDAK_DIKETAHUI, tampilBarisFwi, urutBarisFwi } from "../src/lib/kabProvinsi.js";
import { kelasKepercayaan } from "../src/lib/warning.js";
import {
  agregasiHotspot,
  alasanKesegaran,
  ambangHotspot,
  blokHotspot,
  farthestPointSample,
  kuantilIndeks,
  nilaiKab,
  p75,
  percentRanks,
  statusDaftar,
  susunPrioritas,
  tampilanPrioritas,
} from "../src/lib/aplus.js";
import { CAP_CRON, CAP_WATCH_MINUTES, PRAKIRAAN_CRON, PRAKIRAAN_SLOT_GRACE_MS, REFRESH_CRON, REFRESH_CRON_CADANGAN, nextScheduledRun, slotPrakiraanTerakhir } from "../src/lib/schedule.js";
import { ringkasHujanModel, susunPotensiTujuh } from "../src/lib/potensiTujuh.js";
import {
  JARAK_ULANG_ANALISIS_MS,
  ULANG_ANALISIS_MAKS,
  analisisLebihBaru,
  analisisLebihLama,
  labelAnalisisBmkg,
  perluUlangAnalisis,
  tanggalKalenderWib,
} from "../src/lib/bmkgForecast.js";
import { ANALISIS_MATRIKS, ANALISIS_NAMA, ANALISIS_WARNA, WARNA_TANPA_PERINGATAN, analisisStatus, applyAnalisis, catWilayah, keparahanCuaca, keparahanTerburuk } from "../src/lib/analisisPantauBencana.js";
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
import { BNPB_ABSENT, BNPB_RESOURCE_URL, DAMPAK_HISTORIS_CATATAN, HISTORIS_BANJIR_CATATAN, HISTORIS_CUPLIKAN_DIAMBIL, HISTORIS_DISCLAIMER, barisDampakHistoris } from "../src/lib/bnpbBanjir.js";
import { formatWib } from "../src/lib/format.js";
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
  HUJAN_PEMBANDING_MODEL,
  HUJAN_TANPA_NOWCAST,
  gabungHujan,
  warnaHujan,
} from "../src/lib/hujanPembanding.js";
import { PROVINSI, SEMUA_PROVINSI } from "../src/lib/provinsi.js";
import { CAP_DATA_TERAKHIR, cakupanTersimpan, severityLabel } from "../src/lib/capKab.js";
import { xlsxBytes } from "../src/lib/xlsxMini.js";
import { buildHotspotTree } from "../src/lib/hotspotTree.js";
import { DIBI_LUAR_CUPLIKAN, DIBI_UNAVAILABLE, FLOOD_INFO_COLUMNS, IRBI_BANJIR_TERVERIFIKASI, IRBI_LONGSOR_TERVERIFIKASI, IRBI_PENGGUNAAN_INTERNAL, IRBI_TIDAK_TERSEDIA, RAIN_RISK_MATRIX, buildFloodRows, kodeWilayah, legendClass, nameKey, MISSING_DIBI, peringkatTampil, urutStatusKab } from "../src/lib/floodMatrix.js";
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
  lengkapiCakupanMeta,
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
import { capRunMissed, manifestNeedsRefresh, prakiraanSlotMissed } from "./refresh-watchdog.mjs";
import { gabungManifest, sisiLebihBaru } from "./snapshot-rebase.mjs";
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
assert.equal(BANJIR_FRAME, BATAS_KUNCI_PETA);
assert.equal(areaContains(BATAS_KUNCI_PETA, firmsArea), true);
assert.equal(areaContains(INDONESIA_FRAME, BATAS_KUNCI_PETA), true);
assert.equal(areaContains(BANJIR_PAN_LIMIT, BANJIR_FRAME), true);
const petaBanjirSumber = readFileSync("src/components/FloodRiskMap.jsx", "utf8");
assert.match(petaBanjirSumber, /BANJIR_FRAME/);
assert.match(petaBanjirSumber, /kunciTampilanIndonesia\(map, \{ muatUlang: true, padding: BANJIR_PADDING, bounds: frame \}/);
assert.match(petaBanjirSumber, /fitBounds\(bounds, \{ padding: PADDING_PROVINSI/);
assert.match(petaBanjirSumber, /properties\?\.provinsi \|\| feature\?\.properties\?\.wadmpr/);
assert.match(petaBanjirSumber, /ResizeObserver/);
assert.match(petaBanjirSumber, /maxBoundsViscosity:\s*1/);
assert.equal(petaBanjirSumber.includes("BANJIR_PAN_LIMIT"), false);
assert.equal(petaBanjirSumber.includes("setView([-2.2, 118]"), false);
const kunciSumber = readFileSync("src/lib/kunciPeta.js", "utf8");
assert.match(kunciSumber, /BATAS_KUNCI_PETA/);
assert.match(kunciSumber, /fitBounds\(kotak, \{ padding, animate: false \}/);
assert.match(kunciSumber, /setMinZoom/);
assert.match(kunciSumber, /setMaxBounds\(jejakNasional\(map, kotak, lantai\)\)/);
assert.match(kunciSumber, /maxBoundsViscosity = 1/);
for (const file of [
  "src/components/HotspotMap.jsx",
  "src/components/PetaKab.jsx",
  "src/components/FloodRiskMap.jsx",
  "src/components/StationMap.jsx",
]) {
  const source = readFileSync(file, "utf8");
  assert.match(source, /kunciTampilanIndonesia/, file);
  assert.match(source, /maxBoundsViscosity:\s*1/, file);
  assert.match(source, /ResizeObserver/, file);
  assert.equal(source.includes("setView([-2.2, 118]"), false, file);
}
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
assert.equal(parseRoute("#/karhutla/potensi"), "potensi");
assert.equal(parseLocation("#/sumber-metode/potensi-7-hari").anchor, "potensi-7-hari");

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
assert.equal(mapSource.includes("kunciTampilanIndonesia"), true);
assert.equal(mapSource.includes("fitBounds"), true);
const logicSource = readFileSync("src/components/LogicPage.jsx", "utf8");
assert.equal(logicSource.includes("Kembali ke ringkasan"), true);
assert.equal(logicSource.includes("Sumber Data → Validasi"), true);
assert.equal(logicSource.includes("mapKey"), false);
assert.equal(logicSource.includes("rencana pengembangan"), true);
assert.match(readFileSync("src/components/SiteHeader.jsx", "utf8"), /Logika Pemantauan/);
assert.match(readFileSync("src/components/SiteHeader.jsx", "utf8"), /\["info", "Info", "#\/sumber-metode"\]/);
assert.match(readFileSync("src/components/Footer.jsx", "utf8"), /Glosarium/);
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
assert.equal(PRAKIRAAN_SLOT_GRACE_MS, 4 * 60 * 1000);
assert.equal(PRAKIRAAN_SLOT_GRACE_MS < 7 * 60 * 1000, true);
assert.equal(slotPrakiraanTerakhir(new Date("2026-10-26T00:07:00.000Z")), Date.parse("2026-10-26T00:00:00.000Z"));
assert.equal(slotPrakiraanTerakhir(new Date("2026-10-26T02:07:00.000Z")), Date.parse("2026-10-26T02:00:00.000Z"));
assert.equal(slotPrakiraanTerakhir(new Date("2026-10-26T11:07:00.000Z")), Date.parse("2026-10-26T02:00:00.000Z"));
assert.equal(slotPrakiraanTerakhir(new Date("2026-10-25T23:30:00.000Z")), Date.parse("2026-10-25T14:00:00.000Z"));
assert.equal(prakiraanSlotMissed([], new Date("2026-10-26T00:07:00.000Z")), true);
assert.equal(prakiraanSlotMissed([], new Date("2026-10-26T00:03:00.000Z")), false);
assert.equal(
  prakiraanSlotMissed(
    [{ status: "completed", conclusion: "success", createdAt: "2026-10-26T00:10:00.000Z" }],
    new Date("2026-10-26T00:20:00.000Z"),
  ),
  false,
);
assert.equal(
  prakiraanSlotMissed(
    [{ status: "completed", conclusion: "success", createdAt: "2026-10-26T00:10:00.000Z" }],
    new Date("2026-10-26T02:07:00.000Z"),
  ),
  true,
);
assert.equal(
  prakiraanSlotMissed(
    [{ status: "completed", conclusion: "failure", createdAt: "2026-10-26T00:10:00.000Z" }],
    new Date("2026-10-26T00:20:00.000Z"),
  ),
  true,
);
assert.equal(
  prakiraanSlotMissed(
    [{ status: "in_progress", conclusion: "", createdAt: "2026-10-25T16:00:00.000Z" }],
    new Date("2026-10-26T00:07:00.000Z"),
  ),
  false,
);
assert.equal(sisiLebihBaru(2, 1), "kita");
assert.equal(sisiLebihBaru(1, 2), "hulu");
assert.equal(sisiLebihBaru(2, 2), "hulu");
const manifestHulu = {
  generated_at: "2026-10-26T01:00:00.000Z",
  firms_key: "used",
  datasets: {
    hotspot: { fetched_at: "2026-10-26T00:30:00.000Z", record_count: 1 },
    bmkg_cap: { fetched_at: "2026-10-26T01:00:00.000Z", record_count: 9 },
  },
};
const manifestKita = {
  generated_at: "2026-10-26T00:40:00.000Z",
  firms_key: "absent",
  datasets: {
    hotspot: { fetched_at: "2026-10-26T00:40:00.000Z", record_count: 2 },
    bmkg_cap: { fetched_at: "2026-10-26T00:20:00.000Z", record_count: 4 },
    bmkg_prakiraan: { fetched_at: "2026-10-25T16:00:00.000Z", record_count: 3 },
  },
};
const manifestGabung = gabungManifest(manifestHulu, manifestKita);
assert.equal(manifestGabung.generated_at, "2026-10-26T01:00:00.000Z");
assert.equal(manifestGabung.firms_key, "used");
assert.equal(manifestGabung.datasets.hotspot.record_count, 2);
assert.equal(manifestGabung.datasets.bmkg_cap.record_count, 9);
assert.equal(manifestGabung.datasets.bmkg_prakiraan.record_count, 3);
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
assert.match(workflow, /group: refresh-data/);
assert.match(workflow, /cancel-in-progress: true/);
assert.match(workflow, /timeout-minutes:\s*90/);
assert.match(workflow, /timeout-minutes:\s*50/);
assert.equal(workflow.includes("group: pages"), false);
assert.match(workflow, /deploy-pages/);
assert.equal(workflow.includes("push --force"), false);
assert.equal(workflow.includes("git push -f"), false);
assert.match(workflow, /wilayah_gagal/);
assert.match(workflow, /big_queries/);
assert.match(workflow, /FIRMS_MAP_KEY/);
assert.match(workflow, /git reset --hard[\s\S]*npm ci/);
assert.match(workflow, /snapshot-rebase\.mjs[\s\S]*refresh-live-data\.mjs/);
assert.match(workflow, /npm ci\n\s*npm run check && npm run build/);
assert.equal(workflow.includes("eyJ"), false);
const watchdog = readFileSync(".github/workflows/refresh-watchdog.yml", "utf8");
assert.match(watchdog, /7 \* \* \* \*/);
assert.match(watchdog, /actions: write/);
assert.match(watchdog, /gh workflow run refresh-data\.yml --ref main/);
assert.match(watchdog, /gh workflow run refresh-cap\.yml --ref main/);
assert.match(watchdog, /gh workflow run refresh-prakiraan\.yml --ref main/);
assert.match(watchdog, /PRAKIRAAN_RUNS_JSON/);
assert.match(watchdog, /CAP_RUNS_JSON/);
assert.match(watchdog, /cancel-in-progress: false/);
assert.match(watchdog, /group: refresh-watchdog/);
assert.equal(watchdog.includes("group: pages"), false);
const refreshSource = readFileSync("scripts/refresh-live-data.mjs", "utf8");
assert.match(refreshSource, /bigQueries: annotated\.stats\.queries/);
assert.match(refreshSource, /hotspotEntry\.big_queries = result\.bigQueries/);
assert.match(refreshSource, /wilayah_gagal=\$\{countText/);
assert.match(refreshSource, /big_queries=\$\{countText/);
assert.match(refreshSource, /sumber \$\{label\}: mulai/);
assert.match(refreshSource, /batasWaktu/);
assert.match(refreshSource, /deadlineAt/);
assert.match(refreshSource, /\/tmp\/refresh-hotspot-counts\.txt/);
assert.equal(karhutlaRankingPlan().dapatDisusun, false);
assert.match(karhutlaRankingPlan().status, /belum cukup data – cuplikan prioritas belum ada/);
const jamRingkas = new Date("2026-10-20T09:00:00.000Z");
const kategoriRingkas = statusRingkasan({
  datasets: {
    hotspot: { status: "ok", record_count: 12, fetched_at: "2026-10-20T08:40:00.000Z", observed_at: "2026-10-20T08:00:00.000Z", expected_max_age_hours: 18 },
    bmkg_prakiraan: { status: "failed", error: "HTTP 500", record_count: 0, kept_previous: false },
    ispu: { status: "failed", mode: "tautan", error: "Tautan resmi. Data belum diintegrasikan.", record_count: 0 },
    bmkg_cap: { status: "ok", record_count: 2, fetched_at: "2026-10-20T08:50:00.000Z", observed_at: "2026-10-20T08:50:00.000Z" },
  },
}, { now: jamRingkas, capBerakhir: ["2026-10-20T08:00:00.000Z"] });
const statusKategori = Object.fromEntries(kategoriRingkas.map((row) => [row.nama, row.status]));
assert.equal(statusKategori["Titik panas"], "tersedia");
assert.equal(statusKategori["Prakiraan cuaca"], "gagal dimuat");
assert.equal(statusKategori["ISPU stasiun"], "belum terintegrasi");
assert.equal(statusKategori["Peringatan dini cuaca"], "kedaluwarsa");
assert.equal(statusKategori["Gunung api"], "belum terintegrasi");
assert.equal(statusKategori["Titik panas"] === statusKategori["Prakiraan cuaca"], false);
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
assert.match(pagesWorkflow, /picu-penjaga/);
assert.match(pagesWorkflow, /gh workflow run refresh-watchdog\.yml --repo "\$GITHUB_REPOSITORY" --ref main/);
assert.match(pagesWorkflow, /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);
const windowed = filterHotspotWindow([
  { tanggal: "2026-10-17", waktu: "1200", satelit: "N", kelasKepercayaan: "nominal", provinsi: "Riau" },
  { tanggal: "2026-10-16", waktu: "1200", satelit: "N", kelasKepercayaan: "tinggi", provinsi: "Aceh" },
  { tanggal: "2026-10-17", waktu: "1800", satelit: "N20", kelasKepercayaan: "rendah", provinsi: "Riau" },
], { hours: 24, provinces: ["Riau"] });
assert.equal(windowed.rows.length, 2);
assert.equal(countHotspots(windowed.rows).sensor.N, 1);
assert.equal(countHotspots(windowed.rows).sensor.N20, 1);
assert.equal(kelasKepercayaan(""), "tidak_diketahui");
assert.equal(kelasKepercayaan("???"), "tidak_diketahui");
assert.equal(kelasKepercayaan("n"), "nominal");
assert.equal(kelasKepercayaan("h"), "tinggi");
assert.equal(kelasKepercayaan("l"), "rendah");
assert.equal(kelasPeringkat({ kelasKepercayaan: "tidak_diketahui" }), "tidak_diketahui");
assert.equal(labelStatusFeed({ id: "irbi", asal: "snapshot", status: "berhasil" }, { sumber: "VIIRS_SNPP_NRT" }), "Terhubung");
assert.equal(labelStatusFeed({ id: "ispu_pembanding", asal: "snapshot", status: "berhasil" }, { sumber: "VIIRS_SNPP_NRT" }), "Terhubung");
assert.equal(labelStatusFeed({ id: "bmkg_prakiraan", asal: "snapshot", status: "usang" }, { sumber: "VIIRS_SNPP_NRT" }), "Cuplikan terakhir");
assert.equal(labelStatusFeed({ id: "hotspot", asal: "snapshot", status: "berhasil" }, { sumber: "VIIRS_SNPP_NRT" }), "VIIRS S-NPP NRT (snapshot ±3 jam)");
assert.equal(labelStatusFeed({ id: "sipongi", status: "tautan" }).includes("VIIRS"), false);
assert.equal(statusRingkasanSiap(null, { memuat: true }).keadaan, "memuat");
assert.equal(statusRingkasanSiap(null, { memuat: true }).baris.length, 0);
assert.equal(statusRingkasanSiap(null, { memuat: false }).keadaan, "gagal");
assert.equal(keadaanKategori([{ status: "tersedia" }, { status: "gagal dimuat" }, { status: "belum terintegrasi" }]), "sebagian");
const titikPapua = [
  { provinsi: "Papua Selatan", kabupaten: "Merauke", tanggal: "2026-10-17", waktu: "0100", kelasKepercayaan: "tinggi", lintang: -8.5, bujur: 140.4 },
  { provinsi: "Papua Selatan", kabupaten: "Merauke", tanggal: "2026-10-17", waktu: "0200", kelasKepercayaan: "tinggi", lintang: -8.4, bujur: 140.5 },
  { provinsi: "Papua Selatan", kabupaten: "Boven Digoel", tanggal: "2026-10-17", waktu: "0300", kelasKepercayaan: "tinggi", lintang: -6.1, bujur: 140.3 },
  { provinsi: "Riau", kabupaten: "Pelalawan", tanggal: "2026-10-17", waktu: "0400", kelasKepercayaan: "nominal", lintang: 0.2, bujur: 102.1 },
  { provinsi: "Riau", kabupaten: "Pelalawan", tanggal: "2026-10-17", waktu: "0500", kelasKepercayaan: "nominal", lintang: 0.3, bujur: 102.2 },
  { provinsi: "Riau", kabupaten: "Pelalawan", tanggal: "2026-10-17", waktu: "0600", kelasKepercayaan: "nominal", lintang: 0.4, bujur: 102.3 },
  { provinsi: "Riau", kabupaten: "Pelalawan", tanggal: "2026-10-17", waktu: "0700", kelasKepercayaan: "nominal", lintang: 0.5, bujur: 102.4 },
  { provinsi: "Riau", kabupaten: "Siak", tanggal: "2026-10-17", waktu: "0800", kelasKepercayaan: "rendah", lintang: 0.8, bujur: 102.0 },
  { provinsi: "Riau", kabupaten: "Siak", tanggal: "2026-10-17", waktu: "0900", kelasKepercayaan: "rendah", lintang: 0.9, bujur: 102.1 },
  { provinsi: "Riau", kabupaten: "Siak", tanggal: "2026-10-17", waktu: "1000", kelasKepercayaan: "rendah", lintang: 1.0, bujur: 102.2 },
  { provinsi: "Riau", kabupaten: "Siak", tanggal: "2026-10-17", waktu: "1100", kelasKepercayaan: "rendah", lintang: 1.1, bujur: 102.3 },
  { provinsi: "Riau", kabupaten: "Siak", tanggal: "2026-10-17", waktu: "1200", kelasKepercayaan: "rendah", lintang: 1.2, bujur: 102.4 },
  { provinsi: "Riau", kabupaten: "Siak", tanggal: "2026-10-01", waktu: "1200", kelasKepercayaan: "tinggi", lintang: 1.3, bujur: 102.5 },
  { provinsi: "Aceh", kabupaten: "Aceh Timur", tanggal: "2026-10-17", waktu: "1300", kelasKepercayaan: "tinggi", lintang: 4.6, bujur: 97.8 },
  { provinsi: "Bali", kabupaten: "Jembrana", tanggal: "2026-10-17", waktu: "1400", kelasKepercayaan: "tinggi", lintang: -8.3, bujur: 114.6 },
  { provinsi: "Bali", kabupaten: "Jembrana", tanggal: "2026-10-17", waktu: "1410", kelasKepercayaan: "nominal", lintang: -8.3, bujur: 114.7 },
  { provinsi: "Jambi", kabupaten: "Tebo", tanggal: "2026-10-17", waktu: "1500", kelasKepercayaan: "tinggi", lintang: -1.5, bujur: 102.4 },
  { provinsi: "Jambi", kabupaten: "Tebo", tanggal: "2026-10-17", waktu: "1510", kelasKepercayaan: "nominal", lintang: -1.4, bujur: 102.5 },
  { provinsi: "Jambi", kabupaten: "Tebo", tanggal: "2026-10-17", waktu: "1520", kelasKepercayaan: "nominal", lintang: -1.3, bujur: 102.6 },
  { provinsi: "Jambi", kabupaten: "Tebo", tanggal: "2026-10-17", waktu: "1530", kelasKepercayaan: "rendah", lintang: -1.2, bujur: 102.7 },
  { provinsi: "Kalimantan Barat", kabupaten: "Ketapang", tanggal: "2026-10-17", waktu: "1600", kelasKepercayaan: "tinggi", lintang: -1.8, bujur: 110.2 },
  { provinsi: "Kalimantan Barat", kabupaten: "Ketapang", tanggal: "2026-10-17", waktu: "1610", kelasKepercayaan: "nominal", lintang: -1.7, bujur: 110.3 },
  { provinsi: "Kalimantan Barat", kabupaten: "Ketapang", tanggal: "2026-10-17", waktu: "1620", kelasKepercayaan: "rendah", lintang: -1.6, bujur: 110.4 },
  { provinsi: "Kalimantan Barat", kabupaten: "Ketapang", tanggal: "2026-10-17", waktu: "1630", kelasKepercayaan: "rendah", lintang: -1.5, bujur: 110.5 },
  { provinsi: "Kalimantan Tengah", kabupaten: "Kotawaringin Timur", tanggal: "2026-10-17", waktu: "1700", kelasKepercayaan: "tidak_diketahui", lintang: -2.1, bujur: 112.7 },
  { provinsi: "Kalimantan Tengah", kabupaten: "Kotawaringin Timur", tanggal: "2026-10-17", waktu: "1710", kelasKepercayaan: "", lintang: -2.2, bujur: 112.8 },
];
const periodePapua = barisPeriodeAktif(titikPapua, { from: "2026-10-17", to: "2026-10-17", hours: 168 });
assert.equal(periodePapua.some((row) => row.tanggal === "2026-10-01"), false);
assert.equal(periodePapua.length, titikPapua.length - 1);
const peringkatProv = susunPeringkatHotspot(periodePapua, { tingkat: "provinsi" });
assert.equal(peringkatProv.baris[0].nama, "Papua Selatan");
assert.equal(peringkatProv.baris[0].peringkat, 1);
assert.equal(peringkatProv.baris[0].merah, 3);
assert.equal(peringkatProv.baris.every((row) => row.tingkat === "provinsi"), true);
const barisRiau = peringkatProv.baris.find((row) => row.nama === "Riau");
const jambi = peringkatProv.baris.find((row) => row.nama === "Jambi");
const kalbar = peringkatProv.baris.find((row) => row.nama === "Kalimantan Barat");
assert.ok(barisRiau.total > peringkatProv.baris[0].total);
assert.ok(barisRiau.peringkat > peringkatProv.baris[0].peringkat);
assert.equal(barisRiau.merah, 0);
assert.ok(jambi.oranye > kalbar.oranye);
assert.ok(jambi.peringkat < kalbar.peringkat);
const aceh = peringkatProv.baris.find((row) => row.nama === "Aceh");
const bali = peringkatProv.baris.find((row) => row.nama === "Bali");
assert.equal(aceh.merah, 1);
assert.equal(bali.merah, 1);
assert.ok(bali.oranye > aceh.oranye);
assert.ok(bali.peringkat < aceh.peringkat);
assert.equal(kalbar.oranye, bali.oranye);
assert.ok(kalbar.kuning > bali.kuning);
assert.ok(kalbar.peringkat < bali.peringkat);
const sama = [
  { nama: "Bali", merah: 2, oranye: 2, kuning: 2, total: 9 },
  { nama: "Aceh", merah: 2, oranye: 2, kuning: 2, total: 6 },
];
assert.ok(bandingPeringkat(sama[0], sama[1]) < 0);
const abjad = [
  { nama: "Bali", merah: 1, oranye: 0, kuning: 0, total: 1 },
  { nama: "Aceh", merah: 1, oranye: 0, kuning: 0, total: 1 },
].sort(bandingPeringkat);
assert.deepEqual(abjad.map((row) => row.nama), ["Aceh", "Bali"]);
assert.ok(bandingHitungan(
  { tinggi: 2, nominal: 0, rendah: 0, jumlah: 2 },
  { tinggi: 1, nominal: 5, rendah: 0, jumlah: 6 },
  "Papua Selatan",
  "Kalimantan Tengah",
) < 0);
const kalteng = peringkatProv.baris.find((row) => row.nama === "Kalimantan Tengah");
assert.equal(kalteng.kuning, 0);
assert.equal(kalteng.total, 0);
assert.equal(kalteng.tidakDiketahui, 2);
assert.equal(peringkatProv.total + peringkatProv.tidakDiketahui, periodePapua.length);
const peringkatKab = susunPeringkatHotspot(periodePapua, { tingkat: "kabupaten" });
assert.equal(peringkatKab.baris.every((row) => row.tingkat === "kabupaten"), true);
assert.equal(peringkatKab.baris.some((row) => row.nama === "Papua Selatan"), false);
assert.equal(peringkatKab.baris[0].nama, "Merauke, Papua Selatan");
assert.equal(peringkatKab.merah, peringkatProv.merah);
assert.equal(barisPeriodeAktif(periodePapua, { from: "2026-10-17", to: "2026-10-17", province: "Papua Selatan", hours: 24 }).every((row) => row.provinsi === "Papua Selatan"), true);
const sepuluh = sepuluhPrioritas(peringkatProv.baris);
assert.equal(sepuluh.length, 7);
assert.deepEqual(sepuluh.map((row) => row.nama), peringkatProv.baris.slice(0, 10).map((row) => row.nama));
assert.equal(sepuluh[0].nama, "Papua Selatan");
assert.equal(sepuluhPrioritas(peringkatProv.baris.slice(0, 3)).length, 3);
assert.equal(sepuluhPrioritas(null).length, 0);
assert.equal(JUMLAH_CHIP_PROVINSI, 8);
assert.ok(JUMLAH_CHIP_PROVINSI >= 6 && JUMLAH_CHIP_PROVINSI <= 8);
const chipPapua = chipProvinsi(titikPapua, { from: "2026-10-17", to: "2026-10-17", hours: 168 });
assert.equal(chipPapua[0], "Papua Selatan");
assert.equal(chipPapua.length, 7);
assert.equal(chipPapua.includes("Belum terpetakan"), false);
assert.deepEqual(namaChipProvinsi(Array.from({ length: 12 }, (_, index) => ({ nama: `P${index}`, tingkat: "provinsi" })), 8).length, 8);
assert.equal(namaChipProvinsi([{ nama: "Belum terpetakan", tingkat: "provinsi" }, { nama: "Aceh", tingkat: "provinsi" }])[0], "Aceh");
const batasKab = JSON.parse(readFileSync("data/static/kabkota-provinsi.json", "utf8"));
const topoKab = JSON.parse(readFileSync("data/static/batas-kabkota.topojson", "utf8"));
const propertiBatas = topoKab.objects.kabupaten.geometries.map((geometry) => [geometry.properties.kode, geometry.properties.nama, geometry.properties.provinsi]);
assert.equal(propertiBatas.length, 514);
assert.deepEqual(batasKab, propertiBatas);
assert.equal(new Set(batasKab.map((row) => String(row[0]).replaceAll(".", ""))).size, batasKab.length);
assert.deepEqual(cariWilayahBatas({ kode: "6311" }), { kode: "63.11", nama: "Balangan", provinsi: "Kalimantan Selatan" });
assert.equal(cariWilayahBatas({ kode: "63.11" }).nama, "Balangan");
assert.equal(cariWilayahBatas({ kode: "", kabupaten: "Balangan" }).provinsi, "Kalimantan Selatan");
assert.equal(cariWilayahBatas({ kode: "9999", kabupaten: "Balangan" }), null);
assert.equal(PROVINSI_TIDAK_DIKETAHUI, "Tidak diketahui");
assert.equal(tampilBarisFwi({ kode: "6311", kabupaten: "BALANGAN" }).kabupaten, "Balangan");
assert.equal(tampilBarisFwi({ kode: "6311", kabupaten: "BALANGAN" }).provinsi, "Kalimantan Selatan");
assert.equal(tampilBarisFwi({ kode: "9999", kabupaten: "Fiktif" }).provinsi, "Tidak diketahui");
const fwiContoh = placeFwiTable([
  { kode: "6311", kabupaten: "BALANGAN", provinsi: "Kalimantan Selatan", tanggal: "2026-10-02", fwi: 12 },
  { kode: "6311", kabupaten: "BALANGAN", provinsi: "Kalimantan Selatan", tanggal: "2026-10-01", fwi: 10 },
  { kode: "9999", kabupaten: "Fiktif", provinsi: "Riau", tanggal: "2026-10-01", fwi: 30 },
]);
const fwiTampil = urutBarisFwi(fwiContoh.map((row) => ({ ...row, ...tampilBarisFwi(row) })), "provinsi", "asc");
assert.equal(fwiTampil[0].kabupaten, "Balangan");
assert.equal(fwiTampil[0].provinsi, "Kalimantan Selatan");
assert.equal(fwiTampil[0].fwiRata, 11);
assert.equal(fwiTampil[1].provinsi, "Tidak diketahui");
assert.equal(urutBarisFwi(fwiTampil, "fwiRata", "desc")[0].kabupaten, "Fiktif");
if (existsSync("data/live/fwi_gwis_pembanding.csv")) {
  const fwiHidup = parseCsv(readFileSync("data/live/fwi_gwis_pembanding.csv", "utf8")).find((row) => String(row.kode) === "6311");
  if (fwiHidup) {
    const hidup = tampilBarisFwi({ kode: fwiHidup.kode, kabupaten: fwiHidup.kabupaten });
    assert.equal(hidup.kabupaten, "Balangan");
    assert.equal(hidup.provinsi, "Kalimantan Selatan");
  }
}
const peringkatSumber = readFileSync("src/components/PeringkatHotspot.jsx", "utf8");
assert.match(peringkatSumber, /10 Prioritas/);
assert.match(peringkatSumber, /peringkat-prioritas/);
assert.match(peringkatSumber, /Bukan data terkini/);
assert.match(peringkatSumber, /Tidak diketahui/);
assert.match(peringkatSumber, /sepuluhPrioritas/);
assert.equal((peringkatSumber.match(/<table>/g) || []).length, 1);
assert.equal(peringkatSumber.includes("peringkat-ringkas"), false);
const filterSumber = readFileSync("src/components/FilterProvinsi.jsx", "utf8");
assert.match(filterSumber, /Seluruh Indonesia/);
assert.match(filterSumber, /SEMUA_PROVINSI/);
assert.match(filterSumber, /chipProvinsi/);
assert.match(filterSumber, /Tombol mengikuti peringkat deteksi hotspot pada periode aktif/);
assert.match(filterSumber, /province-chips/);
assert.equal(filterSumber.includes("Kalimantan Tengah"), false);
const periodeSumber = readFileSync("src/components/KontrolPeriode.jsx", "utf8");
assert.match(periodeSumber, /Tanggal/);
assert.match(periodeSumber, /periode-duplikat/);
assert.match(periodeSumber, /JENDELA_PERIODE/);
const cssSumber = readFileSync("src/styles.css", "utf8");
assert.match(cssSumber, /\.province-chips \{ display: none; \}/);
assert.match(cssSumber, /keterangan-sempit/);
assert.match(cssSumber, /60vh/);
assert.match(readFileSync("src/components/DashboardView.jsx", "utf8"), /FilterProvinsi/);
assert.match(readFileSync("src/components/DashboardView.jsx", "utf8"), /frame=\{province \? "points" : "indonesia"\}/);
assert.equal(readFileSync("src/components/DashboardView.jsx", "utf8").includes("priority.map"), false);
assert.match(readFileSync("src/components/SummaryPage.jsx", "utf8"), /FilterProvinsi/);
assert.match(readFileSync("src/components/SummaryPage.jsx", "utf8"), /Laporan singkat harian/);
assert.match(readFileSync("src/components/SummaryPage.jsx", "utf8"), /<h2>Karhutla<\/h2>/);
assert.match(readFileSync("src/components/SummaryPage.jsx", "utf8"), /<h2>Banjir<\/h2>/);
assert.match(readFileSync("src/components/SummaryPage.jsx", "utf8"), /SiklonRingkas/);
const siklonSumber = readFileSync("src/components/SiklonRingkas.jsx", "utf8");
const siklonLib = readFileSync("src/lib/siklonBmkg.js", "utf8");
assert.match(siklonSumber, /Siklon \/ Bibit Siklon/);
assert.match(siklonSumber, /Peta TCWC BMKG/);
assert.match(siklonSumber, /\{SIKLON_TCWC_URL\}/);
assert.match(siklonLib, /https:\/\/tropicalcyclone\.bmkg\.go\.id\//);
assert.match(siklonSumber, /Halaman Siklon Tropis BMKG/);
assert.match(siklonSumber, /\{SIKLON_HTML_URL\}/);
assert.match(siklonLib, /https:\/\/www\.bmkg\.go\.id\/cuaca\/siklon-tropis/);
assert.match(siklonSumber, /target="_blank"/);
assert.equal(/windy/i.test(siklonSumber + siklonLib), false);
assert.match(siklonSumber, /Buka peta siklon BMKG/);
assert.equal(siklonSumber.includes("iframe"), false);
assert.equal(siklonSumber.includes("SIKLON_PETA_URL"), false);
assert.match(SIKLON_JEJAK, /belum terintegrasi/);
assert.match(siklonSumber, /\{SIKLON_JEJAK\}/);
assert.equal(siklonSumber.includes("leaflet"), false);
assert.equal(siklonSumber.includes("GeoJSON"), false);
assert.match(siklonSumber, /Terdekat dengan:/);
assert.match(siklonSumber, /PetaPosisiSiklon/);
const petaSiklon = readFileSync("src/components/PetaPosisiSiklon.jsx", "utf8");
assert.match(petaSiklon, /osmTileLayer/);
assert.equal(petaSiklon.includes("iframe"), false);
assert.equal(/mapbox|api[_-]?key/i.test(petaSiklon), false);
const dekatArnab = dekatDaratan(16.4, 81.4);
const dekat90 = dekatDaratan(17.7, 85.1);
assert.equal(dekatArnab.negara.nama, "India");
assert.equal(dekatArnab.negara.jarak_km <= 20, true);
assert.equal(dekatArnab.indonesia.nama, "Banda Aceh");
assert.equal(dekatArnab.indonesia.jarak_km > 1500, true);
assert.equal(dekat90.negara.nama, "India");
assert.equal(dekat90.negara.jarak_km > 50 && dekat90.negara.jarak_km < 250, true);
assert.equal(dekat90.indonesia.nama, "Banda Aceh");
assert.equal(dekatDaratan(-6.2, 106.8).negara.nama, "Indonesia");
assert.equal(dekatDaratan(-6.2, 106.8).negara.jarak_km, 0);
assert.equal(bacaStatusHtml('<p class="font-bold">Tidak Ada Siklon</p>').status, "Tidak Ada");
assert.equal(bacaStatusHtml("<html><p>Cuaca hari ini</p></html>").status, null);
const htmlSiklon = readFileSync("scripts/fixtures/siklon-bmkg-2026-10-28.html", "utf8");
assert.equal(htmlSiklon.includes("eyJ"), false);
const halamanSiklon = bacaStatusHtml(htmlSiklon);
assert.equal(halamanSiklon.status, "Ada");
assert.equal(halamanSiklon.sistem.length, 2);
const arnab = halamanSiklon.sistem.find((item) => item.nama === "Arnab");
const bibit90 = halamanSiklon.sistem.find((item) => item.nama === "90B");
assert.equal(arnab.jenis, "siklon");
assert.equal(arnab.tahap, "Siklon Tropis");
assert.match(arnab.kalimat, /26 Oktober 2026/);
assert.match(arnab.kalimat, /98B/);
assert.match(arnab.lokasi, /TCWC Jakarta/);
assert.equal(arnab.luar_tcwc, true);
assert.equal(arnab.di_dalam_tcwc, false);
assert.equal(bibit90.jenis, "bibit");
assert.equal(bibit90.tahap, "Bibit Siklon Tropis");
assert.match(bibit90.kalimat, /Teluk Benggala/);
assert.equal(bibit90.di_dalam_tcwc, false);
assert.equal(bibit90.dampak, "-");
assert.equal(arnab.dampak, "-");
assert.equal(arnab.tekanan_hpa, 970);
assert.equal(arnab.angin_knot, 80);
assert.equal(arnab.kategori, "3");
assert.equal(arnab.lintang, 16.4);
assert.equal(arnab.bujur, 81.4);
assert.equal(bibit90.tekanan_hpa, 1003);
assert.equal(bibit90.angin_knot, 25);
assert.equal(bibit90.kategori, "L");
const analisisArnab = analisisDampakIndonesia(arnab);
assert.equal(analisisArnab.tingkat, "Kecil");
assert.equal(analisisArnab.wilayah.length, 1);
assert.equal(analisisArnab.wilayah[0].nama, "Wilayah Indonesia");
assert.equal(Number.isInteger(analisisArnab.jarak_km) && analisisArnab.jarak_km > 0, true);
assert.equal(analisisDampakIndonesia({ lintang: 0, bujur: 110, di_dalam_tcwc: false, dampak: "-" }).jarak_km, 0);
assert.equal(analisisDampakIndonesia({
  dampak: "Menginduksi konvergensi di wilayah Aceh dan Kalimantan Utara.",
  di_dalam_tcwc: false,
}).tingkat, "Disebut BMKG");
assert.deepEqual(analisisDampakIndonesia({
  dampak: "Menginduksi konvergensi di wilayah Aceh dan Kalimantan Utara.",
  di_dalam_tcwc: false,
}).wilayah.map((item) => item.nama), ["Kalimantan Utara", "Aceh"]);
assert.equal(analisisDampakIndonesia({ di_dalam_tcwc: true, dampak: "-" }).tingkat, "Di wilayah pemantauan");
const htmlSiaran = readFileSync("scripts/fixtures/siaran-pers-bmkg-2026-10-28.html", "utf8");
assert.equal(htmlSiaran.includes("eyJ"), false);
const siaran = bacaSiaranPers(htmlSiaran);
assert.equal(siaran.status, "ok");
assert.equal(siaran.daftar.length, 2);
assert.match(siaran.daftar[0].judul, /Tak Berdampak/);
assert.match(siaran.daftar[0].kutipan, /187 milimeter/);
assert.match(siaran.daftar[1].kutipan, /menjauhi Indonesia/);
assert.match(siaran.daftar[1].url, /^https:\/\/www\.bmkg\.go\.id\/siaran-pers\/siklon-tropis-arnab-/);
const siaranGagal = gabungSiaran(
  { status: "gagal", galat: "HTTP 500", daftar: [] },
  { daftar: [{ judul: "Lama" }], fetched_at: "2026-10-27T00:00:00.000Z" },
);
assert.equal(siaranGagal.kept_previous, true);
assert.equal(siaranGagal.daftar[0].judul, "Lama");
assert.equal(bacaSiaranPers("<html><p>Cuaca hari ini</p></html>").status, "gagal");
const cuplikanJauh = susunCuplikanSiklon({ html: htmlSiklon, fetchedAt: "2026-10-28T03:00:00.000Z" });
assert.equal(cuplikanJauh.status, "Ada");
assert.equal(cuplikanJauh.sistem_halaman.length, 2);
assert.equal(potensiDekatIndonesia(cuplikanJauh).dekat, false);
const htmlTeks = htmlSiklon.replace(/<script[\s\S]*?<\/script>/gi, "");
const dariTeks = bacaStatusHtml(htmlTeks);
assert.equal(dariTeks.sistem.map((item) => item.nama).join(","), "90B,Arnab");
const dalamTcwc = bacaStatusHtml("<p>Siklon Tropis Melati terbentuk pada 1 Oktober 2026 di dalam wilayah Monitoring (AoM) TCWC Jakarta.</p>");
assert.equal(dalamTcwc.status, "Ada");
assert.equal(dalamTcwc.sistem[0].di_dalam_tcwc, true);
assert.equal(potensiDekatIndonesia({ status: "Ada", sistem_halaman: dalamTcwc.sistem }).dekat, true);
const berdampak = bacaStatusHtml("<p>Siklon Tropis Melati terpantau di Laut Jawa pada 1 Oktober 2026. Sistem ini menginduksi terbentuknya daerah konvergensi dan konfluensi di wilayah Jawa Timur.</p>");
assert.match(berdampak.sistem[0].dampak, /Jawa Timur/);
assert.equal(potensiDekatIndonesia({ status: "Ada", sistem_halaman: berdampak.sistem }).dekat, true);
const sistemIkhtisar = bacaIkhtisar(
  "5) Siklon Tropis Champi terpantau di Laut Filipina timur laut Filipina, dengan pusat tekanan 905 hPa. intensitasnya berada pada kategori 3 (tiga). Sistem ini menginduksi terbentuknya daerah konvergensi dan konfluensi di wilayah Kalimantan Utara, Laut Filipina, Laut Halmahera, serta di sekitar Bibit siklon tropis tersebut. 6) Daerah",
);
assert.equal(sistemIkhtisar.length, 1);
assert.equal(sistemIkhtisar[0].nama, "Champi");
assert.equal(sistemIkhtisar[0].tahap, "Siklon Tropis kategori 3");
assert.match(sistemIkhtisar[0].dampak, /Kalimantan Utara/);
assert.equal(/bibit/i.test(sistemIkhtisar[0].nama), false);
assert.match(readFileSync("scripts/refresh-live-data.mjs", "utf8"), /ambilSiklon/);
assert.match(readFileSync(".github/workflows/refresh-data.yml", "utf8"), /pypdf/);
assert.equal(readFileSync("data/live/siklon-bmkg.json", "utf8").includes("eyJ"), false);
assert.equal(readFileSync("scripts/ambil-siklon.mjs", "utf8").includes("Authorization"), false);
assert.equal(JSON.parse(readFileSync("data/live/siklon-bmkg.json", "utf8")).jejak, "belum terintegrasi");
const sinyalChampi = potensiDekatIndonesia({
  status: "Tidak Ada",
  status_teks: "Tidak Ada Siklon",
  ikhtisar: { sistem: sistemIkhtisar },
});
assert.equal(sinyalChampi.dekat, true);
assert.equal(sinyalChampi.halamanAda, false);
assert.match(sinyalChampi.sistem[0].dampak, /Kalimantan Utara/);
assert.equal(potensiDekatIndonesia({ status: "Tidak Ada", ikhtisar: { sistem: [] } }).dekat, false);
assert.equal(potensiDekatIndonesia({ status: "Ada", ikhtisar: { sistem: [] }, sistem_halaman: [] }).dekat, false);
assert.equal(potensiDekatIndonesia({ status: "Ada", sistem_halaman: [{ nama: "90B", di_dalam_tcwc: false, dampak: "" }] }).dekat, false);
assert.equal(potensiDekatIndonesia({ status: "Tidak Ada", ikhtisar: { sistem: [{ dampak: "  " }] } }).dekat, false);
assert.equal(siklonUsang({ status: "failed", kept_previous: true }), true);
assert.equal(siklonUsang({ status: "ok", kept_previous: false }), false);
assert.equal(gagalSiklonBerturut({ status: "ok", gagal_berturut: 0 }), 1);
assert.equal(gagalSiklonBerturut({ status: "failed", kept_previous: true, gagal_berturut: 1 }), 2);
assert.equal(gagalSiklonBerturut({ status: "failed", kept_previous: true }), 2);
assert.equal(siklonPerluTanda({ status: "failed", gagal_berturut: 1 }), false);
assert.equal(siklonPerluTanda({ status: "failed", gagal_berturut: 2 }), true);
assert.equal(siklonPerluTanda({ status: "ok", gagal_berturut: 0 }), false);
assert.equal(siklonPerluTanda({
  status: "failed",
  kept_previous: true,
  fetched_at: "2026-10-26T21:12:16.852Z",
  checked_at: "2026-10-27T23:12:35.982Z",
}), true);
assert.equal(siklonPerluTanda({
  status: "failed",
  kept_previous: true,
  fetched_at: "2026-10-27T20:00:00.000Z",
  checked_at: "2026-10-27T23:00:00.000Z",
}), false);
assert.match(readFileSync("src/components/SiteHeader.jsx", "utf8"), /potensiDekatIndonesia/);
assert.match(readFileSync("src/components/SiteHeader.jsx", "utf8"), /siklon-dekat/);
assert.match(siklonSumber, /Analisis &amp; Siaran Pers BMKG/);
assert.match(siklonSumber, /Analisis Dampak ke Indonesia/);
assert.match(siklonSumber, /useGrouping: false/);
assert.match(siklonSumber, /analisis otomatis Pantau Bencana, bukan status resmi/);
assert.equal(siklonSumber.includes("Andhra"), false);
assert.equal(siklonSumber.includes("03:30"), false);
assert.match(siklonSumber, /Data siklon tertunda/);
assert.match(siklonSumber, /Waktu ambil terakhir yang berhasil/);
assert.match(siklonSumber, /Periksa halaman Siklon Tropis BMKG/);
assert.match(siklonSumber, /siklonUsang/);
assert.match(readFileSync("scripts/refresh-live-data.mjs", "utf8"), /gagal_berturut/);
assert.match(readFileSync("scripts/refresh-watchdog.mjs", "utf8"), /siklonPerluTanda/);
assert.match(watchdog, /siklon_tanda/);
assert.match(readFileSync("src/App.jsx", "utf8"), /page === "siklon"/);
assert.match(readFileSync("src/components/HotspotBoard.jsx", "utf8"), /Enam prioritas/);
assert.match(readFileSync("src/components/ExtraLayers.jsx", "utf8"), /Kabupaten/);
assert.match(readFileSync("src/components/ExtraLayers.jsx", "utf8"), /Provinsi/);
assert.match(readFileSync("src/components/ExtraLayers.jsx", "utf8"), /FWI rata-rata/);
assert.match(readFileSync("src/components/ExtraLayers.jsx", "utf8"), /Tidak diketahui/);
assert.match(readFileSync("src/components/ExtraLayers.jsx", "utf8"), /aria-sort/);
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
  { desa: "Mentang", kodeDesa: "14.01.16.2004", kecamatan: "Perhentian Raja", kabupaten: "Kampar", provinsi: "Riau", kelasKepercayaan: "rendah" },
  { desa: "Mentang", kodeDesa: "14.01.16.2004", kecamatan: "Perhentian Raja", kabupaten: "Kampar", provinsi: "Riau", kelasKepercayaan: "rendah" },
  { desa: "Mentang", kodeDesa: "14.01.16.2004", kecamatan: "Perhentian Raja", kabupaten: "Kampar", provinsi: "Riau", kelasKepercayaan: "rendah" },
  { desa: "Mentang", kodeDesa: "14.01.16.2004", kecamatan: "Perhentian Raja", kabupaten: "Kampar", provinsi: "Riau", kelasKepercayaan: "rendah" },
  { desa: "", kodeDesa: "", kecamatan: "Setiabudi", kabupaten: "Kota Adm. Jakarta Selatan", provinsi: "DKI Jakarta", kelasKepercayaan: "rendah" },
]);
assert.equal(desaRows[0].desa, "Hangtuah");
assert.equal(desaRows[0].jumlah, 2);
assert.equal(desaRows[0].nominal, 1);
assert.equal(desaRows[0].tinggi, 1);
assert.equal(desaRows.find((row) => row.desa === "Mentang").jumlah, 4);
assert.ok(desaRows.find((row) => row.desa === "Mentang").jumlah > desaRows[0].jumlah);
assert.equal(desaRows.find((row) => row.kecamatan === "Setiabudi").desa, DESA_UNIDENTIFIED);
const mapComponent = readFileSync("src/components/HotspotMap.jsx", "utf8");
assert.match(mapComponent, /L\.circleMarker\(\[lat, lon\]/);
assert.match(mapComponent, /Number\(anchor\.lintang\)/);
assert.equal(mapComponent.includes("circleMarker([meanLat"), false);
assert.match(readFileSync("src/lib/bigWilayah.js", "utf8"), /#eab308/);
assert.match(readFileSync("src/lib/bigWilayah.js", "utf8"), /#ea580c/);
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
assert.equal(
  hotspotSourceLabel({ asal: "snapshot", status: "usang", rows: [{ id: 1 }] }, "VIIRS_SNPP_NRT"),
  "VIIRS S-NPP NRT (cuplikan terakhir)",
);
assert.equal(hotspotSourceLabel({ status: "usang", rows: [] }), "Cuplikan tidak tersedia");
const boardSource = readFileSync("src/components/HotspotBoard.jsx", "utf8");
assert.match(boardSource, /Confidence deteksi satelit/);
assert.match(boardSource, /Lintasan satelit terakhir/);
assert.match(boardSource, /map-badge/);
assert.match(boardSource, /cuplikan, bukan permintaan peramban ke NASA FIRMS/);
assert.equal(boardSource.includes("map-overlay"), false);
assert.match(boardSource, /nama desa tersedia untuk/);
assert.match(boardSource, /titik belum terverifikasi wilayah/);
assert.match(boardSource, /keyakinan deteksi, bukan intensitas atau bahaya/);
assert.match(boardSource, /Cara membaca/);
assert.match(boardSource, /Jumlah deteksi hotspot \(bukan status\)/);
assert.match(boardSource, /di dalam tanggal/);
assert.match(boardSource, /tinggi \(merah\) dulu/);
assert.equal(boardSource.includes("bukan pada daftar ini"), false);
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
assert.equal(hotspotTree[0].kecamatan[0].kecamatan, "Bandar Petalangan");
assert.equal(hotspotTree[0].kecamatan[0].tinggi, 1);
const siakTree = hotspotTree[0].kecamatan.find((row) => row.kecamatan === "Siak");
assert.equal(siakTree.kabupaten, "Siak");
assert.equal(siakTree.kodeKecamatan, "14.08.01");
assert.equal(hotspotTree[1].kecamatan[0].desa[0].desa, "Teluk Rendah");
assert.equal(hotspotTree[0].kecamatan.find((row) => row.kecamatan === "Bandar Petalangan").desa.length, 0);
const urutMerah = buildHotspotTree([
  { provinsi: "Papua Selatan", kabupaten: "Merauke", kecamatan: "Sota", kodeKecamatan: "93.01.01", kelasKepercayaan: "tinggi", wilayahStatus: "kecamatan" },
  { provinsi: "Papua Selatan", kabupaten: "Merauke", kecamatan: "Sota", kodeKecamatan: "93.01.01", kelasKepercayaan: "tinggi", wilayahStatus: "kecamatan" },
  { provinsi: "Jambi", kabupaten: "Tebo", kecamatan: "Tebo Tengah", kodeKecamatan: "15.09.01", kelasKepercayaan: "tinggi", wilayahStatus: "kecamatan" },
  { provinsi: "Jambi", kabupaten: "Tebo", kecamatan: "Tebo Tengah", kodeKecamatan: "15.09.01", kelasKepercayaan: "nominal", wilayahStatus: "kecamatan" },
  { provinsi: "Jambi", kabupaten: "Tebo", kecamatan: "Tebo Tengah", kodeKecamatan: "15.09.01", kelasKepercayaan: "nominal", wilayahStatus: "kecamatan" },
  { provinsi: "Kalimantan Tengah", kabupaten: "Kapuas", kecamatan: "Basarang", kodeKecamatan: "62.03.02", desa: "Sei Hambawang", kodeDesa: "62.03.02.2001", kelasKepercayaan: "tinggi", wilayahStatus: "desa" },
  { provinsi: "Kalimantan Tengah", kabupaten: "Kapuas", kecamatan: "Basarang", kodeKecamatan: "62.03.02", desa: "Palangkau", kodeDesa: "62.03.02.2002", kelasKepercayaan: "rendah", wilayahStatus: "desa" },
  { provinsi: "Kalimantan Tengah", kabupaten: "Kapuas", kecamatan: "Basarang", kodeKecamatan: "62.03.02", desa: "Palangkau", kodeDesa: "62.03.02.2002", kelasKepercayaan: "rendah", wilayahStatus: "desa" },
  { provinsi: "Kalimantan Tengah", kabupaten: "Kapuas", kecamatan: "Basarang", kodeKecamatan: "62.03.02", desa: "Palangkau", kodeDesa: "62.03.02.2002", kelasKepercayaan: "rendah", wilayahStatus: "desa" },
  { provinsi: "Kalimantan Tengah", kabupaten: "Kapuas", kecamatan: "Basarang", kodeKecamatan: "62.03.02", desa: "Palangkau", kodeDesa: "62.03.02.2002", kelasKepercayaan: "rendah", wilayahStatus: "desa" },
  { provinsi: "Kalimantan Tengah", kabupaten: "Kapuas", kecamatan: "Dadahup", kodeKecamatan: "62.03.03", kelasKepercayaan: "rendah", wilayahStatus: "kecamatan" },
  { provinsi: "Kalimantan Tengah", kabupaten: "Kapuas", kecamatan: "Dadahup", kodeKecamatan: "62.03.03", kelasKepercayaan: "rendah", wilayahStatus: "kecamatan" },
  { provinsi: "Kalimantan Tengah", kabupaten: "Kapuas", kecamatan: "Dadahup", kodeKecamatan: "62.03.03", kelasKepercayaan: "rendah", wilayahStatus: "kecamatan" },
  { provinsi: "Kalimantan Tengah", kabupaten: "Kapuas", kecamatan: "Dadahup", kodeKecamatan: "62.03.03", kelasKepercayaan: "rendah", wilayahStatus: "kecamatan" },
  { provinsi: "Kalimantan Tengah", kabupaten: "Kapuas", kecamatan: "Dadahup", kodeKecamatan: "62.03.03", kelasKepercayaan: "rendah", wilayahStatus: "kecamatan" },
  { provinsi: "Kalimantan Tengah", kabupaten: "Kapuas", kecamatan: "Dadahup", kodeKecamatan: "62.03.03", kelasKepercayaan: "rendah", wilayahStatus: "kecamatan" },
]);
assert.deepEqual(urutMerah.map((row) => row.provinsi), ["Papua Selatan", "Jambi", "Kalimantan Tengah"]);
const kaltengTree = urutMerah.find((row) => row.provinsi === "Kalimantan Tengah");
assert.ok(kaltengTree.jumlah > urutMerah[0].jumlah);
assert.equal(kaltengTree.kecamatan[0].kecamatan, "Basarang");
assert.ok(kaltengTree.kecamatan.find((row) => row.kecamatan === "Dadahup").jumlah > kaltengTree.kecamatan[0].jumlah);
assert.equal(kaltengTree.kecamatan[0].desa[0].desa, "Sei Hambawang");
assert.ok(kaltengTree.kecamatan[0].desa.find((row) => row.desa === "Palangkau").jumlah > kaltengTree.kecamatan[0].desa[0].jumlah);
const urutKab = summarizeByWilayah([
  { kabupaten: "Kapuas", provinsi: "Kalimantan Tengah", kelasKepercayaan: "nominal", wilayahStatus: "ok" },
  { kabupaten: "Kapuas", provinsi: "Kalimantan Tengah", kelasKepercayaan: "nominal", wilayahStatus: "ok" },
  { kabupaten: "Kapuas", provinsi: "Kalimantan Tengah", kelasKepercayaan: "nominal", wilayahStatus: "ok" },
  { kabupaten: "Kapuas", provinsi: "Kalimantan Tengah", kelasKepercayaan: "nominal", wilayahStatus: "ok" },
  { kabupaten: "Kapuas", provinsi: "Kalimantan Tengah", kelasKepercayaan: "nominal", wilayahStatus: "ok" },
  { kabupaten: "Merauke", provinsi: "Papua Selatan", kelasKepercayaan: "tinggi", wilayahStatus: "ok" },
  { kabupaten: "Merauke", provinsi: "Papua Selatan", kelasKepercayaan: "tinggi", wilayahStatus: "ok" },
], "kabupaten");
assert.equal(urutKab[0].kabupaten, "Merauke");
assert.ok(urutKab.find((row) => row.kabupaten === "Kapuas").jumlah > urutKab[0].jumlah);
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
assert.match(readFileSync("src/components/ExtraLayers.jsx", "utf8"), /Konteks risiko jangka panjang \(IRBI 2025\)/);
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
assert.match(readFileSync("src/components/ExtraLayers.jsx", "utf8"), /belum terintegrasi/);
assert.match(readFileSync("src/components/ExtraLayers.jsx", "utf8"), /Potensi 7 hari/);
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
assert.match(udaraSource, /Data stasiun belum terintegrasi ke dashboard/);
assert.equal(udaraSource.includes("Sel model CAMS"), false);
assert.equal(udaraSource.includes("contoh tampilan"), false);
assert.match(udaraSource, /Direktorat Perlindungan dan Pengelolaan Mutu Udara \(Satu Data KemenLH\)/);
const ikuRows = parseCsv(readFileSync("data/static/iku-2024-kabupaten.csv", "utf8"));
assert.equal(ikuRows.length, 509);
assert.deepEqual(Object.keys(ikuRows[0]), ["kode_wilayah", "kab_kota", "provinsi", "iku", "tahun", "sumber", "tanggal_akses"]);
assert.equal(ikuRows.every((row) => row.tahun === "2024" && row.tanggal_akses === "2026-10-19"), true);
assert.equal(new Set(ikuRows.map((row) => `${row.kode_wilayah}|${row.kab_kota}`)).size, 509);
assert.equal(ikuRows.some((row) => row.kab_kota === "Kabupaten Aceh Barat" && row.iku === "92.11"), true);
const jumlahProvinsi81 = { RIAU: 12, JAMBI: 11, "SUMATERA SELATAN": 17, "KALIMANTAN BARAT": 14, "KALIMANTAN TENGAH": 14, "KALIMANTAN SELATAN": 13 };
let kode81 = null;
for (const nama of ["fwi-81-kab-kota.csv", "peluang-hujan-81-kab-kota.csv", "indeks-kesesuaian-iklim-81-kab-kota.csv", "master-81-kab-kota.csv", "template-fwi-81-kab-kota.csv"]) {
  const baris81 = parseCsv(readFileSync(`data/static/karhutla-81/${nama}`, "utf8"));
  assert.equal(baris81.length, 81, nama);
  assert.deepEqual(Object.keys(baris81[0]).slice(0, 3), ["Kode Kab/Kota", "PROVINSI", "KAB/KOTA"], nama);
  const jumlah = {};
  for (const row of baris81) jumlah[row.PROVINSI] = (jumlah[row.PROVINSI] || 0) + 1;
  assert.deepEqual(jumlah, jumlahProvinsi81, nama);
  const kode = baris81.map((row) => row["Kode Kab/Kota"]);
  assert.equal(new Set(kode).size, 81, nama);
  if (!kode81) kode81 = kode;
  else assert.deepEqual(kode, kode81, nama);
}
const fwi81 = parseCsv(readFileSync("data/static/karhutla-81/fwi-81-kab-kota.csv", "utf8"));
assert.equal(fwi81.find((row) => row["Kode Kab/Kota"] === "1401").FWI, "#N/A");
assert.equal(fwi81.filter((row) => row.FWI === "#N/A").length, 29);
assert.equal(fwi81.some((row) => row.FWI === "0" || row.FWI === "0,00"), false);
const template81 = parseCsv(readFileSync("data/static/karhutla-81/template-fwi-81-kab-kota.csv", "utf8"));
assert.equal(template81.every((row) => row.FWI === ""), true);
const hujan81 = parseCsv(readFileSync("data/static/karhutla-81/peluang-hujan-81-kab-kota.csv", "utf8"));
assert.equal(hujan81[0]["Peluang Hujan >20mm (Rentang %)"], ">90%");
const iklim81 = parseCsv(readFileSync("data/static/karhutla-81/indeks-kesesuaian-iklim-81-kab-kota.csv", "utf8"));
assert.equal(iklim81[0]["Indeks Kesesuain Iklim (Rendah, Menengah, Tinggi)"], "Rendah");
const urut81 = susunKarhutla81({ fwi: fwi81, hujan: hujan81, iklim: iklim81 });
assert.equal(urut81.length, 81);
assert.equal(urut81[0].kode, "14.01");
assert.equal(urut81[0].nama, "Kampar");
assert.equal(urut81.find((row) => row.kode === "14.09").nama, "Kuantan Singingi");
assert.equal(urut81.find((row) => row.kode === "14.09").nilai.fwi, "#N/A");
assert.equal(urut81.find((row) => row.kode === "14.72").nama, "Kota Dumai");
assert.equal(urut81.find((row) => row.kode === "14.72").nilai.fwi, "#N/A");
assert.equal(urut81.find((row) => row.kode === "63.03").nilai.fwi, "5");
assert.equal(urut81.filter((row) => row.nilai.fwi === "#N/A").length, 29);
assert.equal(urut81.some((row) => row.nilai.fwi === "0" || row.nilai.fwi === "0,00"), false);
assert.deepEqual(
  urut81.reduce((jumlah, row) => ({ ...jumlah, [row.provinsi]: (jumlah[row.provinsi] || 0) + 1 }), {}),
  { Riau: 12, Jambi: 11, "Sumatera Selatan": 17, "Kalimantan Barat": 14, "Kalimantan Tengah": 14, "Kalimantan Selatan": 13 },
);
const csvFwi81 = csvKarhutla81(urut81, "fwi");
const dataFwi81 = csvFwi81.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line && !line.startsWith("#") && !line.startsWith("Kode"));
assert.equal(dataFwi81.length, 81);
assert.match(csvFwi81, /FWI — 81 kabupaten\/kota prioritas/);
assert.match(csvFwi81, /23 Oktober 2026, 09\.14 WIB/);
assert.match(csvFwi81, /14\.09,Riau,Kuantan Singingi,#N\/A/);
assert.equal(csvFwi81.includes("Google Sheets"), false);
assert.equal(WAKTU_CUPLIKAN_81_TEKS, "23 Oktober 2026, 09.14 WIB");
assert.equal(namaBerkasKarhutla81("fwi", "csv"), "fwi-81-kab-kota-2026-10-23-0914.csv");
assert.equal(namaBerkasKarhutla81("hujan", "xlsx"), "hujan-81-kab-kota-2026-10-23-0914.xlsx");
const csvIklim81 = csvKarhutla81(urut81, "iklim");
assert.equal(csvIklim81.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line && !line.startsWith("#") && !line.startsWith("Kode")).length, 81);
const lembarFwi81 = lembarKarhutla81(urut81, "fwi");
assert.equal(lembarFwi81.nama, "FWI 81 kab/kota");
assert.match(lembarFwi81.baris[0][0], /FWI — 81 kabupaten\/kota prioritas/);
assert.match(lembarFwi81.baris[1][0], /23 Oktober 2026, 09\.14 WIB/);
assert.equal(lembarFwi81.baris.filter((row) => /^\d{2}\.\d{2}$/.test(String(row[0] || ""))).length, 81);
const lib81 = readFileSync("src/lib/karhutla81.js", "utf8");
assert.match(lib81, /Unduh FWI \(81 kab\/kota\)/);
assert.match(lib81, /Unduh Peluang Hujan/);
assert.match(lib81, /Unduh Indeks Kesesuaian Iklim/);
assert.equal(/sheets\.google/i.test(lib81), false);
const unduh81 = readFileSync("src/components/UnduhKarhutla81.jsx", "utf8");
assert.match(unduh81, /\{item\.label\}/);
assert.match(unduh81, /xlsxLembar/);
assert.match(unduh81, /WAKTU_CUPLIKAN_81_TEKS/);
assert.match(unduh81, /Analisis Karhutla 2026/);
assert.match(unduh81, /#N\/A/);
assert.equal(/sheets\.google/i.test(unduh81), false);
assert.match(readFileSync("src/components/DashboardView.jsx", "utf8"), /<UnduhKarhutla81 \/>/);
assert.equal(udaraSource.includes("ispu_pembanding"), false);
assert.match(udaraSource, /CAMS_LABEL/);
assert.match(udaraSource, /OPENAQ_BLOCKED/);
assert.match(udaraSource, /Data belum terhubung/);
assert.equal(udaraSource.includes("Prediksi ISPU"), false);
assert.match(readFileSync("docs/ARAHAN_KUALITAS_UDARA.md", "utf8"), /ISPU resmi dan pembanding kualitas udara/);
assert.match(readFileSync("src/components/ExtraLayers.jsx", "utf8"), /Kualitas Udara \(ISPU\)/);
assert.equal(readFileSync("src/components/ExtraLayers.jsx", "utf8").includes("ISPU perkiraan"), false);
assert.match(readFileSync("src/components/ExtraLayers.jsx", "utf8"), /Penjelasan lapisan/);
assert.match(readFileSync("src/components/InfoTip.jsx", "utf8"), /createPortal/);
assert.match(readFileSync("src/components/InfoTip.jsx", "utf8"), /document\.body/);
assert.match(readFileSync("src/components/InfoTip.jsx", "utf8"), /Escape/);
assert.match(readFileSync("src/components/InfoTip.jsx", "utf8"), /Tutup/);
{
  const kanan = letakInfoTip({
    rect: { left: 860, right: 880, top: 80, bottom: 98 },
    lebar: 1000,
    tinggi: 800,
    align: "end",
  });
  assert.equal(kanan.sheet, false);
  assert.ok(kanan.left >= 8);
  assert.ok(kanan.left + kanan.width <= 992);
  const sempit = letakInfoTip({
    rect: { left: 20, right: 40, top: 80, bottom: 98 },
    lebar: 390,
    tinggi: 700,
    align: "end",
  });
  assert.equal(sempit.sheet, true);
  const bawah = letakInfoTip({
    rect: { left: 40, right: 60, top: 80, bottom: 98 },
    lebar: 1200,
    tinggi: 800,
    align: "start",
  });
  assert.equal(bawah.sheet, false);
  assert.equal(bawah.top, 106);
  assert.equal(bawah.left, 40);
}
assert.equal(readFileSync("src/lib/hazards.js", "utf8").includes("ispu"), false);

const indicatorSource = readFileSync("src/lib/priorityIndicators.js", "utf8");
const indicatorUi = readFileSync("src/components/PriorityIndicators.jsx", "utf8");
assert.match(readFileSync("src/components/LogicPage.jsx", "utf8"), /<PriorityIndicators rinci \/>/);
assert.match(logicSource, /<PriorityIndicators rinci \/>/);
assert.match(indicatorSource, /Indikator untuk Wilayah Prioritas/);
assert.match(indicatorSource, /Metode A\+/);
assert.match(indicatorSource, /bukan prakiraan resmi BMKG\/BNPB/);
assert.match(indicatorSource, /hingga H\+7 sesuai produk BMKG/);
assert.match(indicatorSource, /bukan prakiraan 14 hari/);
assert.match(indicatorSource, /Data stasiun belum terintegrasi ke dashboard/);
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
const irbiLongsor = parseCsv(readFileSync("data/static/irbi-2025-longsor.csv", "utf8"));
assert.equal(irbiLongsor.length, 514);
const kelasLongsor = {};
for (const row of irbiLongsor) kelasLongsor[row.kelas || ""] = (kelasLongsor[row.kelas || ""] || 0) + 1;
assert.equal(kelasLongsor.TINGGI, 369);
assert.equal(kelasLongsor.SEDANG, 52);
assert.equal(kelasLongsor.RENDAH, 34);
assert.equal(kelasLongsor[""], 59);
assert.match(IRBI_LONGSOR_TERVERIFIKASI, /455 kabupaten\/kota/);
assert.match(IRBI_LONGSOR_TERVERIFIKASI, /halaman 310–323/);
assert.match(IRBI_LONGSOR_TERVERIFIKASI, /369 Tinggi, 52 Sedang, 34 Rendah/);
for (const row of irbiLongsor) {
  const halaman = row.halaman ? Number(row.halaman) : 0;
  assert.equal(row.skor === "" || (halaman >= 310 && halaman <= 323), true);
  assert.equal(Boolean(row.skor) === Boolean(row.kelas), true);
  assert.equal(row.skor === "0", false);
}
assert.equal(irbiLongsor.find((row) => row.kode_wilayah === "96.71").skor, "33.00");
assert.equal(irbiLongsor.find((row) => row.kode_wilayah === "96.71").kelas, "TINGGI");
assert.equal(irbiLongsor.find((row) => row.kode_wilayah === "73.24").skor, "1.00");
assert.equal(irbiLongsor.find((row) => row.kode_wilayah === "73.24").halaman, "323");
assert.equal(irbiLongsor.find((row) => row.kode_wilayah === "11.01").skor, "26.40");
assert.equal(irbiLongsor.find((row) => row.kode_wilayah === "11.71").skor, "");
assert.equal(irbiLongsor.find((row) => row.kode_wilayah === "11.71").kelas, "");
assert.equal(irbiLongsor.find((row) => row.kode_wilayah === "76.01").padanan.includes("Pasangkayu"), true);
assert.equal(irbiLongsor.find((row) => row.kode_wilayah === "81.03").skor, "4.43");
assert.equal(irbiNasional.find((row) => row.kode_wilayah === "11.01").skor, "26.84");
assert.match(IRBI_PENGGUNAAN_INTERNAL, /Penggunaan internal/);
assert.match(IRBI_PENGGUNAAN_INTERNAL, /tidak untuk publikasi/);
assert.match(IRBI_PENGGUNAAN_INTERNAL, /bukan status resmi/);
const irbiGabung = susunIrbiGabung(irbiNasional, irbiLongsor);
assert.equal(irbiGabung.length, 514);
const gabungSelatan = irbiGabung.find((row) => row.kode === "11.01");
assert.equal(gabungSelatan.banjir, "Tinggi (26,84)");
assert.equal(gabungSelatan.longsor, "Tinggi (26,40)");
const gabungBanda = irbiGabung.find((row) => row.kode === "11.71");
assert.equal(gabungBanda.nama, "Kota Banda Aceh");
assert.equal(gabungBanda.longsor, "IRBI tidak tersedia");
assert.equal(gabungBanda.banjir.includes("Tinggi") || gabungBanda.banjir.includes("Sedang") || gabungBanda.banjir.includes("Rendah"), true);
assert.equal(irbiGabung.filter((row) => row.longsor !== "IRBI tidak tersedia" && row.longsor !== "belum terintegrasi").length, 455);
assert.equal(irbiGabung.filter((row) => row.banjir !== "IRBI tidak tersedia" && row.banjir !== "belum terintegrasi").length, 510);
const acehGabung = saringIrbi(irbiGabung, { provinsi: "Aceh" });
assert.equal(acehGabung.length, 23);
assert.equal(acehGabung.every((row) => row.provinsi === "Aceh"), true);
assert.equal(saringIrbi(irbiGabung, { cari: "11.01" }).some((row) => row.kode === "11.01"), true);
assert.equal(saringIrbi(irbiGabung, { cari: "banda aceh" }).some((row) => row.kode === "11.71"), true);
const urutLongsor = urutIrbi(irbiGabung, "longsor", "desc");
assert.equal(urutLongsor[0].longsorSkor >= urutLongsor[1].longsorSkor, true);
assert.equal(urutLongsor.at(-1).longsorSkor, null);
assert.equal(urutLongsor.at(-60).longsorSkor == null, false);
const tanpaLongsor = susunIrbiGabung(irbiNasional, null);
assert.equal(tanpaLongsor.every((row) => row.longsor === "belum terintegrasi"), true);
assert.equal(tanpaLongsor.find((row) => row.kode === "11.01").banjir, "Tinggi (26,84)");
const lembarGabung = lembarIrbiGabung({
  irbi: { "11.01": { kelas: "Tinggi", skor: 26.84 } },
  longsor: { "11.01": { kelas: "Tinggi", skor: 26.4 } },
});
assert.equal(lembarGabung.nama, "IRBI 2025 Banjir & Longsor");
assert.equal(lembarGabung.nama.length <= 31, true);
assert.deepEqual(
  lembarGabung.baris.find((row) => row[1] === "Aceh Selatan"),
  ["Aceh", "Aceh Selatan", "Tinggi (26,84)", "Tinggi (26,40)"],
);
assert.equal(lembarGabung.baris.find((row) => row[1] === "Kota Banda Aceh")[3], "IRBI tidak tersedia");
const lembarTanpa = lembarIrbiGabung({ irbi: { "11.01": { kelas: "Tinggi", skor: 26.84 } } });
assert.equal(lembarTanpa.baris.find((row) => row[1] === "Aceh Selatan")[3], "belum terintegrasi");
assert.match(readFileSync("src/components/IrbiBanjirLongsor.jsx", "utf8"), /IRBI 2025 Banjir & Longsor/);
assert.match(readFileSync("src/components/IrbiBanjirLongsor.jsx", "utf8"), /IRBI_PENGGUNAAN_INTERNAL/);
assert.match(readFileSync("src/components/IrbiBanjirLongsor.jsx", "utf8"), /Seluruh Indonesia/);
assert.match(readFileSync("src/components/IrbiBanjirLongsor.jsx", "utf8"), /aria-expanded/);
assert.equal(readFileSync("src/components/IrbiBanjirLongsor.jsx", "utf8").includes("sheets.google"), false);
assert.equal(readFileSync("src/lib/irbiGabung.js", "utf8").includes("multibahaya"), false);
assert.equal(IRBI_ANCAMAN.length, 12);
assert.equal(IRBI_ANCAMAN.some((item) => item.berkas.includes("aceh-bengkulu")), false);
assert.equal(teksSkorIrbi({ skor: "", kelas: "" }), "IRBI tidak tersedia");
assert.equal(teksSkorIrbi({ indeks_risiko: "", kelas_risiko: "" }), "IRBI tidak tersedia");
assert.equal(teksSkorIrbi({ skor: "26.84", kelas: "TINGGI" }), "Tinggi (26,84)");
const berkasIrbi = Object.fromEntries(
  IRBI_ANCAMAN.map((item) => [item.id, parseCsv(readFileSync(item.berkas, "utf8"))]),
);
const irbiProvinsi = susunIrbiNasional(berkasIrbi);
assert.equal(irbiProvinsi.length, 38);
assert.equal(irbiProvinsi.reduce((jumlah, grup) => jumlah + grup.kab.length, 0), 514);
assert.equal(irbiProvinsi[0].provinsi, "Aceh");
assert.equal(irbiProvinsi[0].kab.length, 23);
const acehSelatanNasional = irbiProvinsi[0].kab.find((item) => item.kode === "11.01");
assert.equal(acehSelatanNasional.nilai.banjir, "Tinggi (26,84)");
assert.equal(acehSelatanNasional.nilai.longsor, "Tinggi (26,40)");
const bandaNasional = irbiProvinsi[0].kab.find((item) => item.kode === "11.71");
assert.equal(bandaNasional.nilai.longsor, "IRBI tidak tersedia");
assert.equal(bandaNasional.nilai.banjir.includes("0,00"), false);
const semuaKab = irbiProvinsi.flatMap((grup) => grup.kab);
assert.equal(semuaKab.filter((item) => item.nilai.karhutla !== "IRBI tidak tersedia" && item.nilai.karhutla !== IRBI_BELUM_BERKAS).length, 467);
assert.equal(semuaKab.filter((item) => item.nilai.gempabumi !== "IRBI tidak tersedia").length, 514);
assert.equal(semuaKab.filter((item) => item.nilai.multibahaya !== "IRBI tidak tersedia").length, 514);
assert.equal(semuaKab.filter((item) => item.nilai["banjir-bandang"] !== "IRBI tidak tersedia").length, 420);
assert.equal(semuaKab.some((item) => Object.values(item.nilai).includes("0,00")), false);
const unduhAceh = barisUnduh(irbiProvinsi, { provinsi: ["Aceh"], ancaman: ["banjir", "multibahaya"] });
assert.equal(unduhAceh.length, 23);
assert.equal(Object.keys(unduhAceh[0].nilai).join(","), "banjir,multibahaya");
const csvNasional = csvIrbiNasional(unduhAceh, ["banjir", "multibahaya"]);
assert.match(csvNasional, /Penggunaan internal/);
assert.match(csvNasional, /IRBI tidak tersedia/);
assert.equal(csvNasional.includes("Google Sheets"), false);
const lembarNasional = lembarIrbiNasional(unduhAceh, ["banjir"]);
assert.equal(lembarNasional.nama, "IRBI 2025");
assert.match(lembarNasional.baris[1][0], /Penggunaan internal/);
assert.equal(susunIrbiNasional({}).every((grup) => grup.kab.every((item) => item.nilai.banjir === IRBI_BELUM_BERKAS)), true);
assert.match(readFileSync("src/components/FloodPage.jsx", "utf8"), /Tabel IRBI lengkap ada di tab IRBI/);
assert.equal(readFileSync("src/components/FloodPage.jsx", "utf8").includes("<IrbiBanjirLongsor"), false);
assert.match(readFileSync("src/App.jsx", "utf8"), /page === "irbi"/);
assert.equal(lembarRekap({ irbi: { "11.01": { kelas: "Tinggi", skor: 26.84 } }, longsor: { "11.01": { kelas: "Tinggi", skor: 26.4 } } }).some((item) => item.nama === "IRBI 2025 Banjir & Longsor"), true);
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
  "kedaluwarsa",
);
assert.equal(
  catWilayah(lampauDenganSeverity, { tab: "cap", cakupan: "nasional", tertunda: true }).fill,
  WARNA_TANPA_PERINGATAN,
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
// Titik FIRMS di Jakarta Utara tidak selalu ada pada jendela 5 hari.
// Bila baris itu ada, kecamatan dan kode adm harus tetap dari batas resmi.
// Jangan mewajibkan barisnya: pemeriksaan yang gagal di sini menggagalkan build Pages
// sesudah commit, dan push bot tidak memicu workflow Pages lain.
const hotspotJakarta = readFileSync("data/live/hotspot.csv", "utf8")
  .split("\n")
  .find((line) => line.includes("DKI Jakarta,Kota Adm. Jakarta Utara"));
if (hotspotJakarta) assert.match(hotspotJakarta, /Cilincing,31\.72\.04,31\.72,31/);
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
assert.match(daftarSumber, /<th scope="col">No<\/th>[\s\S]*<th scope="col">Kab\/Kota<\/th>[\s\S]*<th scope="col">Provinsi<\/th>[\s\S]*<th scope="col">Status<\/th>[\s\S]*<th scope="col">[\s\S]*Historis[\s\S]*<th scope="col">IRBI<\/th>/);
assert.match(daftarSumber, /Penjelasan kolom Historis/);
assert.match(daftarSumber, /HISTORIS_DISCLAIMER/);
assert.match(HISTORIS_DISCLAIMER, /tercatat di DIBI BNPB/);
assert.match(HISTORIS_DISCLAIMER, /tahun 2024/);
assert.match(HISTORIS_DISCLAIMER, /a4daec53-1119-43ef-b05e-00ec3a4c42a4/);
assert.match(HISTORIS_DISCLAIMER, new RegExp(formatWib(HISTORIS_CUPLIKAN_DIAMBIL).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(HISTORIS_DISCLAIMER, /20 Oktober 2026/);
assert.match(HISTORIS_DISCLAIMER, /tidak lengkap atau kurang dilaporkan/);
assert.match(HISTORIS_DISCLAIMER, /bukan jumlah seluruh kejadian yang benar-benar terjadi/);
assert.match(HISTORIS_DISCLAIMER, /tidak mengubah status Awas, Siaga, atau Waspada/);
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
assert.match(HISTORIS_BANJIR_CATATAN, /2011–2025/);
assert.match(HISTORIS_BANJIR_CATATAN, /20 Oktober 2026/);
assert.match(HISTORIS_BANJIR_CATATAN, /21044ffd-c397-4b3c-acbd-5adaa03d79e3/);
assert.match(HISTORIS_BANJIR_CATATAN, /semua jenis/);
assert.match(HISTORIS_BANJIR_CATATAN, /5ff9f41f-8312-4b7c-aa18-fdbedac6ee7e/);
assert.equal(DIBI_UNAVAILABLE, "Cuplikan DIBI belum tersedia");
assert.match(readFileSync("src/components/MetodePage.jsx", "utf8"), /HISTORIS_BANJIR_CATATAN/);
assert.match(readFileSync("src/components/FloodPage.jsx", "utf8"), /HISTORIS_BANJIR_CATATAN/);
assert.match(readFileSync("src/components/MetodePage.jsx", "utf8"), /HISTORIS_DISCLAIMER/);
assert.match(readFileSync("src/components/FloodPage.jsx", "utf8"), /flood-disclaimer[\s\S]*HISTORIS_DISCLAIMER/);
assert.equal(readFileSync("src/lib/floodMatrix.js", "utf8").includes("kejadian (2011"), false);
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
assert.match(readFileSync("src/components/FloodRiskMap.jsx", "utf8"), /position: "topright"/);
assert.match(readFileSync("src/components/FloodRiskMap.jsx", "utf8"), /hujan-kontrol/);
assert.match(readFileSync("src/components/FloodRiskMap.jsx", "utf8"), /Lapisan Peta/);
assert.match(readFileSync("src/components/FloodRiskMap.jsx", "utf8"), /Data Pembanding/);
assert.match(readFileSync("src/components/FloodRiskMap.jsx", "utf8"), /Tingkat Peringatan/);
assert.match(readFileSync("src/components/FloodRiskMap.jsx", "utf8"), /Tidak ada status/);
assert.match(petaBanjirSumber, /const OPASITAS_ABU = 0\.15/);
assert.match(petaBanjirSumber, /fillOpacity: OPASITAS_ABU/);
assert.match(petaBanjirSumber, /fillOpacity: 0\.78/);
assert.match(petaBanjirSumber, /LABEL_KEDALUWARSA/);
assert.match(readFileSync("src/components/FloodRiskMap.jsx", "utf8"), /Tidak ada data/);
assert.match(readFileSync("src/components/FloodRiskMap.jsx", "utf8"), /position: "bottomleft"/);
assert.match(readFileSync("src/components/FloodRiskMap.jsx", "utf8"), /position: "topleft"/);
assert.equal(readFileSync("src/components/FloodRiskMap.jsx", "utf8").includes("layer-checks"), false);
assert.equal(readFileSync("src/components/FloodRiskMap.jsx", "utf8").includes("layer-pembanding"), false);
assert.match(readFileSync("src/components/FloodRiskMap.jsx", "utf8"), /HUJAN_PEMBANDING_BADGE/);
assert.equal(HUJAN_PEMBANDING_JENIS, "prakiraan model ECMWF (via Open-Meteo), bukan BMKG");
assert.equal(HUJAN_PEMBANDING_MODEL, "ecmwf_ifs025");
assert.match(HUJAN_TANPA_NOWCAST, /tidak punya nowcast 0–3 jam/);
assert.match(HUJAN_TANPA_NOWCAST, /Hari ini, Besok, dan Lusa/);
assert.match(HUJAN_TANPA_NOWCAST, /Tab 0–3 jam hanya memuat peringatan CAP BMKG/);
assert.equal(readFileSync("src/components/FloodPage.jsx", "utf8").includes("Jumlah yang tampil pada tab ini adalah jumlah harian"), false);
assert.match(readFileSync("src/components/FloodPage.jsx", "utf8"), /tab !== "cap" && showHujan/);
assert.equal(readFileSync("src/components/MetodePage.jsx", "utf8").includes("Pada tab 0–3 jam angka yang tampil"), false);
assert.equal(readFileSync("src/lib/analisisPantauBencana.js", "utf8").includes("hujanPembanding"), false);
assert.match(readFileSync("src/components/MetodePage.jsx", "utf8"), /HUJAN_PEMBANDING_JENIS/);
assert.match(readFileSync("src/components/MetodePage.jsx", "utf8"), /HUJAN_PEMBANDING_MODEL/);
assert.match(readFileSync("src/components/MetodePage.jsx", "utf8"), /HUJAN_TANPA_NOWCAST/);
assert.match(readFileSync("src/components/FloodRiskMap.jsx", "utf8"), /HUJAN_TANPA_NOWCAST/);
assert.match(readFileSync("src/components/FloodRiskMap.jsx", "utf8"), /CC BY 4\.0/);
assert.match(readFileSync("src/components/FloodPage.jsx", "utf8"), /flood-disclaimer[\s\S]*HUJAN_PEMBANDING_JENIS/);
assert.match(readFileSync("src/components/FloodInfoTable.jsx", "utf8"), /hujanFallback/);
assert.match(readFileSync("src/components/MetodePage.jsx", "utf8"), /HUJAN_GPM_CATATAN/);
assert.match(HUJAN_GPM_CATATAN, /tidak dipakai/i);
assert.match(readFileSync("scripts/hujan-pembanding.mjs", "utf8"), /kept_previous/);
assert.match(readFileSync("scripts/hujan-pembanding.mjs", "utf8"), /HUJAN_PEMBANDING_MODEL/);
assert.equal(readFileSync("scripts/hujan-pembanding.mjs", "utf8").includes('"ecmwf_ifs"'), false);
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
assert.equal(readFileSync(".github/workflows/refresh-cap.yml", "utf8").includes("prakiraan-kab.mjs"), false);
assert.match(readFileSync(".github/workflows/refresh-cap.yml", "utf8"), /12,42 \* \* \* \*/);
assert.equal(PRAKIRAAN_CRON, "0 0,2,12,14 * * *");
const workflowPrakiraan = readFileSync(".github/workflows/refresh-prakiraan.yml", "utf8");
assert.match(workflowPrakiraan, /0 0,2,12,14 \* \* \*/);
assert.match(workflowPrakiraan, /workflow_dispatch/);
assert.match(workflowPrakiraan, /group: refresh-prakiraan/);
assert.match(workflowPrakiraan, /cancel-in-progress: false/);
assert.match(workflowPrakiraan, /timeout-minutes: 40/);
assert.match(workflowPrakiraan, /timeout-minutes: 20/);
assert.match(workflowPrakiraan, /prakiraan-kab\.mjs/);
assert.match(workflowPrakiraan, /snapshot-rebase\.mjs[\s\S]*prakiraan-kab\.mjs/);
assert.match(workflowPrakiraan, /Tidak ada commit/);
assert.equal(workflowPrakiraan.includes("FIRMS_MAP_KEY"), false);
assert.equal(ULANG_ANALISIS_MAKS, 3);
assert.equal(JARAK_ULANG_ANALISIS_MS, 45000);
assert.equal(tanggalKalenderWib("2026-10-20T00:00:00Z"), "2026-10-20");
assert.equal(tanggalKalenderWib("2026-10-20T18:00:00Z"), "2026-10-21");
assert.equal(analisisLebihLama("2026-10-20T00:00:00Z", "2026-10-21T00:08:31.406Z"), true);
assert.equal(analisisLebihLama("2026-10-20T00:00:00Z", "2026-10-20T08:40:34.088Z"), false);
assert.equal(analisisLebihLama("", "2026-10-21T00:08:31.406Z"), false);
assert.equal(perluUlangAnalisis({ analysisUtc: "2026-10-20T00:00:00Z", sekarang: "2026-10-21T00:08:31.406Z", percobaan: 0 }), true);
assert.equal(perluUlangAnalisis({ analysisUtc: "2026-10-20T00:00:00Z", sekarang: "2026-10-21T00:08:31.406Z", percobaan: 2 }), true);
assert.equal(perluUlangAnalisis({ analysisUtc: "2026-10-20T00:00:00Z", sekarang: "2026-10-21T00:08:31.406Z", percobaan: 3 }), false);
assert.equal(perluUlangAnalisis({ analysisUtc: "2026-10-21T00:00:00Z", sekarang: "2026-10-21T00:08:31.406Z", percobaan: 0 }), false);
assert.equal(analisisLebihBaru("2026-10-21T00:00:00Z", "2026-10-20T00:00:00Z"), true);
assert.equal(analisisLebihBaru("2026-10-20T00:00:00Z", "2026-10-20T00:00:00Z"), false);
assert.equal(analisisLebihBaru("2026-10-20T00:00:00Z", "2026-10-21T00:00:00Z"), false);
assert.equal(analisisLebihBaru("", "2026-10-20T00:00:00Z"), false);
assert.equal(analisisLebihBaru("2026-10-21T00:00:00Z", ""), true);
const labelLama = labelAnalisisBmkg({
  analysisUtc: "2026-10-20T00:00:00Z",
  fetchedAt: "2026-10-21T00:08:31.406Z",
  tanggal: ["2026-10-22", "2026-10-20", "2026-10-21"],
  sekarang: "2026-10-21T00:08:31.406Z",
});
assert.match(labelLama, /lebih lama dari hari 21 Oktober 2026/);
assert.match(labelLama, /Bukan terbitan hari itu/);
assert.match(labelLama, /Tanggal pada cuplikan: 2026-10-20, 2026-10-21, 2026-10-22/);
assert.equal(labelLama.includes("2026-10-23"), false);
const labelSama = labelAnalisisBmkg({
  analysisUtc: "2026-10-21T00:00:00Z",
  fetchedAt: "2026-10-21T02:00:00.000Z",
  tanggal: ["2026-10-21", "2026-10-22", "2026-10-23"],
  sekarang: "2026-10-21T02:00:00.000Z",
});
assert.equal(labelSama.includes("lebih lama"), false);
assert.match(labelSama, /Tanggal pada cuplikan: 2026-10-21, 2026-10-22, 2026-10-23/);
const skripKab = readFileSync("scripts/prakiraan-kab.mjs", "utf8");
const skripRefresh = readFileSync("scripts/refresh-live-data.mjs", "utf8");
assert.match(skripKab, /perluUlangAnalisis/);
assert.match(skripKab, /analisisLebihBaru/);
assert.match(skripKab, /Cuplikan tidak diubah/);
assert.match(skripKab, /14\.71\.05\.1001/);
assert.match(skripRefresh, /tidak diambil di pembaruan umum/);
assert.equal(skripRefresh.includes("fetchBmkg"), false);
assert.match(readFileSync("src/components/FloodPage.jsx", "utf8"), /labelAnalisisBmkg/);
assert.match(readFileSync("src/components/ExtraLayers.jsx", "utf8"), /labelAnalisisBmkg/);
assert.equal(readFileSync(".github/workflows/refresh-data.yml", "utf8").includes(REFRESH_CRON), true);
assert.equal(readFileSync(".github/workflows/refresh-cap.yml", "utf8").includes("12,42 * * * *"), true);
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
assert.match(floodSource, /Klasifikasi DAS belum terintegrasi/);
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
assert.equal(JSON.parse(readFileSync(join(capSimpan, "bmkg-cap-kab-meta.json"), "utf8")).cakupan, undefined);
assert.equal(readFileSync(join(capSimpan, "bmkg-cap-kab.csv"), "utf8").includes("11.01"), true);
rmSync(capSimpan, { recursive: true, force: true });
const capHeal = mkdtempSync(join(tmpdir(), "cap-cakupan-"));
writeFileSync(join(capHeal, "bmkg-cap-kab.csv"), "kode,kabupaten\n11.01,Aceh Selatan\n");
writeFileSync(
  join(capHeal, "bmkg-cap-kab-meta.json"),
  `${JSON.stringify({ status: "ok", fetched_at: "2026-10-20T01:17:04.008Z", baris: 8, error: null })}\n`,
);
assert.equal(lengkapiCakupanMeta(capHeal), true);
assert.equal(JSON.parse(readFileSync(join(capHeal, "bmkg-cap-kab-meta.json"), "utf8")).cakupan, "nasional");
assert.equal(JSON.parse(readFileSync(join(capHeal, "bmkg-cap-kab-meta.json"), "utf8")).fetched_at, "2026-10-20T01:17:04.008Z");
assert.equal(lengkapiCakupanMeta(capHeal), false);
const capHealHasil = writeCapKabFiles(capHeal, {
  status: "gagal",
  rows: [],
  error: "Failed to execute query.",
  fetchedAt: "2026-10-20T06:37:17.308Z",
});
assert.equal(capHealHasil.kept_previous, true);
assert.equal(JSON.parse(readFileSync(join(capHeal, "bmkg-cap-kab-meta.json"), "utf8")).fetched_at, "2026-10-20T01:17:04.008Z");
assert.equal(readFileSync(join(capHeal, "bmkg-cap-kab.csv"), "utf8").includes("11.01"), true);
rmSync(capHeal, { recursive: true, force: true });
assert.equal(cakupanTersimpan({ status: "ok", baris: 8, error: null }), "nasional");
assert.equal(cakupanTersimpan({ status: "ok", cakupan: "nasional" }), "nasional");
assert.equal(cakupanTersimpan({ status: "gagal", error: "Failed to execute query." }), "");
assert.equal(cakupanTersimpan(null), "");
const capLive = JSON.parse(readFileSync("data/live/bmkg-cap-kab-meta.json", "utf8"));
assert.equal(capLive.status, "ok");
assert.equal(capLive.cakupan, "nasional");
assert.equal(capLive.error, null);
const hujanLive = JSON.parse(readFileSync("data/live/hujan-pembanding-kab-meta.json", "utf8"));
assert.equal(hujanLive.status, "ok");
assert.equal(hujanLive.lisensi, "CC BY 4.0");
assert.equal(hujanLive.variabel, "precipitation_sum");
assert.ok(Number(hujanLive.record_count) > 0);
assert.ok(hujanLive.model === HUJAN_PEMBANDING_MODEL || hujanLive.model === "ECMWF IFS");
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
assert.match(capWorkflow, /snapshot-rebase\.mjs[\s\S]*cap-kab\.mjs/);
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
assert.equal(parseRoute("#/siklon"), "siklon");
assert.equal(parseRoute("#/irbi"), "irbi");
assert.equal(parseLocation("#/banjir").page, "ringkasan");
assert.equal(parseLocation("#/sumber").page, "sumber");
assert.equal(parseLocation("#/sumber-data").page, "sumber");
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
assert.match(readFileSync("src/components/DashboardView.jsx", "utf8"), /<PrioritasPanel /);
assert.match(readFileSync("src/components/ExtraLayers.jsx", "utf8"), /<ForecastPanel/);
assert.match(readFileSync("src/components/MetodePage.jsx", "utf8"), /Logika pemantauan/);
assert.match(readFileSync("src/components/MetodePage.jsx", "utf8"), /<h3>Gunung api<\/h3>/);
const headerNav = readFileSync("src/components/SiteHeader.jsx", "utf8");
const topNav = headerNav.slice(headerNav.indexOf("const TOP"), headerNav.indexOf("const KARHUTLA_PAGES"));
assert.match(topNav, /\["ringkasan", "Ringkasan", "#\/"\],\s*\];/);
assert.equal(topNav.indexOf('["karhutla"') < topNav.indexOf('["ringkasan"'), true);
assert.equal(topNav.includes("Glosarium"), false);
assert.match(topNav, /\["info", "Info", "#\/sumber-metode"\]/);
assert.match(topNav, /\["siklon", "Siklon", "#\/siklon"\]/);
assert.match(topNav, /\["irbi", "IRBI", "#\/irbi"\]/);
assert.equal(topNav.indexOf('["gunung-api"') < topNav.indexOf('["siklon"'), true);
assert.equal(topNav.indexOf('["siklon"') < topNav.indexOf('["info"'), true);
assert.equal(topNav.indexOf('["info"') < topNav.indexOf('["irbi"'), true);
assert.equal(topNav.indexOf('["irbi"') < topNav.indexOf("Rekap Harian"), true);
const subNav = headerNav.slice(headerNav.indexOf("const KARHUTLA_PAGES"), headerNav.indexOf("function topCurrent"));
assert.match(subNav, /Peta dan Data/);
assert.match(subNav, /Potensi 7 hari/);
assert.match(subNav, /Kualitas Udara \(ISPU\)/);
assert.match(subNav, /Logika Pemantauan/);
assert.equal(subNav.includes("Sumber Data"), false);
assert.equal(subNav.includes("Glosarium"), false);
assert.equal(subNav.includes("Ringkasan"), false);
assert.equal(subNav.includes("Rekap"), false);
assert.match(topNav, /Rekap Harian/);
assert.equal(topNav.indexOf("Rekap Harian") < topNav.indexOf("Ringkasan"), true);
assert.equal(topNav.indexOf('["info"') < topNav.indexOf("Rekap Harian"), true);
assert.equal(parseRoute("#/rekap-harian"), "rekap");
assert.equal(parseLocation("#/karhutla/rekap-harian").page, "rekap");
assert.equal(parseRoute("#/lain"), "ringkasan");
assert.equal(readFileSync("src/lib/rekapHarian.js", "utf8").includes("peluang_hujan"), false);
assert.equal(barisRekap(null, "").length, 514);
const acehRekap = barisRekap(null, "Aceh");
assert.equal(acehRekap.length > 0 && acehRekap.length < 514, true);
assert.equal(acehRekap.every((item) => item.provinsi === "Aceh"), true);
assert.equal(kelasFwiGwis(-9999), "");
assert.equal(kelasFwiGwis(11.199), "Rendah");
assert.equal(kelasFwiGwis(11.2), "Sedang");
assert.equal(kelasFwiGwis(21.3), "Tinggi");
assert.equal(kelasFwiGwis(38), "Sangat tinggi");
assert.equal(kelasFwiGwis(50), "Ekstrem");
assert.equal(kelasFwiGwis(70), "Ekstrem");
assert.equal(kelasFwiGwis(70.1), "Sangat ekstrem");
assert.equal(tandaiHujan({ curah_hujan_mm: "5", peluang_hujan_maks: "99" }), false);
assert.equal(tandaiHujan({ curah_hujan_mm: "20" }), false);
assert.equal(tandaiHujan({ curah_hujan_mm: "20.1" }), true);
assert.equal(tandaiHujan({ peluang_hujan_maks: "100" }), null);
assert.match(teksHujan(25), /ya/);
assert.match(teksHujan(5), /tidak/);
const kabRekap = [
  { kode: "11.01", nama: "Aceh Selatan", provinsi: "Aceh" },
  { kode: "14.04", nama: "Indragiri Hilir", provinsi: "Riau" },
];
const cuplikanLama = susunCuplikan({
  hariWib: "2026-10-21",
  kab: kabRekap,
  hotspot: [
    { tanggal: "2026-10-20", kode_kabupaten: "11.01", kepercayaan: "n" },
    { tanggal: "2026-10-20", kode_kabupaten: "11.01", kepercayaan: "l" },
    { tanggal: "2026-10-20", kode_kabupaten: "", kepercayaan: "h" },
    { tanggal: "2026-10-20", kode_kabupaten: "14.04", kepercayaan: "h" },
  ],
  fwi: [
    { tanggal: "2026-10-21", kode: "11.01", fwi: 12 },
    { tanggal: "2026-10-22", kode: "11.01", fwi: 1 },
  ],
});
assert.equal(cuplikanLama.baris["11.01"].h["2026-10-20"], 1);
assert.equal(cuplikanLama.baris["14.04"].h["2026-10-20"], 1);
assert.equal(cuplikanLama.meta.hotspotTanpaKode, 1);
const cuplikanBaru = susunCuplikan({
  hariWib: "2026-10-22",
  kab: kabRekap,
  fwi: [
    { tanggal: "2026-10-21", kode: "11.01", fwi: 99 },
    { tanggal: "2026-10-22", kode: "11.01", fwi: 40 },
    { tanggal: "2026-10-23", kode: "11.01", fwi: 3 },
    { tanggal: "2026-10-24", kode: "11.01", fwi: 4 },
  ],
});
assert.equal(cuplikanBaru.baris["11.01"].f["2026-10-21"], undefined);
assert.equal(cuplikanBaru.baris["11.01"].f["2026-10-22"], 40);
const rekapGabung = gabungRekap(cuplikanLama, cuplikanBaru);
assert.equal(rekapGabung.baris["11.01"].f["2026-10-21"], 12);
assert.equal(rekapGabung.baris["11.01"].f["2026-10-22"], 40);
assert.equal(rekapGabung.baris["11.01"].f["2026-10-24"], 4);
assert.equal(rekapGabung.baris["11.01"].h["2026-10-20"], 1);
assert.equal(rekapGabung.statis.ispu, REKAP_BELUM);
assert.equal(rekapGabung.statis.iki, REKAP_BELUM);
assert.equal(rekapGabung.statis.pvmbg, REKAP_BELUM);
assert.equal(rekapGabung.statis.irbiLongsor, undefined);
const paramLongsor = { id: "longsor", jenis: "irbi", peta: "longsor" };
const cuplikanLongsor = susunCuplikan({
  hariWib: "2026-10-22",
  kab: kabRekap,
  longsor: [
    { kode_wilayah: "11.01", skor: "26.40", kelas: "TINGGI" },
    { kode_wilayah: "14.04", skor: "", kelas: "" },
  ],
});
assert.equal(nilaiParameter(cuplikanLongsor, "11.01", paramLongsor, ""), "Tinggi (26,40)");
assert.equal(nilaiParameter(cuplikanLongsor, "14.04", paramLongsor, ""), IRBI_TIDAK_TERSEDIA);
assert.equal(gabungRekap(cuplikanLama, cuplikanLongsor).longsor["11.01"].kelas, "Tinggi");
assert.match(readFileSync("src/components/RekapHarian.jsx", "utf8"), /param\?\.id === "irbi" \|\| param\?\.id === "longsor"/);
assert.match(catatanParameter(paramLongsor), /455 kabupaten\/kota/);
assert.match(catatanParameter(paramLongsor), /IRBI tidak tersedia/);
assert.equal(rekapGabung.sumber.sipongi.status, "Tautan saja");
assert.equal(kodeSipongi("Aceh", "ACEH SELATAN"), "11.01");
assert.equal(kodeSipongi("Gorontalo", "PAHUWATO"), "75.04");
assert.equal(kodeSipongi("DKI Jakarta", "KOTA ADMINISTRASI JAKARTA UTARA"), "31.72");
assert.equal(kodeSipongi("Sulawesi Utara", "KEPULAUAN SIAU TAGULANDANG BIARO"), "71.09");
assert.equal(kodeSipongi("Sulawesi Selatan", "PANGKAJENE KEPULAUAN"), "73.10");
assert.equal(kodeSipongi("Papua Barat Daya", "KOTA SORONG"), "96.71");
assert.equal(kodeSipongi("Papua Barat Daya", "SORONG"), "96.01");
assert.equal(kodeSipongi("Lampung", ""), "");
assert.match(readFileSync("scripts/ambil-sipongi.mjs", "utf8"), /curl\/8\.5\.0/);
assert.equal(readFileSync("scripts/ambil-sipongi.mjs", "utf8").includes("Authorization"), false);
assert.match(readFileSync("src/components/RekapHarian.jsx", "utf8"), /FIRMS pembanding/);
const paramFwi = { id: "fwi", bidang: "f", cakupan: "fwi", jenis: "fwi" };
assert.equal(nilaiParameter(rekapGabung, "14.04", paramFwi, "2026-10-22"), REKAP_KOSONG);
const hujanKosong = susunCuplikan({
  hariWib: "2026-10-22",
  kab: kabRekap,
  hujan: [{ tanggal: "2026-10-22", kode: "11.01", curah_hujan_mm: "", peluang_hujan_maks: "90" }],
  irbi: [{ kode_wilayah: "11.01", skor: "", kelas: "" }],
});
assert.equal(hujanKosong.baris["11.01"]?.m?.["2026-10-22"], undefined);
assert.equal(hujanKosong.irbi["11.01"], undefined);
const hariLaporan = titikHariTerbaru([
  { tanggal: "2026-10-16", lintang: 0, bujur: 100, kelasKepercayaan: "tinggi", provinsi: "Riau" },
  { tanggal: "2026-10-17", lintang: 0, bujur: 101, kelasKepercayaan: "nominal", provinsi: "Jambi" },
  { tanggal: "2026-10-17", lintang: 1, bujur: 102, kelasKepercayaan: "rendah", provinsi: "Riau" },
]);
assert.equal(hariLaporan.hari, "2026-10-17");
assert.equal(hariLaporan.hitung.merah, 0);
assert.equal(hariLaporan.hitung.oranye, 1);
assert.equal(hariLaporan.hitung.kuning, 1);
assert.equal(hariLaporan.puncak[0].nama, "Jambi");
assert.deepEqual(hitungStatusBanjir([{ status: "Awas" }, { status: "Siaga" }, { status: "Siaga" }, { status: "Waspada" }, { status: "lain" }]), { Awas: 1, Siaga: 2, Waspada: 1 });
assert.equal(puncakBanjir([{ status: "Awas", kab_kota: "A" }, { status: "lain" }, { status: "Siaga", kab_kota: "B" }]).length, 2);
const titikBatas = muatTitikBatas();
assert.equal(titikBatas.points.length, 514);
assert.equal(titikBatas.gagal.length, 0);
const topoTitik = JSON.parse(readFileSync("data/static/batas-kabkota.topojson", "utf8"));
const geoTitik = (await import("topojson-client")).feature(topoTitik, topoTitik.objects.kabupaten);
const fiturAceh = geoTitik.features.find((item) => item.properties.kode === "11.01");
const titikAceh = titikBatas.points.find((item) => item.kode === "11.01");
assert.equal(pointInGeometry(titikAceh.bujur, titikAceh.lintang, fiturAceh.geometry), true);
assert.match(readFileSync("scripts/refresh-live-data.mjs", "utf8"), /prioritas_aplus/);
assert.match(readFileSync("src/components/SiteHeader.jsx", "utf8"), /Potensi 7 hari/);
assert.match(readFileSync("src/lib/potensiTujuh.js", "utf8"), /Potensi karhutla 7 hari ke depan/);
assert.match(readFileSync("src/components/PotensiTujuhHari.jsx", "utf8"), /hasil\.judul/);
assert.match(readFileSync("src/components/PotensiTujuhHari.jsx", "utf8"), /Pembanding \(data terbuka, bukan resmi\)/);
assert.match(readFileSync("src/components/PotensiTujuhHari.jsx", "utf8"), /belum terintegrasi/);
assert.match(readFileSync("src/components/PotensiTujuhHari.jsx", "utf8"), /Petunjuk skoring/);
assert.match(readFileSync("src/components/PotensiTujuhHari.jsx", "utf8"), /peringkat persentil yang sama/);
assert.match(readFileSync("src/components/PotensiTujuhHari.jsx", "utf8"), /#\/sumber-metode\/potensi-7-hari/);
assert.match(readFileSync("src/components/PotensiTujuhHari.jsx", "utf8"), /tidak membedakan peringkat/);
const seriPersentil = percentRanks([3, 3, 3]);
assert.equal(seriPersentil[0], 0.5);
assert.equal(seriPersentil[1], 0.5);
assert.equal(seriPersentil[2], 0.5);
const bedaPersentil = percentRanks([1, 2, 2]);
assert.equal(bedaPersentil[1], bedaPersentil[2]);
assert.equal(bedaPersentil[0] < bedaPersentil[1], true);
const hujanSama = ringkasHujanModel([
  { skor: 0.2, hariBasah: 0, hujanHari: 7 },
  { skor: 0.8, hariBasah: 0, hujanHari: 7 },
]);
assert.equal(hujanSama.membedakan, false);
assert.equal(hujanSama.kelompok[0].hari, 0);
assert.equal(hujanSama.jumlah, 2);
const hujanBeda = ringkasHujanModel([
  { skor: 0.2, hariBasah: 0, hujanHari: 7 },
  { skor: 0.4, hariBasah: 1, hujanHari: 7 },
  { skor: null, hariBasah: 5, hujanHari: 7 },
]);
assert.equal(hujanBeda.membedakan, true);
assert.equal(hujanBeda.jumlah, 2);
assert.deepEqual(hujanBeda.kelompok, [{ hari: 0, jumlah: 1 }, { hari: 1, jumlah: 1 }]);
assert.match(readFileSync("src/lib/potensiTujuh.js", "utf8"), /bukan prakiraan resmi/);
assert.match(readFileSync("src/lib/potensiTujuh.js", "utf8"), /hingga H\+7 sesuai produk BMKG/);
assert.match(readFileSync("src/lib/potensiTujuh.js", "utf8"), /precipitation_sum/);
assert.match(readFileSync("src/lib/potensiTujuh.js", "utf8"), /bukan precipitation_probability/);
assert.equal(readFileSync("src/lib/potensiTujuh.js", "utf8").includes("peluang_hujan"), false);
const hariPotensi = ["2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27"];
const fwiPotensi = [];
const hujanPotensi = [];
for (const tanggal of hariPotensi) {
  fwiPotensi.push({ tanggal, kode: "1504", kabupaten: "BATANGHARI", provinsi: "Jambi", fwi: 20 });
  fwiPotensi.push({ tanggal, kode: "1408", kabupaten: "SIAK", provinsi: "Riau", fwi: 1 });
  hujanPotensi.push({ tanggal, kode: "1504", kabupaten: "BATANGHARI", curahHujan: 0, peluang: 100 });
  hujanPotensi.push({ tanggal, kode: "1408", kabupaten: "SIAK", curahHujan: tanggal === "2026-10-21" ? 40 : 0, peluang: 0 });
}
fwiPotensi.push({ tanggal: "2026-10-21", kode: "1602", kabupaten: "OGAN KOMERING ILIR", fwi: 30 });
fwiPotensi.push({ tanggal: "2026-10-22", kode: "1602", kabupaten: "OGAN KOMERING ILIR", fwi: 30 });
hujanPotensi.push({ tanggal: "2026-10-21", kode: "1602", curahHujan: 0, peluang: 100 });
hujanPotensi.push({ tanggal: "2026-10-22", kode: "1602", curahHujan: 0, peluang: 100 });
const potensiSegar = susunPotensiTujuh({
  fwiRows: fwiPotensi,
  hujanRows: hujanPotensi,
  hotspotRows: [
    { tanggal: "2026-10-20", kodeKabupaten: "15.04", kelasKepercayaan: "tinggi", wilayahStatus: "ok" },
    { tanggal: "2026-10-20", kodeKabupaten: "15.04", kelasKepercayaan: "rendah", wilayahStatus: "ok" },
    { tanggal: "2026-10-01", kodeKabupaten: "15.04", kelasKepercayaan: "tinggi", wilayahStatus: "ok" },
    { tanggal: "2026-10-20", kodeKabupaten: "61.04", kelasKepercayaan: "tinggi", wilayahStatus: "ok" },
  ],
  irbiRows: [{ provinsi: "Jambi", kabupaten: "Batanghari", indeks: 22.5, kelas: "Tinggi" }],
  fwiFetchedAt: "2026-10-21T00:00:00.000Z",
  hujanFetchedAt: "2026-10-21T00:00:00.000Z",
  hotspotFetchedAt: "2026-10-21T00:00:00.000Z",
  now: new Date("2026-10-21T06:00:00.000Z"),
});
assert.equal(potensiSegar.tersedia, true);
assert.equal(potensiSegar.dari, "2026-10-21");
assert.equal(potensiSegar.sampai, "2026-10-27");
assert.equal(potensiSegar.baris[0].kabupaten, "Batanghari");
assert.equal(potensiSegar.baris[0].kelas, "Sangat tinggi");
assert.equal(potensiSegar.baris[0].hariBasah, 0);
assert.equal(potensiSegar.baris[0].hotspot, 1);
assert.match(potensiSegar.baris[0].saran, /Verifikasi lapangan/);
assert.equal(potensiSegar.baris[0].irbi, 22.5);
const siakPotensi = potensiSegar.baris.find((row) => row.kabupaten === "Siak");
assert.equal(siakPotensi.kelas, "Rendah");
assert.equal(siakPotensi.hariBasah, 1);
assert.match(siakPotensi.saran, /Pantau/);
assert.equal(potensiSegar.baris.some((row) => row.provinsi === "Kalimantan Barat"), false);
const okiPotensi = potensiSegar.baris.find((row) => row.kode === "16.02");
assert.equal(okiPotensi.kelas, "Belum cukup data");
assert.equal(okiPotensi.skor, null);
assert.equal(potensiSegar.baris.at(-1).kode, "16.02");
const potensiNasional = susunPotensiTujuh({
  fwiRows: fwiPotensi,
  hujanRows: hujanPotensi,
  hotspotRows: [
    { tanggal: "2026-10-20", kodeKabupaten: "15.04", kelasKepercayaan: "tinggi", wilayahStatus: "ok" },
  ],
  fwiFetchedAt: "2026-10-21T00:00:00.000Z",
  hujanFetchedAt: "2026-10-21T00:00:00.000Z",
  hotspotFetchedAt: "2026-10-21T00:00:00.000Z",
  now: new Date("2026-10-21T06:00:00.000Z"),
  nasional: true,
  daftarWilayah: [
    { kode: "93.01", nama: "Merauke", provinsi: "Papua Selatan" },
    { kode: "72.01", nama: "Banggai", provinsi: "Sulawesi Tengah" },
  ],
});
assert.equal(potensiNasional.baris.find((row) => row.kode === "15.04").kelas, "Sangat tinggi");
assert.equal(potensiNasional.baris.find((row) => row.kode === "15.04").skor, potensiSegar.baris[0].skor);
assert.equal(potensiNasional.baris.find((row) => row.kabupaten === "Merauke").kelas, "Belum cukup data");
assert.equal(potensiNasional.baris.find((row) => row.kabupaten === "Merauke").skor, null);
assert.equal(potensiNasional.baris.find((row) => row.kabupaten === "Banggai").provinsi, "Sulawesi Tengah");
const potensiBasi = susunPotensiTujuh({
  fwiRows: fwiPotensi,
  hujanRows: hujanPotensi,
  hotspotRows: [],
  fwiFetchedAt: "2026-10-18T00:00:00.000Z",
  hujanFetchedAt: "2026-10-21T00:00:00.000Z",
  now: new Date("2026-10-21T06:00:00.000Z"),
});
assert.equal(potensiBasi.tersedia, false);
assert.match(potensiBasi.alasan.join(" "), /FWI pembanding lebih dari 36 jam/);
assert.match(readFileSync("src/components/PriorityIndicators.jsx", "utf8"), /menunggu data resmi|Tautan saja|belum/);

console.log("Pemeriksaan prototipe lulus.");
