export const SIKLON_HTML_URL = "https://www.bmkg.go.id/cuaca/siklon-tropis";
export const SIKLON_TCWC_URL = "https://tropicalcyclone.bmkg.go.id/";
export const SIKLON_PDF_URL = "https://dataweb.bmkg.go.id/cuaca/dokumen/ikhtisar-cuaca-harian.pdf";
export const SIKLON_API_URL = "https://tropicalcyclone.bmkg.go.id/cms/service-api/cyclone/current";
export const SIKLON_WINDY_URL = "https://www.windy.com/-Show-tropical-cyclones/tropicalcyclones?type=tropicalcyclone";
export const SIKLON_WINDY_LABEL = "Lihat di Windy (visualisasi model, bukan resmi)";
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

export function bacaStatusHtml(html) {
  const sumber = String(html || "");
  if (!sumber.trim()) {
    return { status: null, teks: "", galat: "Halaman Siklon Tropis kosong." };
  }
  if (/Tidak Ada Siklon/i.test(sumber)) {
    return { status: "Tidak Ada", teks: "Tidak Ada Siklon", galat: "" };
  }
  return {
    status: null,
    teks: "",
    galat: "Halaman tidak memuat status Ada atau Tidak Ada yang dikenali. Sistem tidak disusun dari teks lain.",
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

export function potensiDekatIndonesia(cuplikan) {
  const status = String(cuplikan?.status || "").trim().toLowerCase();
  const sistem = (Array.isArray(cuplikan?.ikhtisar?.sistem) ? cuplikan.ikhtisar.sistem : [])
    .filter((item) => String(item?.dampak || "").trim());
  const halamanAda = status === "ada";
  return { dekat: halamanAda || sistem.length > 0, halamanAda, sistem };
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
    sistem_halaman: [],
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
