import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "../src/lib/csv.js";
import { detectionMs } from "../src/lib/hotspotWindow.js";
import { BOUNDARY_CRS, BOUNDARY_SOURCE, loadAdm1, loadAdm2, locateFeature, parseFirmsCoordinate } from "./indonesia-land.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ADM1_ID = Object.freeze({
  Aceh: "Aceh",
  Bali: "Bali",
  "Bangka-Belitung Islands": "Kepulauan Bangka Belitung",
  Banten: "Banten",
  Bengkulu: "Bengkulu",
  "Central Java": "Jawa Tengah",
  "Central Kalimantan": "Kalimantan Tengah",
  "Central Sulawesi": "Sulawesi Tengah",
  "East Java": "Jawa Timur",
  "East Kalimantan": "Kalimantan Timur",
  "East Nusa Tenggara": "Nusa Tenggara Timur",
  Gorontalo: "Gorontalo",
  "Jakarta Special Capital Region": "DKI Jakarta",
  Jambi: "Jambi",
  Lampung: "Lampung",
  Maluku: "Maluku",
  "North Kalimantan": "Kalimantan Utara",
  "North Maluku": "Maluku Utara",
  "North Sulawesi": "Sulawesi Utara",
  "North Sumatra": "Sumatera Utara",
  Papua: "Papua",
  Riau: "Riau",
  "Riau Islands": "Kepulauan Riau",
  "South Kalimantan": "Kalimantan Selatan",
  "South Sulawesi": "Sulawesi Selatan",
  "South Sumatra": "Sumatera Selatan",
  "Southeast Sulawesi": "Sulawesi Tenggara",
  "Special Region of Yogyakarta": "DI Yogyakarta",
  "West Java": "Jawa Barat",
  "West Kalimantan": "Kalimantan Barat",
  "West Nusa Tenggara": "Nusa Tenggara Barat",
  "West Papua": "Papua Barat",
  "West Sulawesi": "Sulawesi Barat",
  "West Sumatra": "Sumatera Barat",
});

function interior(feature) {
  const ring = feature.polygons[0]?.[0] || [];
  let sx = 0;
  let sy = 0;
  const usable = Math.max(ring.length - 1, 1);
  for (let index = 0; index < usable; index += 1) {
    sx += ring[index][0];
    sy += ring[index][1];
  }
  const guess = [sx / usable, sy / usable];
  if (locateFeature([feature], guess[0], guess[1])) return guess;
  return ring[0] || [0, 0];
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function writeHotspotMap() {
  const sourcePath = resolve(root, "data/live/hotspot.csv");
  if (!existsSync(sourcePath)) return null;
  const adm2 = loadAdm2();
  const adm1 = loadAdm1();
  const provinceOf = new Map();
  for (const feature of adm2) {
    const [x, y] = interior(feature);
    const parent = locateFeature(adm1, x, y);
    provinceOf.set(feature, ADM1_ID[parent?.name] || parent?.name || "");
  }
  const raw = parseCsv(readFileSync(sourcePath, "utf8"));
  const sensorFile = {};
  const seen = new Set();
  let duplicates = 0;
  let outside = 0;
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
    const area = locateFeature(adm2, lon.value, lat.value);
    if (!area) {
      outside += 1;
      continue;
    }
    kept.push({
      lintang: lat.text,
      bujur: lon.text,
      tanggal: row.tanggal,
      waktu: row.waktu,
      satelit: sat,
      kepercayaan: row.kepercayaan,
      provinsi: provinceOf.get(area) || "",
    });
  }
  const header = ["lintang", "bujur", "tanggal", "waktu", "satelit", "kepercayaan", "provinsi"];
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
    di_luar_poligon: outside,
    di_darat: kept.length,
    tanggal_mulai: dates[0] || "",
    tanggal_selesai: dates.at(-1) || "",
    jam_24_sensor: last24.sensor,
    jam_24_kepercayaan: last24.kepercayaan,
    jam_24_jumlah: Object.values(last24.sensor).reduce((sum, value) => sum + value, 0),
    catatan: "Hotspot = deteksi satelit, bukan kebakaran terkonfirmasi. Hanya titik di dalam poligon kabupaten Indonesia yang disimpan. Kotak koordinat bukan penyaring.",
    batas: BOUNDARY_SOURCE,
    crs: BOUNDARY_CRS,
  };
  writeFileSync(resolve(root, "data/live/hotspot-peta-meta.json"), `${JSON.stringify(meta, null, 2)}\n`);
  return meta;
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function filterHotspotCsvFile() {
  const sourcePath = resolve(root, "data/live/hotspot.csv");
  if (!existsSync(sourcePath)) return null;
  const original = readFileSync(sourcePath, "utf8");
  const raw = parseCsv(original);
  const adm2 = loadAdm2();
  const header = ["tanggal", "waktu", "lintang", "bujur", "provinsi", "kabupaten", "satelit", "kepercayaan", "frp", "kecerahan", "keterangan"];
  const lines = [header.join(",")];
  let outside = 0;
  let invalid = 0;
  for (const row of raw) {
    const lat = parseFirmsCoordinate(row.lintang);
    const lon = parseFirmsCoordinate(row.bujur);
    if (!lat || !lon) {
      invalid += 1;
      continue;
    }
    if (!locateFeature(adm2, lon.value, lat.value)) {
      outside += 1;
      continue;
    }
    lines.push(header.map((name) => csvEscape(name === "lintang" ? lat.text : name === "bujur" ? lon.text : row[name])).join(","));
  }
  const body = `${lines.join("\n")}\n`;
  writeFileSync(sourcePath, body);
  const manifestPath = resolve(root, "data/live/manifest.json");
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const entry = manifest.datasets?.hotspot;
    if (entry) {
      entry.record_count = lines.length - 1;
      entry.content_hash = createHash("sha256").update(body).digest("hex");
      entry.records_before_boundary = raw.length;
      entry.records_after_boundary = lines.length - 1;
      entry.dropped_outside_indonesia = outside;
      entry.invalid_coordinates = invalid;
      entry.boundary = BOUNDARY_SOURCE;
      entry.crs = BOUNDARY_CRS;
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    }
  }
  return { before: raw.length, after: lines.length - 1, outside, invalid };
}

if (process.argv[1] && process.argv[1].endsWith("build-hotspot-map.mjs")) {
  const started = Date.now();
  const filtered = filterHotspotCsvFile();
  const meta = writeHotspotMap();
  console.log(JSON.stringify({ filtered, ...meta, ms: Date.now() - started }));
}
