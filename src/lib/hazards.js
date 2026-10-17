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
    status: "Belum terhubung / menunggu data",
    catatan:
      "Tab ini belum memuat peta atau angka. Indikator di bawah adalah rencana, bukan hasil pemantauan.",
    indikator: [
      "Potensi hujan ekstrem BMKG. Halaman HTML dan citra hanya ditautkan. Bukan prakiraan 14 hari per kabupaten.",
      "Prediksi hujan dasarian (3 dasarian) dan peringatan dini curah hujan tinggi. Tautan saja. Citra tidak diunduh dan tidak dipotong.",
      "DAS kritis dari Klasifikasi DAS KLHK pada layanan peta BNPB. Belum digambar. Kegagalan layanan itu tidak boleh menghentikan Karhutla.",
      "Kejadian banjir historis BNPB. Kompilasi Satu Data yang sudah dipakai untuk karhutla tidak memisahkan banjir per kabupaten pada berkas yang sama.",
      "Kerangka 15–20 kabupaten/kota. Belum disusun. Bobot, ambang, dan periode belum disepakati.",
    ],
    sumber: [
      { nama: "Potensi cuaca ekstrem", instansi: "BMKG", url: "https://www.bmkg.go.id/cuaca/potensi-cuaca-ekstrem", status: "Tautan saja" },
      { nama: "Potensi hujan sepekan", instansi: "BMKG", url: "https://www.bmkg.go.id/cuaca/potensi-hujan-sepekan", status: "Tautan saja" },
      { nama: "Prediksi hujan dasarian", instansi: "BMKG", url: "https://www.bmkg.go.id/iklim/prediksi-hujan-dasarian", status: "Tautan saja" },
      { nama: "Peringatan dini curah hujan tinggi", instansi: "BMKG", url: "https://www.bmkg.go.id/iklim/peringatan-dini-hujan-tinggi", status: "Tautan saja" },
      {
        nama: "Klasifikasi DAS KLHK",
        instansi: "BNPB / KLHK",
        url: "https://gis.bnpb.go.id/server/rest/services/inarisk/Klasifikasi_DAS_KLHK/MapServer",
        status: "Belum terhubung",
      },
      {
        nama: "Kompilasi kejadian bencana",
        instansi: "BNPB Satu Data",
        url: "https://data.bnpb.go.id/api/3/action/package_show?id=data-bencana-indonesia",
        status: "Belum terhubung",
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
    ],
    sumber: [
      { nama: "MAGMA Indonesia", instansi: "PVMBG / Badan Geologi", url: "https://magma.esdm.go.id/", status: "Tautan saja" },
      { nama: "PVMBG", instansi: "Badan Geologi", url: "https://vsi.esdm.go.id/", status: "Tautan saja" },
      { nama: "PPID ESDM", instansi: "Kementerian ESDM", url: "https://ppid.esdm.go.id/", status: "Tautan saja" },
    ],
  },
];

export function hazardById(id) {
  return HAZARDS.find((item) => item.id === id) || HAZARDS[0];
}
