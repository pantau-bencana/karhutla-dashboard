import { useState } from "react";
import { Badge } from "./Badge.jsx";
import { OfficialLinks } from "./OfficialLinks.jsx";
import { officialLinks } from "../lib/sourceCatalog.js";
import { CatatanRingkas } from "./CatatanRingkas.jsx";
import { ExtraLayers, LayerBar } from "./ExtraLayers.jsx";
import { DatasetTiming } from "./DatasetTiming.jsx";
import { HotspotBoard } from "./HotspotBoard.jsx";
import { TrendCharts } from "./TrendCharts.jsx";
import { defaultRange } from "../lib/derive.js";
import { hotspotSourceLabel, labelStatusFeed } from "../lib/freshness.js";
import { formatAngka, formatTanggal } from "../lib/format.js";
import { JENDELA_PERIODE, barisPeriodeAktif, labelJendela } from "../lib/peringkatHotspot.js";
import { PeringkatHotspot } from "./PeringkatHotspot.jsx";
import { FilterProvinsi } from "./FilterProvinsi.jsx";

function feedStatus(feed, sumber) {
  return labelStatusFeed(feed, { sumber });
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
  periodeJam = 24,
  setPeriodeJam,
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
      periodeJam={periodeJam}
      setPeriodeJam={setPeriodeJam}
      view={view}
      freshness={freshness}
    />
  );
}

function DashboardBody({ active, config, feeds, loading, province, setProvince, from, setFrom, to, setTo, periodeJam, setPeriodeJam, view, freshness }) {
  const [layer, setLayer] = useState("hotspot");
  const hotspotFeed = feeds.find((feed) => feed.id === "hotspot");
  const aktif = barisPeriodeAktif(
    hotspotFeed && !hotspotFeed.contoh && hotspotFeed.status !== "gagal" ? hotspotFeed.rows : [],
    { from, to, province, hours: periodeJam },
  );
  const sipongiFeed = feeds.find((feed) => feed.id === "sipongi");
  const irbiFeed = feeds.find((feed) => feed.id === "irbi");
  const visibleFeeds = layer === "ispu" ? feeds.filter((feed) => feed.id !== "ispu" && feed.id !== "ispu_pembanding") : feeds;
  const failures = visibleFeeds.filter((feed) => feed.status === "gagal");
  const fallbacks = visibleFeeds.filter((feed) => feed.status === "cadangan");
  const keySet = Boolean(String(config.firms?.mapKey ?? "").trim());
  const priority = config.provinsiPrioritas ?? [];
  const titikNasional = hotspotFeed && !hotspotFeed.contoh && hotspotFeed.status !== "gagal" ? hotspotFeed.rows : [];

  function resetDates() {
    const range = defaultRange(hotspotFeed?.rows ?? [], 7);
    setFrom(range.from);
    setTo(range.to);
  }

  function latestDay() {
    const range = defaultRange(hotspotFeed?.rows ?? [], 1);
    setFrom(range.to);
    setTo(range.to);
    setPeriodeJam?.(24);
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
      <header className="page-head">
        <div>
          <h1>Karhutla · Peta dan Data</h1>
          <p className="lead">
            Cakupan {province || "seluruh Indonesia"}
            {from && to ? `, ${formatTanggal(from)}–${formatTanggal(to)}` : ""}.
            Hotspot = deteksi satelit, bukan kebakaran terkonfirmasi.
          </p>
        </div>
      </header>
      {!loading && failures.length > 0 && (
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
        <FilterProvinsi
          province={province}
          setProvince={setProvince}
          points={titikNasional}
          from={from}
          to={to}
          hours={periodeJam}
          prioritas={priority}
        />
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
          <button type="button" className="button ghost" onClick={() => { resetDates(); setPeriodeJam?.(168); }}>
            7 hari terakhir
          </button>
        </div>}
        {layer === "ispu" ? null : (
          <div className="province-filter" role="group" aria-label={`Jendela periode, sekarang ${labelJendela(periodeJam)}`}>
            {JENDELA_PERIODE.map(([jam, label]) => (
              <button key={jam} type="button" aria-pressed={periodeJam === jam} onClick={() => setPeriodeJam?.(jam)}>
                {label}
              </button>
            ))}
          </div>
        )}
      </section>
      <LayerBar layer={layer} setLayer={setLayer} />
      {layer !== "hotspot" ? <ExtraLayers layer={layer} view={view} feeds={feeds} province={province} provinces={config?.provinsiPrioritas ?? []} /> : null}

      {layer === "hotspot" && view.rangeInvalid ? (
        <p className="banner error" role="alert">
          Tanggal awal lebih besar dari tanggal akhir. Perbaiki rentang untuk melihat angka.
        </p>
      ) : null}

      {layer === "hotspot" ? (
      <section className="card">
        <header className="card-head">
          <div>
            <h2>Sebaran titik panas</h2>
            <p>
              {formatAngka(aktif.length)} titik · {labelJendela(periodeJam)}
              {from && to ? ` · ${formatTanggal(from)}–${formatTanggal(to)}` : ""}
              {province ? ` · ${province}` : " · seluruh Indonesia"}
              {hotspotFeed?.contoh ? " · data contoh" : ""}
              {hotspotFeed ? ` · ${hotspotSourceLabel(hotspotFeed, config.firms?.sumber)}` : ""}
              {freshness?.tertunda ? " · data tertunda" : ""}
            </p>
          </div>
        </header>
        {hotspotFeed?.status === "gagal" ? (
          <p className="empty">Peta tidak diisi karena sumber titik panas gagal: {hotspotFeed.error}</p>
        ) : (
          <HotspotBoard
            points={aktif}
            priority={priority}
            frame={province ? "points" : "indonesia"}
            onKembaliIndonesia={() => setProvince("")}
            meta={feeds.find((feed) => feed.id === "hotspot_peta")?.petaMeta}
            feed={hotspotFeed}
            fetchedAt={hotspotFeed?.fetchedAt}
            observedAt={hotspotFeed?.observedAt}
            freshness={freshness}
            sumber={config.firms?.sumber}
            from={from}
            to={to}
            periodeTeks={`${labelJendela(periodeJam)}${from && to ? `, ${formatTanggal(from)}–${formatTanggal(to)}` : ""}`}
          />
        )}
      </section>
      ) : null}

      <CatatanRingkas judul="Catatan sumber" id="metadata-heading">
        <p>
          Periode filter {from || "—"} sampai {to || "—"}. Lapisan {layer}. Cakupan {province || "seluruh Indonesia"}. Angka contoh tidak menjadi data resmi.
          Waktu ambil dan waktu data mengikuti snapshot resmi. Berkas contoh tidak ditampilkan. Tidak ada server aplikasi.
        </p>
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
                      <FeedLinks feed={feed} />
                    </dd>
                  </div>
                </dl>
                {feed.id === "ispu_pembanding" ? (
                  <p className="fine">
                    Konsentrasi model dalam µg/m³. Pada lapisan Kualitas Udara labelnya pembanding CAMS, bukan ISPU dan bukan stasiun. Tidak diubah menjadi kategori ISPU.
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
        <p>
          <a href="#/sumber-metode">Rincian di Sumber &amp; Metode</a>
          {" · "}
          <a href="#/">Konteks risiko jangka panjang (IRBI 2025) di Ringkasan</a>
          {" · "}
          <a href="#/">Daftar prioritas 14 hari di Ringkasan</a>
        </p>
      </CatatanRingkas>

      {layer === "hotspot" ? <>
      <PeringkatHotspot
        points={aktif}
        feed={hotspotFeed}
        memuat={Boolean(loading && !hotspotFeed)}
        tertunda={Boolean(freshness?.tertunda)}
        from={from}
        to={to}
        periodeJam={periodeJam}
        province={province}
        sumber={config.firms?.sumber}
      />

      <TrendCharts hotspotTrend={view.hotspotTrend} hotspotSeries={view.hotspotSeries} province={province} />

      <section className="card">
        <header className="card-head">
          <div>
            <h2>Rekap SiPongi</h2>
            <p>
              {sipongiFeed?.rows?.length ? (
                "Jumlah hotspot dan luas terbakar dijumlahkan pada rentang tanggal."
              ) : (
                <span className="link-only">
                  <Badge kind="tau">Tautan saja</Badge>
                  <OfficialLinks links={officialLinks("sipongi")} />
                  <span>Rekap resmi belum terhubung ke dasbor.</span>
                </span>
              )}
            </p>
          </div>
        </header>
        <SimpleTable
          empty={
            sipongiFeed?.rows?.length ? (
              "Tidak ada rekap SiPongi pada rentang ini."
            ) : (
              <span className="link-only">
                <Badge kind="tau">Tautan saja</Badge>
                <OfficialLinks links={officialLinks("sipongi")} />
                <span>Rekap resmi SiPongi belum terhubung.</span>
              </span>
            )
          }
          head={["Provinsi", "Hotspot", "Luas (ha)"]}
          rows={view.sipongiRows.map((row) => [row.provinsi, formatAngka(row.jumlah), formatAngka(row.luas, 1)])}
        />
      </section>
      <p className="fine">
        Konteks risiko jangka panjang (IRBI 2025):{" "}
        {irbiFeed?.rows?.length
          ? "tabel lengkap ada di Ringkasan. Buku IRBI 2025. Tidak mengikuti filter tanggal. Urutan nama, bukan urutan prioritas dan bukan hitungan hotspot."
          : irbiFeed?.error || "Tidak tersedia. Tabel IRBI resmi belum dimuat."}
        {" "}
        <a href="#/">Buka Ringkasan</a>
      </p>
      <p className="fine">
        Daftar resmi 15–20 kabupaten/kota untuk 14 hari: menunggu data resmi BMKG (FDRS/potensi karhutla per kab/kota). Prototipe A+ ada di <a href="#/">Ringkasan</a>.
      </p>
      </> : null}
    </main>
  );
}

function FeedLinks({ feed }) {
  if (feed.urlTampil) {
    return (
      <a href={feed.urlTampil} target="_blank" rel="noopener noreferrer">
        {feed.urlTampil}
      </a>
    );
  }
  const links = feed.status === "tautan" || String(feed.error || "").includes("Tautan saja") ? officialLinks(feed.id) : [];
  if (!links.length) return "—";
  return <OfficialLinks links={links} />;
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
