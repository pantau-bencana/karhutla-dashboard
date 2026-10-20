import { IRBI_TIDAK_TERSEDIA } from "./floodMatrix.js";
import { HUJAN_PEMBANDING_JENIS } from "./hujanPembanding.js";
import { POTENSI_LABEL } from "./pendudukKab.js";

export const KOLOM_UNDUH = [
  "No",
  "Kab/Kota",
  "Provinsi",
  "Status",
  "Historis",
  "IRBI",
  "Potensi penduduk",
  "Potensi rumah",
];

export const DISCLAIMER_UNDUH =
  "Penggunaan internal. Awas/Siaga/Waspada adalah Analisis Pantau Bencana, bukan status resmi.";

export function teksStatusUnduh(row) {
  if (row?.peta?.kind === "status" && row.peta.status) {
    return row.peta.lampau ? `${row.peta.status} (data terakhir, masa berlaku sudah lewat)` : row.peta.status;
  }
  if (row?.peta?.kind === "tak-dikenal") return row.peta.kosongLabel || "Tidak terklasifikasi (kode cuaca BMKG belum dikenali)";
  if (row?.peta?.kind === "kosong") return row.peta.kosongLabel || "Tidak ada peringatan";
  if (row?.hujanFallback && row.peta?.alasan === "prakiraan") {
    return `${row.hujanFallback.teks}. ${HUJAN_PEMBANDING_JENIS}. Diambil ${row.hujanFallback.waktu}.`;
  }
  return "Tanpa data";
}

export function barisUnduh(rows) {
  return (rows ?? []).map((row, index) => {
    const tampil = row?.peta?.kind === "status" && row.peta.status;
    const penduduk = tampil ? row.pendudukItem?.penduduk : null;
    const rumah = tampil ? row.pendudukItem?.rumahTangga : null;
    return [
      String(index + 1),
      row.nama || "",
      row.provinsi || "",
      teksStatusUnduh(row),
      row.dibiTeks || "",
      row.banjirKelas || IRBI_TIDAK_TERSEDIA,
      penduduk == null ? "" : String(penduduk),
      rumah == null ? "" : String(rumah),
    ];
  });
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function csvUnduh(kepala, rows) {
  const lines = (kepala ?? []).map((line) => `# ${line}`);
  lines.push(KOLOM_UNDUH.join(","));
  for (const row of barisUnduh(rows)) lines.push(row.map(csvCell).join(","));
  lines.push(`# ${POTENSI_LABEL}`);
  lines.push(`# ${DISCLAIMER_UNDUH}`);
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function barisXlsx(kepala, rows) {
  const atas = (kepala ?? []).map((line) => [line]);
  return [...atas, KOLOM_UNDUH, ...barisUnduh(rows), [POTENSI_LABEL], [DISCLAIMER_UNDUH]];
}
