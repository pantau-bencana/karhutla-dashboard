import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bmkgForecastUrl } from "../src/lib/bmkgForecast.js";
import { parseCsv } from "../src/lib/csv.js";
import { INDONESIA_FRAME } from "../src/lib/geo.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SAMPLE = resolve(root, "data/static/prakiraan-sampel-adm4.csv");
const OUT = resolve(root, "data/static/prakiraan-adm4-koordinat.csv");
const GAP_MS = 1100;

const HEADERS = ["kode_kab", "adm4", "lintang", "bujur", "provinsi", "kotkab", "kecamatan", "desa", "timezone"];

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
  for (const row of rows) lines.push(HEADERS.map((header) => csvCell(row[header])).join(","));
  return `${lines.join("\n")}\n`;
}

function inFrame(lat, lon) {
  return lat >= INDONESIA_FRAME.south && lat <= INDONESIA_FRAME.north && lon >= INDONESIA_FRAME.west && lon <= INDONESIA_FRAME.east;
}

const sample = parseCsv(readFileSync(SAMPLE, "utf8")).filter((row) => row.status === "ok" && row.adm4 && row.kode_kab);
const saved = existsSync(OUT) ? parseCsv(readFileSync(OUT, "utf8")) : [];
const byKode = new Map(saved.filter((row) => row.kode_kab && row.lintang && row.bujur).map((row) => [row.kode_kab, row]));
const pending = sample.filter((row) => !byKode.has(row.kode_kab));
console.log(`Koordinat adm4: ${byKode.size} tersimpan, ${pending.length} belum.`);

for (const row of pending) {
  let http = 0;
  let attempt = 0;
  while (attempt < 2) {
    attempt += 1;
    try {
      const response = await fetch(bmkgForecastUrl(row.adm4), {
        headers: { Accept: "application/json", "User-Agent": "curl/8.5.0" },
        signal: AbortSignal.timeout(25000),
      });
      http = response.status;
      if (http === 429) {
        await sleep(60000);
        continue;
      }
      if (http === 200) {
        const payload = await response.json();
        const lokasi = payload?.lokasi ?? {};
        const lat = Number(lokasi.lat);
        const lon = Number(lokasi.lon);
        if (lokasi.adm4 === row.adm4 && inFrame(lat, lon)) {
          byKode.set(row.kode_kab, {
            kode_kab: row.kode_kab,
            adm4: row.adm4,
            lintang: lat,
            bujur: lon,
            provinsi: lokasi.provinsi || row.provinsi_api || "",
            kotkab: lokasi.kotkab || row.kotkab_api || "",
            kecamatan: lokasi.kecamatan || "",
            desa: lokasi.desa || "",
            timezone: lokasi.timezone || "",
          });
          writeFileSync(OUT, toCsv([...byKode.values()]));
        } else {
          console.error(`Lewati ${row.kode_kab}: koordinat tidak ada atau di luar bingkai.`);
        }
      } else {
        console.error(`Lewati ${row.kode_kab}: HTTP ${http}.`);
      }
      break;
    } catch (error) {
      console.error(`Lewati ${row.kode_kab}: ${error.message || error}`);
      break;
    }
  }
  await sleep(GAP_MS);
}

writeFileSync(OUT, toCsv([...byKode.values()]));
console.log(`Koordinat adm4 selesai: ${byKode.size} titik.`);
