import { useMemo, useRef } from "react";
import { Badge } from "./Badge.jsx";
import { HotspotMap } from "./HotspotMap.jsx";
import { DatasetTiming } from "./DatasetTiming.jsx";
import { ForecastPanel } from "./ForecastPanel.jsx";
import { formatAngka, formatWib } from "../lib/format.js";
import { hotspotSourceLabel } from "../lib/freshness.js";
import { buildHotspotTree } from "../lib/hotspotTree.js";
import { countHotspots, filterHotspotWindow } from "../lib/hotspotWindow.js";
import { pageHref } from "../lib/route.js";
import { karhutlaRankingPlan } from "../lib/ranking.js";
import { decorateSources } from "../lib/sourceCatalog.js";
import { PriorityIndicators } from "./PriorityIndicators.jsx";
import { PrioritasPanel } from "./PrioritasPanel.jsx";
import { GfwedTable } from "./GfwedTable.jsx";

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
  const sources = decorateSources(manifest);
  const counts = sources.reduce((bag, row) => {
    bag[row.status] = (bag[row.status] || 0) + 1;
    return bag;
  }, {});
  const realTrend = hotspot && !hotspot.contoh && hotspot.asal === "snapshot" && hotspot.rows?.length;
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
          <p className="lead">Satu layar untuk melihat apa yang sedang terdeteksi, seberapa baru datanya, dan sumber mana yang sudah aktif.</p>
        </div>
        <div className="badges">
          <Badge kind="akt">Aktif</Badge>
          <Badge kind="pem">Pembanding, bukan BMKG/KLHK</Badge>
          <Badge kind="tau">Tautan saja</Badge>
        </div>
      </header>
      <section className="time-row" aria-label="Waktu data">
        <article className="tbox">
          <p className="tlabel">Hotspot terakhir (FIRMS)</p>
          <p className="tval">{hotspot?.observedAt ? formatWib(hotspot.observedAt) : "Tidak tersedia"}</p>
          <p className="tnote">{freshness?.tertunda ? <span className="delay">Data tertunda</span> : "Observasi satelit"} · {hotspotSourceLabel(hotspot, config?.firms?.sumber)}</p>
        </article>
        <article className="tbox">
          <p className="tlabel">FWI pembanding (GWIS)</p>
          <p className="tval">Bukan produk BMKG</p>
          <p className="tnote">Lapisan peta opsional. Horizon mengikuti produk GWIS, bukan prakiraan 14 hari.</p>
        </article>
        <article className="tbox">
          <p className="tlabel">Banjir – inaRISK</p>
          <p className="tval">Aceh & Bengkulu</p>
          <p className="tnote">Prototipe · menunggu izin tertulis</p>
        </article>
        <article className="tbox">
          <p className="tlabel">Gunung Api</p>
          <p className="tval">Tautan resmi MAGMA</p>
          <p className="tnote">Integrasi data belum tersedia</p>
        </article>
      </section>
      <section className="overview-grid">
        <article className="modcard">
          <div className="mod-head">
            <div>
              <h2>Karhutla</h2>
              <p>hotspot = deteksi satelit, bukan kebakaran terkonfirmasi. FWI pembanding, ISPU (tautan).</p>
            </div>
            <Badge kind="akt">Aktif</Badge>
          </div>
          {sampleHotspot ? (
            <p className="empty">{hotspot?.error || "Data contoh tidak ditampilkan. Peta dikosongkan."}</p>
          ) : (
            <HotspotMap points={day} frame="indonesia" mapApi={mapApi} />
          )}
          <div className="time-row">
            <article className="tbox">
              <p className="tlabel">Deteksi 24 jam</p>
              <p className="kpi">{formatAngka(tally.jumlah)} titik</p>
            </article>
            <article className="tbox">
              <p className="tlabel">Confidence tinggi</p>
              <p className="kpi">{formatAngka(tally.kepercayaan.tinggi || 0)} titik</p>
            </article>
            <article className="tbox">
              <p className="tlabel">Provinsi terbanyak</p>
              <p className="kpi kpi-name">{topProvince ? topProvince.provinsi : "Tidak tersedia"}</p>
            </article>
          </div>
          <div className="mod-foot">
            <p>Sumber: NASA FIRMS · bukan status kebakaran</p>
            <a className="btn pri" href={pageHref("peta")}>Buka Karhutla</a>
          </div>
        </article>
        <div className="stack-card">
          <article className="modcard">
            <div className="mod-head">
              <div>
                <h2>Banjir</h2>
                <p>inaRISK Aceh & Bengkulu</p>
              </div>
              <Badge kind="tun">Tertunda</Badge>
            </div>
            <div className="badges">
              <Badge kind="pro">Prototipe internal – menunggu izin tertulis BNPB</Badge>
              <Badge kind="sta">IRBI – data statis 2025</Badge>
            </div>
            <p>Nowcast BMKG 0–3 jam hanya tautan; bukan prakiraan 14 hari. Kolom dasarian diisi manual.</p>
            <a className="btn" href="#/banjir">Buka Banjir</a>
          </article>
          <article className="modcard">
            <div className="mod-head">
              <div>
                <h2>Gunung Api</h2>
                <p>Status aktivitas dari sumber resmi</p>
              </div>
              <Badge kind="tau">Tautan saja</Badge>
            </div>
            <p>Integrasi data PVMBG belum tersedia. Status dibaca langsung di MAGMA Indonesia.</p>
            <a className="btn" href="#/gunung-api">Buka Gunung Api</a>
          </article>
          <article className="card rank-card">
            <h2>{ranking.judul}</h2>
            <p>
              <Badge kind={ranking.dapatDisusun ? "pem" : "tun"}>{ranking.dapatDisusun ? ranking.jenis : "Belum tersedia"}</Badge>{" "}
              {ranking.dapatDisusun ? `${ranking.daftar.length} kab/kota pada daftar.` : ranking.status}
            </p>
            <a className="btn" href="#prioritas-kesiapsiagaan">Lihat daftar</a>
          </article>
        </div>
      </section>
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

      <PriorityIndicators />

      <ForecastPanel
        provinces={priority}
        weatherRows={weather?.contoh ? [] : weather?.rows}
        fwiRows={fwiGwis?.contoh ? [] : fwiGwis?.rows}
      />
      <GfwedTable rows={feeds.find((feed) => feed.id === "gfwed_kabupaten")?.rows} />

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

      <PrioritasPanel snapshot={feeds.prioritas} />

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
