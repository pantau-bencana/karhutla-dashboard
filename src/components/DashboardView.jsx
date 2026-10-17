import { HotspotMap } from "./HotspotMap.jsx";
import { TrendCharts } from "./TrendCharts.jsx";
import { defaultRange } from "../lib/derive.js";
import { formatAmbang, formatAngka, formatTanggal, formatTanggalPendek } from "../lib/format.js";

function feedStatus(feed) {
  if (feed.asal === "firms" && feed.status === "berhasil") return "FIRMS langsung";
  if (feed.status === "contoh") return "Data contoh";
  if (feed.status === "berhasil") return "Terhubung";
  if (feed.status === "cadangan") return "CSV cadangan";
  return "Gagal";
}

function ispuTone(kategori) {
  if (kategori === "Baik") return "tone-baik";
  if (kategori === "Sedang") return "tone-sedang";
  if (kategori === "Tidak Sehat") return "tone-tidak";
  if (kategori === "Sangat Tidak Sehat" || kategori === "Berbahaya") return "tone-bahaya";
  return "";
}

export function DashboardView({
  config,
  feeds,
  loading,
  loadedAt,
  province,
  setProvince,
  from,
  setFrom,
  to,
  setTo,
  onReload,
  view,
}) {
  return (
    <>
      <header className="site-header">
        <div className="stripe" aria-hidden="true" />
        <div className="wrap header-inner">
          <div className="brand">
            <span className="mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" width="36" height="36">
                <rect width="32" height="32" rx="7" fill="#e8b931" />
                <path
                  fill="#143028"
                  d="M16 5c2 4 2 6-1 8 3 0 6 2 6 6a7 7 0 1 1-14 0c0-3 2-5 4-6-1 2-1 3 1 4-2-3-1-7 4-12z"
                />
              </svg>
            </span>
            <div>
              <p className="eyebrow">{config?.instansi || "Dit. PD BNPB"}</p>
              <h1>{config?.judul || "Dashboard Peringatan Dini Karhutla Nasional"}</h1>
              <p className="subtitle">
                Prototipe internal untuk memantau kebakaran hutan dan lahan: titik panas, bahaya cuaca kebakaran, dan
                mutu udara.
              </p>
            </div>
          </div>
          <div className="header-actions">
            {loadedAt ? <p>Dimuat {loadedAt}</p> : null}
            <button type="button" className="button" onClick={onReload} disabled={loading}>
              {loading ? "Memuat…" : "Muat ulang"}
            </button>
          </div>
        </div>
      </header>
      {config && view ? (
        <DashboardBody
          config={config}
          feeds={feeds}
          loading={loading}
          province={province}
          setProvince={setProvince}
          from={from}
          setFrom={setFrom}
          to={to}
          setTo={setTo}
          view={view}
        />
      ) : (
        <main className="wrap">
          <p className="loading" role="status">
            Memuat konfigurasi dan data…
          </p>
        </main>
      )}
    </>
  );
}

function DashboardBody({ config, feeds, loading, province, setProvince, from, setFrom, to, setTo, view }) {
  const hotspotFeed = feeds.find((feed) => feed.id === "hotspot");
  const samples = feeds.filter((feed) => feed.contoh && feed.status !== "gagal");
  const failures = feeds.filter((feed) => feed.status === "gagal");
  const fallbacks = feeds.filter((feed) => feed.status === "cadangan");
  const keySet = Boolean(String(config.firms?.mapKey ?? "").trim());
  const ispu = view.summary.ispuTerkini;
  const priority = config.provinsiPrioritas ?? [];

  function resetDates() {
    const range = defaultRange(hotspotFeed?.rows ?? [], 7);
    setFrom(range.from);
    setTo(range.to);
  }

  function latestDay() {
    const range = defaultRange(hotspotFeed?.rows ?? [], 1);
    setFrom(range.to);
    setTo(range.to);
  }

  function updateFrom(value) {
    setFrom(value);
    if (value && to && value > to) setTo(value);
  }

  function updateTo(value) {
    setTo(value);
    if (value && from && value < from) setFrom(value);
  }

  return (
    <main className="wrap main">
      {samples.length > 0 && (
        <div className="banner sample" role="status">
          <strong>Data contoh sedang ditampilkan.</strong>
          <p>
            {samples.map((feed) => feed.nama).join(", ")} bukan data operasional. Sambungkan tautan CSV Google
            Sheets di <code>public/config.json</code>, lalu set <code>contoh</code> menjadi false.
          </p>
        </div>
      )}
      {failures.length > 0 && (
        <div className="banner error" role="alert">
          <strong>Sebagian sumber gagal dimuat. Bagian lain tetap ditampilkan.</strong>
          <ul>
            {failures.map((feed) => (
              <li key={feed.id}>
                {feed.nama}: {feed.error}
              </li>
            ))}
          </ul>
        </div>
      )}
      {fallbacks.length > 0 && (
        <div className="banner warn" role="status">
          <ul>
            {fallbacks.map((feed) => (
              <li key={feed.id}>
                {feed.nama}: {feed.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="filters" aria-label="Filter">
        <div className="province-filter" role="group" aria-label="Cakupan wilayah">
          <button type="button" aria-pressed={province === ""} onClick={() => setProvince("")}>
            Seluruh Indonesia
          </button>
          {priority.map((name) => (
            <button key={name} type="button" aria-pressed={province === name} onClick={() => setProvince(name)}>
              {name}
            </button>
          ))}
        </div>
        <div className="date-filter">
          <label>
            Dari
            <input type="date" value={from} onChange={(event) => updateFrom(event.target.value)} />
          </label>
          <label>
            Sampai
            <input type="date" value={to} onChange={(event) => updateTo(event.target.value)} />
          </label>
          <button type="button" className="button ghost" onClick={latestDay}>
            Hari terakhir
          </button>
          <button type="button" className="button ghost" onClick={resetDates}>
            7 hari terakhir
          </button>
        </div>
      </section>

      {view.rangeInvalid ? (
        <p className="banner error" role="alert">
          Tanggal awal lebih besar dari tanggal akhir. Perbaiki rentang untuk melihat angka.
        </p>
      ) : null}

      <section className="cards" aria-label="Ringkasan">
        <article className="card metric">
          <p className="metric-label">Titik panas</p>
          <p className="metric-value">{formatAngka(view.summary.hotspot)}</p>
          <p className="metric-note">Pada cakupan dan rentang tanggal ini</p>
        </article>
        <article className="card metric">
          <p className="metric-label">Kepercayaan tinggi</p>
          <p className="metric-value">{formatAngka(view.summary.tinggi)}</p>
          <p className="metric-note">Kelas tinggi, high, atau nilai ≥ 80</p>
        </article>
        <article className={`card metric ${view.summary.siagaAwas ? "metric-alert" : ""}`}>
          <p className="metric-label">Provinsi waspada+</p>
          <p className="metric-value">{formatAngka(view.summary.waspadaPlus)}</p>
          <p className="metric-note">{formatAngka(view.summary.siagaAwas)} di antaranya siaga atau awas</p>
        </article>
        <article className={`card metric ${ispuTone(ispu?.kategori)}`}>
          <p className="metric-label">ISPU terkini</p>
          <p className="metric-value">{ispu ? formatAngka(ispu.ispu) : "—"}</p>
          <p className="metric-note">
            {ispu
              ? `${ispu.kategori} · ${ispu.kota ? `${ispu.kota}, ` : ""}${ispu.provinsi} · ${formatTanggal(ispu.tanggal)}`
              : "Tidak ada data ISPU pada rentang ini"}
          </p>
        </article>
      </section>

      <section className="split">
        <article className="card map-card">
          <header className="card-head">
            <div>
              <h2>Sebaran titik panas</h2>
              <p>
                {formatAngka(view.points.length)} titik
                {hotspotFeed?.contoh ? " · data contoh" : ""}
                {hotspotFeed?.asal === "firms" ? " · NASA FIRMS" : ""}
              </p>
            </div>
            <ul className="legend">
              <li>
                <i className="swatch tinggi" /> Tinggi
              </li>
              <li>
                <i className="swatch nominal" /> Nominal
              </li>
              <li>
                <i className="swatch rendah" /> Rendah
              </li>
            </ul>
          </header>
          {hotspotFeed?.status === "gagal" ? (
            <p className="empty">Peta tidak diisi karena sumber titik panas gagal: {hotspotFeed.error}</p>
          ) : null}
          <HotspotMap points={view.points} />
          {!view.points.length && hotspotFeed?.status !== "gagal" ? (
            <p className="map-note">Tidak ada titik pada cakupan ini. Peta tetap menampilkan wilayah Indonesia.</p>
          ) : null}
        </article>

        <article className="card">
          <header className="card-head">
            <div>
              <h2>Status peringatan dini</h2>
              <p>Level lebih tinggi antara jumlah titik panas dan FWI maksimum pada rentang tanggal.</p>
            </div>
          </header>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Provinsi</th>
                  <th scope="col">Status</th>
                  <th scope="col">Titik panas</th>
                  <th scope="col">Tinggi</th>
                  <th scope="col">FWI maks</th>
                  <th scope="col">Pemicu</th>
                </tr>
              </thead>
              <tbody>
                {view.warnings.length ? (
                  view.warnings.map((row) => (
                    <tr key={row.provinsi}>
                      <th scope="row">
                        {row.provinsi}
                        {row.prioritas ? <span className="tag">Prioritas</span> : null}
                      </th>
                      <td>
                        <span className={`badge level-${row.status.toLowerCase()}`}>{row.status}</span>
                        <span className="subline">
                          Titik panas {row.dariHotspot}
                          {row.dariFwi ? ` · FDRS ${row.dariFwi}` : " · FDRS tidak ada"}
                        </span>
                      </td>
                      <td>{formatAngka(row.jumlah)}</td>
                      <td>{formatAngka(row.tinggi)}</td>
                      <td>{row.fwiMax == null ? "—" : formatAngka(row.fwiMax, 1)}</td>
                      <td>{row.pemicu}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>Tidak ada provinsi pada cakupan ini.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="fine">{formatAmbang(config.peringatan)}</p>
          {config.peringatan?.catatan ? <p className="fine">{config.peringatan.catatan}</p> : null}
        </article>
      </section>

      <TrendCharts
        hotspotTrend={view.hotspotTrend}
        hotspotSeries={view.hotspotSeries}
        ispuTrend={view.ispuTrend}
        ispuSeries={view.ispuSeries}
        province={province}
      />

      <section className="thirds">
        <article className="card">
          <header className="card-head">
            <div>
              <h2>Rekap SiPongi</h2>
              <p>Jumlah hotspot dan luas terbakar dijumlahkan pada rentang tanggal. Bukan rekap resmi.</p>
            </div>
          </header>
          <SimpleTable
            empty="Tidak ada rekap SiPongi pada rentang ini."
            head={["Provinsi", "Hotspot", "Luas (ha)"]}
            rows={view.sipongiRows.map((row) => [row.provinsi, formatAngka(row.jumlah), formatAngka(row.luas, 1)])}
          />
        </article>
        <article className="card">
          <header className="card-head">
            <div>
              <h2>IRBI kabupaten</h2>
              <p>Indeks tahunan, tidak mengikuti filter tanggal. Angka contoh bukan keluaran InaRISK.</p>
            </div>
          </header>
          <SimpleTable
            empty="Tidak ada baris IRBI pada cakupan ini."
            head={["Kabupaten", "Provinsi", "Indeks", "Kelas"]}
            rows={view.irbiRows.map((row) => [row.kabupaten, row.provinsi, formatAngka(row.indeks, 2), row.kelas])}
          />
        </article>
        <article className="card">
          <header className="card-head">
            <div>
              <h2>Cuaca dan FDRS</h2>
              <p>
                Tanggal terakhir tiap provinsi dalam rentang
                {view.bmkgRows[0] ? `, misalnya ${formatTanggalPendek(latestSharedDate(view.bmkgRows))}` : ""}.
              </p>
            </div>
          </header>
          <SimpleTable
            empty="Tidak ada data cuaca pada rentang ini."
            head={["Provinsi", "Tanggal", "Hujan (mm)", "FWI", "Kelas"]}
            rows={view.bmkgRows.map((row) => [
              row.provinsi,
              formatTanggalPendek(row.tanggal),
              formatAngka(row.curahHujan, 1),
              formatAngka(row.fwi, 1),
              row.kelasFdrs || "—",
            ])}
          />
        </article>
      </section>

      <section className="card sources-panel" aria-labelledby="metadata-heading">
        <header className="card-head">
          <div>
            <h2 id="metadata-heading">Metadata sumber</h2>
            <p>Setiap dataset dibaca di peramban dari tautan pada config.json. Tidak ada server aplikasi.</p>
          </div>
        </header>
        <div className={`callout ${keySet ? "callout-hot" : ""}`}>
          <strong>{keySet ? "MAP_KEY FIRMS aktif di config." : "MAP_KEY FIRMS kosong."}</strong>
          <p>
            {config.firms?.catatan ||
              "Kunci FIRMS pada situs statis dapat dibaca siapa saja. Jika kosong, dasbor memakai CSV hotspot."}
          </p>
          {keySet ? (
            <p>
              Sumber aktif: {config.firms.sumber || "VIIRS_SNPP_NRT"}, area {config.firms.area},{" "}
              {config.firms.rentangHari} hari. Jendela API FIRMS tidak otomatis mengikuti tanggal yang dipilih di
              filter.
            </p>
          ) : null}
        </div>
        {feeds.length ? (
          <ul className="sources">
            {feeds.map((feed) => (
              <li key={feed.id}>
                <div className="source-top">
                  <h3>{feed.nama}</h3>
                  <span className={`status-pill status-${feed.status}`}>{feedStatus(feed)}</span>
                </div>
                <dl>
                  <div>
                    <dt>Instansi</dt>
                    <dd>{feed.instansi}</dd>
                  </div>
                  <div>
                    <dt>Frekuensi</dt>
                    <dd>{feed.frekuensi}</dd>
                  </div>
                  <div>
                    <dt>Terakhir diperbarui</dt>
                    <dd>{formatTanggal(feed.terakhirDiperbarui)}</dd>
                  </div>
                  <div>
                    <dt>Tautan</dt>
                    <dd>
                      {feed.urlTampil ? (
                        <a href={feed.urlTampil} target="_blank" rel="noreferrer">
                          {feed.urlTampil}
                        </a>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                </dl>
                {feed.error ? <p className="error-text">{feed.error}</p> : null}
                {feed.lisensi ? <p className="fine">{feed.lisensi}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">{loading ? "Memuat sumber…" : "Tidak ada dataset di config.json."}</p>
        )}
      </section>
    </main>
  );
}

function latestSharedDate(rows) {
  return rows.reduce((max, row) => (row.tanggal > max ? row.tanggal : max), rows[0].tanggal);
}

function SimpleTable({ head, rows, empty }) {
  return (
    <div className="table-wrap short">
      <table>
        <thead>
          <tr>
            {head.map((label) => (
              <th key={label} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, index) => (
              <tr key={`${row[0]}-${index}`}>
                {row.map((cell, cellIndex) =>
                  cellIndex === 0 ? (
                    <th key={cellIndex} scope="row">
                      {cell}
                    </th>
                  ) : (
                    <td key={cellIndex}>{cell}</td>
                  ),
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={head.length}>{empty}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
