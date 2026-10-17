import { DatasetTiming } from "./DatasetTiming.jsx";
import { formatWib } from "../lib/format.js";
import { decorateSources } from "../lib/sourceCatalog.js";

function statusClass(status) {
  if (status === "Aktif" || status === "Data statis") return "status-berhasil";
  if (status === "Snapshot/arsip") return "status-csv";
  if (status === "Gagal/stale") return "status-gagal";
  if (String(status).startsWith("Tautan saja")) return "status-off";
  return "status-off";
}

export function SourcesPage({ manifest }) {
  const rows = decorateSources(manifest);
  return (
    <main className="wrap main">
      <section className="card">
        <header className="card-head">
          <div>
            <h2>Sumber data</h2>
            <p>
              Status mengikuti pengambilan terakhir
              {manifest?.generated_at ? ` (${formatWib(manifest.generated_at)})` : ""}. Pembanding tidak menggantikan
              baris resmi.
            </p>
          </div>
        </header>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Instansi</th>
                <th scope="col">Tautan resmi</th>
                <th scope="col">Fungsi</th>
                <th scope="col">Akses</th>
                <th scope="col">Kunci</th>
                <th scope="col">Status</th>
                <th scope="col">Waktu</th>
                <th scope="col">Keterbatasan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <SourceRows key={row.id} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function SourceRows({ row }) {
  return (
    <>
      <tr>
        <th scope="row">{row.nama}</th>
        <td>{row.instansi}</td>
        <td>
          <a href={row.officialUrl} target="_blank" rel="noreferrer">
            {row.officialLabel || row.officialUrl}
          </a>
          {row.extraUrls?.map(([label, url]) => (
            <div key={url}>
              <a href={url} target="_blank" rel="noreferrer">
                {label}
              </a>
            </div>
          ))}
        </td>
        <td>{row.fungsi}</td>
        <td>{row.access}</td>
        <td>{row.needsKey ? `Ya, secret ${row.secret}` : "Tidak"}</td>
        <td>
          <span className={`status-pill ${statusClass(row.status)}`}>{row.status}</span>
        </td>
        <td>
          <DatasetTiming feed={feedFromEntry(row.entry, row.updateType)} />
          {row.entry?.observed_label ? <p>{row.entry.observed_label}</p> : null}
        </td>
        <td>{row.limitation}</td>
      </tr>
      {row.comparisons?.map((item) => (
        <tr key={item.id}>
          <th scope="row">Pembanding: {item.nama}</th>
          <td>{item.instansi}</td>
          <td>
            <a href={item.officialUrl} target="_blank" rel="noreferrer">
              {item.provider || item.instansi}
            </a>
          </td>
          <td>{item.fungsi}</td>
          <td>{item.access}</td>
          <td>Tidak</td>
          <td>
            <span className="status-pill status-pembanding">Pembanding (data terbuka, bukan resmi)</span>
            <div className="subline">{item.status}</div>
          </td>
          <td>
            <DatasetTiming feed={feedFromEntry(item.entry, item.updateType, "pembanding")} />
          </td>
          <td>
            {item.method} {item.license}
          </td>
        </tr>
      ))}
    </>
  );
}

function feedFromEntry(entry, updateType, mode) {
  if (!entry && !updateType) return null;
  return {
    updateType: entry?.update_type || updateType || "",
    mode: mode || entry?.mode || "",
    fetchedAt: entry?.fetched_at || "",
    observedAt: entry?.observed_at || "",
    observedLabel: entry?.observed_label || "",
    sourceUpdatedAt: entry?.source_updated_at || entry?.observed_at || "",
    expectedMaxAgeHours: entry?.expected_max_age_hours,
    scheduleIntervalHours: entry?.schedule_interval_hours,
  };
}
