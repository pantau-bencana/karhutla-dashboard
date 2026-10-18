export const HAZARDS = [
  {
    id: "karhutla",
    nama: "Karhutla",
    ringkas: "Kebakaran hutan dan lahan",
    siap: true,
  },
  {
    id: "banjir",
    nama: "Banjir",
    ringkas: "Banjir",
    siap: false,
    status: "Prototipe internal – menunggu izin tertulis BNPB",
    catatan:
      "Peta indeks risiko dan tabel IRBI 2025 untuk Aceh serta Bengkulu adalah prototipe internal. Izin tertulis BNPB belum ada. Indikator di bawah yang masih tautan bukan hasil pemantauan.",
    indikator: [
      "Potensi hujan ekstrem BMKG. Halaman HTML dan citra hanya ditautkan. Bukan prakiraan 14 hari per kabupaten.",
      "Prediksi hujan dasarian (3 dasarian) dan peringatan dini curah hujan tinggi. Tautan saja. Citra tidak diunduh dan tidak dipotong.",
      "Klasifikasi DAS KLHK pada layanan peta BNPB, sebagai lapisan opsional. Label yang dipakai adalah DIPULIHKAN dan DIPERTAHANKAN. Kegagalan layanan itu tidak boleh menghentikan Karhutla.",
      "Kejadian banjir 2024 per kabupaten/kota dari tabel DIBI Satu Data, kolom BANJIR, resource a4daec53-1119-43ef-b05e-00ec3a4c42a4. Kompilasi 2010–2024 yang dipakai karhutla tetap menggabungkan semua jenis. Baris yang tidak ada tidak diisi nol.",
      "Kerangka 15–20 kabupaten/kota. Belum disusun. Bobot, ambang, dan periode belum disepakati.",
    ],
    sumber: [
      { nama: "Potensi cuaca ekstrem", instansi: "BMKG", url: "https://www.bmkg.go.id/cuaca/potensi-cuaca-ekstrem", status: "Tautan saja" },
      { nama: "Potensi hujan sepekan", instansi: "BMKG", url: "https://www.bmkg.go.id/cuaca/potensi-hujan-sepekan", status: "Tautan saja" },
      { nama: "Prediksi hujan dasarian", instansi: "BMKG", url: "https://www.bmkg.go.id/iklim/prediksi-hujan-dasarian", status: "Tautan saja" },
      { nama: "Peringatan dini curah hujan tinggi", instansi: "BMKG", url: "https://www.bmkg.go.id/iklim/peringatan-dini-hujan-tinggi", status: "Tautan saja" },
      {
        nama: "Peta risiko banjir inaRISK",
        instansi: "BNPB",
        url: "https://gis.bnpb.go.id/server/rest/services/inarisk/layer_risiko_banjir/ImageServer",
        status: "Prototipe internal – menunggu izin tertulis BNPB",
      },
      {
        nama: "Klasifikasi DAS KLHK",
        instansi: "BNPB / KLHK",
        url: "https://gis.bnpb.go.id/server/rest/services/inarisk/Klasifikasi_DAS_KLHK/MapServer",
        status: "Prototipe internal – menunggu izin tertulis BNPB",
      },
      {
        nama: "Kejadian banjir kabupaten 2024",
        instansi: "BNPB Satu Data",
        url: "https://data.bnpb.go.id/dataset/data-bencana-indonesia",
        status: "Data statis",
      },
    ],
  },
  {
    id: "gunung-api",
    nama: "Gunung Api",
    ringkas: "Gunung api",
    siap: false,
    status: "Belum terhubung / menunggu data",
    catatan:
      "Tidak ada API publik MAGMA yang terdokumentasi. Tingkat aktivitas tidak diisi. Pengorek pihak ketiga tidak dipakai.",
    indikator: [
      "Tingkat aktivitas PVMBG: Normal, Waspada, Siaga, Awas, dari sumber resmi MAGMA Indonesia. Saat ini tautan saja.",
      "Kabupaten/kota terdampak. Belum terhubung.",
      "Permintaan data resmi diajukan ke PVMBG / Badan Geologi melalui PPID ESDM.",
      "Laporan mingguan Smithsonian dan nasihat VAAC Darwin hanya tautan. Umpan mesin tidak terbaca oleh klien netral.",
    ],
    sumber: [
      { nama: "MAGMA Indonesia", instansi: "PVMBG / Badan Geologi", url: "https://magma.esdm.go.id/", status: "Tautan saja" },
      { nama: "PVMBG", instansi: "Badan Geologi", url: "https://vsi.esdm.go.id/", status: "Tautan saja" },
      { nama: "PPID ESDM", instansi: "Kementerian ESDM", url: "https://ppid.esdm.go.id/", status: "Tautan saja" },
      { nama: "Laporan mingguan GVP", instansi: "Smithsonian", url: "https://volcano.si.edu/reports_weekly.cfm", status: "Tautan saja" },
      { nama: "VAAC Darwin", instansi: "Bureau of Meteorology", url: "https://www.bom.gov.au/aviation/warnings/volcanic-ash/", status: "Tautan saja" },
    ],
  },
];

export function hazardById(id) {
  return HAZARDS.find((item) => item.id === id) || HAZARDS[0];
}
