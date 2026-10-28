import { kelasIrbi } from "./analisisPantauBencana.js";
import { identitasTampil } from "./identitas.js";
import { formatAngka } from "./format.js";
import {
  IRBI_BANJIR_TERVERIFIKASI,
  IRBI_LONGSOR_TERVERIFIKASI,
  IRBI_PENGGUNAAN_INTERNAL,
  IRBI_TIDAK_TERSEDIA,
} from "./floodMatrix.js";
import { daftarKabkota } from "./kabProvinsi.js";

export const IRBI_BELUM = "belum terintegrasi";
export const IRBI_GABUNG_JUDUL = "IRBI 2025 Banjir & Longsor";
export const KOLOM_IRBI_GABUNG = ["Provinsi", "Kab/Kota", "IRBI Banjir 2025", "IRBI Longsor 2025"];

export function catatanIrbiGabung() {
  return [
    IRBI_PENGGUNAAN_INTERNAL,
    IRBI_BANJIR_TERVERIFIKASI,
    IRBI_LONGSOR_TERVERIFIKASI,
    "Status sumber: Data statis. Tahun 2025. Tahunan, bukan prakiraan harian. Kabupaten/kota tanpa kelas ditulis IRBI tidak tersedia. Bila berkas longsor tidak termuat, sel longsor ditulis belum terintegrasi.",
    identitasTampil(),
  ];
}

function teksSel(row, tersedia) {
  if (!tersedia) return { teks: IRBI_BELUM, skor: null, kelas: "" };
  const kelas = kelasIrbi(row?.kelas);
  if (!kelas) return { teks: IRBI_TIDAK_TERSEDIA, skor: null, kelas: "" };
  const angka = Number(row?.skor);
  const skor = Number.isFinite(angka) ? angka : null;
  const skorTeks = skor == null ? "" : formatAngka(skor, 2);
  return { teks: skorTeks ? `${kelas} (${skorTeks})` : kelas, skor, kelas };
}

function indeksCsv(rows) {
  const peta = new Map();
  if (!Array.isArray(rows)) return peta;
  for (const row of rows) {
    const kode = String(row?.kode_wilayah ?? row?.kode ?? "").trim();
    if (kode) peta.set(kode, row);
  }
  return peta;
}

function susun(banjir, longsor, banjirAda, longsorAda) {
  return daftarKabkota().map((item) => {
    const sumberBanjir = banjir instanceof Map ? banjir.get(item.kode) : banjir?.[item.kode];
    const sumberLongsor = longsor instanceof Map ? longsor.get(item.kode) : longsor?.[item.kode];
    const nilaiBanjir = teksSel(sumberBanjir, banjirAda);
    const nilaiLongsor = teksSel(sumberLongsor, longsorAda);
    return {
      kode: item.kode,
      provinsi: item.provinsi,
      nama: item.nama,
      banjir: nilaiBanjir.teks,
      banjirSkor: nilaiBanjir.skor,
      banjirKelas: nilaiBanjir.kelas,
      longsor: nilaiLongsor.teks,
      longsorSkor: nilaiLongsor.skor,
      longsorKelas: nilaiLongsor.kelas,
    };
  });
}

export function susunIrbiGabung(banjirRows, longsorRows) {
  return susun(indeksCsv(banjirRows), indeksCsv(longsorRows), Array.isArray(banjirRows), Array.isArray(longsorRows));
}

export function susunIrbiDariRekap(rekap) {
  const banjir = rekap?.irbi;
  const longsor = rekap?.longsor;
  return susun(banjir, longsor, banjir != null && typeof banjir === "object", longsor != null && typeof longsor === "object");
}

function ikat(a, b) {
  return (
    String(a.provinsi).localeCompare(String(b.provinsi), "id") ||
    String(a.nama).localeCompare(String(b.nama), "id") ||
    String(a.kode).localeCompare(String(b.kode))
  );
}

export function urutIrbi(baris, kunci = "provinsi", arah = "asc") {
  const faktor = arah === "desc" ? -1 : 1;
  const angka = kunci === "banjir" || kunci === "longsor";
  const skorKunci = kunci === "longsor" ? "longsorSkor" : "banjirSkor";
  const teksKunci = kunci === "nama" ? "nama" : "provinsi";
  return [...(baris ?? [])].sort((a, b) => {
    if (angka) {
      const av = a?.[skorKunci];
      const bv = b?.[skorKunci];
      if (av == null && bv == null) return ikat(a, b);
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av !== bv) return (av - bv) * faktor;
      return ikat(a, b);
    }
    const cmp = String(a?.[teksKunci] || "").localeCompare(String(b?.[teksKunci] || ""), "id");
    if (cmp !== 0) return cmp * faktor;
    return ikat(a, b);
  });
}

export function saringIrbi(baris, { provinsi = "", cari = "" } = {}) {
  const kueri = String(cari ?? "").trim().toLowerCase();
  return (baris ?? []).filter((item) => {
    if (provinsi && item.provinsi !== provinsi) return false;
    if (!kueri) return true;
    return [item.provinsi, item.nama, item.kode].some((nilai) => String(nilai ?? "").toLowerCase().includes(kueri));
  });
}

function csvSel(value) {
  const teks = value == null ? "" : String(value);
  if (/[",\n\r]/.test(teks)) return `"${teks.replaceAll('"', '""')}"`;
  return teks;
}

export function csvIrbiGabung(baris) {
  const lines = catatanIrbiGabung().map((line) => `# ${line}`);
  lines.push(KOLOM_IRBI_GABUNG.join(","));
  for (const item of baris ?? []) {
    lines.push([item.provinsi, item.nama, item.banjir, item.longsor].map(csvSel).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function barisXlsxIrbi(baris) {
  return [
    [IRBI_GABUNG_JUDUL],
    ...catatanIrbiGabung().map((line) => [line]),
    [],
    KOLOM_IRBI_GABUNG,
    ...(baris ?? []).map((item) => [item.provinsi, item.nama, item.banjir, item.longsor]),
  ];
}

export function lembarIrbiGabung(rekap) {
  const baris = Array.isArray(rekap) ? rekap : susunIrbiDariRekap(rekap);
  return {
    nama: IRBI_GABUNG_JUDUL,
    baris: barisXlsxIrbi(baris),
  };
}
