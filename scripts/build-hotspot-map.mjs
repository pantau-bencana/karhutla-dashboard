import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "../src/lib/csv.js";
import { detectionMs } from "../src/lib/hotspotWindow.js";

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

function polygonsOf(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function prepare(feature) {
  const polygons = polygonsOf(feature.geometry);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { name: feature.properties?.shapeName || "", polygons, minX, minY, maxX, maxY };
}

function contains(feature, x, y) {
  if (x < feature.minX || x > feature.maxX || y < feature.minY || y > feature.maxY) return false;
  return feature.polygons.some((polygon) => {
    if (!pointInRing(x, y, polygon[0])) return false;
    for (let hole = 1; hole < polygon.length; hole += 1) {
      if (pointInRing(x, y, polygon[hole])) return false;
    }
    return true;
  });
}

function locate(features, x, y) {
  for (const feature of features) {
    if (contains(feature, x, y)) return feature;
  }
  return null;
}

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
  if (contains(feature, guess[0], guess[1])) return guess;
  return ring[0] || [0, 0];
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function writeHotspotMap() {
  const sourcePath = resolve(root, "data/live/hotspot.csv");
  if (!existsSync(sourcePath)) return null;
  const adm2 = JSON.parse(readFileSync(resolve(root, "data/boundaries/idn-adm2.geojson"), "utf8")).features.map(prepare);
  const adm1 = JSON.parse(readFileSync(resolve(root, "data/boundaries/idn-adm1.geojson"), "utf8")).features.map(prepare);
  const provinceOf = new Map();
  for (const feature of adm2) {
    const [x, y] = interior(feature);
    const parent = locate(adm1, x, y);
    provinceOf.set(feature, ADM1_ID[parent?.name] || parent?.name || "");
  }
  const raw = parseCsv(readFileSync(sourcePath, "utf8"));
  const sensorFile = {};
  const seen = new Set();
  let duplicates = 0;
  let outside = 0;
  const kept = [];
  for (const row of raw) {
    const lat = Number(row.lintang);
    const lon = Number(row.bujur);
    const sat = row.satelit || "";
    sensorFile[sat || "kosong"] = (sensorFile[sat || "kosong"] || 0) + 1;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const key = `${lat.toFixed(4)}|${lon.toFixed(4)}|${row.tanggal}|${row.waktu}|${sat}`;
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.add(key);
    const area = locate(adm2, lon, lat);
    if (!area) {
      outside += 1;
      continue;
    }
    kept.push({
      lintang: lat.toFixed(5),
      bujur: lon.toFixed(5),
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
    bbox: "94.4,-11.5,141.6,6.5",
    permintaan_hari: 5,
    baris_berkas: raw.length,
    sensor_berkas: sensorFile,
    duplikat_dibuang: duplicates,
    di_luar_poligon: outside,
    di_darat: kept.length,
    tanggal_mulai: dates[0] || "",
    tanggal_selesai: dates.at(-1) || "",
    jam_24_sensor: last24.sensor,
    jam_24_kepercayaan: last24.kepercayaan,
    jam_24_jumlah: Object.values(last24.sensor).reduce((sum, value) => sum + value, 0),
    catatan: "Hotspot = deteksi satelit, bukan kebakaran terkonfirmasi. Peta Ringkasan hanya memuat titik di dalam poligon kabupaten.",
    batas: "geoBoundaries gbOpen Indonesia ADM2 (2020, CC BY 3.0 IGO) dan ADM1 (ODbL) untuk nama provinsi.",
  };
  writeFileSync(resolve(root, "data/live/hotspot-peta-meta.json"), `${JSON.stringify(meta, null, 2)}\n`);
  return meta;
}

if (process.argv[1] && process.argv[1].endsWith("build-hotspot-map.mjs")) {
  const started = Date.now();
  const meta = writeHotspotMap();
  console.log(JSON.stringify({ ...meta, ms: Date.now() - started }));
}
