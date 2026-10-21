// Angka laporan singkat dibaca dari cuplikan yang sudah ada. Tidak ada isian bila cuplikan kosong.
import { CAMS_LABEL, camsModelFeed, camsRole } from "./ispuView.js";
import { tampilBarisFwi } from "./kabProvinsi.js";
import { kelasPeringkat, susunPeringkatHotspot } from "./peringkatHotspot.js";
import { tanggalJakarta } from "./gwisFwi.js";

export const STATUS_BANJIR = Object.freeze(["Awas", "Siaga", "Waspada"]);

export function hariCuplikan(points) {
  let hari = "";
  for (const point of points ?? []) {
    const tanggal = String(point?.tanggal ?? "").slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(tanggal) && tanggal > hari) hari = tanggal;
  }
  return hari;
}

export function titikHariTerbaru(points, province = "") {
  const hari = hariCuplikan(points);
  const rows = (points ?? []).filter((point) => {
    if (String(point?.tanggal ?? "").slice(0, 10) !== hari) return false;
    if (province && point.provinsi !== province) return false;
    return Number.isFinite(Number(point?.lintang)) && Number.isFinite(Number(point?.bujur));
  });
  const hitung = { merah: 0, oranye: 0, kuning: 0, tidakDiketahui: 0 };
  for (const point of rows) {
    const kelas = kelasPeringkat(point);
    if (kelas === "merah") hitung.merah += 1;
    else if (kelas === "oranye") hitung.oranye += 1;
    else if (kelas === "kuning") hitung.kuning += 1;
    else hitung.tidakDiketahui += 1;
  }
  const peringkat = susunPeringkatHotspot(rows, { tingkat: province ? "kabupaten" : "provinsi" }).baris;
  return { hari, jumlah: rows.length, hitung, puncak: peringkat.slice(0, 5) };
}

export function hitungStatusBanjir(rows) {
  const hitung = { Awas: 0, Siaga: 0, Waspada: 0 };
  for (const row of rows ?? []) {
    if (Object.hasOwn(hitung, row?.status)) hitung[row.status] += 1;
  }
  return hitung;
}

export function saringProvinsiBanjir(rows, province = "") {
  if (!province) return rows ?? [];
  return (rows ?? []).filter((row) => row?.provinsi === province);
}

export function puncakBanjir(rows, batas = 5) {
  return (rows ?? []).filter((row) => STATUS_BANJIR.includes(row?.status)).slice(0, batas);
}

export function sorotanFwi(rows, { province = "", now = new Date() } = {}) {
  const list = (rows ?? []).filter((row) => {
    if (province && row.provinsi !== province) return false;
    return Number.isFinite(Number(row?.fwi));
  });
  if (!list.length) return null;
  const dates = [...new Set(list.map((row) => String(row.tanggal ?? "").slice(0, 10)).filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item)))].sort();
  const today = tanggalJakarta(now);
  const tanggal = dates.find((item) => item >= today) || dates.at(-1) || "";
  const padaHari = list.filter((row) => String(row.tanggal ?? "").slice(0, 10) === tanggal);
  if (!padaHari.length) return null;
  const terbaik = padaHari.reduce((best, row) => (Number(row.fwi) > Number(best.fwi) ? row : best));
  const nama = tampilBarisFwi(terbaik);
  return {
    tanggal,
    fwi: Number(terbaik.fwi),
    kabupaten: nama.kabupaten,
    provinsi: nama.provinsi,
    jumlah: padaHari.length,
  };
}

export function sorotanCams(feed, { province = "", now = new Date() } = {}) {
  const model = camsModelFeed(feed ? [feed] : []);
  if (!model.rows.length) {
    return { ada: false, alasan: model.alasan || "Cuplikan model tidak ada.", fetchedAt: model.fetchedAt || "", observedAt: model.observedAt || "", label: CAMS_LABEL };
  }
  const today = tanggalJakarta(now);
  const milik = province ? model.rows.filter((row) => row.provinsi === province) : model.rows;
  const lalu = milik.filter((row) => row.tanggal <= today && row.pm25 != null);
  const pakai = lalu.length ? lalu : milik.filter((row) => row.pm25 != null);
  if (!pakai.length) {
    return { ada: false, alasan: "Tidak ada PM2.5 pada cuplikan.", fetchedAt: model.fetchedAt || "", observedAt: model.observedAt || "", label: CAMS_LABEL };
  }
  const tanggal = [...new Set(pakai.map((row) => row.tanggal))].sort().at(lalu.length ? -1 : 0);
  const padaHari = pakai.filter((row) => row.tanggal === tanggal);
  const puncak = padaHari.reduce((best, row) => (row.pm25 > best.pm25 ? row : best));
  return {
    ada: true,
    tanggal,
    peran: camsRole(tanggal, today),
    provinsi: puncak.provinsi,
    pm25: puncak.pm25,
    pm10: puncak.pm10,
    fetchedAt: model.fetchedAt || "",
    observedAt: model.observedAt || "",
    label: CAMS_LABEL,
  };
}
