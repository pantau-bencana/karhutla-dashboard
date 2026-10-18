export const ISPU_EXPLANATION =
  "ISPU menggambarkan kualitas udara berdasarkan pengukuran di stasiun pemantau. Titik pada peta menunjukkan lokasi pengukuran dan tidak otomatis mewakili seluruh wilayah kabupaten/kota. Nilai ISPU bukan bukti tunggal bahwa polusi berasal dari karhutla.";

export const KLH_ISPU_APP = "https://ispu.kemenlh.go.id/app/#/";
export const KLH_ISPU_ANALYTIC = "https://ispu.kemenlh.go.id/kawasan/analytic";

export const OPENAQ_HOME = "https://openaq.org/";
export const OPENAQ_DOCS = "https://docs.openaq.org/using-the-api/v3";

export const OPENAQ_STATUS =
  "OpenAQ v3 mengembalikan HTTP 401 tanpa kunci pada permintaan lokasi Indonesia. Tidak ada konsentrasi µg/m³ yang ditampilkan.";

const BLOCKED_FEEDS = new Set(["ispu", "ispu_pembanding"]);

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function officialStationFeed(feeds) {
  const feed = (feeds ?? []).find((item) => item.id === "ispu_stasiun");
  if (!feed || feed.contoh || feed.status === "contoh" || feed.status === "gagal" || feed.status === "cadangan") {
    return null;
  }
  if (BLOCKED_FEEDS.has(feed.id)) return null;
  return feed;
}

export function stationPoints(feeds) {
  const feed = officialStationFeed(feeds);
  if (!feed) return [];
  return (feed.rows ?? [])
    .filter((row) => finite(row.lintang) != null && finite(row.bujur) != null && finite(row.ispu) != null)
    .map((row, index) => ({
      id: String(row.id || `${row.stasiun || "stasiun"}-${row.tanggal || ""}-${index}`),
      stasiun: row.stasiun || row.nama || "tidak tersedia",
      kabupaten: row.kabupaten || row.kota || "tidak tersedia",
      provinsi: row.provinsi || "",
      ispu: finite(row.ispu),
      kategori: row.kategori || "tidak tersedia",
      parameter: row.parameter || row.parameter_kritis || "tidak tersedia",
      waktu: row.waktu || row.diperbarui || row.tanggal || "",
      tanggal: String(row.tanggal || "").slice(0, 10),
      sumber: row.sumber || "tidak tersedia",
      lintang: finite(row.lintang),
      bujur: finite(row.bujur),
    }));
}

export function filterStations(rows, { period = "hari-ini", today = "", from = "", to = "", province = "", query = "" } = {}) {
  const needle = query.trim().toLocaleLowerCase("id");
  return (rows ?? []).filter((row) => {
    if (province && row.provinsi && row.provinsi !== province) return false;
    if (needle) {
      const haystack = `${row.stasiun} ${row.kabupaten} ${row.provinsi}`.toLocaleLowerCase("id");
      if (!haystack.includes(needle)) return false;
    }
    if (period === "hari-ini") return Boolean(today) && row.tanggal === today;
    if (!from || !to || from > to) return false;
    return Boolean(row.tanggal) && row.tanggal >= from && row.tanggal <= to;
  });
}

export function historyRange(rows) {
  const dates = (rows ?? []).map((row) => row.tanggal).filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)).sort();
  if (!dates.length) return null;
  const to = dates[dates.length - 1];
  const end = new Date(`${to}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() - 6);
  const from = end.toISOString().slice(0, 10);
  const earliest = dates[0];
  return { from: from < earliest ? earliest : from, to };
}

export function openAqMeasurements(feeds) {
  const feed = (feeds ?? []).find((item) => item.id === "openaq_stasiun");
  if (!feed || feed.contoh || feed.status !== "berhasil") return [];
  return (feed.rows ?? [])
    .map((row) => ({
      stasiun: row.stasiun || row.nama || "tidak tersedia",
      lokasi: row.lokasi || row.kabupaten || row.kota || "tidak tersedia",
      parameter: row.parameter || "PM2.5",
      nilai: finite(row.nilai_ugm3 ?? row.ugm3 ?? row.nilai),
      waktu: row.waktu || row.tanggal || "",
      sumber: "OpenAQ",
    }))
    .filter((row) => row.nilai != null);
}
