// Status per kategori pada Ringkasan. Satu sumber gagal tidak mengubah kategori lain.
import { CAP_STALE_MS } from "./capKab.js";

export const STATUS_KATEGORI = Object.freeze([
  "tersedia",
  "sebagian",
  "belum terintegrasi",
  "kedaluwarsa",
  "gagal dimuat",
]);

function waktu(entry) {
  return {
    waktuData: entry?.observed_at || "",
    waktuAmbil: entry?.fetched_at || "",
  };
}

function lewatBatas(entry, now, maxAgeMs) {
  const acuan = Date.parse(entry?.fetched_at || entry?.observed_at || "");
  if (!Number.isFinite(acuan)) return false;
  const batas = maxAgeMs != null
    ? maxAgeMs
    : Number(entry?.expected_max_age_hours) > 0
      ? Number(entry.expected_max_age_hours) * 3600000
      : null;
  if (!batas) return false;
  return now.getTime() - acuan > batas;
}

function pesanTautan(entry) {
  const pesan = `${entry?.error || ""} ${entry?.mode || ""} ${entry?.access || ""}`;
  return /tautan|belum diintegrasikan|menunggu izin|belum tersambung/i.test(pesan);
}

export function statusSumber(entry, { now = new Date(), tautan = false, maxAgeMs = null } = {}) {
  const jam = now instanceof Date ? now : new Date(now);
  if (!entry) {
    return {
      status: tautan ? "belum terintegrasi" : "gagal dimuat",
      ...waktu(null),
      catatan: tautan ? "Belum tersambung." : "Tidak ada entri pada manifes.",
    };
  }
  const jumlah = Number(entry.record_count);
  const adaIsi = Number.isFinite(jumlah) ? jumlah > 0 : Boolean(entry.file);
  const jamWaktu = waktu(entry);
  if (tautan || entry.mode === "tautan" || (entry.status !== "ok" && pesanTautan(entry))) {
    return { status: "belum terintegrasi", ...jamWaktu, catatan: entry.error || entry.limitation || "Tautan saja." };
  }
  if (entry.kept_previous && adaIsi) {
    return { status: "kedaluwarsa", ...jamWaktu, catatan: entry.error || "Menampilkan data terakhir." };
  }
  if (entry.status === "ok" && adaIsi) {
    if (lewatBatas(entry, jam, maxAgeMs)) {
      return { status: "kedaluwarsa", ...jamWaktu, catatan: "Lebih tua dari batas usia yang dipakai dasbor." };
    }
    return { status: "tersedia", ...jamWaktu, catatan: "" };
  }
  if (entry.status === "ok" && !adaIsi) {
    return { status: "sebagian", ...jamWaktu, catatan: "Cuplikan termuat tanpa baris." };
  }
  if (entry.status === "failed" || entry.status === "gagal") {
    return { status: "gagal dimuat", ...jamWaktu, catatan: entry.error || "Gagal dimuat." };
  }
  return { status: "belum terintegrasi", ...jamWaktu, catatan: entry.error || "" };
}

function statusCap(entry, berakhir, now) {
  const dasar = statusSumber(entry, { now, maxAgeMs: CAP_STALE_MS });
  const times = (berakhir ?? []).map((value) => Date.parse(value)).filter((value) => Number.isFinite(value));
  if (!times.length || dasar.status === "gagal dimuat" || dasar.status === "belum terintegrasi") return dasar;
  const masih = times.some((value) => value > now.getTime());
  const lewat = times.some((value) => value <= now.getTime());
  if (!masih) return { ...dasar, status: "kedaluwarsa", catatan: "Masa berlaku peringatan sudah lewat." };
  if (lewat && dasar.status === "tersedia") {
    return { ...dasar, status: "sebagian", catatan: "Sebagian peringatan masih berlaku." };
  }
  return dasar;
}

function gabung(bagian) {
  const unik = [...new Set(bagian.map((item) => item.status))];
  if (unik.length === 1) return { ...bagian[0], status: unik[0] };
  const waktuData = bagian.map((item) => item.waktuData).filter(Boolean).sort().at(-1) || "";
  const waktuAmbil = bagian.map((item) => item.waktuAmbil).filter(Boolean).sort().at(-1) || "";
  const catatan = bagian
    .filter((item) => item.status !== "tersedia")
    .map((item) => `${item.bagian}: ${item.status}`)
    .join("; ");
  return { status: "sebagian", waktuData, waktuAmbil, catatan };
}

function baris(nama, hasil, catatanTetap) {
  const catatan = [catatanTetap, hasil.catatan].filter(Boolean).join(" ");
  return {
    nama,
    status: hasil.status,
    waktuData: hasil.waktuData || "",
    waktuAmbil: hasil.waktuAmbil || "",
    catatan,
  };
}

export function statusRingkasan(manifest, { now = new Date(), capBerakhir = [] } = {}) {
  const jam = now instanceof Date ? now : new Date(now);
  const datasets = manifest?.datasets ?? {};
  const cap = statusCap(datasets.bmkg_cap, capBerakhir, jam);
  const prakiraan = statusSumber(datasets.bmkg_prakiraan, { now: jam });
  const banjir = gabung([
    { ...cap, bagian: "CAP" },
    { ...prakiraan, bagian: "prakiraan cuaca" },
  ]);
  return [
    baris("Titik panas", statusSumber(datasets.hotspot, { now: jam }), "Deteksi satelit, bukan kebakaran terkonfirmasi."),
    baris("Prakiraan cuaca", prakiraan, "API BMKG, horizon 3 hari."),
    baris("Peringatan dini cuaca", cap, "Nowcast CAP. Bukan peringatan banjir resmi."),
    baris(
      "Prioritas kesiapsiagaan",
      statusSumber(datasets.prioritas_aplus, { now: jam }),
      "Analisis dasbor dari model pihak ketiga. Bukan prakiraan resmi BMKG.",
    ),
    baris("ISPU stasiun", statusSumber(datasets.ispu, { now: jam }), "Data stasiun belum terintegrasi ke dashboard."),
    baris(
      "Model kualitas udara",
      statusSumber(datasets.ispu_pembanding, { now: jam }),
      "Pembanding CAMS, bukan ISPU dan bukan pengukuran stasiun. Angka model hanya tabel.",
    ),
    baris("Banjir", banjir, "CAP dan prakiraan terpisah dari analisis dasbor. Klasifikasi DAS belum terintegrasi."),
    baris(
      "Gunung api",
      { status: "belum terintegrasi", waktuData: "", waktuAmbil: "", catatan: "" },
      "Tautan MAGMA saja. Tidak ada status aktivitas, prakiraan, atau peta dampak.",
    ),
    baris("Kejadian historis karhutla", statusSumber(datasets.dibi_karhutla, { now: jam }), "Rangkaian nasional. Bukan jumlah per kabupaten."),
    baris("FDRS / SPARTAN", statusSumber(datasets.fdrs, { now: jam }), "Tautan saja. Citra hingga H+7 sesuai produk BMKG."),
    baris("Citra asap", statusSumber(datasets.asap, { now: jam }), "Tautan saja – menunggu izin BMKG."),
    baris("IRBI 2025", statusSumber(datasets.irbi, { now: jam }), "Data statis buku 2025. Penggunaan internal, tidak untuk publikasi."),
  ];
}
