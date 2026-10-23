import { useMemo, useState } from "react";
import { Badge } from "./Badge.jsx";
import { OfficialLinks } from "./OfficialLinks.jsx";
import { officialLinks } from "../lib/sourceCatalog.js";
import { CatatanRingkas } from "./CatatanRingkas.jsx";
import { ExtraLayers, LayerBar } from "./ExtraLayers.jsx";
import { DatasetTiming } from "./DatasetTiming.jsx";
import { HotspotBoard } from "./HotspotBoard.jsx";
import { HotspotMap } from "./HotspotMap.jsx";
import { KeteranganMobile } from "./KeteranganMobile.jsx";
import { KontrolPeriode, teksJendela } from "./KontrolPeriode.jsx";
import { PetaKab } from "./PetaKab.jsx";
import { PrioritasPanel } from "./PrioritasPanel.jsx";
import { TrendCharts } from "./TrendCharts.jsx";
import { defaultRange } from "../lib/derive.js";
import { hotspotSourceLabel, labelStatusFeed } from "../lib/freshness.js";
import { formatAngka, formatTanggal } from "../lib/format.js";
import { tanggalJakarta } from "../lib/gwisFwi.js";
import { cariWilayahBatas, daftarKabkota } from "../lib/kabProvinsi.js";
import { barisPeriodeAktif, labelJendela } from "../lib/peringkatHotspot.js";
import { hariKeDepan, ringkasTitik, warnaAngin, warnaHujan, warnaIrbi, WARNA_KELAS } from "../lib/petaTema.js";
import { KELAS_BELUM, susunPotensiTujuh } from "../lib/potensiTujuh.js";
import { PeringkatHotspot } from "./PeringkatHotspot.jsx";
import { FilterProvinsi } from "./FilterProvinsi.jsx";
import { UnduhKarhutla81 } from "./UnduhKarhutla81.jsx";

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

const HORIZON = {
  fdrs: "Horizon citra SPARTAN: hingga H+7 sesuai produk BMKG. Peta menampilkan FWI model ECMWF (GWIS) pada tanggal model, pengganti berlabel, bukan FDRS BMKG.",
  hujan: "Horizon prakiraan BMKG: 3 hari. Pewarnaan peta adalah jumlah precipitation_sum model pada 7 hari ke depan, di satu titik di dalam batas. Bukan prakiraan resmi.",
  angin: "Horizon prakiraan BMKG: 3 hari. Pewarnaan peta adalah angin maksimum model pada 7 hari ke depan, di satu titik di dalam batas. Bukan asal kebakaran.",
  ispu: "Horizon: hari pengukuran stasiun. Bukan prakiraan ISPU. Titik model CAMS tetap µg/m³ dan bukan pewarnaan kabupaten/kota.",
  potensi: "Horizon 7 hari ke depan, zona Asia/Jakarta. Analisis model, bukan prakiraan resmi. Abu-abu berarti Belum cukup data.",
};

function DashboardBody({ active, config, feeds, loading, province, setProvince, from, setFrom, to, setTo, periodeJam, setPeriodeJam, view, freshness }) {
  const [layer, setLayer] = useState("hotspot");
  const [overlayIrbi, setOverlayIrbi] = useState(false);
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

  const hariTujuh = useMemo(() => hariKeDepan(7), []);
  const hujanFeed = feeds.find((feed) => feed.id === "hujan_14_pembanding");
  const fwiFeed = feeds.find((feed) => feed.id === "fwi_gwis_pembanding");
  const potensi = useMemo(
    () =>
      susunPotensiTujuh({
        fwiRows: fwiFeed?.contoh ? [] : fwiFeed?.rows,
        hujanRows: hujanFeed?.contoh ? [] : hujanFeed?.rows,
        hotspotRows: hotspotFeed && !hotspotFeed.contoh && hotspotFeed.status !== "gagal" ? hotspotFeed.rows : null,
        irbiRows: irbiFeed?.contoh ? [] : irbiFeed?.rows,
        daftarWilayah: daftarKabkota(),
        nasional: true,
        fwiFetchedAt: fwiFeed?.fetchedAt || "",
        hujanFetchedAt: hujanFeed?.fetchedAt || "",
        hotspotFetchedAt: hotspotFeed?.fetchedAt || "",
      }),
    [fwiFeed, hujanFeed, hotspotFeed, irbiFeed],
  );
  const tanggalFwi = useMemo(() => {
    const today = tanggalJakarta();
    const dates = (fwiFeed?.contoh ? [] : fwiFeed?.rows ?? [])
      .map((row) => String(row.tanggal || "").slice(0, 10))
      .filter((item) => item >= today)
      .sort();
    return dates[0] || today;
  }, [fwiFeed]);
  const garisIrbi = useMemo(() => {
    const map = {};
    if (!overlayIrbi) return map;
    for (const row of irbiFeed?.contoh ? [] : irbiFeed?.rows ?? []) {
      const wilayah = cariWilayahBatas({ kabupaten: row.kabupaten });
      if (!wilayah?.kode) continue;
      map[wilayah.kode] = {
        warna: warnaIrbi(row.kelas),
        teks: `Overlay IRBI 2025: ${row.kelas}. Bukan tema peta dan bukan prakiraan.`,
      };
    }
    return map;
  }, [overlayIrbi, irbiFeed]);
  const isiPeta = useMemo(() => {
    const map = {};
    if (layer === "potensi") {
      for (const row of potensi.baris) {
        map[row.kode] = {
          warna: WARNA_KELAS[row.kelas] || WARNA_KELAS[KELAS_BELUM],
          teks: `${row.kelas}. Analisis model, bukan prakiraan resmi.`,
        };
      }
      return map;
    }
    if (layer === "hujan" || layer === "angin") {
      const bidang = layer === "hujan" ? "curahHujan" : "anginKmj";
      const ringkas = ringkasTitik(hujanFeed?.contoh ? [] : hujanFeed?.rows, { hari: hariTujuh, bidang });
      for (const [kode, nilai] of ringkas) {
        map[kode] =
          layer === "hujan"
            ? { warna: warnaHujan(nilai.jumlah), teks: `Jumlah hujan model 7 hari ${nilai.jumlah.toFixed(1)} mm pada satu titik di dalam batas.` }
            : { warna: warnaAngin(nilai.maks), teks: `Angin maksimum model ${nilai.maks.toFixed(0)} km/jam pada satu titik di dalam batas.` };
      }
      return map;
    }
    if (overlayIrbi && (layer === "hotspot" || layer === "fdrs")) return garisIrbi;
    return map;
  }, [layer, potensi, hujanFeed, hariTujuh, overlayIrbi, garisIrbi]);

  return (
    <main className="wrap main">
      <header className="page-head">
        <div>
          <h1>Karhutla · Peta dan Data</h1>
          <p className="lead peta-penjelas">
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

      <div className="susun-peta">
      <section className="filters susun-filter" aria-label="Filter">
        <FilterProvinsi
          province={province}
          setProvince={setProvince}
          points={titikNasional}
          from={from}
          to={to}
          hours={periodeJam}
          prioritas={priority}
        />
        {layer === "hotspot" ? (
          <KontrolPeriode
            from={from}
            to={to}
            setFrom={setFrom}
            setTo={setTo}
            periodeJam={periodeJam}
            setPeriodeJam={setPeriodeJam}
            onHariTerakhir={latestDay}
            onTujuhHari={() => {
              resetDates();
              setPeriodeJam?.(168);
            }}
          />
        ) : (
          <p className="horizon-label peta-penjelas">{HORIZON[layer]}</p>
        )}
      </section>
      <LayerBar layer={layer} setLayer={setLayer} overlayIrbi={overlayIrbi} setOverlayIrbi={setOverlayIrbi} />
      <div className="susun-kanvas">
      {layer === "potensi" || layer === "hujan" || layer === "angin" ? (
        <PetaKab
          isi={isiPeta}
          garis={overlayIrbi ? garisIrbi : {}}
          judul={layer === "potensi" ? "Potensi 7 hari" : layer === "hujan" ? "Hujan model 7 hari" : "Angin model 7 hari"}
          catatan={HORIZON[layer]}
          legenda={
            layer === "potensi"
              ? Object.entries(WARNA_KELAS).map(([label, warna]) => ({ label, warna }))
              : []
          }
          kosongLabel={layer === "potensi" ? "Belum cukup data" : "Tidak ada nilai model pada titik ini"}
          provinsi={province}
        />
      ) : null}
      {layer === "fdrs" ? (
        <section className="card peta-kartu">
          <header className="card-head">
            <div>
              <h2>FWI model ECMWF (GWIS)</h2>
              <p className="peta-penjelas">Pembanding (data terbuka, bukan resmi). Bukan FDRS BMKG. Tanggal model {formatTanggal(tanggalFwi)}.</p>
            </div>
          </header>
          <HotspotMap points={[]} frame="indonesia" wilayah={province} fwiDate={tanggalFwi} />
          <KeteranganMobile>
            <p>Pembanding (data terbuka, bukan resmi). Bukan FDRS BMKG. Tanggal model {formatTanggal(tanggalFwi)}. {HORIZON.fdrs}</p>
          </KeteranganMobile>
        </section>
      ) : null}
      {overlayIrbi && (layer === "hotspot" || layer === "fdrs") ? (
        <PetaKab
          isi={garisIrbi}
          judul="Overlay IRBI 2025"
          catatan="Kelas buku IRBI 2025. Overlay saja, bukan tema peta, bukan filter tanggal, dan bukan prakiraan."
          kosongLabel="Tidak ada baris IRBI pada batas ini"
          provinsi={province}
        />
      ) : null}
      {layer === "hotspot" && view.rangeInvalid ? (
        <p className="banner error" role="alert">
          Tanggal awal lebih besar dari tanggal akhir. Perbaiki rentang untuk melihat angka.
        </p>
      ) : null}
      {layer === "hotspot" ? (
      <>
      <section className="card">
        <header className="card-head">
          <div>
            <h2>Sebaran titik panas</h2>
            <p className="peta-penjelas">
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
            wilayah={province}
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
      <UnduhKarhutla81 />
      </>
      ) : null}
      {layer !== "hotspot" ? <ExtraLayers layer={layer} view={view} feeds={feeds} province={province} provinces={config?.provinsiPrioritas ?? []} /> : null}
      {overlayIrbi ? <ExtraLayers layer="irbi" view={view} feeds={feeds} province={province} provinces={config?.provinsiPrioritas ?? []} /> : null}
      </div>
      <KeteranganMobile>
        <p>
          Cakupan {province || "seluruh Indonesia"}
          {from && to ? `, ${formatTanggal(from)}–${formatTanggal(to)}` : ""}. Hotspot = deteksi satelit, bukan kebakaran terkonfirmasi.
        </p>
        <p>
          Tombol provinsi pada layar lebar mengikuti peringkat deteksi hotspot pada periode aktif: merah, lalu oranye, lalu kuning, lalu total.
          {priority.length ? ` Konteks provinsi prioritas untuk prakiraan dan kesiapsiagaan tetap: ${priority.join(", ")}.` : ""}
        </p>
        {layer === "hotspot" ? <p>{teksJendela(periodeJam)}</p> : <p>{HORIZON[layer]}</p>}
      </KeteranganMobile>
      </div>

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
          ? "nyalakan overlay IRBI pada pemilih tema. Buku IRBI 2025. Tidak mengikuti filter tanggal. Urutan nama, bukan urutan prioritas dan bukan hitungan hotspot. Tanpa skor: IRBI tidak tersedia, bukan nol."
          : irbiFeed?.error || "Tidak tersedia. Tabel IRBI resmi belum dimuat."}
      </p>
      <p className="fine">
        Daftar resmi 15–20 kabupaten/kota untuk 14 hari: menunggu data resmi BMKG (FDRS/potensi karhutla per kab/kota).
      </p>
      <PrioritasPanel snapshot={feeds.prioritas} />
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
