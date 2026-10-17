// Jadwal yang sama dipakai skrip pembaruan, workflow, dan tampilan.
// Cron di .github/workflows/refresh-data.yml harus tetap "0 */3 * * *".
// Itu waktu UTC. Di WIB (UTC+7) jatuh pada 07.00, 10.00, 13.00, 16.00, 19.00, 22.00, 01.00, dan 04.00.

export const REFRESH_CRON = "0 */3 * * *";
export const REFRESH_INTERVAL_HOURS = 3;
export const MANIFEST_POLL_MINUTES = 15;

export function nextScheduledRun(now = new Date(), intervalHours = REFRESH_INTERVAL_HOURS) {
  const step = 3600000;
  let cursor = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    0,
    0,
    0,
  );
  if (cursor <= now.getTime()) cursor += step;
  while (new Date(cursor).getUTCHours() % intervalHours !== 0) cursor += step;
  return new Date(cursor).toISOString();
}
