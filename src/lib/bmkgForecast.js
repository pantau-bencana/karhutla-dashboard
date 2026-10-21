import { formatTanggal, formatWib } from "./format.js";

// Kode kelurahan ibu kota provinsi prioritas yang sudah dicek ke API publik BMKG.
// Acuan kode: Keputusan Menteri Dalam Negeri No. 100.1.1-6117 Tahun 2022,
// seperti contoh resmi Kelurahan Kemayoran 31.71.03.1001.
export const BMKG_LOCATIONS = [
  { adm4: "14.71.05.1001", provinsi: "Riau" },
  { adm4: "15.71.01.1001", provinsi: "Jambi" },
  { adm4: "16.71.01.1001", provinsi: "Sumatera Selatan" },
  { adm4: "61.71.05.1001", provinsi: "Kalimantan Barat" },
  { adm4: "62.71.01.1001", provinsi: "Kalimantan Tengah" },
  { adm4: "63.71.01.1001", provinsi: "Kalimantan Selatan" },
];

export const BMKG_FORECAST_URL = "https://api.bmkg.go.id/publik/prakiraan-cuaca";
export const BMKG_DOCS_URL = "https://data.bmkg.go.id/prakiraan-cuaca/";
// Percobaan tambahan bila analysis_date masih hari sebelumnya. Bukan jadwal baru.
export const ULANG_ANALISIS_MAKS = 3;
export const JARAK_ULANG_ANALISIS_MS = 45_000;

export function tanggalKalenderWib(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function analisisLebihLama(analysisUtc, sekarang = new Date()) {
  const analisis = tanggalKalenderWib(analysisUtc);
  const hari = tanggalKalenderWib(sekarang);
  if (!analisis || !hari) return false;
  return analisis < hari;
}

export function perluUlangAnalisis({ analysisUtc, sekarang = new Date(), percobaan = 0, maks = ULANG_ANALISIS_MAKS } = {}) {
  return percobaan < maks && analisisLebihLama(analysisUtc, sekarang);
}

export function analisisLebihBaru(baru, tersimpan) {
  const next = String(baru ?? "").trim();
  const prev = String(tersimpan ?? "").trim();
  if (!next) return false;
  if (!prev) return true;
  return next > prev;
}

export function labelAnalisisBmkg({ analysisUtc, fetchedAt, tanggal = [], sekarang = new Date(), analyses = [] } = {}) {
  const rentang = [...new Set((tanggal ?? []).filter(Boolean))].sort();
  const rentangTeks = rentang.length ? rentang.join(", ") : "—";
  const diambil = fetchedAt ? ` Diambil ${formatWib(fetchedAt)}.` : "";
  const daftar = [...new Set([analysisUtc, ...(analyses ?? [])].filter(Boolean))].sort();
  const campuran = daftar.length > 1 ? " Cuplikan memuat lebih dari satu analysis_date." : "";
  if (!analysisUtc) {
    return `Waktu analisis BMKG tidak ada pada cuplikan.${diambil} Tanggal pada cuplikan: ${rentangTeks}.${campuran}`;
  }
  const dikeluarkan = formatWib(analysisUtc);
  if (analisisLebihLama(analysisUtc, sekarang || fetchedAt || new Date())) {
    const hari = formatTanggal(tanggalKalenderWib(sekarang || fetchedAt || new Date()));
    return `Analisis BMKG ${dikeluarkan}, lebih lama dari hari ${hari}. Bukan terbitan hari itu.${diambil} Tanggal pada cuplikan: ${rentangTeks}.${campuran}`;
  }
  return `Analisis BMKG ${dikeluarkan}.${diambil} Tanggal pada cuplikan: ${rentangTeks}.${campuran}`;
}

export function bmkgForecastUrl(adm4) {
  const url = new URL(BMKG_FORECAST_URL);
  url.searchParams.set("adm4", adm4);
  return url.href;
}

export function flattenBmkgForecast(payload) {
  const location = payload?.lokasi ?? {};
  const slots = [];
  for (const block of payload?.data ?? []) {
    const groups = Array.isArray(block?.cuaca) ? block.cuaca : [];
    for (const group of groups) {
      const items = Array.isArray(group) ? group : [group];
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const local = String(item.local_datetime ?? "").trim();
        const analysis = String(item.analysis_date ?? "").trim();
        slots.push({
          tanggal: local.slice(0, 10),
          waktuLokal: local,
          provinsi: location.provinsi || "",
          kotkab: location.kotkab || "",
          kecamatan: location.kecamatan || "",
          desa: location.desa || "",
          adm4: location.adm4 || "",
          suhu: numberOrBlank(item.t),
          kelembapan: numberOrBlank(item.hu),
          hujan: numberOrBlank(item.tp),
          anginKmj: numberOrBlank(item.ws),
          arahAngin: item.wd || "",
          cuaca: item.weather_desc || "",
          kodeCuaca: kodeCuaca(item.weather),
          analysisUtc: analysis ? `${analysis.replace(" ", "T")}Z`.replace("ZZ", "Z") : "",
        });
      }
    }
  }
  return slots;
}

function numberOrBlank(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : "";
}

function kodeCuaca(value) {
  if (value == null || value === "") return "";
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) return "";
  return String(number);
}
