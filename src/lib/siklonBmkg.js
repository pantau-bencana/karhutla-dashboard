import { REFRESH_INTERVAL_HOURS } from "./schedule.js";

export const SIKLON_HTML_URL = "https://www.bmkg.go.id/cuaca/siklon-tropis";
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
    const rata = rapikan(nilai);
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

function susunSistem({ nama, tahap, jenis, kalimat, dampak = "", isAor = null }) {
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
    di_dalam_tcwc: Boolean(diDalam),
    luar_tcwc: Boolean(luar),
    sumber: "halaman",
  };
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
  for (let i = 0; i < raw.length; i += 1) {
    const slot = raw[i];
    if (!slot || typeof slot !== "object" || Array.isArray(slot)) continue;
    if ("is_cyclone" in slot && "name" in slot) {
      const objek = nilaiNuxt(raw, i);
      if (objek && objek.is_current !== false && rapikan(objek.name)) siklon.push(objek);
    } else if ("description_id" in slot && "tc_id" in slot) {
      const objek = nilaiNuxt(raw, i);
      if (objek?.tc_id && objek.description_id) rincian.set(objek.tc_id, objek);
    }
  }
  return siklon.map((rekaman) => {
    const rinci = rincian.get(rekaman.id) || {};
    const namaMentah = rapikan(rekaman.name);
    const jenis = /^bibit\b/i.test(namaMentah) || rekaman.is_cyclone === false ? "bibit" : "siklon";
    const dampak = teksDampak(rinci.direct_impact) || teksDampak(rinci.extreme_weather) || teksDampak(rinci.warning_text);
    return susunSistem({
      nama: namaPublik(namaMentah, rekaman.tc_code, jenis),
      tahap: jenis === "bibit" ? "Bibit Siklon Tropis" : "Siklon Tropis",
      jenis,
      kalimat: rinci.description_id || "",
      dampak,
      isAor: rekaman.is_aor === true,
    });
  }).filter((item) => item.nama && item.kalimat);
}

function dampakDariTabel(html, nama) {
  const aman = rapikan(nama).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (aman.length < 2) return "";
  const pola = new RegExp(`Wilayah Terdampak[^<]{0,80}${aman}[\\s\\S]{0,5000}?<tbody[\\s\\S]*?</tbody>`, "i");
  const cocok = String(html || "").match(pola);
  if (!cocok) return "";
  const sel = [...cocok[0].matchAll(/<p>([\s\S]*?)<\/p>/gi)]
    .map((item) => rapikan(item[1].replace(/<[^>]+>/g, " ")))
    .filter((teks) => teks && !/^[-–—.]+$/.test(teks));
  return sel.join("; ");
}

function dampakHalaman(html, nama, kalimat) {
  const dariKalimat = dampakDari(`${kalimat} `);
  if (dariKalimat) return dariKalimat;
  const tabel = dampakDariTabel(html, nama);
  if (tabel) return tabel;
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
  return sistem.map((item) => {
    if (item.dampak) return item;
    const dampak = dampakHalaman(sumber, item.nama, item.kalimat);
    return dampak ? { ...item, dampak } : item;
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

export function susunCuplikan({
  html,
  ikhtisarTeks = "",
  ikhtisarGalat = "",
  apiHttp = 0,
  apiGalat = "",
  fetchedAt,
  pdfDiubah = "",
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
    fetched_at: fetchedAt,
    pdf_diubah: pdfDiubah || "",
    url_halaman: SIKLON_HTML_URL,
    url_tcwc: SIKLON_TCWC_URL,
  };
}
