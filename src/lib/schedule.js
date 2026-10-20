// Jadwal yang sama dipakai skrip pembaruan, workflow, dan tampilan.
// Dua cron di .github/workflows/refresh-data.yml, selisih 90 menit, keduanya di luar menit 0.
// GitHub dapat menggugurkan satu slot tanpa meninggalkan run. Slot kedua dan workflow penjaga menutup lubang itu.
// UTC: 00.17, 01.47, 03.17, 04.47, 06.17, 07.47, 09.17, 10.47, 12.17, 13.47, 15.17, 16.47, 18.17, 19.47, 21.17, 22.47.
// WIB (UTC+7): 07.17, 08.47, 10.17, 11.47, 13.17, 14.47, 16.17, 17.47, 19.17, 20.47, 22.17, 23.47, 01.17, 02.47, 04.17, 05.47.

export const REFRESH_CRON = "17 */3 * * *";
export const REFRESH_CRON_CADANGAN = "47 1-23/3 * * *";
// CAP nowcast berumur 0–3 jam. Jadwal terpisah tiap 30 menit, di luar menit 0
// dan di luar slot 7, 17, serta 47 yang sudah dipakai workflow lain.
export const CAP_CRON = "12,42 * * * *";
export const REFRESH_CRONS = [REFRESH_CRON, REFRESH_CRON_CADANGAN];
export const REFRESH_INTERVAL_HOURS = 3;
export const REFRESH_MINUTE = 17;
export const REFRESH_MINUTE_CADANGAN = 47;
export const STALE_SNAPSHOT_HOURS = 4;
export const MANIFEST_POLL_MINUTES = 15;

const SLOTS = [
  { minute: REFRESH_MINUTE, hourMod: 3, hourRemainder: 0 },
  { minute: REFRESH_MINUTE_CADANGAN, hourMod: 3, hourRemainder: 1 },
];

function nextSlot(now, slot) {
  const step = 3600000;
  let cursor = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    slot.minute,
    0,
    0,
  );
  if (cursor <= now.getTime()) cursor += step;
  while (new Date(cursor).getUTCHours() % slot.hourMod !== slot.hourRemainder) cursor += step;
  return cursor;
}

export function nextScheduledRun(now = new Date()) {
  const soonest = Math.min(...SLOTS.map((slot) => nextSlot(now, slot)));
  return new Date(soonest).toISOString();
}
