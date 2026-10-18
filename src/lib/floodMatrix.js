export const FLOOD_PERMISSION = "Prototipe internal – menunggu izin tertulis BNPB";
export const MISSING_DIBI = "Tidak tercantum di tabel DIBI 2024";
export const DIBI_UNAVAILABLE = "Cuplikan DIBI belum tersedia";
export const NODATA_LABEL = "Di luar area bahaya banjir yang dipetakan inaRISK";
export const IDENTIFY_FAIL = "Nilai tidak tersedia (layanan BNPB tidak merespons)";
export const RISK_ATTRIBUTION =
  "Indeks risiko banjir inaRISK BNPB, KRB 2021, piksel 100 m. Bukan peringatan dini. Bukan IRBI 2025.";
export const IRBI_PERMISSION =
  "Tabel IRBI dikutip dari buku IRBI 2025 BNPB; penggunaan publik menunggu izin tertulis BNPB (hal. ii).";
export const DIBI_RESOURCE = "a4daec53-1119-43ef-b05e-00ec3a4c42a4";
export const INARISK_PORTAL = "https://inarisk.bnpb.go.id/";

export const RAIN_RISK_MATRIX = {
  id: "hujan-ekstrem-x-risiko-banjir",
  ready: true,
  axes: [
    { id: "hujan", sumber: "BMKG", kelas: "Nowcast peringatan dini cuaca 0–3 jam" },
    { id: "risiko", sumber: "IRBI 2025", kelas: "kelas risiko banjir" },
  ],
  note: "Sumbu hujan adalah nowcast BMKG 0–3 jam per kabupaten/kota. Sumbu risiko adalah kelas banjir IRBI 2025 apa adanya. Bukan peringatan dasarian, bukan IBF, dan bukan prakiraan adm4. Tidak ada skor gabungan.",
};

export const FLOOD_INFO_COLUMNS = [
  { id: "wilayah", label: "Kode dan nama", detail: "BIG, edisi 2022", sortKey: "kode" },
  { id: "irbi-banjir", label: "Kelas risiko banjir IRBI 2025", detail: "Data statis. Skor dan halaman apa adanya.", sortKey: "banjir" },
  {
    id: "nowcast",
    label: "Peringatan hujan lebat BMKG aktif (0–3 jam)",
    detail: "Nowcast CAP. Bukan dasarian dan bukan IBF.",
  },
  {
    id: "dasarian",
    label: "Status Peringatan Dini Curah Hujan Tinggi dasarian (Waspada/Siaga/Awas)",
    detail: "Tautan saja – menunggu izin tertulis BMKG",
  },
  { id: "irbi-multi", label: "IRBI 2025 multi-bahaya", detail: "Data statis. Kelas dan halaman. Bukan khusus banjir.", sortKey: "multi" },
  { id: "dibi", label: "Kejadian banjir 2024", detail: "Data statis. DIBI, ODC-BY.", sortKey: "dibi" },
  { id: "kajian", label: "Ringkasan kajian inaRISK", detail: "Belum terhubung" },
  { id: "krb", label: "Dokumen KRB", detail: "Tautan saja" },
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

export function buildFloodRows({ banjir, multi, dibi, dibiLoaded }) {
  const multiByName = new Map((multi ?? []).map((row) => [nameKey(row.kabupaten_irbi || row.kabupaten_kota), row]));
  const dibiByKode = new Map((dibi ?? []).map((row) => [kodeWilayah(row.kode_wilayah), row]));
  const rows = (banjir ?? []).map((row) => {
    const kode = kodeWilayah(row.kode_wilayah);
    const key = nameKey(row.kabupaten_irbi || row.kabupaten_kota);
    const total = multiByName.get(key);
    const kejadian = dibiByKode.get(kode);
    let dibiTeks = DIBI_UNAVAILABLE;
    let dibiAngka = null;
    if (dibiLoaded) {
      if (!kejadian) dibiTeks = MISSING_DIBI;
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

export function sortFloodRows(rows, key, direction = "asc") {
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
