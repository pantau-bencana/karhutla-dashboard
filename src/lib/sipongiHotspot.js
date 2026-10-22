import { nameKey } from "./floodMatrix.js";
import { daftarKabkota } from "./kabProvinsi.js";

export const SIPONGI_API = "https://opsroom.sipongidata.my.id/api/sebaran";

const ALIAS = [
  ["DKI Jakarta", "KOTA ADMINISTRASI JAKARTA PUSAT", "31.71"],
  ["DKI Jakarta", "KOTA ADMINISTRASI JAKARTA UTARA", "31.72"],
  ["DKI Jakarta", "KOTA ADMINISTRASI JAKARTA BARAT", "31.73"],
  ["DKI Jakarta", "KOTA ADMINISTRASI JAKARTA SELATAN", "31.74"],
  ["DKI Jakarta", "KOTA ADMINISTRASI JAKARTA TIMUR", "31.75"],
  ["Gorontalo", "PAHUWATO", "75.04"],
  ["Sulawesi Utara", "KEPULAUAN SIAU TAGULANDANG BIARO", "71.09"],
  ["Sulawesi Selatan", "PANGKAJENE KEPULAUAN", "73.10"],
];

function indeksWilayah(katalog) {
  const peta = new Map();
  const taruh = (provinsi, nama, kode) => {
    const kunci = `${nameKey(provinsi)}|${nameKey(nama)}`;
    const ada = peta.get(kunci) ?? [];
    if (!ada.includes(kode)) ada.push(kode);
    peta.set(kunci, ada);
  };
  for (const item of katalog) taruh(item.provinsi, item.nama, item.kode);
  for (const [provinsi, nama, kode] of ALIAS) taruh(provinsi, nama, kode);
  return peta;
}

export function kodeSipongi(provinsi, kabupaten, katalog = daftarKabkota()) {
  if (!String(kabupaten ?? "").trim()) return "";
  const kota = /^\s*kota\b/i.test(kabupaten);
  const calon = indeksWilayah(katalog).get(`${nameKey(provinsi)}|${nameKey(kabupaten)}`) ?? [];
  const nama = new Map(katalog.map((item) => [item.kode, item.nama]));
  const saring = calon.filter((kode) => String(nama.get(kode) || "").toUpperCase().startsWith("KOTA ") === kota);
  const pakai = saring.length ? saring : calon;
  return pakai.length === 1 ? pakai[0] : "";
}

export function ringkasSipongi(rows, tanggal, katalog = daftarKabkota()) {
  const sel = new Map();
  const lepas = [];
  for (const row of rows ?? []) {
    const jumlah = Number(row?.counter);
    if (!Number.isFinite(jumlah)) continue;
    const kode = kodeSipongi(row?.provinsi, row?.kabupaten, katalog);
    if (!kode) {
      lepas.push({
        provinsi: String(row?.provinsi || ""),
        kabupaten: String(row?.kabupaten || ""),
        confidence: String(row?.confidence || ""),
        sumber: String(row?.sumber || ""),
        counter: jumlah,
      });
      continue;
    }
    const ada = sel.get(kode) ?? { jumlah: 0, high: 0, medium: 0, low: 0 };
    ada.jumlah += jumlah;
    const kelas = String(row?.confidence || "").toLowerCase();
    if (kelas === "high") ada.high += jumlah;
    else if (kelas === "medium") ada.medium += jumlah;
    else if (kelas === "low") ada.low += jumlah;
    sel.set(kode, ada);
  }
  return { tanggal, sel, lepas };
}
