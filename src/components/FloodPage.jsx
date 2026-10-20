import { Component, useCallback, useEffect, useMemo, useState } from "react";
import { FloodInfoTable, FloodKabDaftar, PrakiraanTigaHari } from "./FloodInfoTable.jsx";
import { FloodRiskMap } from "./FloodRiskMap.jsx";
import { ANALISIS_BUKAN_RESMI, ANALISIS_NAMA, CATATAN_ALASAN, applyAnalisis, catWilayah } from "../lib/analisisPantauBencana.js";
import { BNPB_ABSENT, BNPB_FILE, BNPB_RESOURCE_URL, bnpbAsDibi } from "../lib/bnpbBanjir.js";
import { looksLikeCsv, parseCsv } from "../lib/csv.js";
import {
  BMKG_ATTRIBUTION,
  BMKG_CAP_DOCS,
  DASARIAN_LINKS,
  DASARIAN_NOTE,
  NOWCAST_BUKAN_TIGA_HARI,
  applyNowcast,
  ringkasanNowcast,
} from "../lib/capKab.js";
import { DASARIAN_FILE, DASARIAN_GUIDE_URL, IKLIM_BMKG_URL, applyDasarian, todayWib } from "../lib/dasarianManual.js";
import { formatTanggalPendek, formatUsia, formatWib } from "../lib/format.js";
import { bigQueryUrl } from "../lib/floodServices.js";
import { BMKG_DOCS_URL } from "../lib/bmkgForecast.js";
import { FLOOD_PERMISSION, IRBI_PENGGUNAAN_INTERNAL, IRBI_PERMISSION, IRBI_TIDAK_TERSEDIA, buildFloodRows, kodeWilayah } from "../lib/floodMatrix.js";
import {
  BPS_PROYEKSI_URL,
  PENDUDUK_ABSENT,
  PENDUDUK_FILE,
  bacaPenduduk,
  barisTooltip,
  kalimatJumlahPenduduk,
  lampirkanPenduduk,
  ringkasPendudukBerstatus,
} from "../lib/pendudukKab.js";
import { PEMETAAN_CUACA, indeksPrakiraan, periodeTigaHari, ringkasPrakiraan, terapkanHari } from "../lib/prakiraanHujan.js";
import { PROVINSI, SEMUA_PROVINSI } from "../lib/provinsi.js";

const BANJIR_CSV = "data/static/irbi-2025-banjir.csv";
const CAP_CSV = "data/live/bmkg-cap-kab.csv";
const CAP_META = "data/live/bmkg-cap-kab-meta.json";
const PRAKIRAAN_CSV = "data/live/bmkg-prakiraan-kab.csv";
const PRAKIRAAN_META = "data/live/bmkg-prakiraan-kab-meta.json";

function assetUrl(path) {
  return new URL(path, document.baseURI).href;
}

async function loadCsv(path) {
  const response = await fetch(assetUrl(path), { cache: "no-store" });
  if (!response.ok) throw new Error(`${path} HTTP ${response.status}`);
  const text = await response.text();
  const check = looksLikeCsv(text);
  if (!check.ok) throw new Error(`${path}: ${check.reason}`);
  return parseCsv(text);
}

async function loadJson(path) {
  const response = await fetch(assetUrl(path), { cache: "no-store" });
  if (!response.ok) throw new Error(`${path} HTTP ${response.status}`);
  return response.json();
}

class FloodBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError() {
    return { error: true };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="wrap main">
          <p className="banner warn" role="alert">
            Modul Banjir tidak dapat ditampilkan. Karhutla tidak terpengaruh.
          </p>
        </main>
      );
    }
    return this.props.children;
  }
}

function wilayahDari(banjir, alerts, bigNames, province) {
  const map = new Map();
  const simpan = (kode, nama, provinsiNama) => {
    const key = kodeWilayah(kode);
    if (!key) return;
    if (province && provinsiNama !== province) return;
    const current = map.get(key);
    map.set(key, {
      kode: key,
      nama: current?.nama || nama,
      provinsi: current?.provinsi || provinsiNama,
    });
  };
  for (const row of banjir ?? []) simpan(row.kode_wilayah, row.nama_big || row.kabupaten_irbi, row.provinsi);
  for (const alert of alerts ?? []) simpan(alert.kode, alert.kabupaten, alert.provinsi);
  for (const item of bigNames ?? []) simpan(item.kode, item.nama, item.provinsi);
  return [...map.values()];
}

function catWarna(rows, indeks, konteks) {
  const kab = new Map();
  for (const row of rows ?? []) {
    const cat = row.peta?.kind ? row.peta : catWilayah(row, konteks);
    kab.set(row.kode, {
      ...cat,
      pendudukBaris: cat.status ? barisTooltip(indeks?.get(row.kode)) : [],
    });
  }
  return kab;
}

function FloodBody() {
  const [banjir, setBanjir] = useState([]);
  const [dibi, setDibi] = useState([]);
  const [dibiLoaded, setDibiLoaded] = useState(false);
  const [cap, setCap] = useState({ status: "memuat", alerts: [], meta: {} });
  const [dasarian, setDasarian] = useState({ status: "memuat", rows: [] });
  const [prakiraan, setPrakiraan] = useState({ status: "memuat", rows: [], fetchedAt: "", observedAt: "" });
  const [error, setError] = useState("");
  const [province, setProvince] = useState("");
  const [bigNames, setBigNames] = useState([]);
  const [dasarianDate, setDasarianDate] = useState(() => todayWib());
  const [penduduk, setPenduduk] = useState({ status: "memuat", indeks: new Map(), jumlah: 0 });
  const [tab, setTab] = useState("cap");
  const pilihProvinsi = useCallback((nama) => setProvince(nama || ""), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const banjirRows = await loadCsv(BANJIR_CSV);
        if (!cancelled) setBanjir(banjirRows);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || "Tabel IRBI tidak dapat dimuat.");
      }
      try {
        const dibiRows = await loadCsv(BNPB_FILE);
        if (cancelled) return;
        setDibi(bnpbAsDibi(dibiRows));
        setDibiLoaded(true);
      } catch {
        if (!cancelled) setDibiLoaded(false);
      }
      try {
        const meta = await loadJson(CAP_META);
        if (cancelled) return;
        if (meta?.status !== "ok") setCap({ status: "gagal", alerts: [], meta: meta ?? {} });
        else {
          const alerts = await loadCsv(CAP_CSV);
          if (!cancelled) setCap({ status: "ok", alerts, meta });
        }
      } catch {
        if (!cancelled) setCap({ status: "gagal", alerts: [], meta: {} });
      }
      try {
        const pendudukRows = await loadCsv(PENDUDUK_FILE);
        if (!cancelled) setPenduduk({ status: "ok", indeks: bacaPenduduk(pendudukRows), jumlah: pendudukRows.length });
      } catch {
        if (!cancelled) setPenduduk({ status: "kosong", indeks: new Map(), jumlah: 0 });
      }
      try {
        const manual = await loadCsv(DASARIAN_FILE);
        if (!cancelled) setDasarian({ status: "ok", rows: manual });
      } catch {
        if (!cancelled) setDasarian({ status: "gagal", rows: [] });
      }
      try {
        const [rows, meta] = await Promise.all([
          loadCsv(PRAKIRAAN_CSV),
          loadJson(PRAKIRAAN_META).catch(() => ({})),
        ]);
        if (!cancelled) {
          setPrakiraan({
            status: rows.length ? "ok" : "gagal",
            rows,
            fetchedAt: meta.fetched_at || "",
            observedAt: meta.observed_at || "",
          });
        }
      } catch {
        if (!cancelled) setPrakiraan({ status: "gagal", rows: [], fetchedAt: "", observedAt: "" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!province) {
      setBigNames([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const where = `wadmpr='${province.replaceAll("'", "''")}'`;
        const response = await fetch(bigQueryUrl(2, where, { geometry: false, recordCount: 500 }), {
          signal: AbortSignal.timeout(20000),
        });
        if (!response.ok) throw new Error("BIG");
        const payload = await response.json();
        const names = (payload.features ?? []).map((feature) => ({
          kode: feature?.properties?.kdpkab,
          nama: feature?.properties?.wadmkk,
          provinsi: feature?.properties?.wadmpr || province,
        }));
        if (!cancelled) setBigNames(names);
      } catch {
        if (!cancelled) setBigNames([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [province]);

  const periode = useMemo(() => periodeTigaHari(), []);
  const ringkas = ringkasanNowcast(cap.alerts, { ...cap.meta, status: cap.status });
  const konteks = useMemo(
    () => ({
      tab,
      cakupan: cap.status === "ok" ? cap.meta?.cakupan || "" : "",
      tertunda: Boolean(ringkas.tertunda),
    }),
    [tab, cap.status, cap.meta, ringkas.tertunda],
  );
  const indeksCuaca = useMemo(
    () => indeksPrakiraan(prakiraan.status === "ok" ? prakiraan.rows : []),
    [prakiraan],
  );
  const dasarianNow = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dasarianDate)) return new Date();
    return new Date(`${dasarianDate}T05:00:00.000Z`);
  }, [dasarianDate]);
  const urut = useMemo(() => {
    const wilayah = wilayahDari(banjir, cap.alerts, province ? bigNames : [], province);
    const rows = buildFloodRows({ banjir, multi: [], dibi, dibiLoaded, wilayah });
    const withNowcast = applyAnalisis(applyNowcast(rows, cap.alerts, { ...cap.meta, status: cap.status }));
    const withHari = tab === "cap" ? withNowcast : terapkanHari(withNowcast, indeksCuaca, periode.hari[tab]);
    const withDasarian = applyDasarian(withHari, dasarian.rows, { status: dasarian.status, now: dasarianNow });
    const bertanda = withDasarian.map((row) => {
      const peta = catWilayah(row, konteks);
      return { ...row, peta, statusTab: peta.status || null };
    });
    return lampirkanPenduduk(bertanda, penduduk.indeks, penduduk.status).sort((left, right) =>
      left.kode.localeCompare(right.kode, "id"),
    );
  }, [province, banjir, cap, bigNames, dibi, dibiLoaded, dasarian, dasarianNow, penduduk, tab, konteks, indeksCuaca, periode.hari]);
  const ringkasPenduduk = useMemo(
    () => ringkasPendudukBerstatus(urut, penduduk.indeks),
    [urut, penduduk.indeks],
  );
  const kalimatPenduduk = kalimatJumlahPenduduk(ringkasPenduduk, {
    memuat: (tab === "cap" && cap.status === "memuat") || penduduk.status === "memuat" || prakiraan.status === "memuat",
  });
  const nomor = useMemo(() => {
    const map = new Map();
    urut.forEach((row, index) => map.set(row.kode, index + 1));
    return map;
  }, [urut]);
  const kabPaint = useMemo(() => catWarna(urut, penduduk.indeks, konteks), [urut, penduduk.indeks, konteks]);
  const bolehKosong = tab === "cap" && cap.status === "ok" && cap.meta?.cakupan === "nasional" && !ringkas.tertunda;
  const catatanPeta = useMemo(() => {
    const alasan = new Set(urut.filter((row) => row.peta?.kind === "nodata").map((row) => row.peta.alasan));
    return [...alasan].map((key) => CATATAN_ALASAN[key]).filter(Boolean);
  }, [urut]);
  const titik = useMemo(() => {
    const semua = prakiraan.status === "ok" ? ringkasPrakiraan(prakiraan.rows, periode) : [];
    if (!province) return semua;
    const kodeProv = new Set(urut.map((row) => row.kode));
    return semua.filter((item) => item.provinsi === province || kodeProv.has(item.kodeKab));
  }, [prakiraan, periode, province, urut]);
  const hariTab = tab === "cap" ? null : periode.hari[tab];
  const namaHari = tab === "cap" ? "" : ["Hari ini", "Besok", "Lusa"][tab];
  const sumberPrakiraan = titik.find((item) => item.analysisUtc)?.analysisUtc || prakiraan.observedAt;

  return (
    <main className="wrap main">
      <header className="page-head">
        <div>
          <h1>Banjir · Indonesia</h1>
          <p className="lead">
            Peringatan cuaca jangka pendek BMKG, kejadian banjir 2024, dan kelas risiko IRBI 2025 per kabupaten/kota.
          </p>
        </div>
      </header>
      <p className="banner warn" role="status">
        <strong>{FLOOD_PERMISSION}</strong>
        <span> {IRBI_PERMISSION}</span>
      </p>
      <p className="banner warn" role="note">
        <strong>Penggunaan internal.</strong>
        <span> {IRBI_PENGGUNAAN_INTERNAL.replace(/^Penggunaan internal\.\s*/, "")}</span>
      </p>
      <p className="flood-summary" role="status">
        {ringkas.status === "memuat"
          ? "Memuat peringatan BMKG…"
          : ringkas.status !== "ok"
            ? `Peringatan BMKG tidak dapat diambil pada pembaruan terakhir${ringkas.fetchedAt ? ` (${formatWib(ringkas.fetchedAt)})` : ""}. Peta tidak menampilkan status.`
            : `Pembaruan data ${ringkas.fetchedAt ? formatWib(ringkas.fetchedAt) : "—"} · ${ringkas.provinsi} provinsi dengan peringatan aktif · ${ringkas.kabupaten} kab/kota terdampak${ringkas.berlakuSampai ? ` · berlaku sampai paling lambat ${formatWib(ringkas.berlakuSampai)}` : ""}${ringkas.tertunda ? ` · Data tertunda (${formatUsia(Date.now() - new Date(ringkas.fetchedAt).getTime())})` : ""}`}
        {" "}
        {kalimatPenduduk}
      </p>
      {penduduk.status !== "memuat" && penduduk.jumlah === 0 ? (
        <p className="banner">
          {PENDUDUK_ABSENT}{" "}
          <a href={BPS_PROYEKSI_URL} target="_blank" rel="noopener noreferrer">
            Publikasi proyeksi penduduk kabupaten/kota BPS
          </a>
        </p>
      ) : null}
      {ringkas.status === "ok" && ringkas.kosong ? (
        <p className="banner">Tidak ada peringatan cuaca aktif dari BMKG saat diambil ({ringkas.fetchedAt ? formatWib(ringkas.fetchedAt) : "—"}). Ini bukan berarti aman dari banjir.</p>
      ) : null}
      {ringkas.kedaluwarsa ? (
        <p className="banner">Peringatan sudah lewat masa berlaku; menunggu pembaruan berikutnya (jadwal tiap 30 menit).</p>
      ) : null}
      {cap.status === "ok" && cap.meta?.cakupan !== "nasional" ? (
        <p className="fine">Cuplikan CAP yang tersimpan belum bertanda cakupan nasional. Provinsi di luar cuplikan lama bisa tidak muncul sampai pembaruan berikutnya.</p>
      ) : null}

      <section className="card">
        <header className="card-head">
          <div>
            <h2>Peringatan cuaca jangka pendek</h2>
            <p>{NOWCAST_BUKAN_TIGA_HARI}</p>
          </div>
        </header>
        <div className="logic-body">
          <div className="time-toggle" role="tablist" aria-label="Jangka waktu peta">
            <button type="button" role="tab" aria-selected={tab === "cap"} onClick={() => setTab("cap")}>
              0–3 jam
              <small>Nowcast CAP</small>
            </button>
            {periode.hari.map((iso, index) => (
              <button key={iso} type="button" role="tab" aria-selected={tab === index} onClick={() => setTab(index)}>
                {["Hari ini", "Besok", "Lusa"][index]}
                <small>
                  {formatTanggalPendek(iso)} {iso.slice(0, 4)}
                </small>
              </button>
            ))}
          </div>
          <p className="fine">
            {tab === "cap" ? (
              <>
                Sumber: BMKG. Nowcast CAP, berlaku sekitar 0–3 jam. Bukan status 3 hari. Diambil{" "}
                {cap.meta.fetched_at ? formatWib(cap.meta.fetched_at) : "—"}. Berlaku sampai{" "}
                {ringkas.berlakuSampai ? formatWib(ringkas.berlakuSampai) : "—"}.
              </>
            ) : (
              <>
                Sumber: BMKG. Prakiraan cuaca 3 hari untuk {namaHari}, {formatTanggalPendek(hariTab)} {hariTab.slice(0, 4)}.
                Satu titik sampel per kab/kota. {PEMETAAN_CUACA} Hasilnya dipasangkan dengan kelas IRBI pada matriks{" "}
                {ANALISIS_NAMA}. Bukan nowcast 0–3 jam dan bukan status resmi. Diambil{" "}
                {prakiraan.fetchedAt ? formatWib(prakiraan.fetchedAt) : "—"}. Dikeluarkan{" "}
                {sumberPrakiraan ? formatWib(sumberPrakiraan) : "—"}.
              </>
            )}
          </p>
          <div className="flood-toolbar">
            <label className="filter-field">
              Provinsi
              <select value={province} onChange={(event) => pilihProvinsi(event.target.value)} aria-label="Provinsi">
                <option value="">{SEMUA_PROVINSI}</option>
                {PROVINSI.map((item) => (
                  <option key={item.kode} value={item.nama}>
                    {item.nama}
                  </option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              DAS
              <select aria-label="DAS" disabled value="Dalam pengembangan" onChange={() => {}}>
                <option value="Dalam pengembangan">Dalam pengembangan</option>
              </select>
            </label>
            {province ? (
              <p className="breadcrumb">
                <button type="button" onClick={() => pilihProvinsi("")}>
                  Indonesia
                </button>
                <span> › {province}</span>
              </p>
            ) : null}
          </div>
          <div className="flood-layout">
            <FloodRiskMap
              province={province}
              onProvince={pilihProvinsi}
              kabPaint={kabPaint}
              nomor={province ? nomor : new Map()}
              tab={tab}
              bolehKosong={bolehKosong}
              catatan={catatanPeta}
            />
            <div>
              <h3>{province || SEMUA_PROVINSI}</h3>
              <p className="fine">
                {urut.length} kab/kota.
                {province
                  ? " Nomor pada peta sama dengan nomor tabel."
                  : " Nomor peta dimatikan pada Semua provinsi agar tidak bertumpuk."}{" "}
                Tingkat kabupaten/kota. Kecamatan dan kelurahan tidak ditampilkan.
              </p>
              <FloodKabDaftar rows={urut} />
              {!province ? (
                <p className="fine">
                  {BMKG_ATTRIBUTION}. RSS {cap.meta.rss_published ? formatWib(cap.meta.rss_published) : "—"}. Diambil{" "}
                  {cap.meta.fetched_at ? formatWib(cap.meta.fetched_at) : "—"}. Cakupan CAP: {cap.meta.cakupan || "cuplikan tersimpan"}.{" "}
                  <a href={BMKG_CAP_DOCS} target="_blank" rel="noopener noreferrer">
                    Data peringatan dini cuaca
                  </a>
                  .
                </p>
              ) : null}
            </div>
          </div>
          {urut.length ? (
            <>
              <p>
                {urut.length} kab/kota · {urut.filter((row) => row.peta?.kind === "status").length} dengan status analisis pada tab ini.
              </p>
              {!dibiLoaded ? (
                <p className="banner">
                  {BNPB_ABSENT}{" "}
                  <a href={BNPB_RESOURCE_URL} target="_blank" rel="noopener noreferrer">
                    Tabel BNPB 2024
                  </a>
                </p>
              ) : null}
              {error ? <p className="banner warn">{error}</p> : null}
              {province ? (
                <>
                  <div className="flood-toolbar">
                    <label className="filter-field">
                      Tanggal acuan dasarian
                      <input
                        type="date"
                        value={dasarianDate}
                        onChange={(event) => setDasarianDate(event.target.value)}
                      />
                    </label>
                    <a href={IKLIM_BMKG_URL} target="_blank" rel="noopener noreferrer">
                      iklim.bmkg.go.id
                    </a>
                  </div>
                  <p className="fine">{DASARIAN_NOTE}</p>
                  <FloodInfoTable rows={urut} />
                </>
              ) : (
                <p className="fine">
                  Pilih provinsi untuk membuka tabel rinci, isian dasarian, dan tautan KRB. Peta serta tabel samping sudah memuat kab/kota.
                </p>
              )}
            </>
          ) : (
            <p>Daftar kabupaten/kota belum dapat dimuat. Angka tidak diisi.</p>
          )}
          <p>
            <a href="#/sumber-metode/petunjuk-banjir">Petunjuk perhitungan banjir</a>
          </p>
        </div>
      </section>

      <section className="card">
        <header className="card-head">
          <div>
            <h2>Prakiraan cuaca 3 hari</h2>
            <p>Terpisah dari nowcast CAP. Bukan status banjir 3 hari.</p>
          </div>
        </header>
        <div className="logic-body">
          <p className="period-label">{periode.label}</p>
          <p>
            {BMKG_ATTRIBUTION}. Horizon resmi 3 hari. Satu titik sampel per kab/kota, bukan rata-rata kabupaten dan bukan
            rincian kecamatan. Kolom mengikuti <code>local_datetime</code> pada respons, yaitu waktu setempat titik itu. Label
            periode dihitung dari hari ini zona WIB.
          </p>
          <p className="fine">
            Diambil {prakiraan.fetchedAt ? formatWib(prakiraan.fetchedAt) : "—"}. Dikeluarkan{" "}
            {prakiraan.observedAt ? formatWib(prakiraan.observedAt) : titik.find((item) => item.analysisUtc)?.analysisUtc ? formatWib(titik.find((item) => item.analysisUtc).analysisUtc) : "—"}.{" "}
            <a href={BMKG_DOCS_URL} target="_blank" rel="noopener noreferrer">
              Dokumentasi prakiraan cuaca
            </a>
            .
          </p>
          <p className="fine">
            Nama kelurahan, kode yang gagal, dan batas pengambilan ada di{" "}
            <a href="#/sumber-metode/petunjuk-banjir">Petunjuk perhitungan banjir</a>. Halaman ini tidak menampilkan kecamatan atau kelurahan.
          </p>
          {prakiraan.status === "gagal" ? <p className="banner warn">Prakiraan 3 hari tidak dapat dimuat.</p> : null}
          {prakiraan.status === "ok" ? <PrakiraanTigaHari titik={titik} hari={periode.hari} periodeLabel={periode.label} /> : null}
        </div>
      </section>

      <section className="card">
        <header className="card-head">
          <div>
            <h2>Cara membaca</h2>
            <p>{ANALISIS_NAMA}</p>
          </div>
        </header>
        <div className="logic-body">
          <p>{ANALISIS_BUKAN_RESMI} Rumus dan rujukan ada di halaman Sumber dan Metode.</p>
          <p>{DASARIAN_NOTE}</p>
          <p>
            Kolom dasarian diisi manual. Tanggal acuan hanya menentukan apakah isian itu masih di dalam masa berlaku. Cara
            mengisinya ada di{" "}
            <a href={DASARIAN_GUIDE_URL} target="_blank" rel="noopener noreferrer">
              panduan isi dasarian
            </a>
            .
          </p>
          <p className="nowcast-links">
            <a href={IKLIM_BMKG_URL} target="_blank" rel="noopener noreferrer">
              Iklim BMKG
            </a>
            {DASARIAN_LINKS.map((link) => (
              <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">
                {link.nama}
              </a>
            ))}
          </p>
        </div>
      </section>

      <section className="card">
        <h2>Sumber dan batasan data</h2>
        <div className="logic-body">
          <p>
            Sumber: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika), Data Peringatan Dini Cuaca terbuka —{" "}
            <a href={BMKG_CAP_DOCS} target="_blank" rel="noopener noreferrer">
              {BMKG_CAP_DOCS}
            </a>
            .
          </p>
          <p>
            Prakiraan cuaca 3 hari: {BMKG_ATTRIBUTION},{" "}
            <a href={BMKG_DOCS_URL} target="_blank" rel="noopener noreferrer">
              {BMKG_DOCS_URL}
            </a>
            . Bukan nowcast dan bukan peringatan banjir.
          </p>
          <p>
            Kejadian banjir 2024: BNPB, Portal Satu Data Bencana Indonesia, lisensi Open Data Commons Attribution —{" "}
            <a href={BNPB_RESOURCE_URL} target="_blank" rel="noopener noreferrer">
              {BNPB_RESOURCE_URL}
            </a>
            .
          </p>
          <p>{IRBI_PERMISSION} Tanpa kelas, tulisannya {IRBI_TIDAK_TERSEDIA} dan sel tidak diwarnai.</p>
          <p>Batas wilayah: Badan Informasi Geospasial.</p>
          <p>
            Penduduk dan rumah tangga: BPS, salinan statis di {PENDUDUK_FILE}, proyeksi 2026. Rumah tangga hanya DKI Jakarta, Banten, dan Jawa Timur.{" "}
            <a href={BPS_PROYEKSI_URL} target="_blank" rel="noopener noreferrer">
              Publikasi proyeksi penduduk kabupaten/kota
            </a>
            . Angka yang tampil pada kab/kota berstatus adalah total kab/kota, bukan jumlah terpapar.
          </p>
          <p>Pantau Bencana v0.1 — proyek data terbuka komunitas, bukan produk BNPB, BMKG, PVMBG, atau KLH.</p>
        </div>
      </section>
    </main>
  );
}

export function FloodPage() {
  return (
    <FloodBoundary>
      <FloodBody />
    </FloodBoundary>
  );
}
