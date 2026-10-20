export const FLOOD_PERMISSION = "Prototipe internal – menunggu izin tertulis BNPB";
export const IRBI_BUKU_BANJIR_URL = "https://inarisk.bnpb.go.id/IRBI-2025/files/basic-html/page212.html";
export const IRBI_TIDAK_TERSEDIA = "IRBI tidak tersedia";
export const IRBI_BANJIR_TERVERIFIKASI =
  "510 kabupaten/kota punya skor dan kelas banjir dari Buku IRBI 2025, halaman 212–227 (282 Tinggi, 221 Sedang, 7 Rendah). Empat kabupaten/kota tidak ada di tabel banjir itu dan dikosongkan: Adm. Kep. Seribu, Bangli, Kep. Siau Tagulandang Biaro, dan Kota Ternate. Padanan nama yang dipakai: Mamuju Utara = Pasangkayu, Toba Samosir = Toba, Padangsidimpuan = Kota Padang Sidempuan, Maluku Tenggara Barat = Kepulauan Tanimbar. Skor IRB total dan tabel banjir bandang tidak dipakai.";
export const DIBI_LUAR_CUPLIKAN =
  "Cuplikan kejadian 2024 yang tersimpan tidak mencakup provinsi ini";
export const IRBI_PENGGUNAAN_INTERNAL =
  "Penggunaan internal. Data IRBI 2025 bersumber dari Buku IRBI 2025 (BNPB, Januari 2026). Buku ini melarang pengutipan atau perbanyakan tanpa izin tertulis BNPB; izin belum diperoleh, jadi halaman ini tidak untuk publikasi. Status Awas/Siaga/Waspada adalah Analisis Pantau Bencana (gabungan BMKG × IRBI BNPB), bukan status resmi.";
export const MISSING_DIBI = "Tidak tercantum di tabel BNPB 2024";
export const DIBI_UNAVAILABLE = "Cuplikan DIBI belum tersedia";
export const NODATA_LABEL = "Di luar area bahaya banjir yang dipetakan inaRISK";
export const IDENTIFY_FAIL = "Nilai tidak tersedia (layanan BNPB tidak merespons)";
export const RISK_ATTRIBUTION =
  "Indeks risiko banjir inaRISK BNPB, KRB 2021, piksel 100 m. Bukan peringatan dini. Bukan IRBI 2025.";
export const IRBI_PERMISSION = IRBI_BANJIR_TERVERIFIKASI;
export const DIBI_RESOURCE = "a4daec53-1119-43ef-b05e-00ec3a4c42a4";
export const INARISK_PORTAL = "https://inarisk.bnpb.go.id/";

export const RAIN_RISK_MATRIX = {
  id: "hujan-ekstrem-x-risiko-banjir",
  ready: true,
  axes: [
    { id: "hujan", sumber: "BMKG", kelas: "Nowcast peringatan dini cuaca 0–3 jam" },
    { id: "risiko", sumber: "IRBI 2025", kelas: "kelas risiko banjir" },
  ],
  note: "Sumbu hujan pada tab 0–3 jam adalah nowcast BMKG per kabupaten/kota. Pada tab Hari ini, Besok, dan Lusa sumbu hujan adalah weather_desc BMKG di satu titik sampel: tidak ada status untuk cerah, berawan, udara kabur, asap, dan kabut; hujan ringan atau hujan lokal tidak berstatus kecuali Waspada bila IRBI Tinggi dan hujan ada pada 3 hari berturut-turut; Moderate untuk hujan sedang; Severe untuk hujan lebat atau hujan petir; Extreme untuk hujan sangat lebat atau hujan ekstrem. Kode yang belum dikenali tetap abu-abu. Sumbu risiko adalah kelas banjir IRBI 2025 apa adanya. Analisis Pantau Bencana memetakan kedua sumbu menjadi Awas, Siaga, atau Waspada. Itu analisis dasbor, bukan status resmi, bukan skor angka, bukan peringatan dasarian, dan bukan peringatan resmi 3 hari. Ambang IRBI tinggi dan 3 hari berturut-turut adalah usulan proyek ini.",
};

export const FLOOD_INFO_COLUMNS = [
  { id: "wilayah", label: "Kab/kota", detail: "Batas BIG. Urutan kode wilayah, bukan peringkat.", sortKey: "kode" },
  {
    id: "nowcast",
    label: "Peringatan BMKG (0–3 jam)",
    detail: "Data terakhir tetap ditampilkan. Istilah CAP apa adanya. Bukan kejadian.",
  },
  { id: "berlaku", label: "Berlaku sampai", detail: "WIB" },
  { id: "dibi", label: "Kejadian banjir 2024 (BNPB)", detail: "Historis. Sel kosong bukan nol.", sortKey: "dibi" },
  {
    id: "irbi-banjir",
    label: "Kelas risiko banjir IRBI 2025",
    detail: "Statis. 510 baris dari Buku IRBI 2025, halaman 212–227. Tanpa kelas: IRBI tidak tersedia.",
    sortKey: "banjir",
  },
  { id: "analisis", label: "Analisis Pantau Bencana", detail: "Bukan status resmi.", sortKey: "status" },
  {
    id: "penduduk",
    label: "Potensi penduduk terdampak",
    detail: "potensi = total kab/kota (BPS), bukan estimasi jumlah terpapar.",
  },
  {
    id: "rumah-tangga",
    label: "Potensi rumah terdampak",
    detail: "potensi = total kab/kota (BPS), bukan estimasi jumlah terpapar.",
  },
  {
    id: "dasarian",
    label: "Dasarian (diisi manual)",
    detail: "Bukan prakiraan harian.",
  },
  { id: "tautan", label: "Tautan", detail: "Sumber" },
];

export const KRB_LINKS = {
  Aceh: [
    {
      nama: "KRB Aceh 2016–2020 (BPBA)",
      url: "https://bpba.acehprov.go.id/media/2022.09/dokumen_kajian_risiko_bencana_aceh_2016_-_20201.pdf",
    },
  ],
  Bengkulu: [
    {
      nama: "BPBD Provinsi Bengkulu",
      url: "https://bpbd.bengkuluprov.go.id/",
    },
  ],
  "17.09": [
    {
      nama: "Penyusunan KRB Kab. Bengkulu Tengah 2024",
      url: "https://bpbd.bengkulutengahkab.go.id/postingan/detail_postingan/Diskusi-Publik-Penyusunan-Dokumen-Kajian-Risiko-Bencana-KRB-Kabupaten-Bengkulu-Tengah-Tahun-2024",
    },
  ],
};

export function nameKey(value) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\b(KABUPATEN|KAB|KOTA)\b/g, " ")
    .replace(/\s+/g, "");
}

export function kodeWilayah(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return String(value ?? "").trim();
}

export function skorTeks(value) {
  if (value == null || value === "") return "—";
  return String(value).replace(".", ",");
}

export function legendClass(raw) {
  const text = String(raw ?? "").trim();
  if (!text || /nodata/i.test(text)) return { kind: "nodata", label: NODATA_LABEL };
  const value = Number(text);
  if (!Number.isFinite(value)) return { kind: "nodata", label: NODATA_LABEL };
  let kelas = "";
  if (value >= 0 && value <= 0.3) kelas = "Rendah";
  else if (value > 0.3 && value <= 0.6) kelas = "Sedang";
  else if (value > 0.6 && value <= 1) kelas = "Tinggi";
  return {
    kind: "nilai",
    value,
    kelas,
    teks: text.replace(".", ","),
  };
}

function byKode(rows) {
  return [...rows].sort((a, b) => a.kode.localeCompare(b.kode, "id") || a.nama.localeCompare(b.nama, "id"));
}

export function buildFloodRows({ banjir, multi, dibi, dibiLoaded, wilayah }) {
  const irbiByKode = new Map((banjir ?? []).map((row) => [kodeWilayah(row.kode_wilayah), row]));
  const source = wilayah?.length
    ? wilayah.map((item) => {
        const quoted = irbiByKode.get(kodeWilayah(item.kode));
        if (quoted) return { ...quoted, provinsi: quoted.provinsi || item.provinsi, nama_big: quoted.nama_big || item.nama };
        return {
          kode_wilayah: item.kode,
          provinsi: item.provinsi,
          kabupaten_irbi: "",
          nama_big: item.nama,
          skor: "",
          kelas: "",
          halaman: "",
        };
      })
    : (banjir ?? []);
  const multiByName = new Map((multi ?? []).map((row) => [nameKey(row.kabupaten_irbi || row.kabupaten_kota), row]));
  const dibiByKode = new Map((dibi ?? []).map((row) => [kodeWilayah(row.kode_wilayah), row]));
  const cakupanDibi = new Set(
    (dibi ?? []).map((row) => kodeWilayah(row.kode_wilayah).slice(0, 2)).filter((kode) => kode),
  );
  const rows = source.map((row) => {
    const kode = kodeWilayah(row.kode_wilayah);
    const key = nameKey(row.kabupaten_irbi || row.kabupaten_kota);
    const total = multiByName.get(key);
    const kejadian = dibiByKode.get(kode);
    let dibiTeks = DIBI_UNAVAILABLE;
    let dibiAngka = null;
    if (dibiLoaded) {
      if (!cakupanDibi.size) dibiTeks = DIBI_UNAVAILABLE;
      else if (!cakupanDibi.has(kode.slice(0, 2))) dibiTeks = DIBI_LUAR_CUPLIKAN;
      else if (!kejadian) dibiTeks = MISSING_DIBI;
      else {
        dibiAngka = Number(kejadian.banjir_2024);
        dibiTeks = Number.isFinite(dibiAngka) ? String(dibiAngka) : MISSING_DIBI;
      }
    }
    return {
      kode,
      provinsi: row.provinsi,
      nama: row.nama_big || row.kabupaten_irbi,
      namaIrbi: row.kabupaten_irbi || row.kabupaten_kota,
      banjirSkor: row.skor,
      banjirKelas: row.kelas,
      banjirHalaman: row.halaman,
      multiSkor: total?.skor ?? "",
      multiKelas: total?.kelas ?? "",
      multiHalaman: total?.halaman ?? "",
      dibiTeks,
      dibiAngka,
      dibiNama: kejadian?.nama_dibi || "",
    };
  });
  return byKode(rows);
}

const RANK_STATUS = { Awas: 0, Siaga: 1, Waspada: 2 };

export function peringkatTampil(row) {
  const kind = row?.peta?.kind;
  const status = row?.peta?.status || row?.statusTab || "";
  if (kind === "status" && Object.hasOwn(RANK_STATUS, status)) return RANK_STATUS[status];
  if (kind === "kosong") return 3;
  return 4;
}

export function urutStatusKab(rows) {
  return [...(rows ?? [])].sort((left, right) => {
    const rank = peringkatTampil(left) - peringkatTampil(right);
    if (rank) return rank;
    const nama = String(left.nama || "").localeCompare(String(right.nama || ""), "id");
    if (nama) return nama;
    return String(left.kode || "").localeCompare(String(right.kode || ""), "id");
  });
}

export function sortFloodRows(rows, key, direction = "asc") {
  if (key === "status") {
    const ordered = urutStatusKab(rows);
    return direction === "desc" ? ordered.reverse() : ordered;
  }
  const factor = direction === "desc" ? -1 : 1;
  const valueOf = (row) => {
    if (key === "banjir") return Number(row.banjirSkor);
    if (key === "multi") return Number(row.multiSkor);
    if (key === "dibi") return row.dibiAngka == null ? Number.POSITIVE_INFINITY : row.dibiAngka;
    if (key === "nama") return row.nama;
    return row.kode;
  };
  return [...rows].sort((a, b) => {
    const left = valueOf(a);
    const right = valueOf(b);
    if (typeof left === "number" && typeof right === "number") {
      return (left - right) * factor || a.kode.localeCompare(b.kode, "id");
    }
    return String(left).localeCompare(String(right), "id") * factor || a.kode.localeCompare(b.kode, "id");
  });
}

export function krbLinksFor(row) {
  const extra = KRB_LINKS[row.kode] ?? [];
  return [...(KRB_LINKS[row.provinsi] ?? []), ...extra];
}
