export function detectionMs(point) {
  const tanggal = String(point?.tanggal ?? "").slice(0, 10);
  const waktu = String(point?.waktu ?? "").replace(/\D/g, "").padStart(4, "0").slice(-4);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || !/^\d{4}$/.test(waktu)) return null;
  const ms = Date.parse(`${tanggal}T${waktu.slice(0, 2)}:${waktu.slice(2)}:00Z`);
  return Number.isFinite(ms) ? ms : null;
}

export function filterHotspotWindow(points, { hours = 24, provinces = null } = {}) {
  const stamped = [];
  let newestMs = null;
  for (const point of points ?? []) {
    const ms = detectionMs(point);
    if (ms == null) continue;
    if (newestMs == null || ms > newestMs) newestMs = ms;
    stamped.push({ point, ms });
  }
  if (newestMs == null) return { rows: [], newestMs: null, cutoffMs: null };
  const cutoffMs = newestMs - Number(hours) * 3600000;
  const allow = Array.isArray(provinces) && provinces.length ? new Set(provinces) : null;
  const rows = [];
  for (const item of stamped) {
    if (item.ms < cutoffMs) continue;
    if (allow && !allow.has(item.point.provinsi)) continue;
    rows.push(item.point);
  }
  return { rows, newestMs, cutoffMs };
}

export function countHotspots(points) {
  const sensor = {};
  const kepercayaan = {};
  for (const point of points ?? []) {
    const sat = String(point.satelit || "tidak disebut");
    const key = point.kelasKepercayaan || "tidak_dinilai";
    sensor[sat] = (sensor[sat] || 0) + 1;
    kepercayaan[key] = (kepercayaan[key] || 0) + 1;
  }
  return { jumlah: points?.length ?? 0, sensor, kepercayaan };
}
