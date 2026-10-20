import { formatWib } from "./format.js";

export const BNPB_FILE = "data/bnpb/banjir-2024.csv";
export const BNPB_RESOURCE = "a4daec53-1119-43ef-b05e-00ec3a4c42a4";
export const BNPB_RESOURCE_URL =
  "https://data.bnpb.go.id/dataset/data-bencana-indonesia/resource/a4daec53-1119-43ef-b05e-00ec3a4c42a4";
export const BNPB_HEADER =
  "kode_wilayah,nama_kabkota,provinsi,banjir_2024,sumber_resource,diunduh_tanggal";
export const BNPB_ABSENT =
  "Berkas kejadian banjir 2024 belum diletakkan di data/bnpb/. Sel kosong bukan angka nol.";
export const BNPB_MISSING_ROW = "Tidak tercantum di tabel BNPB 2024";
export const PENDUDUK_TERDAMPAK = "Penduduk terdampak";
export const RUMAH_TERDAMPAK = "Rumah terdampak";
export const DAMPAK_BELUM = "belum tersedia";
export const DAMPAK_HISTORIS_CATATAN =
  "Sumber: DIBI BNPB Satu Data, kompilasi 2010–2024 dan tabel kabupaten 2024. Historis, bukan prakiraan. Tidak ada korban atau rumah rusak per kabupaten.";
export const HISTORIS_BANJIR_CATATAN =
  "Rangkaian kejadian banjir per kabupaten/kota untuk 2011–2025 tidak ada pada berkas publik yang diperiksa 20 Oktober 2026. Tabel kabupaten 2010–2024 (resource 21044ffd-c397-4b3c-acbd-5adaa03d79e3, 510 baris) hanya punya kolom tahun untuk semua jenis bencana. Berkas tahunan 2010–2023 pada paket jumlah-kejadian-dan-dampak-bencana-tahun-YYYY adalah folder Google Drive publik stat_by_wil; lembar Aceh 2011 dan Aceh 2023 berjudul Jumlah Kejadian, tanpa kolom BANJIR. Satu-satunya kolom BANJIR per kabupaten adalah tahun 2024 (resource a4daec53-1119-43ef-b05e-00ec3a4c42a4 dan 5ff9f41f-8312-4b7c-aa18-fdbedac6ee7e, masing-masing 451 baris). Kompilasi 2025 hanya tingkat provinsi. dibi.bnpb.go.id tidak menjawab, dan satudata.bnpb.go.id tidak punya alamat DNS. Angka semua jenis tidak dijumlahkan sebagai banjir.";
export const HISTORIS_CUPLIKAN_DIAMBIL = "2026-10-18T15:58:02.307Z";
export const HISTORIS_DISCLAIMER =
  `Angka Historis adalah jumlah kejadian banjir yang tercatat di DIBI BNPB untuk tahun 2024, bukan jumlah seluruh kejadian yang benar-benar terjadi. Sumber: BNPB Satu Data, resource ${BNPB_RESOURCE}, lisensi ODC-BY. Cuplikan diambil ${formatWib(HISTORIS_CUPLIKAN_DIAMBIL)}; berkas publik diperiksa ulang 20 Oktober 2026. Catatan dapat tidak lengkap atau kurang dilaporkan. Angka ini tidak mengubah status Awas, Siaga, atau Waspada.`;

export function barisDampakHistoris() {
  return [`${PENDUDUK_TERDAMPAK}: ${DAMPAK_BELUM}`, `${RUMAH_TERDAMPAK}: ${DAMPAK_BELUM}`, DAMPAK_HISTORIS_CATATAN];
}

export function bnpbAsDibi(rows) {
  return (rows ?? []).map((row) => ({
    kode_wilayah: row.kode_wilayah,
    nama_dibi: row.nama_kabkota || row.nama_dibi || "",
    banjir_2024: row.banjir_2024,
  }));
}
