import { Component, useCallback, useEffect, useMemo, useState } from "react";
import { FloodInfoTable, PrakiraanTigaHari } from "./FloodInfoTable.jsx";
import { FloodRiskMap } from "./FloodRiskMap.jsx";
import { ANALISIS_BUKAN_RESMI, ANALISIS_NAMA, ANALISIS_WARNA, analisisTertinggi, applyAnalisis } from "../lib/analisisPantauBencana.js";
import { BNPB_ABSENT, BNPB_FILE, BNPB_RESOURCE_URL, bnpbAsDibi } from "../lib/bnpbBanjir.js";
import { parseCsv } from "../lib/csv.js";
import {
  BMKG_ATTRIBUTION,
  BMKG_CAP_DOCS,
  BMKG_CAP_RSS,
  DASARIAN_LINKS,
  DASARIAN_NOTE,
  NOWCAST_BUKAN_TIGA_HARI,
  applyNowcast,
  provinsiDenganPeringatan,
  ringkasanNowcast,
  severityLabel,
} from "../lib/capKab.js";
import { DASARIAN_FILE, DASARIAN_GUIDE_URL, IKLIM_BMKG_URL, applyDasarian, todayWib } from "../lib/dasarianManual.js";
import { formatUsia, formatWib } from "../lib/format.js";
import { bigQueryUrl } from "../lib/floodServices.js";
import { BMKG_DOCS_URL } from "../lib/bmkgForecast.js";
import { FLOOD_PERMISSION, IRBI_PERMISSION, buildFloodRows, kodeWilayah } from "../lib/floodMatrix.js";
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
import { PRAKIRAAN_BATAS, periodeTigaHari, ringkasPrakiraan } from "../lib/prakiraanHujan.js";
import { PROVINSI, SEMUA_PROVINSI } from "../lib/provinsi.js";

const BANJIR_CSV = "data/static/irbi-2025-banjir-aceh-bengkulu.csv";
const CAP_CSV = "data/live/bmkg-cap-kab.csv";
const CAP_META = "data/live/bmkg-cap-kab-meta.json";
const PRAKIRAAN_CSV = "data/live/bmkg_prakiraan.csv";
const MANIFEST = "data/live/manifest.json";

function assetUrl(path) {
  return new URL(path, document.baseURI).href;
}

async function loadCsv(path) {
  const response = await fetch(assetUrl(path), { cache: "no-store" });
  if (!response.ok) throw new Error(`${path} HTTP ${response.status}`);
  return parseCsv(await response.text());
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

function catWarna(rows, indeks) {
  const kab = new Map();
  const grouped = new Map();
  for (const row of rows ?? []) {
    const status = row.analisisStatus;
    const fill = status ? ANALISIS_WARNA[status] : row.nowcastAda ? "#c4b49a" : "";
    kab.set(row.kode, {
      fill,
      hatch: Boolean(row.nowcastAda),
      status: status || "",
      pendudukBaris: status ? barisTooltip(indeks?.get(row.kode)) : [],
    });
    if (!row.provinsi) continue;
    const list = grouped.get(row.provinsi) ?? [];
    list.push(row);
    grouped.set(row.provinsi, list);
  }
  const prov = new Map();
  for (const [nama, list] of grouped) {
    const status = analisisTertinggi(list.map((row) => row.analisisStatus));
    const ada = list.some((row) => row.nowcastAda);
    prov.set(nama, { fill: status ? ANALISIS_WARNA[status] : ada ? "#c4b49a" : "", status: status || "" });
  }
  return { kab, prov };
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
        const [rows, manifest] = await Promise.all([
          loadCsv(PRAKIRAAN_CSV),
          loadJson(MANIFEST).catch(() => null),
        ]);
        const feed = manifest?.datasets?.bmkg_prakiraan ?? {};
        if (!cancelled) {
          setPrakiraan({
            status: "ok",
            rows,
            fetchedAt: feed.fetched_at || "",
            observedAt: feed.observed_at || feed.source_updated_at || "",
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

  const periode = periodeTigaHari();
  const ringkas = ringkasanNowcast(cap.alerts, { ...cap.meta, status: cap.status });
  const daftarProv = provinsiDenganPeringatan(cap.alerts);
  const nasional = useMemo(() => {
    const wilayah = wilayahDari(banjir, cap.alerts, [], "");
    const rows = buildFloodRows({ banjir, multi: [], dibi, dibiLoaded, wilayah });
    return applyAnalisis(applyNowcast(rows, cap.alerts, { ...cap.meta, status: cap.status }));
  }, [banjir, cap, dibi, dibiLoaded]);
  const cat = useMemo(() => catWarna(nasional, penduduk.indeks), [nasional, penduduk.indeks]);
  const ringkasPenduduk = useMemo(
    () => ringkasPendudukBerstatus(nasional, penduduk.indeks),
    [nasional, penduduk.indeks],
  );
  const kalimatPenduduk = kalimatJumlahPenduduk(ringkasPenduduk, {
    memuat: cap.status === "memuat" || penduduk.status === "memuat",
  });
  const dasarianNow = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dasarianDate)) return new Date();
    return new Date(`${dasarianDate}T05:00:00.000Z`);
  }, [dasarianDate]);
  const shown = useMemo(() => {
    if (!province) return [];
    const wilayah = wilayahDari(banjir, cap.alerts, bigNames, province);
    const rows = buildFloodRows({ banjir, multi: [], dibi, dibiLoaded, wilayah });
    const withNowcast = applyAnalisis(applyNowcast(rows, cap.alerts, { ...cap.meta, status: cap.status }));
    const withDasarian = applyDasarian(withNowcast, dasarian.rows, { status: dasarian.status, now: dasarianNow });
    return lampirkanPenduduk(withDasarian, penduduk.indeks, penduduk.status);
  }, [province, banjir, cap, bigNames, dibi, dibiLoaded, dasarian, dasarianNow, penduduk]);
  const titik = useMemo(() => {
    const semua = prakiraan.status === "ok" ? ringkasPrakiraan(prakiraan.rows, periode) : [];
    return province ? semua.filter((item) => item.provinsi === province) : semua;
  }, [prakiraan, periode, province]);
  const kabProvinsi = shown.length;

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
            <FloodRiskMap province={province} onProvince={pilihProvinsi} kabPaint={cat.kab} provPaint={cat.prov} />
            <div>
              <h3>Provinsi dengan peringatan aktif</h3>
              {daftarProv.length ? (
                <ul className="plain-list">
                  {daftarProv.map((item) => (
                    <li key={item.nama}>
                      <button type="button" onClick={() => pilihProvinsi(item.nama)}>
                        {item.nama}
                      </button>
                      <small>
                        {item.jumlahKab} kab/kota · {item.events.join(", ") || "—"} · {severityLabel(item.severity)} · berlaku sampai{" "}
                        {formatWib(item.expires)}
                      </small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Tidak ada provinsi dengan peringatan yang masih berlaku.</p>
              )}
              <p className="fine">
                {BMKG_ATTRIBUTION}. RSS {cap.meta.rss_published ? formatWib(cap.meta.rss_published) : "—"}. Diambil{" "}
                {cap.meta.fetched_at ? formatWib(cap.meta.fetched_at) : "—"}. Cakupan: {cap.meta.cakupan || "cuplikan tersimpan"}.{" "}
                <a href={BMKG_CAP_DOCS} target="_blank" rel="noopener noreferrer">
                  Data peringatan dini cuaca
                </a>
                .{" "}
                <a href={BMKG_CAP_RSS} target="_blank" rel="noopener noreferrer">
                  RSS nowcast
                </a>
                .
              </p>
            </div>
          </div>
          {province ? (
            <>
              <p>
                {kabProvinsi} kab/kota · {shown.filter((row) => row.nowcastAda).length} dengan peringatan aktif.
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
              {!shown.length ? (
                <p>Daftar kabupaten/kota untuk provinsi ini belum dapat dimuat. Angka tidak diisi.</p>
              ) : (
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
                  <FloodInfoTable rows={shown} />
                </>
              )}
            </>
          ) : (
            <p className="fine">Pilih provinsi pada peta atau pada daftar untuk membuka kabupaten/kota.</p>
          )}
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
            {BMKG_ATTRIBUTION}. Horizon resmi 3 hari pada API prakiraan cuaca, satu kelurahan (adm4) per titik, bukan rata-rata
            kabupaten. Kolom mengikuti <code>local_datetime</code> pada respons, yaitu waktu setempat titik itu. Label periode
            dihitung dari hari ini zona WIB.
          </p>
          <p className="fine">
            Diambil {prakiraan.fetchedAt ? formatWib(prakiraan.fetchedAt) : "—"}. Dikeluarkan{" "}
            {prakiraan.observedAt ? formatWib(prakiraan.observedAt) : titik.find((item) => item.analysisUtc)?.analysisUtc ? formatWib(titik.find((item) => item.analysisUtc).analysisUtc) : "—"}.{" "}
            <a href={BMKG_DOCS_URL} target="_blank" rel="noopener noreferrer">
              Dokumentasi prakiraan cuaca
            </a>
            .
          </p>
          <p className="fine">{PRAKIRAAN_BATAS}</p>
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
          <p>{IRBI_PERMISSION} Provinsi yang tidak ada di tabel buku yang tersimpan tidak diisi angka.</p>
          <p>Batas wilayah: Badan Informasi Geospasial.</p>
          <p>
            Penduduk dan rumah tangga: BPS, unduhan manual ke {PENDUDUK_FILE}. Status saat berkas kosong: Tautan saja.{" "}
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
