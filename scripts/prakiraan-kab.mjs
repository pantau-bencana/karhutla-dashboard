import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BMKG_LOCATIONS,
  JARAK_ULANG_ANALISIS_MS,
  ULANG_ANALISIS_MAKS,
  analisisLebihBaru,
  analisisLebihLama,
  bmkgForecastUrl,
  flattenBmkgForecast,
  labelAnalisisBmkg,
  perluUlangAnalisis,
} from "../src/lib/bmkgForecast.js";
import { parseCsv } from "../src/lib/csv.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SAMPLE = resolve(root, "data/static/prakiraan-sampel-adm4.csv");
const OUT = resolve(root, "data/live/bmkg-prakiraan-kab.csv");
const META = resolve(root, "data/live/bmkg-prakiraan-kab-meta.json");
const PROVINCE_OUT = resolve(root, "data/live/bmkg_prakiraan.csv");
const MANIFEST = resolve(root, "data/live/manifest.json");
const GAP_MS = 1100;
const PROVINCE_HEADERS = [
  "tanggal",
  "waktu_lokal",
  "provinsi",
  "kotkab",
  "kecamatan",
  "desa",
  "adm4",
  "suhu_c",
  "kelembapan_pct",
  "curah_hujan_tp",
  "kec_angin_kmj",
  "arah_angin",
  "cuaca",
  "kode_cuaca",
  "analysis_utc",
];

const HEADERS = [
  "kode_kab",
  "tanggal",
  "waktu_lokal",
  "provinsi",
  "kotkab",
  "kecamatan",
  "desa",
  "adm4",
  "suhu_c",
  "kelembapan_pct",
  "curah_hujan_tp",
  "kec_angin_kmj",
  "arah_angin",
  "cuaca",
  "kode_cuaca",
  "analysis_utc",
];

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function toCsv(rows, headers = HEADERS) {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvCell(row[header])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function slotRow(kode, slot) {
  return {
    kode_kab: kode,
    tanggal: slot.tanggal,
    waktu_lokal: slot.waktuLokal,
    provinsi: slot.provinsi,
    kotkab: slot.kotkab,
    kecamatan: slot.kecamatan,
    desa: slot.desa,
    adm4: slot.adm4,
    suhu_c: slot.suhu,
    kelembapan_pct: slot.kelembapan,
    curah_hujan_tp: slot.hujan,
    kec_angin_kmj: slot.anginKmj,
    arah_angin: slot.arahAngin,
    cuaca: slot.cuaca,
    kode_cuaca: slot.kodeCuaca,
    analysis_utc: slot.analysisUtc,
  };
}

const sample = parseCsv(readFileSync(SAMPLE, "utf8")).filter((row) => row.status === "ok" && row.adm4 && row.kode_kab);
const previous = existsSync(OUT) ? parseCsv(readFileSync(OUT, "utf8")) : [];
const fresh = [];
const gagal = [];
let observed = "";

async function ambilSatu(adm4) {
  const response = await fetch(bmkgForecastUrl(adm4), {
    headers: { Accept: "application/json", "User-Agent": "curl/8.5.0" },
    signal: AbortSignal.timeout(25000),
  });
  if (response.status !== 200) return { http: response.status, slots: [] };
  const payload = await response.json();
  const lokasi = payload?.lokasi;
  const slots = lokasi?.desa || lokasi?.kotkab ? flattenBmkgForecast(payload) : [];
  return { http: 200, slots };
}

// Jadwal: 07.00, 09.00, 19.00, 21.00 WIB. 09.00 dan 21.00 memeriksa analysis_date.
// Probe satu adm4. Ulang paling banyak 3 kali (45 detik) hanya bila tanggal analisis
// masih sebelum hari pengambilan. Bila tidak lebih baru dari cuplikan tersimpan, berhenti
// tanpa menulis berkas.
const metaLama = readJson(META);
const manifest = readJson(MANIFEST);
const tersimpanKab = metaLama?.observed_at || "";
const tersimpanProv = manifest?.datasets?.bmkg_prakiraan?.observed_at || "";
const probe = sample.find((row) => row.adm4 === "14.71.05.1001") ?? sample[0];
let probeAnalysis = "";
if (probe) {
  for (let percobaan = 0; percobaan <= ULANG_ANALISIS_MAKS; percobaan += 1) {
    let hasil;
    try {
      hasil = await ambilSatu(probe.adm4);
    } catch (error) {
      console.log(`Prakiraan probe ${probe.adm4} percobaan ${percobaan + 1}: gagal ${error?.message || error}`);
      break;
    }
    const analysis = hasil.slots.find((slot) => slot.analysisUtc)?.analysisUtc || "";
    const tanggal = [...new Set(hasil.slots.map((slot) => slot.tanggal).filter(Boolean))].sort();
    console.log(
      `Prakiraan probe ${probe.adm4} percobaan ${percobaan + 1}/${ULANG_ANALISIS_MAKS + 1}: http ${hasil.http} analisis ${analysis || "—"} tanggal ${tanggal.join(",") || "—"}`,
    );
    if (analysis) probeAnalysis = analysis;
    if (!analysis || !perluUlangAnalisis({ analysisUtc: analysis, percobaan })) break;
    console.log(
      `Analisis ${analysis} lebih lama dari hari pengambilan. Menunggu ${JARAK_ULANG_ANALISIS_MS / 1000} detik, sisa percobaan ${ULANG_ANALISIS_MAKS - percobaan}.`,
    );
    await sleep(JARAK_ULANG_ANALISIS_MS);
  }
}

const kabPerlu = analisisLebihBaru(probeAnalysis, tersimpanKab);
const provPerlu = analisisLebihBaru(probeAnalysis, tersimpanProv);
if (!probeAnalysis || (!kabPerlu && !provPerlu)) {
  console.log(
    probeAnalysis
      ? `Analisis ${probeAnalysis} tidak lebih baru dari cuplikan tersimpan. Cuplikan tidak diubah.`
      : "Probe prakiraan tidak mengembalikan analysis_date. Cuplikan tidak diubah.",
  );
  process.exit(0);
}

const adm4Provinsi = new Set(BMKG_LOCATIONS.map((location) => location.adm4));

function barisProvinsi(rows, analysis) {
  const segar = rows.filter((row) => adm4Provinsi.has(row.adm4) && row.analysis_utc === analysis);
  const ada = new Set(segar.map((row) => row.adm4));
  const lama = existsSync(PROVINCE_OUT) ? parseCsv(readFileSync(PROVINCE_OUT, "utf8")) : [];
  const isi = lama.filter((row) => adm4Provinsi.has(row.adm4) && !ada.has(row.adm4));
  return [...segar, ...isi];
}

function tulisManifest(body, analysis, tanggal, fetchedAt, analyses) {
  if (!manifest?.datasets) return;
  const hash = createHash("sha256").update(body).digest("hex");
  const recordCount = Math.max(0, body.trim().split("\n").length - 1);
  const label = labelAnalisisBmkg({
    analysisUtc: analysis,
    fetchedAt,
    tanggal,
    sekarang: fetchedAt,
    analyses,
  });
  let berubah = false;
  for (const id of ["bmkg_prakiraan", "angin"]) {
    const entry = manifest.datasets[id];
    if (!entry) continue;
    if (entry.content_hash === hash && entry.observed_at === analysis) continue;
    entry.fetched_at = fetchedAt;
    entry.observed_at = analysis;
    entry.source_updated_at = analysis;
    entry.observed_label = label;
    entry.content_hash = hash;
    entry.record_count = recordCount;
    entry.status = "ok";
    entry.error = null;
    entry.kept_previous = false;
    entry.file = "data/live/bmkg_prakiraan.csv";
    berubah = true;
  }
  if (berubah) writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
}

function tulisProvinsi(rows, fetchedAt, analysis, tanggal, analyses) {
  const dipilih = barisProvinsi(rows, analysis);
  if (!dipilih.length) return;
  const body = toCsv(dipilih, PROVINCE_HEADERS);
  const sebelumnya = existsSync(PROVINCE_OUT) ? readFileSync(PROVINCE_OUT, "utf8") : "";
  if (body !== sebelumnya) writeFileSync(PROVINCE_OUT, body);
  tulisManifest(body, analysis, tanggal, fetchedAt, analyses);
}

if (kabPerlu) {
  for (const row of sample) {
    let http = 0;
    try {
      const hasil = await ambilSatu(row.adm4);
      http = hasil.http;
      if (http === 200 && hasil.slots.length) {
        fresh.push(...hasil.slots.map((slot) => slotRow(row.kode_kab, slot)));
        observed = hasil.slots.find((slot) => slot.analysisUtc)?.analysisUtc || observed;
      } else {
        gagal.push(row.kode_kab);
      }
    } catch {
      gagal.push(row.kode_kab);
    }
    if (http === 429) await sleep(60000);
    else await sleep(GAP_MS);
  }

  const freshKode = new Set(fresh.map((row) => row.kode_kab));
  const gagalSet = new Set(gagal);
  const kept = previous.filter((row) => gagalSet.has(row.kode_kab) && !freshKode.has(row.kode_kab));
  const rows = [...fresh, ...kept];
  const fetchedAt = new Date().toISOString();
  const analyses = [...new Set(fresh.map((row) => row.analysis_utc).filter(Boolean))].sort();
  const analysisTerbaru = analyses.at(-1) || observed || "";
  if (!analisisLebihBaru(analysisTerbaru, tersimpanKab)) {
    console.log(`Analisis ${analysisTerbaru || "—"} tidak lebih baru dari cuplikan tersimpan. Cuplikan tidak diubah.`);
    process.exit(0);
  }
  if (!rows.length) {
    console.error("Prakiraan kab/kota kosong. Cuplikan tidak diubah.");
    process.exit(0);
  }
  const tanggalTerbit = [...new Set(fresh.filter((row) => row.analysis_utc === analysisTerbaru).map((row) => row.tanggal).filter(Boolean))].sort();
  const observedLabel = labelAnalisisBmkg({
    analysisUtc: analysisTerbaru,
    fetchedAt,
    tanggal: tanggalTerbit,
    sekarang: fetchedAt,
    analyses,
  });
  const lebihLama = analisisLebihLama(analysisTerbaru, fetchedAt);
  writeFileSync(OUT, toCsv(rows));
  writeFileSync(
    META,
    `${JSON.stringify(
      {
        status: "ok",
        fetched_at: fetchedAt,
        observed_at: analysisTerbaru,
        observed_label: observedLabel,
        analisis_lebih_lama: lebihLama,
        tanggal: tanggalTerbit,
        kept_previous: kept.length > 0,
        diminta: sample.length,
        berhasil: freshKode.size,
        gagal: gagal.length,
        record_count: rows.length,
        titik: "satu adm4 per kab/kota",
        error: gagal.length ? `${gagal.length} kab/kota gagal; cuplikan sebelumnya dipertahankan bila ada.` : null,
      },
      null,
      2,
    )}\n`,
  );
  tulisProvinsi(fresh, fetchedAt, analysisTerbaru, tanggalTerbit, analyses);
  console.log(`Prakiraan kab/kota: ${freshKode.size} berhasil, ${gagal.length} gagal, ${rows.length} slot.`);
  console.log(observedLabel);
} else {
  const fetchedAt = new Date().toISOString();
  const sumber = previous.filter((row) => row.analysis_utc === probeAnalysis);
  const tanggalTerbit = [...new Set(sumber.map((row) => row.tanggal).filter(Boolean))].sort();
  tulisProvinsi(sumber, fetchedAt, probeAnalysis, tanggalTerbit, [probeAnalysis]);
  console.log(`Berkas enam provinsi diperbarui ke analisis ${probeAnalysis}. Cuplikan kabupaten tidak diubah.`);
}
