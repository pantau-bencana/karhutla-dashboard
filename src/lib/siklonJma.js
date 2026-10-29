export const JMA_HALAMAN_URL = "https://www.jma.go.jp/bosai/typhoon/";
export const JMA_DAFTAR_URL = "https://www.jma.go.jp/bosai/typhoon/data/targetTc.json";

const KATEGORI = {
  TD: "Depresi tropis",
  TS: "Badai tropis",
  STS: "Badai tropis kuat",
  TY: "Topan",
};

export function urlPrakiraanJma(id) {
  const aman = String(id || "").trim();
  if (!/^TC\d{3,6}$/.test(aman)) return "";
  return `https://www.jma.go.jp/bosai/typhoon/data/${aman}/forecast.json`;
}

export function bacaTargetJma(daftar) {
  if (!Array.isArray(daftar)) return [];
  return daftar.filter((item) => item && /^TC\d{3,6}$/.test(String(item.tropicalCyclone || "")));
}

export function sistemDariPrakiraanJma(target, prakiraan) {
  if (!Array.isArray(prakiraan)) return null;
  const judul = prakiraan.find((bagian) => bagian?.part === "title");
  const analisis = prakiraan.find((bagian) => bagian?.advancedHours === 0 || bagian?.part?.en === "Analysis");
  const pusat = analisis?.center;
  if (!judul || !Array.isArray(pusat) || pusat.length < 2) return null;
  const lintang = Number(pusat[0]);
  const bujur = Number(pusat[1]);
  if (!Number.isFinite(lintang) || !Number.isFinite(bujur) || Math.abs(lintang) > 85 || Math.abs(bujur) > 180) return null;
  const kategori = String(target?.category || "");
  const nama = String(judul.name?.en || judul.typhoonNumber || target?.typhoonNumber || "").trim();
  if (!nama) return null;
  return {
    nama,
    kode: String(judul.typhoonNumber || target?.typhoonNumber || ""),
    tahap: KATEGORI[kategori] || (kategori ? `Kategori ${kategori}` : "Siklon tropis"),
    jenis: kategori === "TD" ? "bibit" : "siklon",
    kalimat: `Analisis RSMC Tokyo untuk ${nama}.`,
    lokasi: "",
    dampak: "-",
    agensi: "JMA",
    di_dalam_tcwc: false,
    luar_tcwc: false,
    sumber: "jma",
    lintang,
    bujur,
    tekanan_hpa: null,
    angin_knot: null,
    kategori,
    waktu_analisis: analisis.validtime?.UTC || "",
  };
}
