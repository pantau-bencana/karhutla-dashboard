// Status Mode Umum: hanya empat label awam. Tanpa IRBI, tanpa mm, tanpa matriks.

export const LABEL = {
  Aman: "Aman",
  Waspada: "Waspada",
  Siaga: "Siaga",
  Awas: "Awas",
};

export const TEKS_STATUS = {
  Aman: "Tidak ada potensi banjir yang terdeteksi saat ini. Aktivitas berjalan normal.",
  Waspada: "Ada potensi hujan atau genangan. Pantau cuaca dan periksa saluran air di sekitar rumah.",
  Siaga: "Potensi banjir meningkat. Amankan barang berharga ke tempat lebih tinggi dan siapkan tas darurat.",
  Awas: "Potensi banjir tinggi. Utamakan keselamatan, siap pindah ke tempat aman, dan ikuti arahan evakuasi BPBD atau aparat setempat.",
};

export const WARNA_STATUS = {
  Aman: { latar: "#ecfdf3", tinta: "#065f46", aksen: "#059669", border: "#a7f3d0" },
  Waspada: { latar: "#fffbeb", tinta: "#92400e", aksen: "#d97706", border: "#fde68a" },
  Siaga: { latar: "#fff7ed", tinta: "#9a3412", aksen: "#ea580c", border: "#fdba74" },
  Awas: { latar: "#fef2f2", tinta: "#9f1239", aksen: "#dc2626", border: "#fecaca" },
};

export function normalisasiStatus(nilai) {
  const teks = String(nilai ?? "").trim();
  if (teks === "Awas" || teks === "Siaga" || teks === "Waspada") return teks;
  return "Aman";
}

export function capSudahLewat(row, now = Date.now()) {
  if (!row) return true;
  if (row.lampau) return true;
  const sampai = String(row.berlaku_sampai ?? "").trim();
  if (!sampai) return false;
  const waktu = Date.parse(sampai);
  if (Number.isNaN(waktu)) return false;
  return waktu <= now;
}

export function statusBarisAktif(row, now = Date.now(), opsi = {}) {
  const status = normalisasiStatus(row?.status);
  if (opsi.cap && capSudahLewat(row, now)) return "Aman";
  return status;
}

export function tabById(ringkasan, id) {
  return (ringkasan?.tabs ?? []).find((tab) => tab.id === id) || null;
}

export function barisKab(tab, kode) {
  if (!tab || !kode) return null;
  return (tab.rows ?? []).find((row) => String(row.kode) === String(kode)) || null;
}

export function daftarKabupaten(ringkasan) {
  const peta = new Map();
  for (const tab of ringkasan?.tabs ?? []) {
    for (const row of tab.rows ?? []) {
      const kode = String(row.kode ?? "").trim();
      if (!kode || peta.has(kode)) continue;
      peta.set(kode, {
        kode,
        nama: String(row.kab_kota ?? "").trim(),
        provinsi: String(row.provinsi ?? "").trim(),
      });
    }
  }
  return [...peta.values()].sort((a, b) => a.nama.localeCompare(b.nama, "id"));
}

export function statusKabupaten(ringkasan, kode, now = Date.now()) {
  const capTab = tabById(ringkasan, "0-3-jam");
  const hariTab = tabById(ringkasan, "hari-ini");
  const besokTab = tabById(ringkasan, "besok");
  const capMati = Boolean(ringkasan?.cap?.kedaluwarsa || capTab?.kedaluwarsa);
  const sekarangRow = barisKab(capTab, kode);
  const hariRow = barisKab(hariTab, kode);
  const besokRow = barisKab(besokTab, kode);
  const sekarang = capMati ? "Aman" : statusBarisAktif(sekarangRow, now, { cap: true });
  const hariIni = statusBarisAktif(hariRow, now, { cap: false });
  const besok = statusBarisAktif(besokRow, now, { cap: false });
  const meta = barisKab(hariTab, kode) || barisKab(besokTab, kode) || sekarangRow;
  return {
    kode: String(kode ?? ""),
    nama: meta?.kab_kota ?? "",
    provinsi: meta?.provinsi ?? "",
    sekarang,
    hariIni,
    besok,
    utama: prioritasStatus(sekarang, hariIni, besok),
  };
}

export function prioritasStatus(...daftar) {
  const urut = ["Awas", "Siaga", "Waspada", "Aman"];
  let terpilih = "Aman";
  for (const status of daftar) {
    if (urut.indexOf(status) < urut.indexOf(terpilih)) terpilih = status;
  }
  return terpilih;
}

export function ringkasHariIni(ringkasan, now = Date.now()) {
  const tab = tabById(ringkasan, "hari-ini");
  const awas = [];
  const siaga = [];
  const waspada = [];
  for (const row of tab?.rows ?? []) {
    const status = statusBarisAktif(row, now, { cap: false });
    const item = {
      kode: String(row.kode ?? ""),
      nama: String(row.kab_kota ?? ""),
      provinsi: String(row.provinsi ?? ""),
      status,
    };
    if (status === "Awas") awas.push(item);
    else if (status === "Siaga") siaga.push(item);
    else if (status === "Waspada") waspada.push(item);
  }
  const urutNama = (a, b) => a.nama.localeCompare(b.nama, "id");
  awas.sort(urutNama);
  siaga.sort(urutNama);
  waspada.sort(urutNama);
  return {
    awas,
    siaga,
    waspada,
    jumlah: awas.length + siaga.length + waspada.length,
  };
}

export function saringKabupaten(daftar, kueri) {
  const q = String(kueri ?? "").trim().toLowerCase();
  if (!q) return daftar.slice(0, 12);
  return daftar
    .filter((item) => {
      const hay = `${item.nama} ${item.provinsi} ${item.kode}`.toLowerCase();
      return hay.includes(q);
    })
    .slice(0, 20);
}

export function parseTitikWakil(text) {
  // Dipakai tes dan pemuatan. Pemanggil UI memakai parseCsv, lalu fungsi ini
  // menormalkan hasil objek.
  return (Array.isArray(text) ? text : []).map((row) => ({
    kode: String(row.kode ?? "").trim(),
    nama: String(row.kabupaten ?? row.nama ?? "").trim(),
    provinsi: String(row.provinsi ?? "").trim(),
    lintang: Number(row.lintang),
    bujur: Number(row.bujur),
  })).filter((row) => row.kode && Number.isFinite(row.lintang) && Number.isFinite(row.bujur));
}

export function jarakKm(lat1, lon1, lat2, lon2) {
  const keRad = (nilai) => (nilai * Math.PI) / 180;
  const dLat = keRad(lat2 - lat1);
  const dLon = keRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(keRad(lat1)) * Math.cos(keRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function kabTerdekat(titik, lintang, bujur) {
  if (!titik?.length || !Number.isFinite(lintang) || !Number.isFinite(bujur)) return null;
  let terbaik = null;
  let jarak = Infinity;
  for (const item of titik) {
    const km = jarakKm(lintang, bujur, item.lintang, item.bujur);
    if (km < jarak) {
      jarak = km;
      terbaik = { ...item, jarakKm: km };
    }
  }
  return terbaik;
}

export function kodeDariHash(hash) {
  const path = String(hash ?? "")
    .replace(/^#/, "")
    .split("?")[0]
    .replace(/\/+$/, "")
    .trim();
  const parts = path.split("/").filter(Boolean);
  if (!parts.length) return "";
  if (parts[0] === "kab" && parts[1]) return parts[1];
  return parts[0];
}

export function hashKab(kode) {
  return kode ? `#/kab/${kode}` : "#/";
}

export function tautanJalurSitus(segmen = "") {
  const url = new URL(window.location.href);
  let path = url.pathname;
  if (path.endsWith("/index.html")) path = path.slice(0, -10);
  if (!path.endsWith("/")) path += "/";
  const tujuan = String(segmen ?? "").replace(/^\/+/, "");
  return `${url.origin}${path}${tujuan}${tujuan && !tujuan.endsWith("/") ? "/" : ""}`;
}

export function tautanTeknis() {
  const url = new URL(window.location.href);
  if (url.port === "5173") {
    url.port = "5176";
    url.pathname = "/";
    url.hash = "";
    return url.toString();
  }
  return tautanJalurSitus("teknis");
}

export function tautanModeUmumDariTeknis() {
  const url = new URL(window.location.href);
  if (url.port === "5176" || url.port === "5174") {
    url.port = "5173";
    url.pathname = "/";
    url.hash = "";
    return url.toString();
  }
  if (url.port === "5175") {
    url.port = "5173";
    url.pathname = "/";
    url.hash = "";
    return url.toString();
  }
  if (url.port === "5177") {
    url.port = "5173";
    url.pathname = "/";
    url.hash = "";
    return url.toString();
  }
  let path = url.pathname;
  if (path.endsWith("/index.html")) path = path.slice(0, -10);
  path = path.replace(/\/(v1|v2|v3|teknis)\/?$/, "/");
  if (!path.endsWith("/")) path += "/";
  return `${url.origin}${path}`;
}
