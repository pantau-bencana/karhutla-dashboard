export const JARAK_SISTEM_SAMA_KM = 300;

export function agensiSistem(item) {
  const nilai = String(item?.agensi || "").toUpperCase();
  if (nilai === "JMA" || nilai === "JTWC") return nilai;
  return "BMKG";
}

export function kunciNamaSiklon(nama) {
  return String(nama || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function labelPetaSiklon(item) {
  const nama = String(item?.nama || "").trim();
  if (!nama) return "";
  if (item?.jenis === "bibit" && !/^bibit\b/i.test(nama)) return `Bibit ${nama}`;
  return nama;
}

function identitas(item) {
  const kunci = new Set();
  for (const nilai of [item?.nama, item?.kode]) {
    const kunciNama = kunciNamaSiklon(nilai);
    if (kunciNama) kunci.add(kunciNama);
  }
  return kunci;
}

function jarakKm(kiri, kanan) {
  const lintang1 = Number(kiri?.lintang);
  const bujur1 = Number(kiri?.bujur);
  const lintang2 = Number(kanan?.lintang);
  const bujur2 = Number(kanan?.bujur);
  if (![lintang1, bujur1, lintang2, bujur2].every((nilai) => Number.isFinite(nilai))) return null;
  const rad = (derajat) => (derajat * Math.PI) / 180;
  const dLintang = rad(lintang2 - lintang1);
  const dBujur = rad(bujur2 - bujur1);
  const a = Math.sin(dLintang / 2) ** 2
    + Math.cos(rad(lintang1)) * Math.cos(rad(lintang2)) * Math.sin(dBujur / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function sistemSama(kiri, kanan) {
  const milikKiri = identitas(kiri);
  for (const kunci of identitas(kanan)) {
    if (milikKiri.has(kunci)) return true;
  }
  const jarak = jarakKm(kiri, kanan);
  return jarak != null && jarak <= JARAK_SISTEM_SAMA_KM;
}

function pasifikBarat(item) {
  const lintang = Number(item?.lintang);
  const bujur = Number(item?.bujur);
  if (!Number.isFinite(lintang) || !Number.isFinite(bujur)) return null;
  return lintang >= 0 && lintang <= 60 && bujur >= 100 && bujur <= 180;
}

function pilihPemantau(grup) {
  const jma = grup.find((item) => agensiSistem(item) === "JMA");
  const jtwc = grup.find((item) => agensiSistem(item) === "JTWC");
  const wilayah = grup.map(pasifikBarat).find((nilai) => nilai != null);
  if (wilayah === false) return jtwc || jma;
  return jma || jtwc;
}

export function daftarSistemSiklon(data) {
  const bmkg = (Array.isArray(data?.sistem_halaman) ? data.sistem_halaman : [])
    .map((item) => ({ ...item, agensi: "BMKG" }));
  const calon = [
    ...(Array.isArray(data?.pemantau?.jma?.sistem) ? data.pemantau.jma.sistem : []),
    ...(Array.isArray(data?.pemantau?.jtwc?.sistem) ? data.pemantau.jtwc.sistem : []),
  ].map((item) => ({ ...item, agensi: agensiSistem(item) }));
  const kelompok = [];
  for (const item of calon) {
    if (bmkg.some((ada) => sistemSama(ada, item))) continue;
    const grup = kelompok.find((daftar) => daftar.some((ada) => sistemSama(ada, item)));
    if (grup) grup.push(item);
    else kelompok.push([item]);
  }
  return [...bmkg, ...kelompok.map(pilihPemantau)];
}
