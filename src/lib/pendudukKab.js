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
export const PENDUDUK_BUKAN_TERPAPAR = "total kab/kota, bukan jumlah terpapar";
export const PENDUDUK_ABSENT =
  "Angka penduduk dan rumah tangga kabupaten/kota belum diisi dari tabel BPS. Sel kosong bukan nol dan bukan jumlah terpapar.";
export const BPS_PROYEKSI_URL = "https://sensus.bps.go.id/publikasi/index/sp2020";

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
  return `Penduduk kab/kota (BPS, proyeksi ${tahun})`;
}

export function labelRumahTangga(item) {
  const sumber = item?.sumberRt || "sumber belum diisi";
  const tahun = item?.tahunRt || "tahun belum diisi";
  return `Jumlah rumah tangga/KK (${sumber}, ${tahun})`;
}

export function teksAngkaPenduduk(value) {
  if (value == null) return "Belum diisi";
  return formatAngka(value);
}

export function barisTooltip(item) {
  return [
    `${labelPenduduk(item)}: ${teksAngkaPenduduk(item?.penduduk ?? null)}`,
    `${labelRumahTangga(item)}: ${teksAngkaPenduduk(item?.rumahTangga ?? null)}`,
    PENDUDUK_BUKAN_TERPAPAR,
  ];
}

export function lampirkanPenduduk(rows, indeks, status = "kosong") {
  return (rows ?? []).map((row) => {
    const tampil = Boolean(row?.analisisStatus);
    return {
      ...row,
      pendudukTampil: tampil,
      pendudukStatus: status,
      pendudukItem: tampil ? indeks?.get(row.kode) ?? null : null,
    };
  });
}

export function ringkasPendudukBerstatus(rows, indeks) {
  const berstatus = (rows ?? []).filter((row) => row?.analisisStatus);
  if (!berstatus.length) {
    return { adaStatus: false, lengkap: false, penduduk: null, kurang: 0, jumlahStatus: 0 };
  }
  let penduduk = 0;
  let kurang = 0;
  for (const row of berstatus) {
    const angka = indeks?.get(row.kode)?.penduduk;
    if (angka == null) kurang += 1;
    else penduduk += angka;
  }
  return {
    adaStatus: true,
    lengkap: kurang === 0,
    penduduk: kurang === 0 ? penduduk : null,
    kurang,
    jumlahStatus: berstatus.length,
  };
}

export function kalimatJumlahPenduduk(ringkas, { memuat = false } = {}) {
  if (memuat) return "Jumlah penduduk kab/kota yang berstatus menunggu data peringatan.";
  if (!ringkas?.adaStatus) return "Tidak ada kab/kota berstatus, jadi jumlah penduduk tidak dijumlahkan.";
  if (!ringkas.lengkap) {
    return `Jumlah penduduk kab/kota yang berstatus belum dapat dijumlahkan. ${ringkas.kurang} dari ${ringkas.jumlahStatus} kab/kota berstatus belum punya angka BPS. ${PENDUDUK_BUKAN_TERPAPAR}.`;
  }
  return `Jumlah penduduk kab/kota yang berstatus: ${teksAngkaPenduduk(ringkas.penduduk)}. ${PENDUDUK_BUKAN_TERPAPAR}.`;
}
