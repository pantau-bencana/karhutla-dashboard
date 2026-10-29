import { INDONESIA_FRAME } from "./geo.js";
import { PROVINSI } from "./provinsi.js";
import { REFRESH_INTERVAL_HOURS } from "./schedule.js";
import { agensiSistem, kunciNamaSiklon } from "./siklonTampil.js";

export const SIKLON_HTML_URL = "https://www.bmkg.go.id/cuaca/siklon-tropis";
export const SIARAN_PERS_URL = "https://www.bmkg.go.id/siaran-pers";
export const IMD_RSMC_URL = "https://rsmcnewdelhi.imd.gov.in/";
export const JTWC_URL = "https://www.metoc.navy.mil/jtwc/jtwc.html";
export const RUMUS_DAMPAK_SIKLON =
  "Tingkat Kecil dipakai bila teks dampak pada halaman Siklon Tropis hanya '-' atau kosong dan sistem tidak berada di dalam wilayah pemantauan TCWC Jakarta. Tingkat Disebut BMKG dipakai hanya untuk nama wilayah yang tertulis pada teks dampak itu. Tingkat Di wilayah pemantauan dipakai bila sistem ditandai di dalam AoM TCWC Jakarta tanpa nama wilayah pada teks dampak. Jarak, bila koordinat ada, adalah haversine ke titik terdekat pada bingkai Indonesia dasbor, dibulatkan ke kilometer, dan bukan batas administrasi. Analisis otomatis Pantau Bencana, bukan status resmi.";
export const SIKLON_TCWC_URL = "https://tropicalcyclone.bmkg.go.id/";
export const SIKLON_PDF_URL = "https://dataweb.bmkg.go.id/cuaca/dokumen/ikhtisar-cuaca-harian.pdf";
export const SIKLON_API_URL = "https://tropicalcyclone.bmkg.go.id/cms/service-api/cyclone/current";
export const SIKLON_JEJAK =
  "Analisis jejak dan kerucut ketidakpastian terhadap wilayah Indonesia belum terintegrasi.";
export const SIKLON_BELUM = "belum terintegrasi";

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

function teksPolos(html) {
  return rapikan(
    String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&#(\d+);/g, (_, angka) => String.fromCharCode(Number(angka)))
      .replace(/&[a-z]+;/gi, " "),
  );
}

function kalimatPertama(teks) {
  const rata = rapikan(teks);
  if (!rata) return "";
  const cocok = rata.match(/^(.+?\.)(?:\s|$)/);
  return cocok ? cocok[1] : rata;
}

function lokasiDari(kalimat) {
  const rata = rapikan(kalimat).replace(/[.]+$/, "");
  const cocok = rata.match(/\bdi\s+([^.]{3,160})$/i);
  return cocok ? cocok[1].trim() : "";
}

function luarTcwc(kalimat) {
  return /di luar wilayah monitoring|di luar wilayah pemantauan|outside the area of monitoring/i.test(kalimat);
}

function dalamTcwc(kalimat) {
  return /di dalam wilayah monitoring|di dalam wilayah pemantauan|inside the area of monitoring/i.test(kalimat);
}

function teksDampak(nilai) {
  if (typeof nilai === "string") {
    const rata = teksPolos(nilai);
    if (!rata || /^[-–—.]+$/.test(rata)) return "";
    return rata;
  }
  if (Array.isArray(nilai)) return nilai.map(teksDampak).filter(Boolean).join("; ");
  if (nilai && typeof nilai === "object") {
    return ["text", "description_id", "description", "nama", "name"]
      .map((kunci) => teksDampak(nilai[kunci]))
      .filter(Boolean)
      .join("; ");
  }
  return "";
}

function namaPublik(namaMentah, kode, jenis) {
  if (jenis === "bibit") {
    const dariNama = String(namaMentah).match(/([0-9]{2}[A-Za-z])\s*$/);
    if (dariNama) return dariNama[1].toUpperCase();
  }
  if (jenis === "bibit" && /^[0-9]{2}[A-Za-z]$/.test(kode || "")) return String(kode).toUpperCase();
  const inti = rapikan(namaMentah).replace(/^(?:bibit\s+)?siklon\s+tropis\s+/i, "").trim();
  if (/^[A-Z]{2,}$/.test(inti)) return `${inti[0]}${inti.slice(1).toLowerCase()}`;
  return inti || rapikan(namaMentah);
}

function susunSistem({
  nama,
  tahap,
  jenis,
  kalimat,
  dampak = "",
  cuaca_ekstrem = "",
  gelombang_tinggi = "",
  angin_kencang = "",
  dampak_status = "",
  berlaku_hingga = "",
  url_infografis = "",
  isAor = null,
  titik = null,
}) {
  const kalimatBersih = kalimatPertama(kalimat);
  const luar = luarTcwc(kalimatBersih);
  const diDalam = (!luar && dalamTcwc(kalimatBersih)) || (isAor === true && !luar);
  return {
    nama,
    tahap,
    jenis,
    kalimat: kalimatBersih,
    lokasi: lokasiDari(kalimatBersih),
    dampak: rapikan(dampak),
    cuaca_ekstrem: rapikan(cuaca_ekstrem),
    gelombang_tinggi: rapikan(gelombang_tinggi),
    angin_kencang: rapikan(angin_kencang),
    dampak_status: rapikan(dampak_status),
    berlaku_hingga: rapikan(berlaku_hingga),
    url_infografis: url_infografis || "",
    di_dalam_tcwc: Boolean(diDalam),
    luar_tcwc: Boolean(luar),
    sumber: "halaman",
    agensi: "BMKG",
    lintang: titik?.lintang ?? null,
    bujur: titik?.bujur ?? null,
    tekanan_hpa: titik?.tekanan_hpa ?? null,
    angin_knot: titik?.angin_knot ?? null,
    kategori: titik?.kategori || "",
    waktu_analisis: titik?.waktu || "",
  };
}

function angkaAtauNull(nilai) {
  if (nilai == null || nilai === "") return null;
  const angka = Number(nilai);
  return Number.isFinite(angka) ? angka : null;
}

function titikAnalisis(geojson) {
  const fitur = Array.isArray(geojson?.features) ? geojson.features : [];
  const titik = [];
  for (const item of fitur) {
    const prop = item?.properties || {};
    if (prop.is_forecast) continue;
    const koordinat = item?.geometry?.coordinates;
    if (!Array.isArray(koordinat) || koordinat.length < 2) continue;
    const bujur = Number(koordinat[0]);
    const lintang = Number(koordinat[1]);
    if (!Number.isFinite(bujur) || !Number.isFinite(lintang)) continue;
    if (Math.abs(lintang) > 90 || Math.abs(bujur) > 180) continue;
    titik.push({
      lintang,
      bujur,
      tekanan_hpa: angkaAtauNull(prop.pressure),
      angin_knot: angkaAtauNull(prop.mean_wind),
      kategori: prop.cat == null ? "" : String(prop.cat),
      waktu: prop.analysis_time || prop.time || "",
    });
  }
  titik.sort((kiri, kanan) => String(kanan.waktu).localeCompare(String(kiri.waktu)));
  return titik[0] || null;
}

function nilaiNuxt(raw, indeks, dalam = new Set()) {
  if (typeof indeks !== "number" || !Number.isInteger(indeks) || indeks < 0 || indeks >= raw.length) return undefined;
  if (dalam.has(indeks)) return null;
  const slot = raw[indeks];
  if (slot === null || typeof slot !== "object") return slot;
  const berikutnya = new Set(dalam);
  berikutnya.add(indeks);
  if (Array.isArray(slot)) return slot.map((item) => nilaiNuxt(raw, item, berikutnya));
  const objek = {};
  for (const [kunci, isi] of Object.entries(slot)) objek[kunci] = nilaiNuxt(raw, isi, berikutnya);
  return objek;
}

function bacaSistemNuxt(html) {
  const cocok = String(html || "").match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!cocok) return [];
  let raw;
  try {
    raw = JSON.parse(cocok[1]);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  try {
    return sistemDariNuxt(raw);
  } catch {
    return [];
  }
}

function sistemDariNuxt(raw) {
  const siklon = [];
  const rincian = new Map();
  const peta = new Map();
  for (let i = 0; i < raw.length; i += 1) {
    const slot = raw[i];
    if (!slot || typeof slot !== "object" || Array.isArray(slot)) continue;
    if ("is_cyclone" in slot && "name" in slot) {
      const objek = nilaiNuxt(raw, i);
      if (objek && objek.is_current !== false && rapikan(objek.name)) siklon.push(objek);
    } else if ("description_id" in slot && "tc_id" in slot) {
      const objek = nilaiNuxt(raw, i);
      if (objek?.tc_id && objek.description_id) rincian.set(objek.tc_id, objek);
    } else if ("geojson" in slot && "id" in slot) {
      const objek = nilaiNuxt(raw, i);
      if (objek?.id && objek.geojson) peta.set(objek.id, objek.geojson);
    }
  }
  return siklon.map((rekaman) => {
    const rinci = rincian.get(rekaman.id) || {};
    const namaMentah = rapikan(rekaman.name);
    const jenis = /^bibit\b/i.test(namaMentah) || rekaman.is_cyclone === false ? "bibit" : "siklon";
    const dampakCuaca = teksDampak(rinci.extreme_weather);
    const dampakGelombang = teksDampak(rinci.ocean_gale);
    const dampakAngin = teksDampak(rinci.gale);
    const dampakLangsung = teksDampak(rinci.direct_impact);
    const peringatan = teksDampak(rinci.warning_text);
    const statusNuxt = statusDariTeks(dampakLangsung);
    return susunSistem({
      nama: namaPublik(namaMentah, rekaman.tc_code, jenis),
      tahap: jenis === "bibit" ? "Bibit Siklon Tropis" : "Siklon Tropis",
      jenis,
      kalimat: rinci.description_id || "",
      dampak: [dampakLangsung, dampakCuaca, dampakGelombang, dampakAngin, peringatan].filter(Boolean).join(". "),
      cuaca_ekstrem: dampakCuaca,
      gelombang_tinggi: dampakGelombang,
      angin_kencang: dampakAngin,
      dampak_status: statusNuxt.dampak_status,
      berlaku_hingga: statusNuxt.berlaku_hingga,
      url_infografis: urlBerkas(rinci.infografis),
      isAor: rekaman.is_aor === true,
      titik: titikAnalisis(peta.get(rekaman.id)),
    });
  }).filter((item) => item.nama && item.kalimat);
}

function urlBerkas(nilai) {
  if (!nilai) return "";
  if (typeof nilai === "string" && /^https?:\/\//i.test(nilai)) return nilai;
  if (Array.isArray(nilai)) {
    for (const item of nilai) {
      const url = urlBerkas(item);
      if (url) return url;
    }
    return "";
  }
  if (typeof nilai === "object") {
    for (const kunci of ["url", "href", "src", "full_url"]) {
      const url = urlBerkas(nilai[kunci]);
      if (url) return url;
    }
  }
  return "";
}

function isiKolom(teks) {
  const rata = rapikan(teks);
  if (!rata || /^[-–—.]+$/.test(rata)) return "";
  return rata;
}

function statusDariTeks(teks) {
  const cocok = String(teks || "").match(/Dampak\s+(langsung|tidak langsung)([\s\S]{0,500})/i);
  if (!cocok) return { dampak_status: "", berlaku_hingga: "" };
  const hingga = cocok[2].match(/hingga\s+(\d{1,2}\s+[A-Za-z]+\s+20\d{2}(?:\s+(?:pukul\s+)?\d{1,2}[.:]\d{2}\s+WIB)?)/i);
  return {
    dampak_status: /tidak/i.test(cocok[1]) ? "tidak langsung" : "langsung",
    berlaku_hingga: hingga ? rapikan(hingga[1]) : "",
  };
}

function urlMutlakBmkg(nilai) {
  const rata = rapikan(String(nilai || "").replace(/&amp;/gi, "&"));
  if (/^https?:\/\//i.test(rata)) return rata;
  if (rata.startsWith("/") && !rata.startsWith("//")) return `https://www.bmkg.go.id${rata}`;
  return "";
}

function gambarDalam(html) {
  for (const cocok of String(html || "").matchAll(/\b(?:src|href)="([^"]+)"/gi)) {
    const url = urlMutlakBmkg(cocok[1]);
    if (!/\.(?:png|jpe?g|webp)(?:\?|$)/i.test(url)) continue;
    if (/\/images\/(?:icon|footer)\b/i.test(url)) continue;
    return url;
  }
  return "";
}

function blokNama(html, nama) {
  const kunci = String(nama || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (kunci.length < 2) return "";
  const cocok = String(html || "").match(new RegExp(`<p\\b[^>]*font-bold[^>]*>[^<]*${kunci}[^<]*</p>([\\s\\S]{0,1500})`, "i"));
  if (!cocok) return "";
  return cocok[1].split(/<h2\b/i)[0].split(/<p\b[^>]*font-bold/i)[0];
}

function bacaKolomWilayah(html) {
  const peta = [];
  for (const blok of String(html || "").split(/<h2\b[^>]*>/i)) {
    const judul = teksPolos(blok.slice(0, 500));
    if (!/^Wilayah Terdampak\b/i.test(judul)) continue;
    const namaBagian = judul.replace(/^Wilayah Terdampak\s*/i, "").split(/Wilayah Terdampak/i)[0];
    const sel = [...blok.matchAll(/<td\b[\s\S]*?<\/td>/gi)].slice(0, 3).map((td) => {
      const para = [...td[0].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((item) => teksPolos(item[1])).filter(Boolean);
      return isiKolom(para.join("; ") || teksPolos(td[0]));
    });
    const status = statusDariTeks(teksPolos(blok));
    peta.push({
      judul: namaBagian.toLowerCase(),
      cuaca_ekstrem: sel[0] || "",
      gelombang_tinggi: sel[1] || "",
      angin_kencang: sel[2] || "",
      dampak_status: status.dampak_status,
      berlaku_hingga: status.berlaku_hingga,
      url_infografis: gambarDalam(blok),
    });
  }
  return peta;
}

function kolomUntuk(peta, nama) {
  const kunci = String(nama || "").toLowerCase();
  if (kunci.length < 2) return null;
  return peta.find((item) => item.judul.includes(kunci)) || null;
}

export function susunTeksDampak(item) {
  const bagian = [];
  if (item?.dampak_status) {
    bagian.push(`Dampak ${item.dampak_status}${item.berlaku_hingga ? ` hingga ${item.berlaku_hingga}` : ""}`);
  }
  for (const [label, nilai] of [
    ["Cuaca ekstrem", item?.cuaca_ekstrem],
    ["Gelombang tinggi", item?.gelombang_tinggi],
    ["Angin kencang", item?.angin_kencang],
  ]) {
    if (nilai) bagian.push(`${label}: ${nilai}`);
  }
  if (bagian.length) return `${bagian.join(". ")}.`;
  const lama = rapikan(item?.dampak);
  if (!lama || /^[-–—.]+$/.test(lama)) return "-";
  return lama;
}

function dampakHalaman(html, nama, kalimat) {
  const dariKalimat = dampakDari(`${kalimat} `);
  if (dariKalimat) return dariKalimat;
  const polos = teksPolos(html);
  const cuplikan = rapikan(kalimat).slice(0, 40).toLowerCase();
  const awal = cuplikan ? polos.toLowerCase().indexOf(cuplikan) : -1;
  if (awal < 0) return "";
  let jendela = polos.slice(awal, awal + 900);
  const batas = jendela.slice(40).search(/Wilayah Terdampak|Bibit Siklon Tropis|Siklon Tropis/i);
  if (batas >= 0) jendela = jendela.slice(0, 40 + batas);
  return dampakDari(jendela);
}

function bacaSistemTeks(html) {
  const polos = teksPolos(html);
  const pola = /(Bibit Siklon Tropis|Siklon Tropis)\s+([0-9]{2}[A-Za-z]|[A-Z][A-Za-z-]{1,24})\s+((?:mulai terbentuk|terbentuk|berkembang|terpantau)\s(?:\d+\.\d+|[^.]){8,500}\.)/gi;
  const sistem = [];
  const sudah = new Set();
  for (const cocok of polos.matchAll(pola)) {
    const namaMentah = cocok[2];
    if (/^(dan|yang|dari|pada|dengan|untuk|atau|ini|itu|tropis)$/i.test(namaMentah)) continue;
    const jenis = /bibit/i.test(cocok[1]) ? "bibit" : "siklon";
    const nama = namaPublik(namaMentah, namaMentah, jenis);
    const kunci = nama.toLowerCase();
    if (!nama || sudah.has(kunci)) continue;
    const kalimat = rapikan(cocok[0]);
    sistem.push(susunSistem({
      nama,
      tahap: jenis === "bibit" ? "Bibit Siklon Tropis" : "Siklon Tropis",
      jenis,
      kalimat,
      dampak: dampakDari(polos.slice(cocok.index, cocok.index + 800)),
    }));
    sudah.add(kunci);
  }
  return sistem;
}

export function bacaSistemHalaman(html) {
  const sumber = String(html || "");
  const dariNuxt = bacaSistemNuxt(sumber);
  const sistem = dariNuxt.length ? dariNuxt : bacaSistemTeks(sumber);
  const kolom = bacaKolomWilayah(sumber);
  return sistem.map((item) => {
    const isi = kolomUntuk(kolom, item.nama) || {};
    const dekat = blokNama(sumber, item.nama);
    const statusDekat = statusDariTeks(teksPolos(`${dekat} ${item.kalimat || ""}`));
    const gabung = {
      ...item,
      cuaca_ekstrem: item.cuaca_ekstrem || isi.cuaca_ekstrem || "",
      gelombang_tinggi: item.gelombang_tinggi || isi.gelombang_tinggi || "",
      angin_kencang: item.angin_kencang || isi.angin_kencang || "",
      dampak_status: item.dampak_status || isi.dampak_status || statusDekat.dampak_status || "",
      berlaku_hingga: item.berlaku_hingga || isi.berlaku_hingga || statusDekat.berlaku_hingga || "",
      url_infografis: item.url_infografis || isi.url_infografis || gambarDalam(dekat) || "",
    };
    if (!gabung.cuaca_ekstrem && !gabung.gelombang_tinggi && !gabung.angin_kencang && !gabung.dampak_status) {
      const kalimat = dampakHalaman(sumber, item.nama, item.kalimat);
      if (kalimat && kalimat !== "-") gabung.dampak = kalimat;
    }
    gabung.dampak = susunTeksDampak(gabung);
    return gabung;
  });
}

export function bacaStatusHtml(html) {
  const sumber = String(html || "");
  if (!sumber.trim()) {
    return { status: null, teks: "", galat: "Halaman Siklon Tropis kosong.", sistem: [] };
  }
  const sistem = bacaSistemHalaman(sumber);
  if (sistem.length) {
    return { status: "Ada", teks: "Ada Siklon", galat: "", sistem };
  }
  if (/Tidak Ada Siklon/i.test(teksPolos(sumber))) {
    return { status: "Tidak Ada", teks: "Tidak Ada Siklon", galat: "", sistem: [] };
  }
  return {
    status: null,
    teks: "",
    galat: "Halaman tidak memuat status Ada atau Tidak Ada yang dikenali. Sistem tidak disusun dari teks lain.",
    sistem: [],
  };
}

export function tanggalDokumen(teks) {
  const rata = rapikan(teks);
  const cocok = rata.match(
    /(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(20\d{2})/i,
  );
  if (!cocok) return "";
  const bulan = BULAN[cocok[2].toLowerCase()];
  if (!bulan) return "";
  return `${cocok[3]}-${String(bulan).padStart(2, "0")}-${String(cocok[1]).padStart(2, "0")}`;
}

function dampakDari(jendela) {
  const cocok = jendela.match(/menginduksi terbentuknya daerah konvergensi dan konfluensi di wilayah ([^.]+)/i);
  if (!cocok) return "";
  const tempat = cocok[1]
    .replace(/,?\s*serta di sekitar bibit siklon tropis tersebut/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/,$/, "");
  if (!tempat) return "";
  return `Menginduksi konvergensi dan konfluensi di ${tempat}.`;
}

export function bacaIkhtisar(teks) {
  const rata = rapikan(teks);
  if (!rata) return [];
  const sistem = [];
  const sudah = new Set();
  const pola = [
    /Siklon Tropis\s+([A-Z][A-Za-z-]{1,24})\s+terpantau di\s+([^,.]{3,90})/g,
    /(Depresi tropis|Badai tropis|Bibit siklon)\s+([A-Z][A-Za-z0-9-]{1,24})\s+terpantau di\s+([^,.]{3,90})/gi,
  ];
  for (const ekspresi of pola) {
    for (const cocok of rata.matchAll(ekspresi)) {
      const nama = cocok[2] && /tropis|badai|depresi|bibit/i.test(cocok[1]) ? cocok[2] : cocok[1];
      const lokasi = (cocok[3] || cocok[2] || "").trim();
      const kunci = nama.toLowerCase();
      if (!nama || sudah.has(kunci) || /^(tropis|tersebut)$/i.test(nama)) continue;
      const jendela = rata.slice(cocok.index, cocok.index + 800);
      const kategori = jendela.match(/kategori\s+(\d+)/i);
      const tahapAwal = /Siklon Tropis/i.test(cocok[0]) ? "Siklon Tropis" : cocok[1];
      sistem.push({
        nama,
        tahap: kategori ? `${tahapAwal} kategori ${kategori[1]}` : tahapAwal,
        lokasi,
        dampak: dampakDari(jendela),
        sumber: "ikhtisar",
      });
      sudah.add(kunci);
    }
  }
  return sistem;
}

function berdampak(item) {
  const dampak = rapikan(item?.dampak);
  return Boolean(dampak) && !/^[-–—.]+$/.test(dampak);
}

function dekatIndonesia(item) {
  return item?.di_dalam_tcwc === true || berdampak(item);
}

export function potensiDekatIndonesia(cuplikan) {
  const status = String(cuplikan?.status || "").trim().toLowerCase();
  const halamanAda = status === "ada";
  const kumpulan = [
    ...(Array.isArray(cuplikan?.sistem_halaman) ? cuplikan.sistem_halaman : []),
    ...(Array.isArray(cuplikan?.ikhtisar?.sistem) ? cuplikan.ikhtisar.sistem : []),
  ].filter(dekatIndonesia);
  const sistem = [];
  const sudah = new Set();
  for (const item of kumpulan) {
    const kunci = rapikan(item?.nama).toLowerCase();
    if (!kunci || sudah.has(kunci)) continue;
    sudah.add(kunci);
    sistem.push(item);
  }
  return { dekat: sistem.length > 0, halamanAda, sistem };
}

export function jumlahSistemSiklon(cuplikan) {
  const nama = new Set();
  const daftar = [
    ...(Array.isArray(cuplikan?.sistem_halaman) ? cuplikan.sistem_halaman : []),
    ...(Array.isArray(cuplikan?.ikhtisar?.sistem) ? cuplikan.ikhtisar.sistem : []),
  ];
  for (const item of daftar) {
    const kunci = rapikan(item?.nama).toLowerCase();
    if (kunci) nama.add(kunci);
  }
  return nama.size;
}

export function siklonUsang(entri) {
  if (!entri || typeof entri !== "object") return false;
  return Boolean(entri.kept_previous) || entri.status === "failed";
}

export function gagalSiklonBerturut(sebelumnya) {
  const angka = Number(sebelumnya?.gagal_berturut);
  if (Number.isFinite(angka) && angka > 0) return angka + 1;
  if (sebelumnya?.status === "failed" || sebelumnya?.kept_previous) return 2;
  return 1;
}

export function siklonPerluTanda(entri, { intervalHours = REFRESH_INTERVAL_HOURS } = {}) {
  if (!entri || typeof entri !== "object") return false;
  const angka = Number(entri.gagal_berturut);
  if (Number.isFinite(angka)) return angka > 1;
  if (entri.status !== "failed" || !entri.kept_previous) return false;
  const ambil = Date.parse(entri.fetched_at || "");
  const cek = Date.parse(entri.checked_at || "");
  if (!Number.isFinite(ambil) || !Number.isFinite(cek)) return false;
  const batas = Number(intervalHours) > 0 ? Number(intervalHours) : REFRESH_INTERVAL_HOURS;
  return cek - ambil > batas * 2 * 3600000;
}

function rad(derajat) {
  return (derajat * Math.PI) / 180;
}

function haversineKm(lintang1, bujur1, lintang2, bujur2) {
  const dLintang = rad(lintang2 - lintang1);
  const dBujur = rad(bujur2 - bujur1);
  const a = Math.sin(dLintang / 2) ** 2
    + Math.cos(rad(lintang1)) * Math.cos(rad(lintang2)) * Math.sin(dBujur / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function jarakKeBingkaiIndonesia(lintang, bujur) {
  const lat = Number(lintang);
  const lon = Number(bujur);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const dekatLintang = Math.min(INDONESIA_FRAME.north, Math.max(INDONESIA_FRAME.south, lat));
  const dekatBujur = Math.min(INDONESIA_FRAME.east, Math.max(INDONESIA_FRAME.west, lon));
  if (dekatLintang === lat && dekatBujur === lon) return 0;
  return Math.round(haversineKm(lat, lon, dekatLintang, dekatBujur));
}

function dampakKosong(teks) {
  const rata = rapikan(teks);
  return !rata || /^[-–—.]+$/.test(rata);
}

function entriKurasi(kurasi) {
  if (Array.isArray(kurasi?.entri)) return kurasi.entri;
  if (Array.isArray(kurasi)) return kurasi;
  return [];
}

function kurasiBerlaku(entri, sekarang) {
  const teks = rapikan(entri?.potensi_dampak);
  const label = rapikan(entri?.sumber?.label);
  const url = rapikan(entri?.sumber?.url);
  const batas = Date.parse(entri?.berlaku_hingga || "");
  const kini = sekarang instanceof Date ? sekarang.getTime() : Number(sekarang);
  if (!teks || !label || !url || !Number.isFinite(batas) || !Number.isFinite(kini)) return null;
  if (kini > batas) return null;
  return { teks, label, url, berlaku_hingga: entri.berlaku_hingga, diperbarui: entri.diperbarui || "" };
}

export function gabungDampakManual(item, kurasi, sekarang = Date.now()) {
  if (!item || agensiSistem(item) !== "BMKG") return item;
  const dariHalaman = !dampakKosong(item.dampak) && item.dampak_manual !== true;
  if (dariHalaman) {
    if (!item.dampak_manual && !item.sumber_manual) return item;
    return { ...item, dampak_manual: false, sumber_manual: null };
  }
  const kunci = kunciNamaSiklon(item.nama);
  const entri = entriKurasi(kurasi)
    .map((calon) => (kunci && kunciNamaSiklon(calon?.sistem) === kunci ? kurasiBerlaku(calon, sekarang) : null))
    .find(Boolean);
  if (!entri) {
    if (item.dampak_manual) return { ...item, dampak: "-", dampak_manual: false, sumber_manual: null };
    return item;
  }
  return {
    ...item,
    dampak: entri.teks,
    dampak_manual: true,
    sumber_manual: { label: entri.label, url: entri.url },
    dampak_diperbarui: entri.diperbarui,
    dampak_berlaku_hingga: entri.berlaku_hingga,
  };
}

export function terapkanKurasiDampak(cuplikan, kurasi, sekarang = Date.now()) {
  if (!cuplikan || typeof cuplikan !== "object") return cuplikan;
  const sistem = Array.isArray(cuplikan.sistem_halaman) ? cuplikan.sistem_halaman : [];
  return {
    ...cuplikan,
    sistem_halaman: sistem.map((item) => gabungDampakManual(item, kurasi, sekarang)),
  };
}

function wilayahPadaTeks(teks) {
  const sumber = rapikan(teks);
  const nama = [...PROVINSI.map((item) => item.nama)].sort((kiri, kanan) => kanan.length - kiri.length);
  const ketemu = [];
  let sisa = sumber;
  for (const wilayah of nama) {
    const pola = new RegExp(`(?<![A-Za-z])${wilayah.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z])`, "i");
    if (!pola.test(sisa)) continue;
    ketemu.push(wilayah);
    sisa = sisa.replace(pola, " ");
  }
  return ketemu;
}

export function analisisDampakIndonesia(sistem) {
  const dampak = rapikan(sistem?.dampak);
  const kosong = dampakKosong(dampak);
  const disebut = kosong ? [] : wilayahPadaTeks(dampak);
  let tingkat = "Kecil";
  let wilayah = [{ nama: "Wilayah Indonesia", tingkat: "Kecil", kutipan: kosong ? "-" : dampak }];
  if (disebut.length) {
    tingkat = "Disebut BMKG";
    wilayah = disebut.map((nama) => ({ nama, tingkat: "Disebut BMKG", kutipan: dampak }));
  } else if (sistem?.di_dalam_tcwc === true) {
    tingkat = "Di wilayah pemantauan";
    wilayah = [{ nama: "Wilayah Indonesia", tingkat, kutipan: kosong ? "-" : dampak }];
  }
  return {
    tingkat,
    wilayah,
    rumus: RUMUS_DAMPAK_SIKLON,
    jarak_km: jarakKeBingkaiIndonesia(sistem?.lintang, sistem?.bujur),
  };
}

function muatNuxt(html) {
  const cocok = String(html || "").match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!cocok) return null;
  try {
    const raw = JSON.parse(cocok[1]);
    return Array.isArray(raw) ? raw : null;
  } catch {
    return null;
  }
}

function kutipanSiaran(teks) {
  const rata = rapikan(teks);
  if (rata.length <= 500) return rata;
  const potong = rata.slice(0, 500);
  const kalimat = potong.match(/^[\s\S]*\./);
  return `${(kalimat ? kalimat[0] : potong).trim()} …`;
}

function urlSiaran(slug) {
  const aman = String(slug || "").trim();
  if (!/^[a-z0-9-]+$/i.test(aman)) return "";
  return `${SIARAN_PERS_URL}/${aman}`;
}

export function bacaSiaranPers(html) {
  const raw = muatNuxt(html);
  if (!raw) return { status: "gagal", galat: "Daftar siaran pers tidak dikenali.", daftar: [] };
  const sudah = new Set();
  const semua = [];
  let dikenal = false;
  for (let i = 0; i < raw.length; i += 1) {
    const slot = raw[i];
    if (!slot || typeof slot !== "object" || Array.isArray(slot)) continue;
    if (!("title" in slot) || !("slug" in slot)) continue;
    const objek = nilaiNuxt(raw, i);
    const judul = rapikan(objek?.title);
    const slug = rapikan(objek?.slug);
    if (!judul || !slug) continue;
    dikenal = true;
    if (sudah.has(slug)) continue;
    sudah.add(slug);
    const kutipan = kutipanSiaran(objek?.excerpt || "");
    if (!/\bsiklon|\bbibit\b/i.test(`${judul} ${kutipan}`)) continue;
    const url = urlSiaran(slug);
    if (!url) continue;
    semua.push({
      judul,
      slug,
      url,
      terbit: rapikan(objek?.date),
      kutipan,
    });
  }
  if (!dikenal) return { status: "gagal", galat: "Daftar siaran pers tidak dikenali.", daftar: [] };
  return { status: "ok", galat: "", daftar: semua.slice(0, 8) };
}

export function gabungSiaran(hasil, sebelumnya) {
  if (hasil?.status === "ok") {
    return {
      status: "ok",
      galat: "",
      daftar: Array.isArray(hasil.daftar) ? hasil.daftar : [],
      url: SIARAN_PERS_URL,
      fetched_at: hasil.fetched_at || "",
      kept_previous: false,
    };
  }
  const daftar = Array.isArray(sebelumnya?.daftar) ? sebelumnya.daftar : [];
  return {
    status: "gagal",
    galat: rapikan(hasil?.galat) || "Daftar siaran pers tidak terbaca.",
    daftar,
    url: SIARAN_PERS_URL,
    fetched_at: sebelumnya?.fetched_at || "",
    kept_previous: daftar.length > 0,
  };
}

export function susunCuplikan({
  html,
  ikhtisarTeks = "",
  ikhtisarGalat = "",
  apiHttp = 0,
  apiGalat = "",
  fetchedAt,
  pdfDiubah = "",
  siaranPers = null,
}) {
  const halaman = bacaStatusHtml(html);
  if (!halaman.status) {
    const galat = new Error(halaman.galat || "Status halaman tidak dikenali.");
    galat.kode = "parse";
    throw galat;
  }
  const sistem = ikhtisarGalat ? [] : bacaIkhtisar(ikhtisarTeks);
  const terbit = ikhtisarGalat ? "" : tanggalDokumen(ikhtisarTeks);
  return {
    status: halaman.status,
    status_teks: halaman.teks,
    status_sumber: "halaman-siklon-tropis",
    sistem_halaman: halaman.sistem,
    ikhtisar: {
      status: ikhtisarGalat ? "gagal" : terbit || sistem.length ? "ok" : "kosong",
      galat: ikhtisarGalat,
      terbit,
      url: SIKLON_PDF_URL,
      sistem,
    },
    api: {
      url: SIKLON_API_URL,
      http: apiHttp || null,
      dipakai: false,
      galat: apiGalat,
    },
    jejak: SIKLON_BELUM,
    siaran_pers: siaranPers || {
      status: "kosong",
      galat: "",
      daftar: [],
      url: SIARAN_PERS_URL,
      fetched_at: "",
      kept_previous: false,
    },
    fetched_at: fetchedAt,
    pdf_diubah: pdfDiubah || "",
    url_halaman: SIKLON_HTML_URL,
    url_tcwc: SIKLON_TCWC_URL,
  };
}
