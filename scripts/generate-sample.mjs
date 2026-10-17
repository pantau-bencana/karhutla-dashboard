import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "data", "sample");
const NOTE = "DATA CONTOH — bukan data operasional";
const START = "2026-10-01";

const HOTSPOTS = {
  Riau: [4, 5, 6, 7, 8, 9, 10, 12, 11, 9, 8, 10, 13, 12, 11, 9],
  "Kalimantan Tengah": [2, 2, 3, 3, 4, 4, 5, 5, 4, 4, 3, 4, 5, 4, 3, 3],
  "Sumatera Selatan": [1, 2, 2, 2, 3, 3, 3, 4, 3, 3, 3, 4, 4, 3, 3, 3],
  "Kalimantan Barat": [1, 1, 1, 2, 2, 2, 2, 2, 1, 1, 2, 2, 1, 2, 1, 1],
  Jambi: [1, 1, 1, 1, 2, 2, 1, 2, 1, 1, 1, 2, 2, 1, 1, 1],
  "Kalimantan Selatan": [0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1],
  "Kalimantan Timur": [1, 1, 2, 1, 2, 2, 1, 2, 2, 1, 1, 2, 2, 1, 1, 1],
  "Sumatera Utara": [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
  "Nusa Tenggara Timur": [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0],
};

const FWI = {
  Riau: [14, 15, 16, 17, 18, 19, 20, 22, 21, 18, 19, 22, 24, 21, 20, 19],
  "Kalimantan Tengah": [8, 9, 10, 11, 11, 12, 13, 14, 13, 12, 13, 14, 15, 14, 13, 12],
  "Sumatera Selatan": [6, 7, 7, 8, 8, 9, 9, 10, 10, 9, 10, 11, 12, 11, 10, 9],
  "Kalimantan Barat": [4, 5, 5, 6, 6, 7, 7, 8, 7, 6, 7, 8, 10, 9, 8, 7],
  Jambi: [3, 4, 4, 5, 5, 6, 6, 7, 6, 5, 6, 7, 8, 7, 6, 5],
  "Kalimantan Selatan": [2, 2, 3, 3, 3, 4, 4, 5, 4, 3, 3, 4, 4, 3, 3, 2],
  "Kalimantan Timur": [5, 6, 6, 7, 7, 8, 8, 9, 8, 7, 7, 8, 9, 8, 7, 6],
  "Sumatera Utara": [1, 2, 2, 2, 3, 3, 3, 4, 3, 2, 2, 3, 4, 3, 2, 2],
  "Nusa Tenggara Timur": [8, 9, 10, 11, 12, 12, 13, 14, 13, 12, 13, 14, 16, 15, 14, 13],
};

const PLACES = {
  Riau: [
    ["Bengkalis", 1.49, 102.08],
    ["Pelalawan", 0.35, 101.86],
    ["Rokan Hilir", 2.05, 100.85],
    ["Siak", 0.79, 102.02],
    ["Indragiri Hilir", -0.32, 103.16],
  ],
  Jambi: [
    ["Muaro Jambi", -1.6, 103.62],
    ["Tanjung Jabung Timur", -1.2, 103.9],
    ["Tanjung Jabung Barat", -0.82, 103.4],
    ["Sarolangun", -2.3, 102.73],
  ],
  "Sumatera Selatan": [
    ["Ogan Komering Ilir", -3.2, 105.35],
    ["Banyuasin", -2.45, 104.5],
    ["Musi Banyuasin", -2.75, 103.85],
    ["Ogan Ilir", -3.25, 104.65],
  ],
  "Kalimantan Barat": [
    ["Ketapang", -1.75, 110.4],
    ["Kubu Raya", -0.12, 109.45],
    ["Sanggau", 0.12, 110.59],
    ["Sintang", 0.08, 111.5],
  ],
  "Kalimantan Tengah": [
    ["Pulang Pisau", -2.68, 114.22],
    ["Kapuas", -2.15, 114.35],
    ["Katingan", -1.9, 113.4],
    ["Kotawaringin Timur", -2.4, 112.95],
  ],
  "Kalimantan Selatan": [
    ["Banjar", -3.35, 114.9],
    ["Tanah Laut", -3.8, 114.78],
    ["Barito Kuala", -3.05, 114.7],
    ["Tapin", -2.95, 115.15],
  ],
  "Kalimantan Timur": [
    ["Kutai Kartanegara", -0.45, 116.98],
    ["Kutai Timur", 0.52, 117.52],
    ["Berau", 2.05, 117.45],
  ],
  "Sumatera Utara": [
    ["Labuhanbatu", 2.1, 99.83],
    ["Tapanuli Selatan", 1.45, 99.2],
  ],
  "Nusa Tenggara Timur": [
    ["Sumba Timur", -9.66, 120.26],
    ["Sikka", -8.62, 122.21],
    ["Manggarai", -8.55, 120.47],
  ],
};

const CITIES = {
  Riau: "Pekanbaru",
  Jambi: "Jambi",
  "Sumatera Selatan": "Palembang",
  "Kalimantan Barat": "Pontianak",
  "Kalimantan Tengah": "Palangka Raya",
  "Kalimantan Selatan": "Banjarmasin",
  "Kalimantan Timur": "Samarinda",
  "Sumatera Utara": "Medan",
  "Nusa Tenggara Timur": "Kupang",
};

const ISPU_BASE = {
  Riau: 40,
  "Kalimantan Tengah": 48,
  "Sumatera Selatan": 35,
  "Kalimantan Barat": 30,
  Jambi: 32,
  "Kalimantan Selatan": 22,
  "Kalimantan Timur": 34,
  "Sumatera Utara": 28,
  "Nusa Tenggara Timur": 36,
};

const ISPU_FACTOR = {
  Riau: 8,
  "Kalimantan Tengah": 12,
  "Sumatera Selatan": 8,
  "Kalimantan Barat": 7,
  Jambi: 7,
  "Kalimantan Selatan": 6,
  "Kalimantan Timur": 8,
  "Sumatera Utara": 5,
  "Nusa Tenggara Timur": 6,
};

const HA_FACTOR = {
  Riau: 8.5,
  "Kalimantan Tengah": 7.5,
  "Sumatera Selatan": 6,
  "Kalimantan Barat": 5,
  Jambi: 5.5,
  "Kalimantan Selatan": 3,
  "Kalimantan Timur": 4.5,
  "Sumatera Utara": 2.5,
  "Nusa Tenggara Timur": 3.5,
};

const IRBI = [
  ["Riau", "Bengkalis", 0.81],
  ["Riau", "Pelalawan", 0.76],
  ["Riau", "Rokan Hilir", 0.73],
  ["Riau", "Siak", 0.69],
  ["Riau", "Indragiri Hilir", 0.66],
  ["Riau", "Pekanbaru", 0.3],
  ["Jambi", "Muaro Jambi", 0.7],
  ["Jambi", "Tanjung Jabung Timur", 0.64],
  ["Jambi", "Tanjung Jabung Barat", 0.58],
  ["Jambi", "Sarolangun", 0.41],
  ["Sumatera Selatan", "Ogan Komering Ilir", 0.8],
  ["Sumatera Selatan", "Banyuasin", 0.67],
  ["Sumatera Selatan", "Musi Banyuasin", 0.62],
  ["Sumatera Selatan", "Ogan Ilir", 0.48],
  ["Kalimantan Barat", "Ketapang", 0.71],
  ["Kalimantan Barat", "Kubu Raya", 0.6],
  ["Kalimantan Barat", "Sanggau", 0.52],
  ["Kalimantan Barat", "Sintang", 0.44],
  ["Kalimantan Tengah", "Pulang Pisau", 0.86],
  ["Kalimantan Tengah", "Kapuas", 0.77],
  ["Kalimantan Tengah", "Katingan", 0.68],
  ["Kalimantan Tengah", "Kotawaringin Timur", 0.63],
  ["Kalimantan Selatan", "Banjar", 0.55],
  ["Kalimantan Selatan", "Tanah Laut", 0.49],
  ["Kalimantan Selatan", "Barito Kuala", 0.57],
  ["Kalimantan Selatan", "Tapin", 0.38],
  ["Kalimantan Timur", "Kutai Kartanegara", 0.66],
  ["Kalimantan Timur", "Kutai Timur", 0.58],
  ["Sumatera Utara", "Labuhanbatu", 0.36],
  ["Nusa Tenggara Timur", "Sumba Timur", 0.61],
  ["Nusa Tenggara Timur", "Sikka", 0.33],
];

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function addDays(iso, amount) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function csv(headers, rows) {
  const escape = (value) => {
    const text = String(value ?? "");
    if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
    return text;
  };
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((header) => escape(row[header])).join(","));
  return `${lines.join("\n")}\n`;
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function confidence(index) {
  const mod = index % 5;
  if (mod === 0) return "low";
  if (mod === 1) return "nominal";
  return "high";
}

function kelasFdrs(fwi) {
  if (fwi >= 21) return "Ekstrem";
  if (fwi >= 13) return "Sangat Tinggi";
  if (fwi >= 6) return "Tinggi";
  if (fwi >= 2) return "Sedang";
  return "Rendah";
}

function kelasRisiko(indeks) {
  if (indeks >= 0.67) return "Tinggi";
  if (indeks >= 0.34) return "Sedang";
  return "Rendah";
}

function parameterFor(ispu) {
  if (ispu <= 50) return "PM10";
  return "PM2.5";
}

const rand = mulberry32(20261016);
const provinces = Object.keys(HOTSPOTS);
const satellites = ["Suomi-NPP", "NOAA-20", "Terra", "Aqua"];
const times = ["0135", "0210", "0530", "0625", "1430", "1550", "1705", "1840"];

const hotspotRows = [];
const sipongiRows = [];
const bmkgRows = [];
const ispuRows = [];

for (const province of provinces) {
  let running = 0;
  for (let day = 0; day < 16; day += 1) {
    const tanggal = addDays(START, day);
    const count = HOTSPOTS[province][day];
    const places = PLACES[province];
    for (let i = 0; i < count; i += 1) {
      const [kabupaten, lat, lon] = places[(running + i) % places.length];
      const kelas = confidence(running + i);
      const frp = round(6 + ((running + i) * 3) % 28 + (kelas === "high" ? 12 : 0), 1);
      hotspotRows.push({
        tanggal,
        waktu: times[(running + i) % times.length],
        lintang: round(lat + (rand() - 0.5) * 0.16, 4),
        bujur: round(lon + (rand() - 0.5) * 0.16, 4),
        provinsi: province,
        kabupaten,
        satelit: satellites[(running + i) % satellites.length],
        kepercayaan: kelas,
        frp,
        kecerahan: round(305 + frp, 1),
        keterangan: NOTE,
      });
    }
    running += count;

    const sipongiCount = Math.max(0, count - (count > 0 && day % 2 === 0 ? 1 : 0));
    sipongiRows.push({
      tanggal,
      provinsi: province,
      jumlah_hotspot: sipongiCount,
      luas_terbakar_ha: round(sipongiCount * HA_FACTOR[province], 1),
      keterangan: NOTE,
    });

    const fwi = FWI[province][day];
    bmkgRows.push({
      tanggal,
      provinsi: province,
      curah_hujan_mm: fwi >= 10 ? 0 : round((10 - fwi) * 1.5, 1),
      suhu_c: round(30 + Math.min(fwi, 20) / 8, 1),
      kelembapan_pct: Math.max(40, Math.min(95, Math.round(92 - fwi * 1.6))),
      kec_angin_ms: round(1.5 + (fwi % 5) * 0.7, 1),
      fwi,
      kelas_fdrs: kelasFdrs(fwi),
      keterangan: NOTE,
    });

    const ispu = Math.max(15, Math.min(250, Math.round(ISPU_BASE[province] + count * ISPU_FACTOR[province])));
    ispuRows.push({
      tanggal,
      provinsi: province,
      kota: CITIES[province],
      ispu,
      kategori:
        ispu <= 50 ? "Baik" : ispu <= 100 ? "Sedang" : ispu <= 200 ? "Tidak Sehat" : "Sangat Tidak Sehat",
      parameter_dominan: parameterFor(ispu),
      pm25: round(ispu * 0.42, 1),
      keterangan: NOTE,
    });
  }
}

const irbiRows = IRBI.map(([provinsi, kabupaten, indeks]) => {
  const bahaya = Math.min(0.95, round(indeks + 0.05, 2));
  const kerentanan = round(indeks * 0.9, 2);
  const kapasitas = round((1.05 - indeks) * 0.7, 2);
  return {
    tahun: 2025,
    provinsi,
    kabupaten,
    skor_bahaya: bahaya,
    skor_kerentanan: kerentanan,
    skor_kapasitas: kapasitas,
    indeks_risiko: indeks,
    kelas_risiko: kelasRisiko(indeks),
    keterangan: NOTE,
  };
});

mkdirSync(outDir, { recursive: true });
writeFileSync(
  path.join(outDir, "hotspot.csv"),
  csv(
    ["tanggal", "waktu", "lintang", "bujur", "provinsi", "kabupaten", "satelit", "kepercayaan", "frp", "kecerahan", "keterangan"],
    hotspotRows,
  ),
);
writeFileSync(
  path.join(outDir, "sipongi.csv"),
  csv(["tanggal", "provinsi", "jumlah_hotspot", "luas_terbakar_ha", "keterangan"], sipongiRows),
);
writeFileSync(
  path.join(outDir, "irbi.csv"),
  csv(
    ["tahun", "provinsi", "kabupaten", "skor_bahaya", "skor_kerentanan", "skor_kapasitas", "indeks_risiko", "kelas_risiko", "keterangan"],
    irbiRows,
  ),
);
writeFileSync(
  path.join(outDir, "bmkg.csv"),
  csv(
    ["tanggal", "provinsi", "curah_hujan_mm", "suhu_c", "kelembapan_pct", "kec_angin_ms", "fwi", "kelas_fdrs", "keterangan"],
    bmkgRows,
  ),
);
writeFileSync(
  path.join(outDir, "ispu.csv"),
  csv(["tanggal", "provinsi", "kota", "ispu", "kategori", "parameter_dominan", "pm25", "keterangan"], ispuRows),
);

console.log(
  `Sampel tertulis di data/sample: ${hotspotRows.length} titik panas, ${sipongiRows.length} baris SiPongi, ${irbiRows.length} baris IRBI, ${bmkgRows.length} baris BMKG, ${ispuRows.length} baris ISPU.`,
);
