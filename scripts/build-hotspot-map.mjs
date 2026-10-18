import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "../src/lib/csv.js";
import { detectionMs } from "../src/lib/hotspotWindow.js";
import { BIG_EDITION_NOTE, BIG_SOURCE_LABEL } from "../src/lib/bigWilayah.js";
import { parseFirmsCoordinate } from "./indonesia-land.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function writeHotspotMap() {
  const sourcePath = resolve(root, "data/live/hotspot.csv");
  if (!existsSync(sourcePath)) return null;
  const raw = parseCsv(readFileSync(sourcePath, "utf8"));
  const sensorFile = {};
  const seen = new Set();
  let duplicates = 0;
  let invalid = 0;
  const kept = [];
  for (const row of raw) {
    const lat = parseFirmsCoordinate(row.lintang);
    const lon = parseFirmsCoordinate(row.bujur);
    const sat = row.satelit || "";
    sensorFile[sat || "kosong"] = (sensorFile[sat || "kosong"] || 0) + 1;
    if (!lat || !lon) {
      invalid += 1;
      continue;
    }
    const key = `${lat.text}|${lon.text}|${row.tanggal}|${row.waktu}|${sat}`;
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.add(key);
    kept.push({
      lintang: lat.text,
      bujur: lon.text,
      tanggal: row.tanggal,
      waktu: row.waktu,
      satelit: sat,
      kepercayaan: row.kepercayaan,
      provinsi: row.provinsi || "",
      kabupaten: row.kabupaten || "",
      kecamatan: row.kecamatan || "",
      desa: row.desa || "",
      kode_desa: row.kode_desa || "",
      kode_kecamatan: row.kode_kecamatan || "",
      kode_kabupaten: row.kode_kabupaten || "",
      kode_provinsi: row.kode_provinsi || "",
      wilayah_status: row.wilayah_status || "",
      frp: row.frp || "",
      kecerahan: row.kecerahan || "",
    });
  }
  const header = ["lintang", "bujur", "tanggal", "waktu", "satelit", "kepercayaan", "provinsi", "kabupaten", "kecamatan", "desa", "kode_desa", "kode_kecamatan", "kode_kabupaten", "kode_provinsi", "wilayah_status", "frp", "kecerahan"];
  const lines = [header.join(",")];
  for (const row of kept) lines.push(header.map((name) => csvCell(row[name])).join(","));
  mkdirSync(resolve(root, "data/live"), { recursive: true });
  writeFileSync(resolve(root, "data/live/hotspot-peta.csv"), `${lines.join("\n")}\n`);
  let newest = null;
  const last24 = { sensor: {}, kepercayaan: {} };
  for (const row of kept) {
    const ms = detectionMs(row);
    if (ms != null && (newest == null || ms > newest)) newest = ms;
  }
  for (const row of kept) {
    const ms = detectionMs(row);
    if (newest == null || ms == null || ms < newest - 24 * 3600000) continue;
    const conf = String(row.kepercayaan || "").toLowerCase();
    const bucket = conf === "h" || conf === "high" ? "tinggi" : conf === "n" || conf === "nominal" ? "nominal" : conf === "l" || conf === "low" ? "rendah" : "lain";
    last24.sensor[row.satelit || "kosong"] = (last24.sensor[row.satelit || "kosong"] || 0) + 1;
    last24.kepercayaan[bucket] = (last24.kepercayaan[bucket] || 0) + 1;
  }
  const dates = kept.map((row) => row.tanggal).filter(Boolean).sort();
  const meta = {
    sumber: "NASA FIRMS VIIRS_SNPP_NRT",
    bbox_permintaan: "94.4,-11.5,141.6,6.5",
    permintaan_hari: 5,
    baris_berkas: raw.length,
    koordinat_tidak_valid: invalid,
    sensor_berkas: sensorFile,
    duplikat_dibuang: duplicates,
    di_luar_poligon: 0,
    di_darat: kept.length,
    tanggal_mulai: dates[0] || "",
    tanggal_selesai: dates.at(-1) || "",
    jam_24_sensor: last24.sensor,
    jam_24_kepercayaan: last24.kepercayaan,
    jam_24_jumlah: Object.values(last24.sensor).reduce((sum, value) => sum + value, 0),
    catatan: "Hotspot = deteksi satelit, bukan kebakaran terkonfirmasi. Penyaring daratan dan nama wilayah datang dari kueri BIG pada saat pembaruan, bukan dari berkas batas di repositori. Koordinat FIRMS tidak diubah.",
    batas: BIG_SOURCE_LABEL,
    edisi: BIG_EDITION_NOTE,
    crs: "Koordinat FIRMS dan layanan BIG memakai lintang/bujur EPSG:4326. Marker Leaflet memakai [lintang, bujur].",
  };
  writeFileSync(resolve(root, "data/live/hotspot-peta-meta.json"), `${JSON.stringify(meta, null, 2)}\n`);
  return meta;
}

if (process.argv[1] && process.argv[1].endsWith("build-hotspot-map.mjs")) {
  const started = Date.now();
  const meta = writeHotspotMap();
  console.log(JSON.stringify({ ...meta, ms: Date.now() - started }));
}
