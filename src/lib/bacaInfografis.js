import { PROVINSI } from "./provinsi.js";

export const LABEL_INFOGRAFIS_OTOMATIS = "dibaca otomatis dari infografis BMKG";
export const AMBANG_YAKIN_INFOGRAFIS = 70;

const BULAN = {
  januari: 1,
  februari: 2,
  maret: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  agustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  desember: 12,
};

function rapikan(teks) {
  return String(teks || "").replace(/\s+/g, " ").trim();
}

function waktuWib(hari, namaBulan, tahun, jam, menit) {
  const bulan = BULAN[String(namaBulan || "").toLowerCase()];
  const angka = [hari, tahun, jam, menit].map((nilai) => Number(nilai));
  if (!bulan || angka.some((nilai) => !Number.isInteger(nilai))) return "";
  const [tanggal, tahunAngka, jamAngka, menitAngka] = angka;
  if (tanggal < 1 || tanggal > 31 || jamAngka > 23 || menitAngka > 59) return "";
  const utc = new Date(Date.UTC(tahunAngka, bulan - 1, tanggal, jamAngka - 7, menitAngka));
  if (Number.isNaN(utc.getTime())) return "";
  if (utc.getUTCDate() !== tanggal && jamAngka >= 7) return "";
  return utc.toISOString();
}

function gabungNama(nama) {
  if (nama.length === 1) return nama[0];
  if (nama.length === 2) return `${nama[0]} dan ${nama[1]}`;
  return `${nama.slice(0, -1).join(", ")}, dan ${nama.at(-1)}`;
}

export function yakinCukup(nilai, ambang = AMBANG_YAKIN_INFOGRAFIS) {
  const angka = (Array.isArray(nilai) ? nilai : [nilai]).map(Number).filter((item) => Number.isFinite(item) && item >= 0);
  if (!angka.length) return false;
  const rata = angka.reduce((jumlah, item) => jumlah + item, 0) / angka.length;
  return rata >= ambang;
}

export function bacaTeksInfografis(teks) {
  const sumber = String(teks || "").replace(/\r/g, "");
  const sistem = sumber.match(/Bibit\s+Siklon\s+([0-9]{2}[A-Z])\b/i)?.[1]
    || sumber.match(/\b([0-9]{2}[A-Z])\b/)?.[1]
    || "";
  if (!sistem) return null;
  const tidakLangsung = /tidak\s+langsung/i.test(sumber);
  const langsung = !tidakLangsung && /dampak\s+langsung/i.test(sumber);
  if (!tidakLangsung && !langsung) return null;
  const hingga = sumber.match(/hingga\s+(\d{1,2})\s+([A-Za-z]+)\s+(20\d{2})\s+pukul\s+(\d{1,2})[.:](\d{2})\s+WIB/i);
  if (!hingga) return null;
  const berlaku = waktuWib(hingga[1], hingga[2], hingga[3], hingga[4], hingga[5]);
  if (!berlaku) return null;
  const pembaruan = sumber.match(/(?:Update|Pembaruan)\s*:?\s*(\d{1,2})\s+([A-Za-z]+)\s+(20\d{2})\s+(\d{1,2})[.:](\d{2})\s+WIB/i);
  const diperbarui = pembaruan ? waktuWib(pembaruan[1], pembaruan[2], pembaruan[3], pembaruan[4], pembaruan[5]) : "";
  const potonganHujan = sumber.split(/Gelombang Laut Tinggi/i)[0] || "";
  if (!/sedang\s+hingga\s+lebat/i.test(potonganHujan)) return null;
  const urut = [...PROVINSI.map((item) => item.nama)].sort((kiri, kanan) => kanan.length - kiri.length);
  const posisi = [];
  let sisa = potonganHujan;
  for (const nama of urut) {
    const pola = new RegExp(`(?:^|[\\n\\-–])\\s*${nama.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    const cocok = pola.exec(sisa);
    if (!cocok) continue;
    posisi.push({ indeks: cocok.index, nama });
    sisa = `${sisa.slice(0, cocok.index)}${" ".repeat(cocok[0].length)}${sisa.slice(cocok.index + cocok[0].length)}`;
  }
  const provinsi = posisi.sort((kiri, kanan) => kiri.indeks - kanan.indeks).map((item) => item.nama);
  if (!provinsi.length) return null;
  const tinggi = sumber.match(/(\d+(?:[.,]\d+)?)\s*[-–—]\s*(\d+(?:[.,]\d+)?)\s*m(?:\s*\(([^)\n]+)\))?/i);
  if (!tinggi) return null;
  const sesudah = sumber.split(tinggi[0])[1] || "";
  const wilayah = [...sesudah.matchAll(/(?:^|\n)\s*[-–—]\s*([A-Za-z][^\n]{2,80})/g)]
    .map((cocok) => rapikan(cocok[1]))
    .find((baris) => baris && !/moderate|www\.|bmkg|info/i.test(baris));
  if (!wilayah) return null;
  const min = tinggi[1];
  const max = tinggi[2];
  const moderate = /moderate\s+sea/i.test(tinggi[3] || "");
  const status = tidakLangsung ? "tidak langsung" : "langsung";
  return {
    sistem: sistem.toUpperCase(),
    potensi_dampak: `Dampak ${status}: hujan sedang–lebat di ${gabungNama(provinsi)}; gelombang tinggi ${min}–${max} m${moderate ? " (moderate sea)" : ""} di ${wilayah}.`,
    berlaku_hingga: berlaku,
    diperbarui,
    hujan: provinsi,
    gelombang_tinggi: `${min}–${max} m`,
    gelombang_wilayah: wilayah,
  };
}
