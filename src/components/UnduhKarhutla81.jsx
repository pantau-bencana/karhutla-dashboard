import { useEffect, useState } from "react";
import { looksLikeCsv, parseCsv } from "../lib/csv.js";
import {
  METRIK_81,
  WAKTU_CUPLIKAN_81_TEKS,
  csvKarhutla81,
  lembarKarhutla81,
  namaBerkasKarhutla81,
  susunKarhutla81,
} from "../lib/karhutla81.js";
import { xlsxLembar } from "../lib/xlsxMini.js";

function simpanBerkas(nama, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nama;
  link.click();
  URL.revokeObjectURL(url);
}

export function UnduhKarhutla81() {
  const [baris, setBaris] = useState([]);
  const [gagal, setGagal] = useState([]);
  const [muat, setMuat] = useState("memuat");

  useEffect(() => {
    let batal = false;
    (async () => {
      const hasil = await Promise.all(
        METRIK_81.map(async (item) => {
          try {
            const response = await fetch(new URL(item.berkas, document.baseURI).href, { cache: "no-store" });
            if (!response.ok) throw new Error(`${item.berkas} HTTP ${response.status}`);
            const text = await response.text();
            const check = looksLikeCsv(text);
            if (!check.ok) throw new Error(check.reason || item.berkas);
            return [item.id, parseCsv(text)];
          } catch {
            return [item.id, null];
          }
        }),
      );
      if (batal) return;
      setGagal(hasil.filter(([, rows]) => rows == null).map(([id]) => id));
      setBaris(susunKarhutla81(Object.fromEntries(hasil.filter(([, rows]) => rows))));
      setMuat("siap");
    })();
    return () => {
      batal = true;
    };
  }, []);

  function unduh(id, jenis) {
    if (gagal.length || !baris.length) return;
    const nama = namaBerkasKarhutla81(id, jenis);
    if (jenis === "xlsx") {
      const bytes = xlsxLembar([lembarKarhutla81(baris, id)]);
      simpanBerkas(nama, new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      return;
    }
    simpanBerkas(nama, new Blob([csvKarhutla81(baris, id)], { type: "text/csv;charset=utf-8" }));
  }

  const siap = muat === "siap" && gagal.length === 0 && baris.length === 81;

  return (
    <section className="card" id="karhutla-81">
      <header className="card-head">
        <div>
          <h2>Berkas 81 kab/kota</h2>
          <p>
            Daftar tetap untuk enam provinsi prioritas supaya nama kabupaten/kota seragam: Riau 12, Jambi 11, Sumatera Selatan 17, Kalimantan Barat 14, Kalimantan Tengah 14, Kalimantan Selatan 13.
          </p>
        </div>
        <span className="status-pill status-csv">Snapshot/arsip</span>
      </header>
      <p className="fine">
        Cuplikan baca-saja dari lembar Analisis Karhutla 2026, bukan sinkron langsung. Waktu cuplikan {WAKTU_CUPLIKAN_81_TEKS}. Setiap unduhan memuat 81 baris dengan kode Kemendagri dan urutan yang sama. Peluang hujan adalah rentang persen untuk hujan lebih dari 20 mm. Indeks kesesuaian iklim memakai kelas pada lembar, termasuk gabungan kelas bila tertulis lebih dari satu. Sel FWI yang berisi #N/A dibiarkan, bukan diisi dan bukan nol. Bukan FDRS BMKG dan bukan peringatan resmi.
      </p>
      {gagal.length ? (
        <p className="banner warn" role="status">
          Berkas belum termuat: {gagal.map((id) => METRIK_81.find((item) => item.id === id)?.label || id).join(", ")}. Angka tidak diisi.
        </p>
      ) : null}
      <p className="fine" role="status">
        {muat !== "siap" ? "Memuat daftar 81 kab/kota…" : gagal.length ? "Unduhan ditahan. Angka tidak diisi." : `${baris.length} kabupaten/kota siap diunduh.`}
      </p>
      <div className="karhutla-81-unduh">
        {METRIK_81.map((item) => (
          <div className="karhutla-81-grup" key={item.id}>
            <button type="button" className="button" disabled={!siap} onClick={() => unduh(item.id, "csv")}>{item.label}</button>
            <button type="button" className="button" disabled={!siap} onClick={() => unduh(item.id, "xlsx")}>Unduh {item.id === "fwi" ? "FWI" : item.id === "hujan" ? "Peluang Hujan" : "Indeks Kesesuaian Iklim"} XLSX</button>
          </div>
        ))}
      </div>
    </section>
  );
}
