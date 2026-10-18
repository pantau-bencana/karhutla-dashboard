import { parseCsv } from "./csv.js";
import { kodeWilayah } from "./floodMatrix.js";

export const DASARIAN_HEADER =
  "kode_wilayah,kab_kota,provinsi,status,dasarian,berlaku_mulai,berlaku_sampai,kutipan,sumber_url,tanggal_akses,diisi_oleh";
export const DASARIAN_STATUS_VALUES = ["Waspada", "Siaga", "Awas"];
export const DASARIAN_EMPTY = "Belum diisi untuk dasarian ini";
export const DASARIAN_UNLISTED = "Tidak tercantum di peringatan BMKG dasarian ini";
export const DASARIAN_EXPIRED = "Kedaluwarsa – perlu diperbarui";
export const DASARIAN_MANUAL_LABEL = "Disalin manual dari halaman resmi BMKG; bukan integrasi data otomatis";
export const DASARIAN_BMKG_URL = "https://www.bmkg.go.id/iklim/peringatan-dini-hujan-tinggi";
export const DASARIAN_GUIDE_URL = "https://github.com/rixaga/karhutla-dashboard/blob/main/docs/PANDUAN_ISI_DASARIAN.md";
export const DASARIAN_CSV_URL =
  "https://github.com/rixaga/karhutla-dashboard/blob/main/data/manual/bmkg-pdcht-dasarian.csv";
export const DASARIAN_FILE = "data/manual/bmkg-pdcht-dasarian.csv";

const DATE_FIELDS = ["berlaku_mulai", "berlaku_sampai", "tanggal_akses"];

export function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function todayWib(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function validateDasarian(text, expectedCodes) {
  const errors = [];
  const raw = String(text ?? "").replace(/^\uFEFF/, "");
  const firstLine = raw.split(/\r?\n/).find((line) => line.trim()) ?? "";
  if (firstLine.trim() !== DASARIAN_HEADER) {
    errors.push(`Header CSV harus persis: ${DASARIAN_HEADER}`);
  }
  const rows = parseCsv(raw);
  const seen = new Map();
  for (const row of rows) {
    const kode = kodeWilayah(row.kode_wilayah);
    if (!kode) {
      errors.push("Ada baris tanpa kode_wilayah.");
      continue;
    }
    if (seen.has(kode)) errors.push(`${kode}: kode_wilayah dobel.`);
    seen.set(kode, row);
    const status = String(row.status ?? "").trim();
    if (status && !DASARIAN_STATUS_VALUES.includes(status)) {
      errors.push(
        `${kode}: Status tidak dikenal ("${status}"). Yang boleh diisi: Waspada, Siaga, Awas, atau dikosongkan.`,
      );
    }
    for (const field of DATE_FIELDS) {
      const value = String(row[field] ?? "").trim();
      if (value && !isIsoDate(value)) errors.push(`${kode}: Tanggal ${field} tidak berbentuk YYYY-MM-DD.`);
    }
    if (status) {
      if (!String(row.dasarian ?? "").trim()) errors.push(`${kode}: dasarian wajib diisi bila status diisi.`);
      if (!String(row.sumber_url ?? "").trim()) errors.push(`${kode}: sumber_url wajib diisi bila status diisi.`);
      if (!String(row.tanggal_akses ?? "").trim()) errors.push(`${kode}: tanggal_akses wajib diisi bila status diisi.`);
    }
  }
  const expected = expectedCodes ?? [];
  for (const kode of expected) {
    if (!seen.has(kode)) errors.push(`${kode}: baris kabupaten/kota hilang. Jangan menghapus baris.`);
  }
  for (const kode of seen.keys()) {
    if (!expected.includes(kode)) {
      errors.push(`${kode}: kode ini tidak termasuk 33 kabupaten/kota Aceh dan Bengkulu.`);
    }
  }
  return errors;
}

export function applyDasarian(rows, manualRows, options = {}) {
  const loadStatus = options.status ?? "ok";
  const today = todayWib(options.now ?? new Date());
  const list = manualRows ?? [];
  const anyFilled = list.some((row) => String(row.status ?? "").trim());
  const byKode = new Map(list.map((row) => [kodeWilayah(row.kode_wilayah), row]));
  return (rows ?? []).map((row) => {
    if (loadStatus !== "ok") {
      return { ...row, dasarianKind: loadStatus === "memuat" ? "memuat" : "gagal" };
    }
    const manual = byKode.get(row.kode) ?? {};
    const status = String(manual.status ?? "").trim();
    const sampai = String(manual.berlaku_sampai ?? "").trim();
    let kind = "kosong";
    if (status) kind = "isi";
    else if (anyFilled) kind = "tak-tercantum";
    return {
      ...row,
      dasarianKind: kind,
      dasarianStatus: status,
      dasarianNama: String(manual.dasarian ?? "").trim(),
      dasarianKutipan: String(manual.kutipan ?? "").trim(),
      dasarianUrl: String(manual.sumber_url ?? "").trim(),
      dasarianAkses: String(manual.tanggal_akses ?? "").trim(),
      dasarianMulai: String(manual.berlaku_mulai ?? "").trim(),
      dasarianSampai: sampai,
      dasarianExpired: Boolean(status) && Boolean(sampai) && sampai < today,
    };
  });
}
