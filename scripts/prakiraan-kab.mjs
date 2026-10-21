import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  JARAK_ULANG_ANALISIS_MS,
  ULANG_ANALISIS_MAKS,
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
const GAP_MS = 1100;

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

function toCsv(rows) {
  const lines = [HEADERS.join(",")];
  for (const row of rows) {
    lines.push(HEADERS.map((header) => csvCell(row[header])).join(","));
  }
  return `${lines.join("\n")}\n`;
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

// Dokumentasi BMKG hanya menulis "2 kali sehari", tanpa menit terbit.
// Cron CAP tetap 12,42. Probe satu adm4, ulang paling banyak 3 kali (45 detik)
// hanya bila tanggal analisis WIB masih sebelum hari pengambilan, lalu ambil semua kab sekali.
const probe = sample.find((row) => row.adm4 === "14.71.05.1001") ?? sample[0];
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
    if (!perluUlangAnalisis({ analysisUtc: analysis, percobaan })) break;
    console.log(
      `Analisis ${analysis} lebih lama dari hari pengambilan. Menunggu ${JARAK_ULANG_ANALISIS_MS / 1000} detik, sisa percobaan ${ULANG_ANALISIS_MAKS - percobaan}.`,
    );
    await sleep(JARAK_ULANG_ANALISIS_MS);
  }
}

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
const tanggalTerbit = [...new Set(fresh.filter((row) => !analysisTerbaru || row.analysis_utc === analysisTerbaru).map((row) => row.tanggal).filter(Boolean))].sort();
const observedLabel = labelAnalisisBmkg({
  analysisUtc: analysisTerbaru,
  fetchedAt,
  tanggal: tanggalTerbit,
  sekarang: fetchedAt,
  analyses,
});
const lebihLama = analisisLebihLama(analysisTerbaru, fetchedAt);

if (!rows.length) {
  writeFileSync(
    META,
    `${JSON.stringify(
      {
        status: "gagal",
        fetched_at: fetchedAt,
        observed_at: null,
        observed_label: "Waktu analisis BMKG tidak ada pada cuplikan.",
        analisis_lebih_lama: false,
        kept_previous: false,
        diminta: sample.length,
        gagal: gagal.length,
        record_count: 0,
        error: "Tidak ada slot prakiraan.",
      },
      null,
      2,
    )}\n`,
  );
  console.error("Prakiraan kab/kota kosong.");
  process.exit(1);
}

writeFileSync(OUT, toCsv(rows));
writeFileSync(
  META,
  `${JSON.stringify(
    {
      status: "ok",
      fetched_at: fetchedAt,
      observed_at: analysisTerbaru || null,
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
console.log(`Prakiraan kab/kota: ${freshKode.size} berhasil, ${gagal.length} gagal, ${rows.length} slot.`);
console.log(observedLabel);
