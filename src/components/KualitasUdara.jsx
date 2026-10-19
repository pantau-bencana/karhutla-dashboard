import { useEffect, useMemo, useState } from "react";
import { Badge } from "./Badge.jsx";
import { StationMap } from "./StationMap.jsx";
import { parseCsv } from "../lib/csv.js";
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

export function KualitasUdara({ feeds, province, provinces = [] }) {
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
  const [ikuRows, setIkuRows] = useState([]);
  const [ikuState, setIkuState] = useState("memuat");
  const [ikuQuery, setIkuQuery] = useState("");

  useEffect(() => {
    let cancel = false;
    const url = new URL("data/static/iku-2024-kabupaten.csv", document.baseURI).href;
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.text();
      })
      .then((text) => {
        if (cancel) return;
        const parsed = parseCsv(text)
          .filter((row) => row.kode_wilayah && row.kab_kota)
          .sort((a, b) => String(a.kode_wilayah).localeCompare(String(b.kode_wilayah), "id", { numeric: true })
            || String(a.kab_kota).localeCompare(String(b.kab_kota), "id"));
        setIkuRows(parsed);
        setIkuState(parsed.length ? "ada" : "kosong");
      })
      .catch(() => {
        if (!cancel) setIkuState("gagal");
      });
    return () => {
      cancel = true;
    };
  }, []);

  const ikuVisible = ikuRows.filter((row) => {
    const needle = ikuQuery.trim().toLocaleLowerCase("id");
    if (!needle) return true;
    return `${row.kab_kota} ${row.provinsi} ${row.kode_wilayah}`.toLocaleLowerCase("id").includes(needle);
  });

  const stationCount = useMemo(() => {
    const counts = new Map();
    for (const row of allStations) {
      if (!row.provinsi) continue;
      counts.set(row.provinsi, (counts.get(row.provinsi) || 0) + 1);
    }
    return counts;
  }, [allStations]);

  function showHistory() {
    setPeriod("historis");
    setSelectedId("");
    if (archive && !history.from && !history.to) setHistory(archive);
  }

  return (
    <section className="stack" aria-label="Kualitas Udara (ISPU)">
      <div className="split">
        <article className="card">
          <h2>Status per provinsi prioritas</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Provinsi</th>
                  <th scope="col">Status data di dashboard</th>
                  <th scope="col">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(provinces.length ? provinces : ["Tidak tersedia"]).map((name) => {
                  const count = stationCount.get(name) || 0;
                  return (
                    <tr key={name}>
                      <th scope="row">{name}</th>
                      <td>
                        {count ? (
                          <Badge kind="akt">{formatAngka(count)} stasiun tersambung</Badge>
                        ) : (
                          <Badge kind="tau">Tidak ada data stasiun</Badge>
                        )}
                      </td>
                      <td>
                        {count ? (
                          "Tabel stasiun di bawah"
                        ) : (
                          <a href={KLH_ISPU_APP} target="_blank" rel="noopener noreferrer">Lihat di ISPU KLH</a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="fine">
            Dashboard tidak menyimpan daftar stasiun. Ketersediaan stasiun diperiksa di portal resmi. Baris tanpa pengukuran tidak diisi angka.
          </p>
        </article>
        <div className="stack-card">
          <article className="card rank-card">
            <h2>Portal resmi ISPU – KLH</h2>
            <p>Nilai, parameter kritis, kategori, dan waktu pembaruan per stasiun.</p>
            <p>
              <a className="btn pri" href={KLH_ISPU_APP} target="_blank" rel="noopener noreferrer">Buka ispu.kemenlh.go.id</a>
            </p>
          </article>
          <article className="card">
            <div className="mod-head">
              <h2>PM2.5 model Copernicus</h2>
              <Badge kind="pem">Pembanding, bukan BMKG/KLHK</Badge>
            </div>
            <p>Pembanding model atmosfer. Bukan ISPU dan tidak dikonversi ke kategori ISPU. Angka model tidak ditampilkan di halaman ini.</p>
          </article>
          <article className="card">
            <div className="mod-head">
              <h2>Indeks Kualitas Udara 2024</h2>
              <Badge kind="sta">Data statis tahunan 2024</Badge>
            </div>
            <p>Satu Data KemenLH, per kab/kota, dataset terbuka dengan atribusi. Konteks tahunan, bukan ISPU. Tabel lengkap ada di bawah.</p>
          </article>
          <article className="empty">
            <h2>Kenapa tidak ada angka ISPU?</h2>
            <p>Portal ISPU belum punya API publik terdokumentasi dan katalog Satu Data belum memuat ISPU harian per stasiun. Pengambilan otomatis memerlukan izin tertulis KLH.</p>
          </article>
        </div>
      </div>

      {allStations.length ? <>
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
      </> : null}

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
            <h2>Indeks Kualitas Udara 2024 (tahunan, statis) — bukan ISPU, bukan kondisi harian</h2>
            <p>Sumber: Kementerian Lingkungan Hidup – Direktorat Perlindungan dan Pengelolaan Mutu Udara (Satu Data KemenLH)</p>
          </div>
        </header>
        <div className="logic-body">
          <p>
            Akses Terbuka. Tahun data 2024. Pembaruan pada sumber 8 Juli 2026. Disalin 19 Oktober 2026.
            Metode pada halaman dataset: 40% indeks SO2, 40% indeks NO2, dan 20% indeks PM2.5 dari data ambien tahunan.
            Tidak ada kelas resmi pada berkas ini, jadi angka tidak diwarnai. Urutan mengikuti kode wilayah, bukan nilai IKU.
          </p>
          <p>
            <a href="https://satudata.kemenlh.go.id/dataset/indeks-kualitas-udara" target="_blank" rel="noopener noreferrer">Halaman dataset</a>
            {" · "}
            <a href="https://satudata.kemenlh.go.id/tentang/kebijakan" target="_blank" rel="noopener noreferrer">Kebijakan pemakaian</a>
          </p>
          <p className="fine">
            Beberapa kode wilayah pada sumber terulang untuk kabupaten dan kota yang berbeda. Kode disimpan apa adanya.
          </p>
          <label className="search-field">
            Cari kabupaten/kota atau provinsi
            <input type="search" value={ikuQuery} onChange={(event) => setIkuQuery(event.target.value)} />
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Kode wilayah</th>
                <th scope="col">Kabupaten/kota</th>
                <th scope="col">Provinsi</th>
                <th scope="col">IKU 2024</th>
              </tr>
            </thead>
            <tbody>
              {ikuState === "ada" && ikuVisible.length ? ikuVisible.map((row) => (
                <tr key={`${row.kode_wilayah}-${row.kab_kota}`}>
                  <td>{row.kode_wilayah}</td>
                  <th scope="row">{row.kab_kota}</th>
                  <td>{row.provinsi}</td>
                  <td>{row.iku}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4}>{ikuState === "memuat" ? "Memuat tabel IKU…" : "Tidak tersedia"}</td>
                </tr>
              )}
            </tbody>
          </table>
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
