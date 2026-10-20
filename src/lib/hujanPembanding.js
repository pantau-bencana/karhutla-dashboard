import { kodeWilayah } from "./floodMatrix.js";

export const HUJAN_PEMBANDING_BADGE = "Pembanding (data terbuka, bukan resmi)";
export const HUJAN_PEMBANDING_JENIS = "prakiraan model ECMWF (via Open-Meteo), bukan BMKG";
export const HUJAN_PEMBANDING_SUMBER = "Open-Meteo";
export const HUJAN_PEMBANDING_MODEL = "ecmwf_ifs025";
export const HUJAN_TANPA_NOWCAST =
  "Model ECMWF tidak punya nowcast 0–3 jam. Angka Hari ini, Besok, dan Lusa adalah jumlah hujan harian, bukan peringatan BMKG.";
export const HUJAN_TITIK_BATAS =
  "Kabupaten tanpa koordinat prakiraan BMKG memakai pusat poligon terbesar pada batas administrasi tersimpan, bukan titik kelurahan BMKG.";
export const HUJAN_PEMBANDING_VARIABEL = "precipitation_sum";
export const HUJAN_PEMBANDING_SATUAN = "mm";
export const HUJAN_PEMBANDING_URL = "https://open-meteo.com/en/docs";
export const HUJAN_PEMBANDING_LISENSI = "https://open-meteo.com/en/licence";
export const HUJAN_PEMBANDING_FILE = "data/live/hujan-pembanding-kab.csv";
export const HUJAN_PEMBANDING_META = "data/live/hujan-pembanding-kab-meta.json";
export const HUJAN_KOORDINAT_FILE = "data/static/prakiraan-adm4-koordinat.csv";
export const HUJAN_CHUNK = 20;
export const HUJAN_GAP_MS = 1500;
export const HUJAN_GPM_CATATAN =
  "NASA GPM IMERG tidak dipakai. Unduhan Early/Late di PPS mengembalikan HTTP 401 tanpa akun, dan jalur yang terdokumentasi memakai registrasi Earthdata atau PPS. Tidak ada berkas observasi yang diunduh.";

export const HUJAN_KELAS = Object.freeze([
  { id: "nol", sampai: 0, warna: "#e7eef6", label: "0 mm" },
  { id: "ringan", sampai: 5, warna: "#c5d8ef", label: "di bawah 5 mm" },
  { id: "sedang", sampai: 20, warna: "#7eadd8", label: "5–20 mm" },
  { id: "lebat", sampai: 50, warna: "#3d78b4", label: "20–50 mm" },
  { id: "sangat", sampai: Infinity, warna: "#1d4e89", label: "50 mm atau lebih" },
]);

export function warnaHujan(mm) {
  if (!Number.isFinite(mm) || mm < 0) return "";
  const kelas = HUJAN_KELAS.find((item) => mm <= item.sampai);
  return kelas?.warna || "";
}

export function teksMm(mm) {
  if (!Number.isFinite(mm)) return "belum tersedia";
  const rounded = Math.round(mm * 10) / 10;
  return `${String(rounded).replace(".", ",")} mm`;
}

export function indeksHujan(rows) {
  const map = new Map();
  for (const row of rows ?? []) {
    const kode = kodeWilayah(row.kode_kab);
    if (!kode) continue;
    const current = map.get(kode) ?? {
      kode,
      nama: String(row.nama ?? "").trim(),
      provinsi: String(row.provinsi ?? "").trim(),
      adm4: String(row.adm4 ?? "").trim(),
      lintang: Number(row.lintang),
      bujur: Number(row.bujur),
      hari: new Map(),
    };
    const raw = row.curah_hujan_mm;
    const mm = raw === "" || raw == null ? null : Number(raw);
    if (row.tanggal) current.hari.set(String(row.tanggal), Number.isFinite(mm) ? mm : null);
    if (!current.nama && row.nama) current.nama = String(row.nama).trim();
    map.set(kode, current);
  }
  return map;
}

export function mmPada(item, tanggal) {
  if (!item || !tanggal || !item.hari?.has(tanggal)) return undefined;
  return item.hari.get(tanggal);
}

export function barisHujanModel(teks, waktu) {
  return [
    `Hujan model: ${teks}. ${HUJAN_PEMBANDING_JENIS}.`,
    `Diambil ${waktu}. Model ${HUJAN_PEMBANDING_MODEL}. Lisensi CC BY 4.0.`,
    HUJAN_TANPA_NOWCAST,
  ];
}

export function gabungHujan(sebelum, baru, gagalKode) {
  const gagal = new Set(gagalKode ?? []);
  const baruKode = new Set((baru ?? []).map((row) => row.kode_kab));
  const kept = (sebelum ?? []).filter((row) => gagal.has(row.kode_kab) && !baruKode.has(row.kode_kab));
  return { rows: [...(baru ?? []), ...kept], kept: kept.length };
}
