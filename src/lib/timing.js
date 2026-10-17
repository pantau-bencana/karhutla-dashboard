import { REFRESH_INTERVAL_HOURS } from "./schedule.js";

export function assessTiming(feed, now = new Date()) {
  if (!feed) return { tertunda: false, ageMs: 0, alasan: "" };
  const maxHours = Number(feed.expectedMaxAgeHours);
  const clock = feed.sourceUpdatedAt || feed.observedAt;
  if (clock && Number.isFinite(maxHours) && maxHours > 0) {
    const ageMs = now.getTime() - new Date(clock).getTime();
    if (ageMs > maxHours * 3600000) {
      return {
        tertunda: true,
        ageMs,
        alasan: "Waktu data lebih lama dari frekuensi yang diharapkan.",
      };
    }
  }
  const interval = Number(feed.scheduleIntervalHours) || REFRESH_INTERVAL_HOURS;
  if (feed.fetchedAt && feed.updateType === "Realtime / mendekati realtime") {
    const ageMs = now.getTime() - new Date(feed.fetchedAt).getTime();
    if (ageMs > (interval * 2 + 1.5) * 3600000) {
      return {
        tertunda: true,
        ageMs,
        alasan: "Snapshot lebih lama dari jadwal pengambilan.",
      };
    }
  }
  return { tertunda: false, ageMs: 0, alasan: "" };
}
