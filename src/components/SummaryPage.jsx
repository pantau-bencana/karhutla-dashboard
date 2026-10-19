import { useMemo, useRef } from "react";
import { HotspotMap } from "./HotspotMap.jsx";
import { DatasetTiming } from "./DatasetTiming.jsx";
import { ForecastPanel } from "./ForecastPanel.jsx";
import { formatAngka, formatWib } from "../lib/format.js";
import { hotspotSourceLabel } from "../lib/freshness.js";
import { buildHotspotTree } from "../lib/hotspotTree.js";
import { countHotspots, filterHotspotWindow } from "../lib/hotspotWindow.js";
import { karhutlaRankingPlan } from "../lib/ranking.js";
import { PriorityIndicators } from "./PriorityIndicators.jsx";
import { PrioritasPanel } from "./PrioritasPanel.jsx";

export function SummaryPage({ config, feeds, manifest, freshness }) {
  const hotspot = feeds.find((feed) => feed.id === "hotspot");
  const hotspotPeta = feeds.find((feed) => feed.id === "hotspot_peta");
  const priority = config?.provinsiPrioritas ?? [];
  const irbi = feeds.find((feed) => feed.id === "irbi");
  const dibi = feeds.find((feed) => feed.id === "dibi_karhutla");
  const cap = feeds.find((feed) => feed.id === "bmkg_cap");
  const prakiraan = feeds.find((feed) => feed.id === "bmkg_prakiraan");
  const sampleHotspot = !hotspot || hotspot.contoh || hotspot.status === "gagal" || hotspot.status === "cadangan";
  const ranking = karhutlaRankingPlan(feeds.prioritas);
  const mapApi = useRef(null);
  const fwiGwis = feeds.find((feed) => feed.id === "fwi_gwis_pembanding");
  const mapSource = hotspotPeta?.rows?.length ? hotspotPeta : hotspot;
  const mapPoints = !sampleHotspot && mapSource && !mapSource.contoh ? mapSource.rows : [];
  const day = useMemo(() => filterHotspotWindow(mapPoints, { hours: 24 }).rows, [mapPoints]);
  const tally = countHotspots(day);
  const topProvince = buildHotspotTree(day)[0];
  const weather = feeds.find((feed) => feed.id === "fdrs_pembanding");

  return (
    <main className="wrap main">
      <header className="page-head">
        <div>
          <h1>Ringkasan pemantauan</h1>
          <p className="lead">hotspot = deteksi satelit, bukan kebakaran terkonfirmasi. Peta memakai jendela 24 jam, cakupan Indonesia.</p>
        </div>
      </header>
      <section className="overview-grid">
        <article className="modcard">
          <div className="mod-head">
            <div>
              <h2>Sebaran 24 jam</h2>
              {sampleHotspot ? (
                <p>{hotspot?.error || "Data contoh tidak ditampilkan. Peta dikosongkan."}</p>
              ) : (
                <p>
                  {formatAngka(tally.jumlah)} titik, {formatAngka(tally.kepercayaan.tinggi || 0)} confidence tinggi
                  {topProvince ? `, terbanyak di ${topProvince.provinsi}` : ""}.
                  Observasi {hotspot?.observedAt ? formatWib(hotspot.observedAt) : "tidak tersedia"}
                  {freshness?.tertunda ? " · data tertunda" : ""}.
                  Sumber: {hotspotSourceLabel(hotspot, config?.firms?.sumber)}. Satuan: titik deteksi.
                </p>
              )}
            </div>
          </div>
          {sampleHotspot ? (
            <p className="empty">{hotspot?.error || "Data contoh tidak ditampilkan. Peta dikosongkan."}</p>
          ) : (
            <HotspotMap points={day} frame="indonesia" mapApi={mapApi} />
          )}
          <p className="fine">
            Hijau rendah, kuning nominal, merah tinggi: kualitas deteksi satelit, bukan tingkat bahaya.
            {" "}
            <a href="#/karhutla/peta">Buka peta dan tabel</a>
          </p>
        </article>
        <article className="modcard">
          <h2>Yang perlu perhatian</h2>
          <ol className="attention-list">
            <li>
              <strong>Wilayah dengan perhatian tertinggi</strong>
              <p>
                {ranking.dapatDisusun
                  ? `${ranking.daftar.length} kab/kota pada daftar model pihak ketiga. ${ranking.jenis}.`
                  : ranking.status}
                {" "}
                <a href="#prioritas-kesiapsiagaan">Lihat daftar</a>
              </p>
            </li>
            <li>
              <strong>Banjir, Aceh dan Bengkulu</strong>
              <p>
                Prototipe internal – menunggu izin tertulis BNPB. IRBI 2025 statis. Bukan prakiraan 14 hari.
                {" "}
                <a href="#/banjir">Buka tabel</a>
              </p>
            </li>
            <li>
              <strong>Gunung api</strong>
              <p>
                Tautan saja. Status resmi dibaca di MAGMA. Tidak ada daftar gunung di dasbor ini.
                {" "}
                <a href="#/gunung-api">Buka tautan</a>
              </p>
            </li>
          </ol>
        </article>
      </section>

      <section className="card">
        <h2>Wilayah dengan perhatian tertinggi</h2>
        <p>
          Belum ada daftar dari produk resmi per kabupaten. FDRS BMKG dan kejadian historis per kabupaten belum tersambung untuk urutan ini.
          Daftar di bawah, bila cuplikannya segar, adalah model pihak ketiga dan bukan peringatan BNPB atau BMKG.
        </p>
      </section>

      <PrioritasPanel snapshot={feeds.prioritas} />

      <ForecastPanel
        provinces={priority}
        weatherRows={weather?.contoh ? [] : weather?.rows}
        fwiRows={fwiGwis?.contoh ? [] : fwiGwis?.rows}
      />

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

      <PriorityIndicators />
      <IrbiContext feed={irbi} />
    </main>
  );
}

function IrbiContext({ feed }) {
  const rows = [...(feed?.rows ?? [])]
    .filter((row) => row.kabupaten)
    .sort(
      (a, b) =>
        String(a.kabupaten).localeCompare(String(b.kabupaten), "id") ||
        String(a.provinsi).localeCompare(String(b.provinsi), "id"),
    );
  if (!rows.length || feed?.contoh) return null;
  return (
    <section className="card">
      <header className="card-head">
        <div>
          <h2>Konteks risiko jangka panjang (IRBI 2025)</h2>
          <p>Urutan nama kabupaten/kota. Bukan urutan 14 hari, bukan prakiraan, dan bukan hitungan hotspot.</p>
        </div>
      </header>
      <DatasetTiming feed={feed} />
      <div className="table-wrap short">
        <table>
          <thead>
            <tr>
              <th scope="col">Kabupaten/kota</th>
              <th scope="col">Provinsi</th>
              <th scope="col">Indeks</th>
              <th scope="col">Kelas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.provinsi}-${row.kabupaten}`}>
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
  );
}
