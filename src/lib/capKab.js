export const NOWCAST_FAIL = "Tidak tersedia";
export const NOWCAST_LOADING = "Memuat cuplikan…";
export const MATRIX_PERMISSION = "Prototipe internal – menunggu izin tertulis BNPB/BMKG";
export const BMKG_ATTRIBUTION = "Sumber: BMKG";
export const BMKG_CAP_DOCS = "https://data.bmkg.go.id/peringatan-dini-cuaca/";
export const BMKG_CAP_RSS = "https://www.bmkg.go.id/alerts/nowcast/id";
export const NOWCAST_BASIS = "Nowcast BMKG, dasar waktu 0–3 jam.";
export const NOWCAST_BUKAN_TIGA_HARI =
  "Peringatan cuaca jangka pendek (±0–3 jam) dari BMKG. Bukan peringatan banjir dan bukan prakiraan 3 hari.";
export const CAP_STALE_MS = 90 * 60 * 1000;

const SEVERITY_LABEL = {
  Extreme: "Ekstrem (Extreme)",
  Severe: "Parah (Severe)",
  Moderate: "Sedang (Moderate)",
  Minor: "Ringan (Minor)",
  Unknown: "Tidak diketahui (Unknown)",
};

const SEVERITY_RANK = { Extreme: 5, Severe: 4, Moderate: 3, Minor: 2, Unknown: 1 };

export function severityCapKanon(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "extreme") return "Extreme";
  if (text === "severe") return "Severe";
  if (text === "moderate") return "Moderate";
  if (text === "minor") return "Minor";
  if (text === "unknown") return "Unknown";
  return "";
}

export function severityLabel(value) {
  const key = severityCapKanon(value);
  if (!key) return value ? String(value) : "—";
  return SEVERITY_LABEL[key];
}

export function severityTertinggi(values) {
  let best = "";
  let rank = 0;
  for (const value of values ?? []) {
    const key = severityCapKanon(value);
    const score = SEVERITY_RANK[key] || 0;
    if (score > rank) {
      rank = score;
      best = key;
    }
  }
  return best;
}
export const DASARIAN_NOTE =
  "Disalin manual dari halaman resmi BMKG; bukan integrasi data otomatis";
export const DASARIAN_LINKS = [
  {
    nama: "Peringatan dini hujan tinggi",
    url: "https://www.bmkg.go.id/iklim/peringatan-dini-hujan-tinggi",
  },
  {
    nama: "Potensi cuaca ekstrem",
    url: "https://www.bmkg.go.id/cuaca/potensi-cuaca-ekstrem",
  },
];

const KELAS_ORDER = { TINGGI: 0, SEDANG: 1, RENDAH: 2 };

export function clockWib(iso) {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function nowcastAbsent(jam) {
  return `Tidak ada peringatan aktif pada RSS pukul ${jam || "—"} WIB`;
}

export function nowcastExpiredText(jam) {
  return `Peringatan pada cuplikan RSS pukul ${jam || "—"} WIB sudah berakhir`;
}

export function warningActive(row, now = new Date()) {
  const raw = row?.expires || "";
  const expires = new Date(raw);
  if (!raw || Number.isNaN(expires.getTime())) return false;
  return expires.getTime() > now.getTime();
}

export function applyNowcast(rows, alerts, meta, now = new Date()) {
  const status = meta?.status === "ok" || meta?.status === "memuat" ? meta.status : "gagal";
  const jam = clockWib(meta?.rss_published || meta?.fetched_at || "");
  const byKode = new Map();
  if (status === "ok") {
    for (const alert of alerts ?? []) {
      const kode = String(alert?.kode ?? "").trim();
      if (!kode) continue;
      const list = byKode.get(kode) ?? [];
      list.push(alert);
      byKode.set(kode, list);
    }
  }
  return (rows ?? []).map((row) => {
    const hits = byKode.get(row.kode) ?? [];
    const active = hits.filter((alert) => warningActive(alert, now));
    return {
      ...row,
      nowcastStatus: status,
      nowcastJam: jam,
      nowcastAda: status === "ok" && active.length > 0,
      nowcastExpired: status === "ok" && hits.length > 0 && active.length === 0,
      nowcastAlerts: active,
      nowcastLampau: status === "ok" ? hits.filter((alert) => !warningActive(alert, now)) : [],
    };
  });
}

export function ringkasanNowcast(rows, meta, now = new Date()) {
  const status = meta?.status === "ok" || meta?.status === "memuat" ? meta.status : "gagal";
  const active = status === "ok" ? (rows ?? []).filter((row) => warningActive(row, now)) : [];
  const provinsi = new Set(active.map((row) => row.provinsi).filter(Boolean));
  const kabupaten = new Set(active.map((row) => row.kode).filter(Boolean));
  let berlakuSampai = "";
  for (const row of active) {
    if ((row.expires || "") > berlakuSampai) berlakuSampai = row.expires;
  }
  const fetchedAt = meta?.fetched_at || meta?.fetchedAt || "";
  const fetchedMs = new Date(fetchedAt).getTime();
  const ageMs = fetchedAt && !Number.isNaN(fetchedMs) ? now.getTime() - fetchedMs : NaN;
  const anyRow = status === "ok" && (rows ?? []).length > 0;
  return {
    status,
    provinsi: provinsi.size,
    kabupaten: kabupaten.size,
    berlakuSampai,
    fetchedAt,
    tertunda: Number.isFinite(ageMs) && ageMs > CAP_STALE_MS,
    kosong: status === "ok" && !anyRow,
    kedaluwarsa: anyRow && active.length === 0,
    cakupan: meta?.cakupan || "",
  };
}

export function provinsiDenganPeringatan(rows, now = new Date()) {
  const grouped = new Map();
  for (const row of rows ?? []) {
    if (!warningActive(row, now)) continue;
    const nama = String(row.provinsi || "").trim() || "Belum terpetakan";
    const current = grouped.get(nama) ?? { nama, kab: new Set(), expires: "", events: new Set(), severities: [] };
    if (row.kode) current.kab.add(row.kode);
    if ((row.expires || "") > current.expires) current.expires = row.expires;
    if (row.event) current.events.add(row.event);
    current.severities.push(row.severity);
    grouped.set(nama, current);
  }
  return [...grouped.values()]
    .map((item) => ({
      nama: item.nama,
      jumlahKab: item.kab.size,
      expires: item.expires,
      events: [...item.events],
      severity: severityTertinggi(item.severities),
    }))
    .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
}

export function nowcastCrossTab(rows) {
  const list = rows ?? [];
  const statuses = new Set(list.map((row) => row.nowcastStatus));
  if (statuses.has("memuat")) return { ok: false, pending: true, kelas: [], cell: () => [] };
  const ok = list.length > 0 && [...statuses].every((status) => status === "ok");
  if (!ok) return { ok: false, pending: false, kelas: [], cell: () => [] };
  const grouped = new Map();
  for (const row of list) {
    const kelas = String(row.banjirKelas ?? "").trim().toUpperCase();
    const ada = row.nowcastAda ? "ada" : "tidak";
    const key = `${kelas}|${ada}`;
    const bucket = grouped.get(key) ?? [];
    bucket.push(row);
    grouped.set(key, bucket);
  }
  const kelas = [...new Set(list.map((row) => String(row.banjirKelas ?? "").trim().toUpperCase()).filter(Boolean))].sort(
    (left, right) => (KELAS_ORDER[left] ?? 9) - (KELAS_ORDER[right] ?? 9) || left.localeCompare(right, "id"),
  );
  return {
    ok: true,
    pending: false,
    kelas,
    cell(kelasNama, ada) {
      return (grouped.get(`${String(kelasNama).toUpperCase()}|${ada ? "ada" : "tidak"}`) ?? [])
        .slice()
        .sort((left, right) => left.kode.localeCompare(right.kode, "id"));
    },
  };
}
