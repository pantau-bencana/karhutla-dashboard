export const JTWC_ABPW_URL = "https://www.metoc.navy.mil/jtwc/products/abpwweb.txt";
export const JTWC_ABIO_URL = "https://www.metoc.navy.mil/jtwc/products/abioweb.txt";

const BULAN = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

function rapikan(teks) {
  return String(teks || "").replace(/\r/g, " ").replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

function waktuZ(tanggal, jam) {
  const cocok = String(tanggal || "").match(/^(\d{2})([A-Z]{3})(\d{2})$/);
  const bulan = cocok ? BULAN[cocok[2]] : 0;
  if (!bulan || !/^\d{4}$/.test(String(jam || ""))) return "";
  const tahun = 2000 + Number(cocok[3]);
  return `${tahun}-${String(bulan).padStart(2, "0")}-${cocok[1]}T${jam.slice(0, 2)}:${jam.slice(2)}:00.000Z`;
}

function koordinat(lintang, utaraSelatan, bujur, timurBarat) {
  let lat = Number(lintang);
  let lon = Number(bujur);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (utaraSelatan === "S") lat = -lat;
  if (timurBarat === "W") lon = -lon;
  if (Math.abs(lat) > 85 || Math.abs(lon) > 180) return null;
  return { lintang: lat, bujur: lon };
}

function tahapDari(jenis) {
  const teks = String(jenis || "").toUpperCase();
  if (teks.includes("SUPER")) return "Super typhoon";
  if (teks.includes("TYPHOON")) return "Typhoon";
  if (teks.includes("DEPRESSION")) return "Depresi tropis";
  if (teks.includes("STORM")) return "Badai tropis";
  return "Siklon tropis";
}

function anginSetelah(teks, awal) {
  const jendela = teks.slice(awal, awal + 500);
  const tunggal = jendela.match(/ESTIMATED AT\s+(\d{1,3})\s+KNOTS/i);
  if (tunggal) return Number(tunggal[1]);
  return null;
}

function tekananSetelah(teks, awal) {
  const jendela = teks.slice(awal, awal + 700);
  const cocok = jendela.match(/NEAR\s+(\d{3,4})\s+MB/i);
  return cocok ? Number(cocok[1]) : null;
}

function dasar(nama, pos, waktu, produk) {
  return {
    nama,
    kalimat: `Advisory JTWC ${produk} menyebut ${nama}.`,
    lokasi: "",
    dampak: "-",
    agensi: "JTWC",
    di_dalam_tcwc: false,
    luar_tcwc: false,
    sumber: "jtwc",
    lintang: pos.lintang,
    bujur: pos.bujur,
    tekanan_hpa: null,
    angin_knot: null,
    kategori: "",
    waktu_analisis: waktu,
  };
}

export function bacaTeksJtwc(teks, produk) {
  const rata = rapikan(teks);
  const sistem = [];
  const sudah = new Set();
  const siklon = /AT\s+(\d{2}[A-Z]{3}\d{2})\s+(\d{4})Z,\s+((?:SUPER\s+)?(?:TYPHOON|TROPICAL\s+CYCLONE|TROPICAL\s+STORM|TROPICAL\s+DEPRESSION))\s+(\d{2}[A-Z])\s+\(([A-Z0-9-]+)\)\s+WAS\s+LOCATED\s+NEAR\s+(\d+(?:\.\d+)?)([NS])\s+(\d+(?:\.\d+)?)([EW])/gi;
  for (const cocok of rata.matchAll(siklon)) {
    const nama = cocok[5];
    const kunci = nama.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!kunci || sudah.has(kunci)) continue;
    const pos = koordinat(cocok[6], cocok[7], cocok[8], cocok[9]);
    if (!pos) continue;
    sudah.add(kunci);
    const item = dasar(nama, pos, waktuZ(cocok[1], cocok[2]), produk);
    item.kode = cocok[4];
    item.tahap = tahapDari(cocok[3]);
    item.jenis = /DEPRESSION/i.test(cocok[3]) ? "bibit" : "siklon";
    item.angin_knot = anginSetelah(rata, cocok.index);
    item.tekanan_hpa = tekananSetelah(rata, cocok.index);
    sistem.push(item);
  }
  const invest = /AREA OF CONVECTION \(INVEST\s+([0-9]{2}[A-Z])\)\s+HAS PERSISTED NEAR\s+(\d+(?:\.\d+)?)([NS])\s+(\d+(?:\.\d+)?)([EW])/gi;
  for (const cocok of rata.matchAll(invest)) {
    const nama = cocok[1].toUpperCase();
    if (sudah.has(nama)) continue;
    const pos = koordinat(cocok[2], cocok[3], cocok[4], cocok[5]);
    if (!pos) continue;
    sudah.add(nama);
    const item = dasar(nama, pos, "", produk);
    item.kode = nama;
    item.tahap = "Invest";
    item.jenis = "bibit";
    item.kalimat = `Advisory JTWC ${produk} menyebut invest ${nama}.`;
    item.tekanan_hpa = tekananSetelah(rata, cocok.index);
    sistem.push(item);
  }
  return sistem;
}
