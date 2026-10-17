import { formatUsia, formatWib } from "../lib/format.js";
import { assessTiming } from "../lib/timing.js";

export function DatasetTiming({ feed }) {
  if (!feed) return null;
  const stale = assessTiming(feed);
  return (
    <div className="dataset-timing">
      {feed.mode === "pembanding" ? (
        <span className="status-pill status-pembanding">Pembanding (data terbuka, bukan resmi)</span>
      ) : null}
      {feed.updateType ? <span className="status-pill status-csv">{feed.updateType}</span> : null}
      {stale.tertunda ? (
        <span className="status-pill status-tertunda" title={stale.alasan}>
          Data tertunda · {formatUsia(stale.ageMs)}
        </span>
      ) : null}
      <p>Diambil: {feed.fetchedAt ? formatWib(feed.fetchedAt) : "belum ada pengambilan terjadwal"}</p>
      <p>Waktu data: {feed.observedLabel || "—"}</p>
    </div>
  );
}
