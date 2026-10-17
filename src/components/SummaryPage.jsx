import { useState } from "react";
import { HotspotMap } from "./HotspotMap.jsx";
import { DatasetTiming } from "./DatasetTiming.jsx";
import { ForecastPanel } from "./ForecastPanel.jsx";
import { Term } from "./Term.jsx";
import { formatAngka, formatWib } from "../lib/format.js";
import { countHotspots, filterHotspotWindow } from "../lib/hotspotWindow.js";
import { pageHref } from "../lib/route.js";
import { karhutlaRankingPlan } from "../lib/ranking.js";
import { decorateSources } from "../lib/sourceCatalog.js";

const WINDOWS = [
  [24, "24 jam"],
  [48, "48 jam"],
  [168, "7 hari"],
];

export function SummaryPage({ config, feeds, manifest }) {
  const hotspot = feeds.find((feed) => feed.id === "hotspot");
  const hotspotPeta = feeds.find((feed) => feed.id === "hotspot_peta");
  const [hours, setHours] = useState(24);
  const [provinceFilter, setProvinceFilter] = useState("semua");
  const priority = config?.provinsiPrioritas ?? [];
  const irbi = feeds.find((feed) => feed.id === "irbi");
  const dibi = feeds.find((feed) => feed.id === "dibi_karhutla");
  const cap = feeds.find((feed) => feed.id === "bmkg_cap");
  const prakiraan = feeds.find((feed) => feed.id === "bmkg_prakiraan");
  const sampleHotspot = !hotspot || hotspot.contoh || hotspot.status === "gagal" || hotspot.status === "cadangan";
  const ranking = karhutlaRankingPlan({ irbiFeed: irbi });
  const sources = decorateSources(manifest);
  const counts = sources.reduce((bag, row) => {
    bag[row.status] = (bag[row.status] || 0) + 1;
    return bag;
  }, {});
  const realTrend = hotspot && !hotspot.contoh && hotspot.asal === "snapshot" && hotspot.rows?.length;
  const mapSource = hotspotPeta?.rows?.length ? hotspotPeta : hotspot;
  const mapPoints = !sampleHotspot && mapSource && !mapSource.contoh ? mapSource.rows : [];
  const selectedProvinces = provinceFilter === "prioritas" ? priority : provinceFilter === "semua" ? null : [provinceFilter];
  const windowed = filterHotspotWindow(mapPoints, { hours, provinces: selectedProvinces });
  const tally = countHotspots(windowed.rows);
  const meta = hotspotPeta?.petaMeta;
  const weather = feeds.find((feed) => feed.id === "fdrs_pembanding");
  const fwiGwis = feeds.find((feed) => feed.id === "fwi_gwis_pembanding");

  return (
    <main className="wrap main">
      <section className="cards" aria-label="Status sumber">
        {Object.entries(counts).map(([status, count]) => (
          <article key={status} className="card metric">
            <p className="metric-label">{status}</p>
            <p className="metric-value">{count}</p>
            <p className="metric-note">Baris pada Sumber Data</p>
          </article>
        ))}
      </section>

      <p className="back-row">
        <a className="button" href={pageHref("logika")}>
          Logika Pemantauan
        </a>{" "}
        <a className="button ghost" href={pageHref("sumber")}>
          Sumber Data
        </a>
      </p>

      <section className="card">
        <header className="card-head">
          <div>
            <h2>
              Peta <Term id="hotspot">hotspot</Term>
            </h2>
            <p>hotspot = deteksi satelit, bukan kebakaran terkonfirmasi</p>
          </div>
        </header>
        {sampleHotspot ? (
          <div className="logic-body">
            <p>
              Hotspot resmi belum tersambung. Titik pada data contoh tidak digambar di halaman ini. Peta contoh ada di{" "}
              <a href={pageHref("peta")}>Peta dan Data</a>.
            </p>
            <DatasetTiming feed={hotspot} />
          </div>
        ) : (
          <div className="logic-body">
            <p>
              Sumber: NASA FIRMS{meta?.sumber ? ` (${meta.sumber})` : ""}. Kotak permintaan {meta?.bbox || "94.4,-11.5,141.6,6.5"},
              {" "}
              {meta?.permintaan_hari || 5} hari pada berkas penuh ({formatAngka(meta?.baris_berkas)} baris, sensor{" "}
              {meta ? Object.entries(meta.sensor_berkas || {}).map(([name, count]) => `${name} ${formatAngka(count)}`).join(", ") : "—"}
              ). Peta ini memakai titik di dalam batas kabupaten
              {meta ? ` (${formatAngka(meta.di_darat)} di darat, ${formatAngka(meta.di_luar_poligon)} di luar poligon tidak digambar)` : ""}.
              Duplikat yang dibuang: {formatAngka(meta?.duplikat_dibuang ?? 0)}.
            </p>
            <DatasetTiming feed={hotspot} />
            {hotspot?.fetchedAt || manifest?.datasets?.hotspot?.fetched_at ? (
              <p className="fine">Diambil {formatWib(hotspot?.fetchedAt || manifest?.datasets?.hotspot?.fetched_at)}. Waktu data {formatWib(hotspot?.observedAt || manifest?.datasets?.hotspot?.observed_at)}.</p>
            ) : null}
            <div className="province-filter" role="group" aria-label="Jendela waktu hotspot">
              {WINDOWS.map(([value, label]) => (
                <button key={value} type="button" aria-pressed={hours === value} onClick={() => setHours(value)}>
                  {label}
                </button>
              ))}
            </div>
            <div className="province-filter" role="group" aria-label="Provinsi prioritas">
              <button type="button" aria-pressed={provinceFilter === "semua"} onClick={() => setProvinceFilter("semua")}>
                Semua
              </button>
              <button type="button" aria-pressed={provinceFilter === "prioritas"} onClick={() => setProvinceFilter("prioritas")}>
                Enam prioritas
              </button>
              {priority.map((name) => (
                <button key={name} type="button" aria-pressed={provinceFilter === name} onClick={() => setProvinceFilter(name)}>
                  {name}
                </button>
              ))}
            </div>
            <p className="fine">
              {WINDOWS.find(([value]) => value === hours)?.[1]} sampai deteksi terbaru: {formatAngka(tally.jumlah)} titik.
              Sensor {Object.entries(tally.sensor).map(([name, count]) => `${name} ${formatAngka(count)}`).join(", ") || "—"}.
              Kepercayaan tinggi {formatAngka(tally.kepercayaan.tinggi || 0)}, nominal {formatAngka(tally.kepercayaan.nominal || 0)}, rendah {formatAngka(tally.kepercayaan.rendah || 0)}.
              Kelompok warna pada zoom kecil adalah kumpulan deteksi, bukan satu kebakaran.
            </p>
            <HotspotMap points={windowed.rows} frame="indonesia" />
          </div>
        )}
      </section>

      <ForecastPanel
        provinces={priority}
        weatherRows={weather?.contoh ? [] : weather?.rows}
        fwiRows={fwiGwis?.contoh ? [] : fwiGwis?.rows}
      />

      <section className="card">
        <header className="card-head">
          <div>
            <h2>Wilayah perhatian</h2>
            <p>Hanya dari data yang bukan contoh. Tidak ada skor resmi dan tidak ada rekomendasi operasi otomatis.</p>
          </div>
        </header>
        <p className="logic-body empty">
          Belum ada wilayah perhatian. Hotspot, FDRS per kabupaten, dan kejadian historis per kabupaten belum
          tersambung sebagai data resmi.
        </p>
      </section>

      <section className="card">
        <header className="card-head">
          <div>
            <h2>15–20 kabupaten/kota</h2>
            <p>
              Kerangka prototipe untuk {ranking.horizonDiminta}. Status: {ranking.status}.
            </p>
          </div>
        </header>
        <div className="logic-body">
          <p>{ranking.izin}</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Masukan</th>
                  <th scope="col">Status</th>
                  <th scope="col">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {ranking.masukan.map((row) => (
                  <tr key={row.nama}>
                    <th scope="row">{row.nama}</th>
                    <td>{row.status}</td>
                    <td>{row.catatan}</td>
                  </tr>
                ))}
                <tr>
                  <th scope="row">Daftar peringkat</th>
                  <td colSpan={2}>Kosong. Tidak diisi dari citra atau dari prakiraan 3 hari.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {ranking.annual.length ? (
        <section className="card">
          <header className="card-head">
            <div>
              <h2>
                Konteks <Term id="irbi">IRBI</Term> 2025
              </h2>
              <p>Dua puluh skor tertinggi pada buku tahun 2025. Bukan urutan 14 hari dan bukan prakiraan.</p>
            </div>
          </header>
          <DatasetTiming feed={irbi} />
          <div className="table-wrap short">
            <table>
              <thead>
                <tr>
                  <th scope="col">Urutan</th>
                  <th scope="col">Kabupaten/kota</th>
                  <th scope="col">Provinsi</th>
                  <th scope="col">Indeks</th>
                  <th scope="col">Kelas</th>
                </tr>
              </thead>
              <tbody>
                {ranking.annual.map((row) => (
                  <tr key={`${row.provinsi}-${row.kabupaten}`}>
                    <td>{row.urutan}</td>
                    <th scope="row">{row.kabupaten}</th>
                    <td>{row.provinsi}</td>
                    <td>{formatAngka(row.indeks, 2)}</td>
                    <td>{row.kelas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="split">
        <article className="card">
          <header className="card-head">
            <div>
              <h2>Kejadian historis nasional</h2>
              <p>Sumber: BNPB Satu Data. Bukan jumlah per kabupaten.</p>
            </div>
          </header>
          <div className="logic-body">
            <DatasetTiming feed={dibi} />
            {dibi?.rows?.length ? (
              <ul className="plain-list">
                {dibi.rows.map((row) => (
                  <li key={row.tahun}>
                    {row.tahun}: {formatAngka(row.jumlah)} kejadian {row.jenis.toLowerCase()} ({row.cakupan})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">Rangkaian nasional belum ada di snapshot.</p>
            )}
          </div>
        </article>
        <article className="card">
          <header className="card-head">
            <div>
              <h2>Peringatan dini cuaca</h2>
              <p>Sumber: BMKG. Nowcast, bukan peringatan karhutla. Horizon prakiraan terbuka tetap 3 hari.</p>
            </div>
          </header>
          <div className="logic-body">
            <DatasetTiming feed={cap} />
            <DatasetTiming feed={prakiraan} />
            {cap?.rows?.length ? (
              <ul className="plain-list">
                {cap.rows.slice(0, 6).map((row) => (
                  <li key={row.id || row.url}>
                    <a href={row.url} target="_blank" rel="noreferrer">
                      {row.judul || row.kejadian}
                    </a>
                    <div className="subline">
                      {row.mulai || "—"}
                      {row.berakhir ? ` sampai ${row.berakhir}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">Tidak ada butir CAP pada snapshot.</p>
            )}
            {manifest?.generated_at ? <p className="fine">Manifes {formatWib(manifest.generated_at)}</p> : null}
            {config?.bmkg?.atribusi ? <p className="fine">{config.bmkg.atribusi}</p> : null}
          </div>
        </article>
      </section>

      <section className="card">
        <header className="card-head">
          <div>
            <h2>Tren sepekan</h2>
            <p>Hanya ditampilkan bila arsip hotspot resmi ada.</p>
          </div>
        </header>
        <p className="logic-body">{realTrend ? "Arsip siap digambar." : "Tren sepekan tidak ditampilkan. Arsip hotspot resmi belum ada."}</p>
      </section>
    </main>
  );
}
