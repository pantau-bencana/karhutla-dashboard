import { Component, useEffect, useMemo, useState } from "react";
import { HazardPlaceholder } from "./HazardPlaceholder.jsx";
import { FloodInfoTable, NowcastCrossTab } from "./FloodInfoTable.jsx";
import { FloodRiskMap } from "./FloodRiskMap.jsx";
import { parseCsv } from "../lib/csv.js";
import {
  BMKG_ATTRIBUTION,
  DASARIAN_LINKS,
  DASARIAN_NOTE,
  MATRIX_PERMISSION,
  NOWCAST_BASIS,
  applyNowcast,
} from "../lib/capKab.js";
import { DASARIAN_CSV_URL, DASARIAN_FILE, DASARIAN_GUIDE_URL, applyDasarian } from "../lib/dasarianManual.js";
import { formatWib } from "../lib/format.js";
import { hazardById } from "../lib/hazards.js";
import { DIBI_RESOURCE, FLOOD_PERMISSION, IRBI_PERMISSION, RISK_ATTRIBUTION, buildFloodRows } from "../lib/floodMatrix.js";

const BANJIR_CSV = "data/static/irbi-2025-banjir-aceh-bengkulu.csv";
const MULTI_CSV = "data/static/irbi-2025-multibahaya-aceh-bengkulu.csv";
const DIBI_CSV = "data/live/dibi-banjir-2024.csv";
const CAP_CSV = "data/live/bmkg-cap-kab.csv";
const CAP_META = "data/live/bmkg-cap-kab-meta.json";
const DASARIAN_CSV = DASARIAN_FILE;

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

function FloodBody() {
  const [banjir, setBanjir] = useState([]);
  const [multi, setMulti] = useState([]);
  const [dibi, setDibi] = useState([]);
  const [dibiLoaded, setDibiLoaded] = useState(false);
  const [cap, setCap] = useState({ status: "memuat", alerts: [], meta: {} });
  const [dasarian, setDasarian] = useState({ status: "memuat", rows: [] });
  const [error, setError] = useState("");
  const hazard = hazardById("banjir");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [banjirRows, multiRows] = await Promise.all([loadCsv(BANJIR_CSV), loadCsv(MULTI_CSV)]);
        if (cancelled) return;
        setBanjir(banjirRows);
        setMulti(multiRows);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || "Tabel IRBI tidak dapat dimuat.");
      }
      try {
        const dibiRows = await loadCsv(DIBI_CSV);
        if (cancelled) return;
        setDibi(dibiRows);
        setDibiLoaded(true);
      } catch {
        if (!cancelled) setDibiLoaded(false);
      }
      try {
        const meta = await loadJson(CAP_META);
        if (cancelled) return;
        if (meta?.status !== "ok") {
          setCap({ status: "gagal", alerts: [], meta: meta ?? {} });
        } else {
          const alerts = await loadCsv(CAP_CSV);
          if (!cancelled) setCap({ status: "ok", alerts, meta });
        }
      } catch {
        if (!cancelled) setCap({ status: "gagal", alerts: [], meta: {} });
      }
      try {
        const manual = await loadCsv(DASARIAN_CSV);
        if (!cancelled) setDasarian({ status: "ok", rows: manual });
      } catch {
        if (!cancelled) setDasarian({ status: "gagal", rows: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => buildFloodRows({ banjir, multi, dibi, dibiLoaded }), [banjir, multi, dibi, dibiLoaded]);
  const shown = useMemo(() => {
    const withNowcast = applyNowcast(rows, cap.alerts, { ...cap.meta, status: cap.status });
    return applyDasarian(withNowcast, dasarian.rows, { status: dasarian.status });
  }, [rows, cap, dasarian]);

  return (
    <main className="wrap main">
      <header className="page-head">
        <div>
          <h1>Banjir · Aceh & Bengkulu</h1>
          <p className="lead">Konteks risiko jangka panjang (inaRISK, IRBI 2025) digabung dengan tautan nowcast BMKG. Ini bukan prakiraan 14 hari.</p>
        </div>
      </header>
      <p className="banner warn" role="status">
        <strong>{FLOOD_PERMISSION}</strong>
        <span> {IRBI_PERMISSION}</span>
      </p>
      <FloodRiskMap />
      <section className="card">
        <header className="card-head">
          <div>
            <h2>Konteks risiko banjir jangka panjang per kabupaten/kota (bukan prioritas, bukan prakiraan)</h2>
            <p>{FLOOD_PERMISSION}</p>
          </div>
        </header>
        <div className="logic-body">
          <p>
            Aceh 23 kabupaten/kota dan Bengkulu 10. Urutan bawaan mengikuti kode wilayah BIG, dikelompokkan per provinsi.
            Mengurutkan kolom hanya mengubah tampilan. Urutan itu bukan prioritas. Tidak ada peringkat, nomor IRBI, atau
            skor gabungan.
          </p>
          <p className="fine">
            {IRBI_PERMISSION} IRBI 2025 memakai bahaya berbasis data 2021 dan kapasitas IKD 2025. DIBI di kolom sebelahnya
            adalah kejadian tahun 2024 saja (resource {DIBI_RESOURCE}, lisensi ODC-BY, atribusi BNPB Satu Data).{" "}
            {RISK_ATTRIBUTION} Angka dari kolom yang berbeda tidak digabung.
          </p>
          {!dibiLoaded ? (
            <p className="fine">Cuplikan kejadian banjir 2024 belum tersedia. Sel yang kosong bukan angka nol.</p>
          ) : null}
          {error ? <p className="banner warn">{error}</p> : null}
          <h3>Matriks nowcast hujan lebat × kelas risiko banjir</h3>
          <p className="banner warn">
            <strong>{MATRIX_PERMISSION}</strong>
          </p>
          <p>
            {NOWCAST_BASIS} RSS {cap.meta.rss_published ? formatWib(cap.meta.rss_published) : "—"}. Diambil{" "}
            {cap.meta.fetched_at ? formatWib(cap.meta.fetched_at) : "—"}. {BMKG_ATTRIBUTION}
          </p>
          <h3>Cara membaca</h3>
          <p>
            Nowcast adalah peringatan jangka pendek, kira-kira 0–3 jam, dari RSS CAP BMKG. Produk ini berbeda dari
            Peringatan Dini Curah Hujan Tinggi dasarian dan dari prakiraan berbasis dampak (IBF). Kolom nowcast tidak
            memakai prakiraan adm4 (tp) dan tidak memakai Open-Meteo.
          </p>
          <p>{DASARIAN_NOTE}</p>
          <p>
            Kolom dasarian diisi dengan menyalin status dari halaman BMKG ke berkas CSV. Warna kuning, jingga, dan merah
            hanya dipakai pada kolom itu. Tidak ada skor gabungan. Cara mengisinya ada di{" "}
            <a href={DASARIAN_GUIDE_URL} target="_blank" rel="noopener noreferrer">
              panduan isi dasarian
            </a>
            . Berkasnya{" "}
            <a href={DASARIAN_CSV_URL} target="_blank" rel="noopener noreferrer">
              bmkg-pdcht-dasarian.csv
            </a>
            .
          </p>
          <p className="nowcast-links">
            {DASARIAN_LINKS.map((link) => (
              <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">
                {link.nama}
              </a>
            ))}
          </p>
          {shown.length ? <NowcastCrossTab rows={shown} /> : null}
          {shown.length ? <FloodInfoTable rows={shown} /> : null}
        </div>
      </section>
      <HazardPlaceholder hazardId={hazard.id} bare />
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
