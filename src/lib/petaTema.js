import { kodeKan } from "./aplus.js";
import { addDays } from "./derive.js";
import { tanggalJakarta } from "./gwisFwi.js";
import { KELAS_BELUM } from "./potensiTujuh.js";

export const WARNA_KELAS = Object.freeze({
  "Sangat tinggi": "#9f1239",
  Tinggi: "#c2410c",
  Sedang: "#ca8a04",
  Rendah: "#3f6212",
  [KELAS_BELUM]: "#cbd5e1",
});

export const WARNA_KOSONG = "#e2e8f0";

export function hariKeDepan(jumlah = 7, now = new Date()) {
  const awal = tanggalJakarta(now);
  return Array.from({ length: jumlah }, (_, index) => addDays(awal, index));
}

export function ringkasTitik(rows, { hari, bidang }) {
  const tanggal = new Set(hari);
  const map = new Map();
  for (const row of rows ?? []) {
    const waktu = String(row?.tanggal ?? "").slice(0, 10);
    if (!tanggal.has(waktu)) continue;
    const kode = kodeKan(row?.kode);
    const nilai = Number(row?.[bidang]);
    if (!kode || !Number.isFinite(nilai)) continue;
    const ada = map.get(kode) ?? { jumlah: 0, n: 0, maks: Number.NEGATIVE_INFINITY };
    ada.jumlah += nilai;
    ada.n += 1;
    ada.maks = Math.max(ada.maks, nilai);
    map.set(kode, ada);
  }
  return map;
}

export function warnaHujan(mm) {
  if (!Number.isFinite(mm)) return WARNA_KOSONG;
  if (mm <= 20) return "#fef3c7";
  if (mm <= 50) return "#93c5fd";
  if (mm <= 100) return "#2563eb";
  return "#1e3a8a";
}

export function warnaAngin(kmj) {
  if (!Number.isFinite(kmj)) return WARNA_KOSONG;
  if (kmj < 20) return "#e0f2fe";
  if (kmj < 40) return "#fde68a";
  if (kmj < 60) return "#fb923c";
  return "#b91c1c";
}

export function warnaIrbi(kelas) {
  const teks = String(kelas || "");
  if (teks === "Tinggi") return "#9a3412";
  if (teks === "Sedang") return "#a16207";
  if (teks === "Rendah") return "#3f6212";
  return "#64748b";
}
