// Provinsi kabupaten/kota dibaca dari data/static/kabkota-provinsi.json.
// Berkas itu disalin dari properti batas-kabkota.topojson dan dicek sama persis
// di self-check. Nama yang tidak ada pada batas tidak diisi dari kolom CSV.
import daftar from "../../data/static/kabkota-provinsi.json" with { type: "json" };
import { normalizePlaceName } from "./attentionPrototype.js";

export const PROVINSI_TIDAK_DIKETAHUI = "Tidak diketahui";

const byKode = new Map();
const byNama = new Map();

for (const item of daftar) {
  const [kode, nama, provinsi] = item;
  const wilayah = { kode, nama, provinsi };
  const mentah = String(kode);
  byKode.set(mentah, wilayah);
  byKode.set(mentah.replaceAll(".", ""), wilayah);
  const kunci = normalizePlaceName(nama);
  if (!kunci) continue;
  if (!byNama.has(kunci)) byNama.set(kunci, wilayah);
  else if (byNama.get(kunci)?.kode !== wilayah.kode) byNama.set(kunci, null);
}

export function daftarKabkota() {
  return daftar.map(([kode, nama, provinsi]) => ({ kode, nama, provinsi }));
}

export function cariWilayahBatas({ kode = "", kabupaten = "" } = {}) {
  const mentah = String(kode ?? "").trim();
  const polos = mentah.replaceAll(".", "");
  if (mentah) return byKode.get(polos) || byKode.get(mentah) || null;
  const ketemu = byNama.get(normalizePlaceName(kabupaten));
  return ketemu || null;
}

export function tampilBarisFwi(row) {
  const wilayah = cariWilayahBatas({ kode: row?.kode, kabupaten: row?.kabupaten });
  return {
    kabupaten: wilayah?.nama || row?.kabupaten || "—",
    provinsi: wilayah?.provinsi || PROVINSI_TIDAK_DIKETAHUI,
  };
}

function nilaiUrut(row, key) {
  if (key === "fwiRata" || key === "hari") {
    const number = Number(row?.[key]);
    return Number.isFinite(number) ? number : null;
  }
  if (key === "periode") return `${row?.dari || ""}\u0000${row?.sampai || ""}`;
  return String(row?.[key] || "");
}

export function urutBarisFwi(rows, key = "kabupaten", arah = "asc") {
  const factor = arah === "desc" ? -1 : 1;
  return [...(rows ?? [])].sort((a, b) => {
    const av = nilaiUrut(a, key);
    const bv = nilaiUrut(b, key);
    if (av == null && bv == null) return ikatNama(a, b);
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv), "id");
    if (cmp === 0) return ikatNama(a, b);
    return cmp * factor;
  });
}

function ikatNama(a, b) {
  return (
    String(a.kabupaten || "").localeCompare(String(b.kabupaten || ""), "id") ||
    String(a.provinsi || "").localeCompare(String(b.provinsi || ""), "id")
  );
}
