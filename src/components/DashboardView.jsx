import { useState } from "react";
import { ExtraLayers, LayerBar, WilayahDetail } from "./ExtraLayers.jsx";
import { DatasetTiming } from "./DatasetTiming.jsx";
import { HotspotBoard } from "./HotspotBoard.jsx";
import { HotspotAccordion } from "./HotspotAccordion.jsx";
import { TrendCharts } from "./TrendCharts.jsx";
import { defaultRange } from "../lib/derive.js";
import { hotspotSourceLabel } from "../lib/freshness.js";
import { formatAngka, formatTanggal } from "../lib/format.js";

function feedStatus(feed, sumber) {
  if (feed.asal === "snapshot") return hotspotSourceLabel(feed, sumber);
  if (feed.status === "contoh") return "Data contoh";
  if (feed.status === "berhasil") return "Terhubung";
  if (feed.status === "usang") return "Cuplikan terakhir";
  return "Gagal";
}

export function DashboardView({
  active = true,
  config,
  feeds,
  loading,
  province,
  setProvince,
  from,
  setFrom,
  to,
  setTo,
  view,
  freshness,
}) {
  if (!config || !view) {
    return (
      <main className="wrap">
        <p className="loading" role="status">
          Memuat konfigurasi dan data…
        </p>
      </main>
    );
  }

  return (
    <DashboardBody
      active={active}
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
      freshness={freshness}
    />
  );
}

function DashboardBody({ active, config, feeds, loading, province, setProvince, from, setFrom, to, setTo, view, freshness }) {
  const [layer, setLayer] = useState("hotspot");
  const hotspotFeed = feeds.find((feed) => feed.id === "hotspot");
  const visibleFeeds = layer === "ispu" ? feeds.filter((feed) => feed.id !== "ispu" && feed.id !== "ispu_pembanding") : feeds;
  const samples = visibleFeeds.filter((feed) => feed.contoh && feed.status !== "gagal");
  const failures = visibleFeeds.filter((feed) => feed.status === "gagal");
  const fallbacks = visibleFeeds.filter((feed) => feed.status === "cadangan");
  const keySet = Boolean(String(config.firms?.mapKey ?? "").trim());
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
        <div className="banner sample is-sticky" role="status">
          <strong>Data contoh sedang ditampilkan.</strong>
          <p>
            {samples.map((feed) => feed.nama).join(", ")} bukan data operasional. Snapshot resmi, bila ada, tampil
            terpisah dan tidak memakai angka contoh ini.
          </p>
        </div>
      )}
      {failures.length > 0 && (
        <div className="banner error is-sticky" role="alert">
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
        <div className="banner warn is-sticky" role="status">
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
        {layer === "ispu" ? null : <div className="date-filter">
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
        </div>}
      </section>
      <LayerBar layer={layer} setLayer={setLayer} />
      <WilayahDetail province={province} from={from} to={to} layer={layer} />
      {layer !== "hotspot" ? <ExtraLayers layer={layer} view={view} feeds={feeds} province={province} /> : null}

      {layer === "hotspot" && view.rangeInvalid ? (
        <p className="banner error" role="alert">
          Tanggal awal lebih besar dari tanggal akhir. Perbaiki rentang untuk melihat angka.
        </p>
      ) : null}

      {layer === "hotspot" ? <section className="cards" aria-label="Ringkasan">
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
        <article className="card metric">
          <p className="metric-label">Belum terverifikasi wilayah</p>
          <p className="metric-value">{formatAngka(view.summary.belumTerverifikasi || 0)}</p>
          <p className="metric-note">Tidak masuk hitungan provinsi</p>
        </article>
        <article className="card metric">
          <p className="metric-label">ISPU stasiun</p>
          <p className="metric-value">—</p>
          <p className="metric-note">Stasiun resmi belum terhubung. Buka lapisan Kualitas Udara (ISPU).</p>
        </article>
      </section> : null}

      {layer === "hotspot" ? <>
      <section className="card">
        <header className="card-head">
          <div>
            <h2>Sebaran titik panas</h2>
            <p>
              {formatAngka(view.points.length)} titik
              {hotspotFeed?.contoh ? " · data contoh" : ""}
              {hotspotFeed ? ` · ${hotspotSourceLabel(hotspotFeed, config.firms?.sumber)}` : ""}
            </p>
          </div>
        </header>
        {hotspotFeed?.status === "gagal" ? (
          <p className="empty">Peta tidak diisi karena sumber titik panas gagal: {hotspotFeed.error}</p>
        ) : (
          <HotspotBoard
            points={view.points}
            priority={priority}
            meta={feeds.find((feed) => feed.id === "hotspot_peta")?.petaMeta}
            feed={hotspotFeed}
            fetchedAt={hotspotFeed?.fetchedAt}
            observedAt={hotspotFeed?.observedAt}
            freshness={freshness}
            sumber={config.firms?.sumber}
          />
        )}
      </section>

      <ProvinceCounts
        points={view.points}
        from={from}
        to={to}
        sumber={hotspotSourceLabel(hotspotFeed, config.firms?.sumber)}
        summary={view.summary}
      />

      <TrendCharts hotspotTrend={view.hotspotTrend} hotspotSeries={view.hotspotSeries} province={province} />

      <section className="card">
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
      </section>

      <section className="card">
        <header className="card-head">
          <div>
            <h2>Konteks risiko jangka panjang (IRBI 2025)</h2>
            <p>
              {feeds.find((feed) => feed.id === "irbi")?.contoh
                ? "Indeks tahunan pada berkas contoh, bukan keluaran buku IRBI. Urutan nama, bukan urutan prioritas."
                : "Buku IRBI 2025. Tidak mengikuti filter tanggal. Urutan nama, bukan urutan prioritas dan bukan hitungan hotspot."}
            </p>
          </div>
        </header>
        <SimpleTable
          empty="Tidak ada baris IRBI pada cakupan ini."
          head={["Kabupaten", "Provinsi", "Indeks", "Kelas"]}
          rows={view.irbiRows.map((row) => [row.kabupaten, row.provinsi, formatAngka(row.indeks, 2), row.kelas])}
        />
      </section>
      </> : null}

      <section className="card sources-panel" aria-labelledby="metadata-heading">
        <header className="card-head">
          <div>
            <h2 id="metadata-heading">Metadata sumber</h2>
            <p>Waktu ambil dan waktu data mengikuti snapshot atau berkas contoh. Tidak ada server aplikasi.</p>
          </div>
        </header>
        <div className={`callout ${keySet ? "callout-hot" : ""}`}>
          <strong>{keySet ? "MAP_KEY FIRMS aktif di config." : "MAP_KEY FIRMS kosong."}</strong>
          <p>
            {config.firms?.catatan ||
              "Kunci FIRMS pada situs statis dapat dibaca siapa saja. Cuplikan hotspot dibaca dari data/live. Berkas contoh tidak ditampilkan."}
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
            {visibleFeeds.map((feed) => (
              <li key={feed.id}>
                <div className="source-top">
                  <h3>{feed.id === "ispu_pembanding" ? "PM2.5 model (CAMS)" : feed.nama}</h3>
                  <span className={`status-pill status-${feed.status}`}>{feedStatus(feed, config.firms?.sumber)}</span>
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
                {feed.id === "ispu_pembanding" ? (
                  <p className="fine">
                    Konsentrasi model, bukan ISPU. Tidak ditampilkan pada lapisan Kualitas Udara (ISPU) dan tidak diubah
                    menjadi kategori ISPU di antarmuka.
                  </p>
                ) : null}
                {feed.error ? <p className="error-text">{feed.error}</p> : null}
                <DatasetTiming feed={feed} />
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

function ProvinceCounts({ points, from, to, sumber, summary }) {
  return (
    <section className="card">
      <header className="card-head">
        <div>
          <h2>Jumlah deteksi hotspot (bukan status)</h2>
          <p>
            Periode {from || "—"}–{to || "—"}. Bukan status operasional.
            {summary?.belumTerverifikasi
              ? ` ${formatAngka(summary.belumTerverifikasi)} titik belum terverifikasi wilayah.`
              : ""}
          </p>
        </div>
      </header>
      <details className="read-help">
        <summary>Cara membaca</summary>
        <p>
          Satelit: {sumber || "—"}. Urutan provinsi mengikuti jumlah titik, dari yang terbanyak. Angka berwarna adalah
          confidence deteksi satelit: rendah, nominal (sedang), dan tinggi. Bukan tingkat bahaya.
        </p>
      </details>
      <HotspotAccordion points={points} />
    </section>
  );
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
