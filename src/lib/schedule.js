// Jadwal yang sama dipakai skrip pembaruan, workflow, dan tampilan.
// Cron di .github/workflows/refresh-data.yml harus tetap "17 */3 * * *".
// Menit 17, bukan menit 0: GitHub sering menunda atau menggugurkan jadwal di menit 0.
// Itu waktu UTC. Di WIB (UTC+7) jatuh pada 07.17, 10.17, 13.17, 16.17, 19.17, 22.17, 01.17, dan 04.17.

export const REFRESH_CRON = "17 */3 * * *";
export const REFRESH_INTERVAL_HOURS = 3;
export const REFRESH_MINUTE = 17;
export const MANIFEST_POLL_MINUTES = 15;

export function nextScheduledRun(now = new Date(), intervalHours = REFRESH_INTERVAL_HOURS, minute = REFRESH_MINUTE) {
  const step = 3600000;
  let cursor = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    minute,
    0,
    0,
  );
  if (cursor <= now.getTime()) cursor += step;
  while (new Date(cursor).getUTCHours() % intervalHours !== 0) cursor += step;
  return new Date(cursor).toISOString();
}
