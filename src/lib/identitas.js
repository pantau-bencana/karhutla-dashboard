// Kalimat identitas. v0.1 tetap bawaan bila edisi tidak disetel, termasuk saat
// berkas ini dimuat oleh Node pada npm run check (tanpa Vite).
export const IDENTITAS_V01 =
  "Pantau Bencana v0.1 — proyek data terbuka komunitas, bukan produk BNPB, BMKG, PVMBG, atau KLH.";
export const IDENTITAS_V02 =
  "Pantau Bencana v0.2 — proyek data terbuka komunitas, bukan produk BNPB, BMKG, PVMBG, atau KLH.";
export const IDENTITAS_V03 =
  "Pantau Bencana v0.3 — proyek data terbuka komunitas, bukan produk BNPB, BMKG, PVMBG, atau KLH.";

export function identitasTampil() {
  const edisi = import.meta.env && import.meta.env.VITE_EDITION;
  if (edisi === "v3") return IDENTITAS_V03;
  if (edisi === "v2") return IDENTITAS_V02;
  return IDENTITAS_V01;
}
