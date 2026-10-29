export const URL_TINGKAT = "https://magma.esdm.go.id/v1/gunung-api/tingkat-aktivitas";
export const URL_LETUSAN = "https://magma.esdm.go.id/v1/gunung-api/informasi-letusan";
export const URL_VONA = "https://magma.esdm.go.id/vona";
export const URL_MAGMA = "https://magma.esdm.go.id/";
export const URL_VSI = "https://vsi.esdm.go.id/";

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

const ZONA = { WIB: 7, WITA: 8, WIT: 9 };
const TINGKAT = [
  ["Awas", 4],
  ["Siaga", 3],
  ["Waspada", 2],
  ["Normal", 1],
];

function rapikan(teks) {
  return String(teks || "").replace(/&nbsp;/gi, " ").replace(/&plusmn;|±/g, "±").replace(/\s+/g, " ").trim();
}

function polos(html) {
  return rapikan(String(html || "").replace(/<[^>]+>/g, " "));
}

function tingkatDari(teks) {
  const rata = rapikan(teks);
  for (const [nama, level] of TINGKAT) {
    if (new RegExp(`Level\\s+[IVX]+\\s*\\(${nama}\\)`, "i").test(rata)) return { tingkat: nama, level };
  }
  return null;
}

export function bacaTingkatAktivitas(html) {
  const baris = [...String(html || "").matchAll(/<tr[\s\S]*?<\/tr>/gi)];
  let aktif = null;
  const gunung = [];
  const sudah = new Set();
  for (const cocok of baris) {
    const tingkat = tingkatDari(polos(cocok[0]));
    if (tingkat) aktif = tingkat;
    if (!aktif) continue;
    const sel = [...cocok[0].matchAll(/<td[\s\S]*?<\/td>/gi)].map((item) => polos(item[0]));
    for (const isi of sel) {
      const namaLokasi = isi.match(/^(.+?)\s+-\s+(.+?)(?:\s+Lihat laporan)?$/i);
      if (!namaLokasi) continue;
      const nama = rapikan(namaLokasi[1]);
      const lokasi = rapikan(namaLokasi[2]).replace(/\s+Lihat laporan$/i, "");
      if (!nama || /^tidak ada gunung/i.test(nama) || /^level\b/i.test(nama)) continue;
      const kunci = nama.toLowerCase();
      if (sudah.has(kunci)) continue;
      sudah.add(kunci);
      gunung.push({
        nama,
        lokasi,
        tingkat: aktif.tingkat,
        level: aktif.level,
        lintang: null,
        bujur: null,
        url: URL_TINGKAT,
      });
    }
  }
  return gunung.sort((kiri, kanan) => kanan.level - kiri.level || kiri.nama.localeCompare(kanan.nama, "id"));
}

function tanggalKepala(teks) {
  const cocok = rapikan(teks).match(/(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(20\d{2})/i);
  if (!cocok) return "";
  const bulan = BULAN[cocok[2].toLowerCase()];
  if (!bulan) return "";
  return `${cocok[3]}-${String(bulan).padStart(2, "0")}-${String(cocok[1]).padStart(2, "0")}`;
}

function waktuLokal(tanggal, jamTeks) {
  const cocok = rapikan(jamTeks).match(/(\d{1,2}):(\d{2})\s+(WIB|WITA|WIT)/i);
  if (!tanggal || !cocok) return "";
  const zona = ZONA[cocok[3].toUpperCase()];
  const jam = String(cocok[1]).padStart(2, "0");
  return `${tanggal}T${jam}:${cocok[2]}:00+${String(zona).padStart(2, "0")}:00`;
}

function tinggiKolom(teks) {
  const meter = rapikan(teks).match(/tinggi kolom abu teramati[^0-9]{0,16}(\d+)\s*m/i);
  if (meter) return Number(meter[1]);
  const vona = rapikan(teks).match(/\((\d+)\s*M\)/i);
  return vona ? Number(vona[1]) : null;
}

export function bacaInformasiLetusan(html) {
  const sumber = String(html || "");
  const tanda = [...sumber.matchAll(/timeline-date">([^<]+)|class="timeline-item"/g)];
  const daftar = [];
  let tanggal = "";
  for (let i = 0; i < tanda.length; i += 1) {
    if (tanda[i][1]) {
      tanggal = tanggalKepala(tanda[i][1]);
      continue;
    }
    const item = sumber.slice(tanda[i].index, tanda[i + 1]?.index ?? sumber.length);
    const jam = (item.match(/timeline-time"><small>([^<]+)/) || [])[1] || "";
    const gunung = rapikan((item.match(/timeline-title">[\s\S]*?<a[^>]*>([^<]+)/) || [])[1] || "");
    if (!gunung) continue;
    const teks = polos((item.match(/timeline-text">([\s\S]*?)<\/p>/) || [])[1] || "").slice(0, 500);
    const url = (item.match(/href="(https:\/\/magma\.esdm\.go\.id\/v1\/gunung-api\/informasi-letusan\/[^"]+\/show)"/) || [])[1] || URL_LETUSAN;
    daftar.push({
      jenis: "informasi-letusan",
      gunung,
      waktu: waktuLokal(tanggal, jam),
      waktu_teks: rapikan(`${jam} ${tanggal}`),
      teks,
      tinggi_kolom_m: tinggiKolom(teks),
      url,
    });
  }
  return daftar;
}

export function bacaVona(html) {
  const daftar = [];
  for (const item of String(html || "").split('class="timeline-item"').slice(1)) {
    const judul = rapikan((item.match(/vona\?code=[A-Z]+">([^<]+)/) || [])[1] || "");
    const cocok = judul.match(/^(.+?)\s+-\s+(\d{8})\/(\d{4})Z$/);
    if (!cocok) continue;
    const teks = polos((item.match(/timeline-text">([\s\S]*?)<\/p>/) || [])[1] || "").slice(0, 500);
    const url = (item.match(/href="(https:\/\/magma\.esdm\.go\.id\/vona\/[0-9a-f-]{36})"/) || [])[1] || URL_VONA;
    const stamp = `${cocok[2].slice(0, 4)}-${cocok[2].slice(4, 6)}-${cocok[2].slice(6, 8)}T${cocok[3].slice(0, 2)}:${cocok[3].slice(2)}:00Z`;
    daftar.push({
      jenis: "vona",
      gunung: rapikan(cocok[1]),
      waktu: stamp,
      waktu_teks: `${cocok[2]}/${cocok[3]}Z`,
      teks,
      tinggi_kolom_m: /not observed/i.test(teks) ? null : tinggiKolom(teks),
      url,
    });
  }
  return daftar;
}

export function dalamJam(waktu, sekarang = new Date(), jam = 72) {
  const saat = Date.parse(waktu || "");
  if (!Number.isFinite(saat)) return false;
  const umur = sekarang.getTime() - saat;
  return umur >= -3600000 && umur <= jam * 3600000;
}

export function ringkasTingkat(gunung) {
  const hitung = { Awas: 0, Siaga: 0, Waspada: 0, Normal: 0 };
  for (const item of gunung || []) {
    if (hitung[item?.tingkat] != null) hitung[item.tingkat] += 1;
  }
  const urut = [...(gunung || [])].sort((kiri, kanan) => (kanan.level || 0) - (kiri.level || 0) || String(kiri.nama).localeCompare(String(kanan.nama), "id"));
  const level = urut[0]?.level || 0;
  const puncak = level > 1 ? urut.filter((item) => item.level === level).slice(0, 3) : [];
  return { hitung, puncak, tingkatTertinggi: puncak[0]?.tingkat || (level === 1 ? "Normal" : "") };
}
