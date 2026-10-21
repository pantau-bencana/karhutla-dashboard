import { useMemo, useRef } from "react";
import { Badge } from "./Badge.jsx";
import { ClusterLegend, HotspotMap } from "./HotspotMap.jsx";
import { DatasetTiming } from "./DatasetTiming.jsx";
import { ForecastPanel } from "./ForecastPanel.jsx";
import { formatAngka, formatWib } from "../lib/format.js";
import { hotspotSourceLabel } from "../lib/freshness.js";
import { karhutlaRankingPlan } from "../lib/ranking.js";
import { statusRingkasanSiap } from "../lib/ringkasanStatus.js";
import { barisPeriodeAktif, labelJendela, susunPeringkatHotspot } from "../lib/peringkatHotspot.js";
import { defaultRange } from "../lib/derive.js";
import { PriorityIndicators } from "./PriorityIndicators.jsx";
import { PrioritasPanel } from "./PrioritasPanel.jsx";
import { PeringkatHotspot } from "./PeringkatHotspot.jsx";
import { KontrolPeriode } from "./KontrolPeriode.jsx";

export function SummaryPage({
  config,
  feeds,
  manifest,
  freshness,
  loading = false,
  province = "",
  from = "",
  setFrom,
  to = "",
  setTo,
  periodeJam = 24,
  setPeriodeJam,
}) {
  const hotspot = feeds.find((feed) => feed.id === "hotspot");
  const priority = config?.provinsiPrioritas ?? [];
  const irbi = feeds.find((feed) => feed.id === "irbi");
  const dibi = feeds.find((feed) => feed.id === "dibi_karhutla");
  const cap = feeds.find((feed) => feed.id === "bmkg_cap");
  const prakiraan = feeds.find((feed) => feed.id === "bmkg_prakiraan");
  const bolehHotspot = hotspot && !hotspot.contoh && (hotspot.status === "berhasil" || hotspot.status === "usang");
  const ranking = karhutlaRankingPlan(feeds.prioritas);
  const mapApi = useRef(null);
  const fwiGwis = feeds.find((feed) => feed.id === "fwi_gwis_pembanding");
  const mapPoints = bolehHotspot && hotspot && !hotspot.contoh ? hotspot.rows : [];
  const sampleHotspot = !bolehHotspot || !mapPoints.length;
  const siap = statusRingkasanSiap(manifest, {
    memuat: Boolean(loading && !manifest),
    capBerakhir: (cap?.rows ?? []).map((row) => row.berakhir).filter(Boolean),
  });
  const kategori = siap.baris;
  const day = useMemo(
    () => barisPeriodeAktif(mapPoints, { from, to, province, hours: periodeJam }),
    [mapPoints, from, to, province, periodeJam],
  );
  const tally = {
    jumlah: day.length,
    kepercayaan: day.reduce((acc, point) => {
      const key = point.kelasKepercayaan || "tidak_diketahui";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
  };
  const pertamaMerah = susunPeringkatHotspot(day, { tingkat: "provinsi" }).baris[0];
  const weather = feeds.find((feed) => feed.id === "fdrs_pembanding");

  return (
    <main className="wrap main">
      <header className="page-head">
        <div>
          <h1>Ringkasan pemantauan</h1>
          <p className="lead">
            hotspot = deteksi satelit, bukan kebakaran terkonfirmasi. Kepercayaan sensor bukan tingkat bahaya.
            Peta, angka, dan tabel memakai periode yang sama{province ? ` untuk ${province}` : ", cakupan Indonesia"}.
          </p>
        </div>
      </header>
      <section className="card" aria-label="Status kategori">
        <h2>Status data</h2>
        <p className="fine">
          Setiap kategori memakai manifes yang sama dengan halaman Karhutla. Satu sumber yang gagal tidak mengubah status kategori lain.
          {siap.keadaan === "memuat" ? " Memuat status sumber…" : manifest?.generated_at ? ` Manifes ${formatWib(manifest.generated_at)}.` : ` ${siap.catatan || "Manifes gagal dimuat."}`}
        </p>
        {siap.keadaan === "memuat" ? (
          <p className="loading" role="status">Memuat status sumber…</p>
        ) : siap.keadaan === "gagal" && !kategori.length ? (
          <p className="empty" role="alert">{siap.catatan || "Manifes gagal dimuat."}</p>
        ) : (
        <>
        <p className="fine">Keadaan gabungan: {siap.keadaan === "berhasil" ? "berhasil" : siap.keadaan === "kedaluwarsa" ? "kedaluwarsa" : siap.keadaan === "gagal" ? "gagal" : "sebagian"}.</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Kategori</th>
                <th scope="col">Status</th>
                <th scope="col">Waktu data</th>
                <th scope="col">Waktu pembaruan</th>
                <th scope="col">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {kategori.map((row) => (
                <tr key={row.nama}>
                  <th scope="row">{row.nama}</th>
                  <td>{row.status}</td>
                  <td>{formatWib(row.waktuData)}</td>
                  <td>{formatWib(row.waktuAmbil)}</td>
                  <td>{row.catatan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
        )}
      </section>
      <KontrolPeriode
        from={from}
        to={to}
        setFrom={setFrom}
        setTo={setTo}
        periodeJam={periodeJam}
        setPeriodeJam={setPeriodeJam}
        onHariTerakhir={() => {
          const range = defaultRange(hotspot?.rows ?? [], 1);
          if (!range.to) return;
          setFrom?.(range.to);
          setTo?.(range.to);
          setPeriodeJam?.(24);
        }}
        onTujuhHari={() => {
          const range = defaultRange(hotspot?.rows ?? [], 7);
          if (!range.from || !range.to) return;
          setFrom?.(range.from);
          setTo?.(range.to);
          setPeriodeJam?.(168);
        }}
      />
      <section className="overview-grid">
        <article className="modcard">
          <div className="mod-head">
            <div>
              <h2>Sebaran {labelJendela(periodeJam)}</h2>
              {loading && !hotspot ? (
                <p className="loading" role="status">Memuat sebaran titik panas…</p>
              ) : sampleHotspot ? (
                <p>{hotspot?.status === "gagal" ? (hotspot.error || "Titik panas gagal dimuat.") : hotspot?.status === "usang" ? (hotspot.error || "Cuplikan terakhir tidak ada.") : (hotspot?.error || "Data contoh tidak ditampilkan. Peta dikosongkan.")} Kategori lain tetap mengikuti manifes yang sama.</p>
              ) : (
                <p>
                  {formatAngka(tally.jumlah)} titik, {formatAngka(tally.kepercayaan.tinggi || 0)} kepercayaan tinggi, {formatAngka(tally.kepercayaan.nominal || 0)} sedang, {formatAngka(tally.kepercayaan.rendah || 0)} rendah, {formatAngka(tally.kepercayaan.tidak_diketahui || 0)} tidak diketahui
                  {pertamaMerah ? `, peringkat merah tertinggi: ${pertamaMerah.nama}` : ""}.
                  Observasi {hotspot?.observedAt ? formatWib(hotspot.observedAt) : "tidak tersedia"}
                  {freshness?.tertunda ? " · data tertunda" : ""}.
                  Sumber: {hotspotSourceLabel(hotspot, config?.firms?.sumber)}. Satuan: titik deteksi.
                </p>
              )}
            </div>
          </div>
          {loading && !hotspot ? null : sampleHotspot ? (
            <p className="empty">{hotspot?.error || "Data contoh tidak ditampilkan. Peta dikosongkan."}</p>
          ) : (
            <HotspotMap points={day} frame="indonesia" mapApi={mapApi} />
          )}
          <ClusterLegend />
          <p className="fine">
            Merah tinggi, oranye sedang, kuning rendah: kualitas deteksi satelit, bukan tingkat bahaya. Tidak diketahui berwarna abu-abu dan tidak dihitung sebagai kuning. Satu titik memakai warna itu. Cincin pada zoom kecil hanya merangkum bagian warna di dalam petak.
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
              <strong>Banjir</strong>
              <p>
                Prototipe dasbor untuk Indonesia. CAP yang masih berlaku, prakiraan 3 hari, dan analisis dasbor ditulis terpisah. IRBI 2025 statis dan tidak untuk publikasi. Klasifikasi DAS belum terintegrasi.
                {" "}
                <a href="#/banjir">Buka tabel</a>
              </p>
            </li>
            <li>
              <strong>Gunung api</strong>
              <p>
                <span className="link-only">
                  <Badge kind="tau">Tautan saja</Badge>
                  <a href="https://magma.esdm.go.id/" target="_blank" rel="noopener noreferrer">MAGMA Indonesia</a>
                </span>
                {" "}Status resmi dibaca di MAGMA. Tidak ada daftar gunung di dasbor ini.
                {" "}
                <a href="#/gunung-api">Buka tautan</a>
              </p>
            </li>
          </ol>
        </article>
      </section>

      <PeringkatHotspot
        points={day}
        feed={hotspot}
        memuat={Boolean(loading && !hotspot)}
        tertunda={Boolean(freshness?.tertunda)}
        from={from}
        to={to}
        periodeJam={periodeJam}
        province={province}
        sumber={config?.firms?.sumber}
      />

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
                    <a href={row.url} target="_blank" rel="noopener noreferrer">
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
