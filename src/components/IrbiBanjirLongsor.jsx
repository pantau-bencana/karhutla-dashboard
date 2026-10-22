import { useEffect, useMemo, useState } from "react";
import { looksLikeCsv, parseCsv } from "../lib/csv.js";
import {
  IRBI_BANJIR_TERVERIFIKASI,
  IRBI_BUKU_BANJIR_URL,
  IRBI_BUKU_LONGSOR_URL,
  IRBI_LONGSOR_TERVERIFIKASI,
  IRBI_PENGGUNAAN_INTERNAL,
} from "../lib/floodMatrix.js";
import {
  IRBI_BELUM,
  IRBI_GABUNG_JUDUL,
  csvIrbiGabung,
  lembarIrbiGabung,
  saringIrbi,
  susunIrbiGabung,
  urutIrbi,
} from "../lib/irbiGabung.js";
import { PROVINSI } from "../lib/provinsi.js";
import { xlsxLembar } from "../lib/xlsxMini.js";

const BANJIR_CSV = "data/static/irbi-2025-banjir.csv";
const LONGSOR_CSV = "data/static/irbi-2025-longsor.csv";
const KOLOM = [
  ["provinsi", "Provinsi"],
  ["nama", "Kab/Kota"],
  ["banjir", "IRBI Banjir 2025"],
  ["longsor", "IRBI Longsor 2025"],
];

function assetUrl(path) {
  return new URL(path, document.baseURI).href;
}

async function muatCsv(path) {
  const response = await fetch(assetUrl(path), { cache: "no-store" });
  if (!response.ok) throw new Error(`${path} HTTP ${response.status}`);
  const text = await response.text();
  const check = looksLikeCsv(text);
  if (!check.ok) throw new Error(`${path}: ${check.reason}`);
  return parseCsv(text);
}

function simpanBerkas(nama, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nama;
  link.click();
  URL.revokeObjectURL(url);
}

export function IrbiBanjirLongsor() {
  const [semua, setSemua] = useState([]);
  const [muat, setMuat] = useState("memuat");
  const [banjirOk, setBanjirOk] = useState(false);
  const [longsorOk, setLongsorOk] = useState(false);
  const [provinsi, setProvinsi] = useState("");
  const [cari, setCari] = useState("");
  const [urut, setUrut] = useState({ kunci: "provinsi", arah: "asc" });

  useEffect(() => {
    let batal = false;
    (async () => {
      const hasil = await Promise.all([
        muatCsv(BANJIR_CSV).then(
          (rows) => ({ ok: true, rows }),
          () => ({ ok: false, rows: null }),
        ),
        muatCsv(LONGSOR_CSV).then(
          (rows) => ({ ok: true, rows }),
          () => ({ ok: false, rows: null }),
        ),
      ]);
      if (batal) return;
      setBanjirOk(hasil[0].ok);
      setLongsorOk(hasil[1].ok);
      setSemua(susunIrbiGabung(hasil[0].rows, hasil[1].rows));
      setMuat("siap");
    })();
    return () => {
      batal = true;
    };
  }, []);

  const tampil = useMemo(
    () => urutIrbi(saringIrbi(semua, { provinsi, cari }), urut.kunci, urut.arah),
    [semua, provinsi, cari, urut],
  );

  function gantiUrut(kunci) {
    setUrut((saat) =>
      saat.kunci === kunci
        ? { kunci, arah: saat.arah === "asc" ? "desc" : "asc" }
        : { kunci, arah: kunci === "banjir" || kunci === "longsor" ? "desc" : "asc" },
    );
  }

  function unduh(jenis) {
    if (jenis === "xlsx") {
      const bytes = xlsxLembar([lembarIrbiGabung(tampil)]);
      simpanBerkas(
        "irbi-2025-banjir-longsor.xlsx",
        new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      );
      return;
    }
    simpanBerkas("irbi-2025-banjir-longsor.csv", new Blob([csvIrbiGabung(tampil)], { type: "text/csv;charset=utf-8" }));
  }

  return (
    <section className="card" id="irbi-banjir-longsor">
      <header className="card-head">
        <div>
          <h2>IRBI 2025 Banjir & Longsor</h2>
          <p>Skor dan kelas tahunan Buku IRBI 2025 untuk 514 kabupaten/kota. Bukan prakiraan harian dan bukan peta rawan longsor PVMBG.</p>
        </div>
        <span className="status-pill status-berhasil">Data statis</span>
      </header>
      <div className="logic-body">
        <p className="rekap-note">{IRBI_PENGGUNAAN_INTERNAL}</p>
        <p className="fine">{banjirOk ? IRBI_BANJIR_TERVERIFIKASI : `IRBI banjir 2025 ${IRBI_BELUM}. Berkas ${BANJIR_CSV} tidak dapat dimuat.`}</p>
        <p className="fine">
          {longsorOk ? IRBI_LONGSOR_TERVERIFIKASI : `IRBI longsor 2025 ${IRBI_BELUM}. Berkas ${LONGSOR_CSV} tidak dapat dimuat.`}
        </p>
        <p className="fine">
          Sumber: BNPB, Buku IRBI 2025, terbitan Januari 2026.{" "}
          <a href={IRBI_BUKU_BANJIR_URL} target="_blank" rel="noopener noreferrer">
            Halaman banjir 212–227
          </a>
          {" · "}
          <a href={IRBI_BUKU_LONGSOR_URL} target="_blank" rel="noopener noreferrer">
            Halaman longsor 310–323
          </a>
          . Berkas statis di repositori, tanpa waktu ambil harian. Status sumber: Data statis.
        </p>
        <p>Pantau Bencana v0.1 — proyek data terbuka komunitas, bukan produk BNPB, BMKG, PVMBG, atau KLH.</p>
        <div className="rekap-tools">
          <label>
            Provinsi
            <select value={provinsi} onChange={(event) => setProvinsi(event.target.value)}>
              <option value="">Seluruh Indonesia</option>
              {PROVINSI.map((nama) => (
                <option key={nama} value={nama}>
                  {nama}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            Cari kab/kota
            <input
              type="search"
              value={cari}
              placeholder="Nama atau kode"
              onChange={(event) => setCari(event.target.value)}
            />
          </label>
          <button type="button" className="button" onClick={() => unduh("csv")} disabled={muat !== "siap"}>
            Unduh CSV
          </button>
          <button type="button" className="button" onClick={() => unduh("xlsx")} disabled={muat !== "siap"}>
            Unduh XLSX
          </button>
        </div>
        <p className="fine" role="status">
          {muat === "memuat" ? "Memuat tabel IRBI 2025…" : `${tampil.length} dari ${semua.length} kabupaten/kota.`}
        </p>
        <div className="table-wrap tabel-urut">
          <table>
            <caption>
              {IRBI_GABUNG_JUDUL}. Provinsi, kabupaten/kota, skor dan kelas banjir, skor dan kelas longsor. Urutan awal mengikuti nama provinsi.
            </caption>
            <thead>
              <tr>
                {KOLOM.map(([kunci, label]) => (
                  <th
                    key={kunci}
                    scope="col"
                    aria-sort={urut.kunci === kunci ? (urut.arah === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <button type="button" onClick={() => gantiUrut(kunci)}>
                      {label}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tampil.length ? (
                tampil.map((baris) => (
                  <tr key={baris.kode}>
                    <td>{baris.provinsi}</td>
                    <th scope="row">{baris.nama}</th>
                    <td>{baris.banjir}</td>
                    <td>{baris.longsor}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>{muat === "memuat" ? "Memuat…" : "Tidak ada kabupaten/kota yang cocok."}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
