export const BNPB_FILE = "data/bnpb/banjir-2024.csv";
export const BNPB_RESOURCE = "a4daec53-1119-43ef-b05e-00ec3a4c42a4";
export const BNPB_RESOURCE_URL =
  "https://data.bnpb.go.id/dataset/data-bencana-indonesia/resource/a4daec53-1119-43ef-b05e-00ec3a4c42a4";
export const BNPB_HEADER =
  "kode_wilayah,nama_kabkota,provinsi,banjir_2024,sumber_resource,diunduh_tanggal";
export const BNPB_ABSENT =
  "Berkas kejadian banjir 2024 belum diletakkan di data/bnpb/. Sel kosong bukan angka nol.";
export const BNPB_MISSING_ROW = "Tidak tercantum di tabel BNPB 2024";

export function bnpbAsDibi(rows) {
  return (rows ?? []).map((row) => ({
    kode_wilayah: row.kode_wilayah,
    nama_dibi: row.nama_kabkota || row.nama_dibi || "",
    banjir_2024: row.banjir_2024,
  }));
}
