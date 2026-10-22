import { Component, useCallback, useEffect, useMemo, useState } from "react";
import { FloodInfoTable, FloodKabDaftar, PrakiraanTigaHari, rincianKab } from "./FloodInfoTable.jsx";
import { KeteranganMobile } from "./KeteranganMobile.jsx";
import { IrbiBanjirLongsor } from "./IrbiBanjirLongsor.jsx";
import { FloodRiskMap } from "./FloodRiskMap.jsx";
import { ANALISIS_BUKAN_RESMI, ANALISIS_NAMA, CATATAN_ALASAN, applyAnalisis, catWilayah } from "../lib/analisisPantauBencana.js";
import { DISCLAIMER_UNDUH, barisXlsx, csvUnduh } from "../lib/banjirExport.js";
import { xlsxBytes } from "../lib/xlsxMini.js";
import { BNPB_ABSENT, BNPB_FILE, BNPB_RESOURCE_URL, HISTORIS_BANJIR_CATATAN, HISTORIS_DISCLAIMER, bnpbAsDibi } from "../lib/bnpbBanjir.js";
import { looksLikeCsv, parseCsv } from "../lib/csv.js";
import {
  BMKG_ATTRIBUTION,
  BMKG_CAP_DOCS,
  DASARIAN_LINKS,
  DASARIAN_NOTE,
  CAP_DATA_TERAKHIR,
  NOWCAST_BUKAN_TIGA_HARI,
  PEMBARUAN_TERAKHIR_LABEL,
  applyNowcast,
  cakupanTersimpan,
  ringkasanNowcast,
} from "../lib/capKab.js";
import { DASARIAN_FILE, DASARIAN_GUIDE_URL, IKLIM_BMKG_URL, applyDasarian, todayWib } from "../lib/dasarianManual.js";
import { formatTanggalPendek, formatUsia, formatWib } from "../lib/format.js";
import { bigQueryUrl } from "../lib/floodServices.js";
import { BMKG_DOCS_URL, labelAnalisisBmkg } from "../lib/bmkgForecast.js";
import { DIBI_UNAVAILABLE, FLOOD_PERMISSION, IRBI_PENGGUNAAN_INTERNAL, IRBI_PERMISSION, IRBI_TIDAK_TERSEDIA, buildFloodRows, kodeWilayah, urutStatusKab } from "../lib/floodMatrix.js";
import {
  BPS_PROYEKSI_URL,
  PENDUDUK_ABSENT,
  PENDUDUK_FILE,
  POTENSI_LABEL,
  bacaPenduduk,
  barisTooltip,
  kalimatJumlahPenduduk,
  lampirkanPenduduk,
  ringkasPendudukBerstatus,
} from "../lib/pendudukKab.js";
import {
  HUJAN_GPM_CATATAN,
  HUJAN_PEMBANDING_FILE,
  HUJAN_PEMBANDING_JENIS,
  HUJAN_PEMBANDING_LISENSI,
  HUJAN_PEMBANDING_META,
  HUJAN_PEMBANDING_MODEL,
  HUJAN_TANPA_NOWCAST,
  indeksHujan,
  mmPada,
  teksMm,
} from "../lib/hujanPembanding.js";
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

function kalimatCap(ringkas) {
  const waktu = ringkas.fetchedAt ? formatWib(ringkas.fetchedAt) : "—";
  const kepala = `${PEMBARUAN_TERAKHIR_LABEL}: ${waktu}`;
  if (ringkas.status === "memuat") return "Memuat peringatan BMKG…";
  if (ringkas.status !== "ok") return `${kepala}. Peringatan BMKG tidak dapat diambil dan tidak ada cuplikan tersimpan.`;
  if (ringkas.kedaluwarsa) {
    return `${kepala}. ${CAP_DATA_TERAKHIR}. ${ringkas.kabupaten} kab/kota pada cuplikan terakhir${ringkas.berlakuSampai ? `, masa berlaku sampai ${formatWib(ringkas.berlakuSampai)}` : ""}.`;
  }
  if (ringkas.kosong) return `${kepala}. Tidak ada peringatan cuaca pada cuplikan ini. Ini bukan berarti aman dari banjir.`;
  const tunda = ringkas.tertunda ? ` Data tertunda (${formatUsia(Date.now() - new Date(ringkas.fetchedAt).getTime())}).` : "";
  return `${kepala}. ${ringkas.provinsi} provinsi dengan peringatan yang masih berlaku. ${ringkas.kabupaten} kab/kota. Masa berlaku sampai ${ringkas.berlakuSampai ? formatWib(ringkas.berlakuSampai) : "—"}.${tunda}`;
}

function simpanBerkas(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
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
      rincian: rincianKab(row),
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
  const [showHujan, setShowHujan] = useState(false);
  const [hujan, setHujan] = useState({ status: "memuat", rows: [], meta: {} });
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
        const meta = await loadJson(CAP_META).catch(() => null);
        let alerts = [];
        try {
          alerts = await loadCsv(CAP_CSV);
        } catch {
          alerts = [];
        }
        if (cancelled) return;
        if (alerts.length || meta?.status === "ok") {
          setCap({
            status: "ok",
            alerts,
            meta: {
              ...(meta ?? {}),
              status: "ok",
              cakupan: cakupanTersimpan(meta),
            },
          });
        } else {
          setCap({ status: "gagal", alerts: [], meta: meta ?? {} });
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
      try {
        const [rows, meta] = await Promise.all([
          loadCsv(HUJAN_PEMBANDING_FILE),
          loadJson(HUJAN_PEMBANDING_META).catch(() => ({})),
        ]);
        const modelCocok = !meta?.model || meta.model === HUJAN_PEMBANDING_MODEL;
        if (!cancelled) {
          setHujan({
            status: rows.length && meta?.status !== "gagal" && modelCocok ? "ok" : "gagal",
            rows: modelCocok && meta?.status !== "gagal" ? rows : [],
            meta: meta ?? {},
          });
        }
      } catch {
        if (!cancelled) setHujan({ status: "gagal", rows: [], meta: {} });
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
  const hujanIndeks = useMemo(() => indeksHujan(hujan.status === "ok" ? hujan.rows : []), [hujan]);
  const hujanWaktu = hujan.meta?.fetched_at ? formatWib(hujan.meta.fetched_at) : "—";
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
    const withHari = tab === "cap" ? withNowcast : terapkanHari(withNowcast, indeksCuaca, periode.hari[tab], periode.hari);
    const withDasarian = applyDasarian(withHari, dasarian.rows, { status: dasarian.status, now: dasarianNow });
    const bertanda = withDasarian.map((row) => {
      const peta = catWilayah(row, konteks);
      const tanggalTab = tab === "cap" ? "" : periode.hari[tab];
      const mm = tanggalTab ? mmPada(hujanIndeks.get(row.kode), tanggalTab) : undefined;
      const hujanFallback =
        tab !== "cap" && !row.prakiraanAda
          ? { teks: mm === undefined || mm == null ? "belum tersedia" : teksMm(mm), waktu: hujanWaktu }
          : null;
      return { ...row, peta, statusTab: peta.status || null, hujanFallback };
    });
    return urutStatusKab(lampirkanPenduduk(bertanda, penduduk.indeks, penduduk.status));
  }, [province, banjir, cap, bigNames, dibi, dibiLoaded, dasarian, dasarianNow, penduduk, tab, konteks, indeksCuaca, periode.hari, hujanIndeks, hujanWaktu]);
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
  const bolehKosong = tab === "cap" && cap.status === "ok" && cap.meta?.cakupan === "nasional";
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
  const jumlahBerstatus = urut.filter((row) => row.peta?.kind === "status").length;
  const hujanTanggal = tab === "cap" ? "" : periode.hari[tab];
  const hujanNilai = useMemo(() => {
    const map = new Map();
    for (const row of urut) {
      const mm = mmPada(hujanIndeks.get(row.kode), hujanTanggal);
      map.set(row.kode, mm === undefined || mm == null ? "belum tersedia" : teksMm(mm));
    }
    return map;
  }, [urut, hujanIndeks, hujanTanggal]);
  const hujanCatatan = tab === "cap"
    ? HUJAN_TANPA_NOWCAST
    : `Jumlah harian ${["Hari ini", "Besok", "Lusa"][tab]}. ${HUJAN_PEMBANDING_JENIS}. Bukan status analisis.`;
  const hujanLapisan = useMemo(
    () => ({
      aktif: tab !== "cap" && showHujan,
      indeks: hujanIndeks,
      tanggal: hujanTanggal,
      waktu: hujanWaktu,
      catatan: hujanCatatan,
      gpm: HUJAN_GPM_CATATAN,
      kodeTampil: province ? new Set(urut.map((row) => row.kode)) : null,
    }),
    [tab, showHujan, hujanIndeks, hujanTanggal, hujanWaktu, hujanCatatan, province, urut],
  );
  const hariTab = tab === "cap" ? null : periode.hari[tab];
  const namaHari = tab === "cap" ? "" : ["Hari ini", "Besok", "Lusa"][tab];
  const sumberPrakiraan = titik.find((item) => item.analysisUtc)?.analysisUtc || prakiraan.observedAt;
  const tanggalCuplikan = useMemo(() => {
    const tanggal = (prakiraan.rows ?? []).map((row) => String(row.tanggal ?? "").slice(0, 10)).filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item));
    return [...new Set(tanggal)].sort();
  }, [prakiraan.rows]);
  const analysesCuplikan = useMemo(
    () => [...new Set((prakiraan.rows ?? []).map((row) => String(row.analysis_utc ?? row.analysisUtc ?? "").trim()).filter(Boolean))],
    [prakiraan.rows],
  );
  const kalimatAnalisis = prakiraan.status === "ok"
    ? labelAnalisisBmkg({
        analysisUtc: sumberPrakiraan,
        fetchedAt: prakiraan.fetchedAt,
        tanggal: tanggalCuplikan,
        analyses: analysesCuplikan,
      })
    : "";
  const kepalaUnduh = [
    tab === "cap"
      ? `Periode: 0–3 jam. ${PEMBARUAN_TERAKHIR_LABEL}: ${cap.meta.fetched_at ? formatWib(cap.meta.fetched_at) : "—"}.`
      : `${periode.label}. Tab ${namaHari}${hariTab ? `, ${formatTanggalPendek(hariTab)} ${hariTab.slice(0, 4)}` : ""}.`,
    tab === "cap"
      ? `Sumber: BMKG. ${PEMBARUAN_TERAKHIR_LABEL}: ${cap.meta.fetched_at ? formatWib(cap.meta.fetched_at) : "—"}.${ringkas.berlakuSampai ? ` Masa berlaku sampai ${formatWib(ringkas.berlakuSampai)}.` : ""}${ringkas.kedaluwarsa ? ` ${CAP_DATA_TERAKHIR}.` : ""}`
      : `Sumber: BMKG. ${kalimatAnalisis}`,
    `Cakupan: ${province || SEMUA_PROVINSI}.`,
    `${DIBI_UNAVAILABLE}. Tanda — pada kolom Historis bukan nol kejadian. Klasifikasi DAS belum terintegrasi.`,
    DISCLAIMER_UNDUH,
  ];
  function unduhTabel(jenis) {
    const slug = `${tab === "cap" ? "0-3-jam" : ["hari-ini", "besok", "lusa"][tab]}-${(province || "indonesia").toLowerCase().replaceAll(" ", "-")}`;
    if (jenis === "xlsx") {
      simpanBerkas(
        `banjir-${slug}.xlsx`,
        new Blob([xlsxBytes(barisXlsx(kepalaUnduh, urut))], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      );
      return;
    }
    simpanBerkas(`banjir-${slug}.csv`, new Blob([csvUnduh(kepalaUnduh, urut)], { type: "text/csv;charset=utf-8" }));
  }

  return (
    <main className="wrap main">
      <header className="page-head">
        <div>
          <h1>Banjir · Indonesia</h1>
          <p className="lead peta-penjelas">
            Peringatan cuaca jangka pendek BMKG, kejadian banjir 2024, dan kelas risiko IRBI 2025 per kabupaten/kota.
          </p>
        </div>
      </header>
      <section className="card flood-map-first susun-peta">
        <div className="logic-body susun-filter">
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
              <select aria-label="DAS" disabled value="belum terintegrasi" onChange={() => {}}>
                <option value="belum terintegrasi">belum terintegrasi</option>
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
          <p className="fine peta-penjelas">Klasifikasi DAS belum terintegrasi. Daftar DAS tidak menyaring peta dan tidak menampilkan angka DAS.</p>
          <div className="flood-layout susun-kanvas">
            <FloodRiskMap
              province={province}
              onProvince={pilihProvinsi}
              kabPaint={kabPaint}
              nomor={province ? nomor : new Map()}
              tab={tab}
              bolehKosong={bolehKosong}
              catatan={catatanPeta}
              waktuLabel={
                tab === "cap"
                  ? cap.meta.fetched_at
                    ? formatWib(cap.meta.fetched_at)
                    : "—"
                  : prakiraan.fetchedAt
                    ? formatWib(prakiraan.fetchedAt)
                    : "—"
              }
              showHujan={tab !== "cap" && showHujan}
              onShowHujan={setShowHujan}
              hujan={hujanLapisan}
            />
            <div className="flood-bawah-peta">
              <div className="flood-unduh">
                <button type="button" className="button" onClick={() => unduhTabel("csv")}>
                  Unduh CSV
                </button>
                <button type="button" className="button" onClick={() => unduhTabel("xlsx")}>
                  Unduh XLSX
                </button>
              </div>
              <h3>{province || SEMUA_PROVINSI}</h3>
              <p className="fine">
                {urut.length} kab/kota
                {province ? "" : `, ${jumlahBerstatus} berstatus`}.
                {province
                  ? " Nomor pada peta sama dengan nomor tabel."
                  : " Seluruh baris ditampilkan, urut Awas, Siaga, Waspada, tanpa status, lalu tidak terklasifikasi atau tanpa data."}{" "}
                Tingkat kabupaten/kota. Kecamatan dan kelurahan tidak ditampilkan.
              </p>
              <FloodKabDaftar
                rows={urut}
                tampilProvinsi={!province}
                hujanNilai={tab !== "cap" && showHujan ? hujanNilai : null}
              />
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
          <p className="flood-summary" role="status">
            {kalimatCap(ringkas)} {kalimatPenduduk}
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
            <p className="banner warn" role="status">
              <strong>{CAP_DATA_TERAKHIR}</strong>
            </p>
          ) : null}
          {cap.status === "ok" && cap.meta?.cakupan !== "nasional" ? (
            <p className="fine">Cuplikan CAP yang tersimpan belum bertanda cakupan nasional. Provinsi di luar cuplikan lama bisa tidak muncul sampai pembaruan berikutnya.</p>
          ) : null}
          <h2>Peringatan cuaca jangka pendek</h2>
          <p>{NOWCAST_BUKAN_TIGA_HARI}</p>
          <p className="fine">
            {tab === "cap" ? (
              <>
                Sumber: BMKG. Nowcast CAP, berlaku sekitar 0–3 jam. Bukan status 3 hari. {PEMBARUAN_TERAKHIR_LABEL}:{" "}
                {cap.meta.fetched_at ? formatWib(cap.meta.fetched_at) : "—"}. Masa berlaku pada cuplikan
                {ringkas.berlakuSampai ? ` sampai ${formatWib(ringkas.berlakuSampai)}` : " tidak tercantum"}.
                {ringkas.kedaluwarsa ? ` ${CAP_DATA_TERAKHIR}.` : ""}
              </>
            ) : (
              <>
                Sumber: BMKG. Prakiraan cuaca 3 hari untuk {namaHari}, {formatTanggalPendek(hariTab)} {hariTab.slice(0, 4)}.
                Satu titik sampel per kab/kota. {PEMETAAN_CUACA} Hasilnya dipasangkan dengan kelas IRBI pada matriks{" "}
                {ANALISIS_NAMA}. Bukan nowcast 0–3 jam dan bukan status resmi. {kalimatAnalisis}
              </>
            )}
          </p>
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
                <div className="flood-ikut-provinsi">
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
                </div>
              ) : (
                <p className="fine">
                  Tabel Semua provinsi memuat seluruh {urut.length} kab/kota pada tab ini, urut Awas, Siaga, Waspada, tanpa
                  status, lalu tidak terklasifikasi atau tanpa data. Unduh CSV dan XLSX memuat urutan yang sama.
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

      <IrbiBanjirLongsor />

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
            {kalimatAnalisis}{" "}
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
          <p>{HISTORIS_BANJIR_CATATAN}</p>
          <p>{IRBI_PERMISSION} Tanpa kelas, tulisannya {IRBI_TIDAK_TERSEDIA} dan sel tidak diwarnai.</p>
          <p>Batas wilayah: Badan Informasi Geospasial.</p>
          <p>
            Penduduk dan rumah tangga: BPS, salinan statis di {PENDUDUK_FILE}, proyeksi 2026. Rumah tangga hanya DKI Jakarta, Banten, dan Jawa Timur.{" "}
            <a href={BPS_PROYEKSI_URL} target="_blank" rel="noopener noreferrer">
              Publikasi proyeksi penduduk kabupaten/kota
            </a>
            . Angka yang tampil pada kab/kota berstatus adalah {POTENSI_LABEL}.
          </p>
          <p>Pantau Bencana v0.1 — proyek data terbuka komunitas, bukan produk BNPB, BMKG, PVMBG, atau KLH.</p>
        </div>
      </section>
      <section className="card flood-disclaimer">
        <h2>Penyangkalan</h2>
        <div className="logic-body">
          <p>
            <strong>{FLOOD_PERMISSION}</strong>
          </p>
          <p>
            <strong>Penggunaan internal.</strong>
            <span> {IRBI_PENGGUNAAN_INTERNAL.replace(/^Penggunaan internal\.\s*/, "")}</span>
          </p>
          <p>{HISTORIS_DISCLAIMER}</p>
          <p>
            {HUJAN_PEMBANDING_JENIS}. Model {HUJAN_PEMBANDING_MODEL}. Lisensi{" "}
            <a href={HUJAN_PEMBANDING_LISENSI} target="_blank" rel="noopener noreferrer">
              CC BY 4.0
            </a>
            . {HUJAN_TANPA_NOWCAST} Angka milimeter itu tidak menetapkan Awas, Siaga, atau Waspada.
          </p>
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
