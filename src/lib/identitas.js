// Kalimat identitas. v0.1 tetap bawaan bila edisi tidak disetel, termasuk saat
// berkas ini dimuat oleh Node pada npm run check (tanpa Vite).
export const IDENTITAS_V01 =
  "Pantau Bencana v0.1 — proyek data terbuka komunitas, bukan produk BNPB, BMKG, PVMBG, atau KLH.";
export const IDENTITAS_V02 =
  "Pantau Bencana v0.2 — proyek data terbuka komunitas, bukan produk BNPB, BMKG, PVMBG, atau KLH.";

export function identitasTampil() {
  const edisi = import.meta.env && import.meta.env.VITE_EDITION;
  return edisi === "v2" ? IDENTITAS_V02 : IDENTITAS_V01;
}
