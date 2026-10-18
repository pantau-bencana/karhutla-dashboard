import { useMemo, useState } from "react";
import { StationMap } from "./StationMap.jsx";
import { formatAngka, formatTanggal, formatWib } from "../lib/format.js";
import {
  ISPU_EXPLANATION,
  KLH_ISPU_ANALYTIC,
  KLH_ISPU_APP,
  OPENAQ_DOCS,
  OPENAQ_HOME,
  OPENAQ_STATUS,
  filterStations,
  historyRange,
  officialStationFeed,
  openAqMeasurements,
  stationPoints,
} from "../lib/ispuView.js";

const COLUMNS = ["Stasiun", "Kabupaten/kota", "ISPU", "Parameter kritis", "Kategori", "Waktu pembaruan", "Sumber"];

function formatStamp(value) {
  const formatted = formatWib(value);
  return formatted === "—" || formatted === String(value) ? String(value) : formatted;
}

function todayInJakarta() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function KualitasUdara({ feeds, province }) {
  const [period, setPeriod] = useState("hari-ini");
  const [history, setHistory] = useState({ from: "", to: "" });
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const today = todayInJakarta();
  const allStations = useMemo(() => stationPoints(feeds), [feeds]);
  const archive = historyRange(allStations);
  const official = officialStationFeed(feeds);
  const rows = filterStations(allStations, {
    period,
    today,
    from: history.from,
    to: history.to,
    province,
    query,
  });
  const measurements = openAqMeasurements(feeds);

  function showHistory() {
    setPeriod("historis");
    setSelectedId("");
    if (archive && !history.from && !history.to) setHistory(archive);
  }

  return (
    <section className="stack" aria-labelledby="ispu-heading">
      <article className="card">
        <header className="card-head">
          <div>
            <h2 id="ispu-heading">Kualitas Udara (ISPU)</h2>
            <p>Memantau dampak asap pada kualitas udara di lokasi stasiun pemantau.</p>
          </div>
        </header>
        <div className="logic-body">
          <p>{ISPU_EXPLANATION}</p>
          <div className="province-filter" role="group" aria-label="Periode kualitas udara">
            <button type="button" aria-pressed={period === "hari-ini"} onClick={() => { setPeriod("hari-ini"); setSelectedId(""); }}>
              Hari Ini
            </button>
            <button type="button" aria-pressed={period === "historis"} onClick={showHistory}>
              Historis
            </button>
          </div>
          <p className="fine">
            {period === "hari-ini"
              ? `Hari Ini memakai tanggal ${formatTanggal(today)} (WIB).`
              : "Historis menampilkan arsip stasiun resmi pada rentang yang dipilih. Hari tanpa pengukuran ditulis tidak tersedia, bukan nol."}
          </p>
          {period === "historis" ? (
            <div className="date-filter">
              <label>
                Dari
                <input
                  type="date"
                  value={history.from}
                  onChange={(event) => setHistory((current) => ({ ...current, from: event.target.value }))}
                  disabled={!archive}
                />
              </label>
              <label>
                Sampai
                <input
                  type="date"
                  value={history.to}
                  onChange={(event) => setHistory((current) => ({ ...current, to: event.target.value }))}
                  disabled={!archive}
                />
              </label>
            </div>
          ) : null}
          <label className="search-field">
            Cari stasiun atau kabupaten/kota
            <input
              type="search"
              value={query}
              placeholder="Nama stasiun"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <p className="fine">
            Waktu pembaruan: {official?.fetchedAt ? formatWib(official.fetchedAt) : "tidak tersedia"}. Sumber:{" "}
            {official ? official.instansi || official.nama : "Kementerian Lingkungan Hidup — ISPU (belum terhubung)"}.
          </p>
        </div>
      </article>

      <section className="split">
        <article className="card map-card">
          <header className="card-head">
            <div>
              <h2>Peta stasiun</h2>
              <p>Titik adalah lokasi pengukuran. Bukan pewarnaan kabupaten/kota.</p>
            </div>
            <ul className="legend" aria-label="Legenda kategori ISPU">
              <li><i className="swatch baik" /> Baik</li>
              <li><i className="swatch sedang" /> Sedang</li>
              <li><i className="swatch tidak" /> Tidak Sehat</li>
              <li><i className="swatch sangat" /> Sangat Tidak Sehat</li>
              <li><i className="swatch bahaya" /> Berbahaya</li>
            </ul>
          </header>
          <StationMap stations={rows} selectedId={selectedId} onSelect={setSelectedId} />
          {!rows.length ? (
            <p className="map-note">Tidak ada titik stasiun. Data stasiun ISPU resmi belum terhubung.</p>
          ) : null}
        </article>

        <article className="card">
          <header className="card-head">
            <div>
              <h2>{period === "hari-ini" ? "Hari Ini" : "Historis"}</h2>
              <p>
                {period === "historis" && !archive
                  ? "Arsip stasiun resmi belum tersedia."
                  : `${rows.length ? formatAngka(rows.length) : "tidak tersedia"} baris pada periode ini.`}
              </p>
            </div>
          </header>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {COLUMNS.map((label) => (
                    <th key={label} scope="col">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      className={row.id === selectedId ? "is-selected" : undefined}
                      onClick={() => setSelectedId(row.id)}
                    >
                      <th scope="row">{row.stasiun}</th>
                      <td>{row.kabupaten}</td>
                      <td>{formatAngka(row.ispu)}</td>
                      <td>{row.parameter}</td>
                      <td>{row.kategori}</td>
                      <td>{row.waktu ? formatStamp(row.waktu) : "tidak tersedia"}</td>
                      <td>{row.sumber}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    {COLUMNS.map((label) => (
                      <td key={label}>tidak tersedia</td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <article className="card">
        <header className="card-head">
          <div>
            <h2>Status data resmi</h2>
            <p>Belum tersedia. Portal ISPU tidak menyediakan API publik yang terdokumentasi.</p>
          </div>
        </header>
        <div className="logic-body">
          <p>
            Koordinat, nilai ISPU, kategori, parameter kritis, dan riwayat tidak diisi dari sumber lain. Dasbor tidak
            memakai token yang tertanam di aplikasi web KLH.
          </p>
          <p>
            <a href={KLH_ISPU_APP} target="_blank" rel="noopener noreferrer">Portal ISPU</a>
            {" · "}
            <a href={KLH_ISPU_ANALYTIC} target="_blank" rel="noopener noreferrer">Analisis kawasan ISPU</a>
          </p>
        </div>
      </article>

      <article className="card">
        <header className="card-head">
          <div>
            <h2>Data Pembanding – pengukuran stasiun</h2>
            <p>Nilai dalam µg/m³. Tidak diubah menjadi angka ISPU atau kategori ISPU.</p>
          </div>
        </header>
        <div className="logic-body">
          <p>{measurements.length ? "Pengukuran stasiun terbuka yang berhasil dimuat." : OPENAQ_STATUS}</p>
          <p>
            <a href={OPENAQ_HOME} target="_blank" rel="noopener noreferrer">OpenAQ</a>
            {" · "}
            <a href={OPENAQ_DOCS} target="_blank" rel="noopener noreferrer">Dokumentasi API OpenAQ v3</a>
          </p>
          {measurements.length ? (
            <div className="table-wrap short">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Stasiun</th>
                    <th scope="col">Lokasi</th>
                    <th scope="col">Parameter</th>
                    <th scope="col">Nilai (µg/m³)</th>
                    <th scope="col">Waktu</th>
                    <th scope="col">Sumber</th>
                  </tr>
                </thead>
                <tbody>
                  {measurements.map((row, index) => (
                    <tr key={`${row.stasiun}-${index}`}>
                      <th scope="row">{row.stasiun}</th>
                      <td>{row.lokasi}</td>
                      <td>{row.parameter}</td>
                      <td>{formatAngka(row.nilai, 1)}</td>
                      <td>{row.waktu || "tidak tersedia"}</td>
                      <td>{row.sumber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="fine">Nilai µg/m³: tidak tersedia.</p>
          )}
        </div>
      </article>
    </section>
  );
}
