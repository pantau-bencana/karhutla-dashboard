export const PASS_STALE_HOURS = 8;
export const NEXT_RUN_GRACE_HOURS = 1;

function time(value) {
  if (!value) return NaN;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : NaN;
}

export function assessFreshness({ observedAt = "", nextRun = "", now = new Date() } = {}) {
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const observedMs = time(observedAt);
  const nextMs = time(nextRun);
  const passLate = Number.isFinite(observedMs) && nowMs - observedMs > PASS_STALE_HOURS * 3600000;
  const runLate = Number.isFinite(nextMs) && nowMs > nextMs + NEXT_RUN_GRACE_HOURS * 3600000;
  const nextVisible = Number.isFinite(nextMs) && nextMs > nowMs;
  return {
    tertunda: passLate || runLate,
    passLate,
    runLate,
    nextVisible,
    nextRun: nextVisible ? nextRun : "",
  };
}

export function hotspotSourceLabel(feed, sumber = "VIIRS_SNPP_NRT") {
  const product = !sumber || sumber === "VIIRS_SNPP_NRT" ? "VIIRS S-NPP NRT" : String(sumber);
  const adaBaris = Array.isArray(feed?.rows) && feed.rows.length > 0;
  if ((feed?.status === "gagal" || feed?.status === "usang") && !adaBaris) return "Cuplikan tidak tersedia";
  if (feed?.status === "usang" && adaBaris) return `${product} (cuplikan terakhir)`;
  if (feed?.asal === "snapshot") return `${product} (snapshot ±3 jam)`;
  if (feed?.asal === "firms" && feed.status === "berhasil") return product;
  return product;
}

export function labelStatusFeed(feed, { sumber = "", memuat = false } = {}) {
  if (memuat && !feed) return "Memuat";
  if (!feed) return "Memuat";
  if (feed.id === "hotspot" || feed.id === "hotspot_peta") return hotspotSourceLabel(feed, sumber);
  if (feed.status === "tautan" || feed.mode === "tautan") return "Tautan saja";
  if (feed.status === "berhasil") return "Terhubung";
  if (feed.status === "usang" || feed.status === "cadangan") return "Cuplikan terakhir";
  if (feed.status === "gagal") return "Gagal dimuat";
  return "Memuat";
}
