// Total penduduk dan rumah tangga satu kabupaten/kota.
// Diisi manual dari tabel BPS. Bukan jumlah terpapar dan bukan kisi penduduk global.

import { formatAngka } from "./format.js";
import { kodeWilayah } from "./floodMatrix.js";

export const PENDUDUK_FILE = "data/static/penduduk-kabkota.csv";
export const PENDUDUK_HEADER = Object.freeze([
  "kode",
  "nama",
  "penduduk",
  "tahun_penduduk",
  "sumber_penduduk",
  "rumah_tangga",
  "tahun_rt",
  "sumber_rt",
]);
export const POTENSI_PENDUDUK = "Jumlah penduduk di wilayah berstatus";
export const POTENSI_RUMAH = "Jumlah rumah tangga di wilayah berstatus";
export const KPI_PENDUDUK = "Penduduk di wilayah berstatus";
export const KPI_RUMAH = "Rumah tangga di wilayah berstatus";
export const CATATAN_PENDUDUK =
  "Total penduduk kab/kota berstatus Awas/Siaga/Waspada (BPS). Bukan jumlah orang yang terdampak.";
export const CATATAN_RUMAH =
  "Total rumah tangga kab/kota (BPS SP2020), dipakai sebagai pendekatan jumlah rumah. Bukan jumlah rumah yang terdampak.";
export const POTENSI_LABEL = `${CATATAN_PENDUDUK} ${CATATAN_RUMAH}`;
export const PENDUDUK_BUKAN_TERPAPAR = CATATAN_PENDUDUK;
export const PENDUDUK_ABSENT =
  `Angka penduduk dan rumah tangga kabupaten/kota belum diisi dari tabel BPS. Sel kosong bukan nol. ${CATATAN_PENDUDUK} ${CATATAN_RUMAH}`;
export const BPS_PROYEKSI_URL = "https://sensus.bps.go.id/publikasi/index/sp2020";
export const BPS_PENDUDUK_URL =
  "https://www.bps.go.id/id/statistics-table/2/Mjc5MCMy/-jumlah-penduduk-menurut-kabupaten-kota-dan-kelompok-umur.html";
export const RUMAH_BELUM = "belum tersedia";

export function angkaUtuh(value) {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text)) return null;
  const number = Number(text);
  if (!Number.isSafeInteger(number)) return null;
  return number;
}

export function bacaPenduduk(rows) {
  const indeks = new Map();
  for (const row of rows ?? []) {
    const kode = kodeWilayah(row?.kode);
    if (!kode || !/^\d{2}\.\d{2}$/.test(kode)) continue;
    indeks.set(kode, {
      kode,
      nama: String(row?.nama ?? "").trim(),
      penduduk: angkaUtuh(row?.penduduk),
      tahunPenduduk: String(row?.tahun_penduduk ?? "").trim(),
      sumberPenduduk: String(row?.sumber_penduduk ?? "").trim(),
      rumahTangga: angkaUtuh(row?.rumah_tangga),
      tahunRt: String(row?.tahun_rt ?? "").trim(),
      sumberRt: String(row?.sumber_rt ?? "").trim(),
    });
  }
  return indeks;
}

export function labelPenduduk(item) {
  const tahun = item?.tahunPenduduk || "tahun belum diisi";
  return `${POTENSI_PENDUDUK} (BPS, proyeksi ${tahun})`;
}

export function labelRumahTangga(item) {
  const sumber = item?.sumberRt || "sumber belum diisi";
  const tahun = item?.tahunRt || "tahun belum diisi";
  return `${POTENSI_RUMAH} (${sumber}, ${tahun})`;
}

export function teksAngkaPenduduk(value) {
  if (value == null) return "Belum diisi";
  return formatAngka(value);
}

export function teksRumahTangga(item) {
  if (item?.rumahTangga == null) return RUMAH_BELUM;
  return formatAngka(item.rumahTangga);
}

export function barisTooltip(item) {
  const rumah =
    item?.rumahTangga == null
      ? `${POTENSI_RUMAH}: ${RUMAH_BELUM}`
      : `${labelRumahTangga(item)}: ${teksAngkaPenduduk(item.rumahTangga)}`;
  return [
    `${labelPenduduk(item)}: ${teksAngkaPenduduk(item?.penduduk ?? null)}`,
    CATATAN_PENDUDUK,
    rumah,
    CATATAN_RUMAH,
  ];
}

function statusYangDitampilkan(row) {
  if (row && Object.hasOwn(row, "statusTab")) return row.statusTab || null;
  return row?.analisisStatus || null;
}

export function lampirkanPenduduk(rows, indeks, status = "kosong") {
  return (rows ?? []).map((row) => {
    const tampil = Boolean(statusYangDitampilkan(row));
    return {
      ...row,
      pendudukTampil: tampil,
      pendudukStatus: status,
      pendudukItem: tampil ? indeks?.get(row.kode) ?? null : null,
    };
  });
}

export function ringkasPendudukBerstatus(rows, indeks) {
  const berstatus = (rows ?? []).filter((row) => statusYangDitampilkan(row));
  if (!berstatus.length) {
    return {
      adaStatus: false,
      lengkap: false,
      penduduk: null,
      kurang: 0,
      rumahLengkap: false,
      rumah: null,
      rumahKurang: 0,
      jumlahStatus: 0,
    };
  }
  let penduduk = 0;
  let kurang = 0;
  let rumah = 0;
  let rumahKurang = 0;
  for (const row of berstatus) {
    const item = indeks?.get(row.kode);
    if (item?.penduduk == null) kurang += 1;
    else penduduk += item.penduduk;
    if (item?.rumahTangga == null) rumahKurang += 1;
    else rumah += item.rumahTangga;
  }
  return {
    adaStatus: true,
    lengkap: kurang === 0,
    penduduk: kurang === 0 ? penduduk : null,
    kurang,
    rumahLengkap: rumahKurang === 0,
    rumah: rumahKurang === 0 ? rumah : null,
    rumahKurang,
    jumlahStatus: berstatus.length,
  };
}

export function kalimatJumlahPenduduk(ringkas, { memuat = false } = {}) {
  if (memuat) return `${POTENSI_PENDUDUK} pada kab/kota berstatus menunggu data peringatan. ${CATATAN_PENDUDUK}`;
  if (!ringkas?.adaStatus) return "Tidak ada kab/kota berstatus, jadi jumlah penduduk dan rumah tangga di wilayah berstatus tidak dijumlahkan.";
  const penduduk = ringkas.lengkap
    ? `${POTENSI_PENDUDUK}: ${teksAngkaPenduduk(ringkas.penduduk)}.`
    : `${POTENSI_PENDUDUK} belum dapat dijumlahkan. ${ringkas.kurang} dari ${ringkas.jumlahStatus} kab/kota berstatus belum punya angka BPS.`;
  const rumah = ringkas.rumahLengkap
    ? `${POTENSI_RUMAH}: ${teksAngkaPenduduk(ringkas.rumah)}.`
    : `${POTENSI_RUMAH} belum dapat dijumlahkan. ${ringkas.rumahKurang} dari ${ringkas.jumlahStatus} kab/kota berstatus belum punya angka rumah tangga BPS.`;
  return `${penduduk} ${rumah} ${CATATAN_PENDUDUK} ${CATATAN_RUMAH}`;
}
