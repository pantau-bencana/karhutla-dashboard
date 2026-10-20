import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bmkgForecastUrl, flattenBmkgForecast } from "../src/lib/bmkgForecast.js";
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

for (const row of sample) {
  let http = 0;
  try {
    const response = await fetch(bmkgForecastUrl(row.adm4), {
      headers: { Accept: "application/json", "User-Agent": "curl/8.5.0" },
      signal: AbortSignal.timeout(25000),
    });
    http = response.status;
    if (http === 200) {
      const payload = await response.json();
      const lokasi = payload?.lokasi;
      const slots = lokasi?.desa || lokasi?.kotkab ? flattenBmkgForecast(payload) : [];
      if (slots.length) {
        fresh.push(...slots.map((slot) => slotRow(row.kode_kab, slot)));
        observed = slots.find((slot) => slot.analysisUtc)?.analysisUtc || observed;
      } else {
        gagal.push(row.kode_kab);
      }
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

if (!rows.length) {
  writeFileSync(
    META,
    `${JSON.stringify(
      {
        status: "gagal",
        fetched_at: fetchedAt,
        observed_at: null,
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
      observed_at: observed || null,
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
