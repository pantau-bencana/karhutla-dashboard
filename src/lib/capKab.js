export const NOWCAST_FAIL = "Tidak tersedia";
export const NOWCAST_LOADING = "Memuat cuplikan…";
export const MATRIX_PERMISSION = "Prototipe internal – menunggu izin tertulis BNPB/BMKG";
export const BMKG_ATTRIBUTION = "Sumber: BMKG";
export const NOWCAST_BASIS = "Nowcast BMKG, dasar waktu 0–3 jam.";
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
    };
  });
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
