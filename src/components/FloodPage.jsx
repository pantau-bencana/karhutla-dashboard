import { Component, useEffect, useMemo, useState } from "react";
import { HazardPlaceholder } from "./HazardPlaceholder.jsx";
import { FloodRiskMap } from "./FloodRiskMap.jsx";
import { parseCsv } from "../lib/csv.js";
import { hazardById } from "../lib/hazards.js";
import {
  DIBI_RESOURCE,
  FLOOD_PERMISSION,
  IRBI_PERMISSION,
  RISK_ATTRIBUTION,
  buildFloodRows,
  krbLinksFor,
  skorTeks,
  sortFloodRows,
} from "../lib/floodMatrix.js";

const BANJIR_CSV = "data/static/irbi-2025-banjir-aceh-bengkulu.csv";
const MULTI_CSV = "data/static/irbi-2025-multibahaya-aceh-bengkulu.csv";
const DIBI_CSV = "data/live/dibi-banjir-2024.csv";

function assetUrl(path) {
  return new URL(path, document.baseURI).href;
}

async function loadCsv(path) {
  const response = await fetch(assetUrl(path), { cache: "no-store" });
  if (!response.ok) throw new Error(`${path} HTTP ${response.status}`);
  return parseCsv(await response.text());
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

function MatrixTable({ rows }) {
  const [sort, setSort] = useState({ key: "kode", direction: "asc" });
  const ordered = useMemo(() => sortFloodRows(rows, sort.key, sort.direction), [rows, sort]);
  const grouped = sort.key === "kode";

  function toggle(key) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "nama" || key === "kode" ? "asc" : "desc" },
    );
  }

  const body = [];
  let lastProvince = "";
  for (const row of ordered) {
    if (grouped && row.provinsi !== lastProvince) {
      lastProvince = row.provinsi;
      body.push(
        <tr key={`${row.provinsi}-grup`} className="flood-group">
          <th scope="colgroup" colSpan={6}>
            {row.provinsi}
          </th>
        </tr>,
      );
    }
    const links = krbLinksFor(row);
    body.push(
      <tr key={row.kode}>
        <th scope="row">
          {row.kode}
          <small>{row.nama}</small>
        </th>
        <td>
          {skorTeks(row.banjirSkor)} · {row.banjirKelas}
          <small>hal. {row.banjirHalaman}</small>
        </td>
        <td>
          {row.multiKelas || "—"}
          <small>
            hal. {row.multiHalaman || "—"}
            {row.multiSkor ? ` · skor ${skorTeks(row.multiSkor)}` : ""}
          </small>
        </td>
        <td>{row.dibiTeks}</td>
        <td>Belum terhubung</td>
        <td>
          {links.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
              {link.nama}
            </a>
          ))}
        </td>
      </tr>,
    );
  }

  return (
    <div className="table-wrap flood-table">
      <table>
        <thead>
          <tr>
            <th scope="col">
              <button type="button" onClick={() => toggle("kode")}>
                Kode dan nama
              </button>
              <small>BIG, edisi 2022</small>
            </th>
            <th scope="col">
              <button type="button" onClick={() => toggle("banjir")}>
                IRBI 2025 Banjir
              </button>
              <small>Data statis. Skor, kelas, halaman.</small>
            </th>
            <th scope="col">
              <button type="button" onClick={() => toggle("multi")}>
                IRBI 2025 multi-bahaya
              </button>
              <small>Data statis. Kelas dan halaman. Bukan khusus banjir.</small>
            </th>
            <th scope="col">
              <button type="button" onClick={() => toggle("dibi")}>
                Kejadian banjir 2024
              </button>
              <small>Data statis. DIBI, ODC-BY.</small>
            </th>
            <th scope="col">
              Ringkasan kajian inaRISK
              <small>Belum terhubung</small>
            </th>
            <th scope="col">
              Dokumen KRB
              <small>Tautan saja</small>
            </th>
          </tr>
        </thead>
        <tbody>{body}</tbody>
      </table>
    </div>
  );
}

function FloodBody() {
  const [banjir, setBanjir] = useState([]);
  const [multi, setMulti] = useState([]);
  const [dibi, setDibi] = useState([]);
  const [dibiLoaded, setDibiLoaded] = useState(false);
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
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => buildFloodRows({ banjir, multi, dibi, dibiLoaded }), [banjir, multi, dibi, dibiLoaded]);

  return (
    <main className="wrap main">
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
          {rows.length ? <MatrixTable rows={rows} /> : null}
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
