import { useEffect, useMemo, useState } from "react";
import { looksLikeCsv, parseCsv } from "../lib/csv.js";
import { IRBI_PENGGUNAAN_INTERNAL } from "../lib/floodMatrix.js";
import {
  IRBI_ANCAMAN,
  IRBI_BUKU_URL,
  ancamanTerpilih,
  barisUnduh,
  csvIrbiNasional,
  lembarIrbiNasional,
  susunIrbiNasional,
} from "../lib/irbiNasional.js";
import { PROVINSI } from "../lib/provinsi.js";
import { xlsxLembar } from "../lib/xlsxMini.js";

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

function gantiSet(set, id, aktif) {
  const berikutnya = new Set(set);
  if (aktif) berikutnya.add(id);
  else berikutnya.delete(id);
  return berikutnya;
}

export function IrbiBanjirLongsor() {
  const [kelompok, setKelompok] = useState([]);
  const [gagal, setGagal] = useState([]);
  const [muat, setMuat] = useState("memuat");
  const [ancaman, setAncaman] = useState(() => new Set(["banjir"]));
  const [terbuka, setTerbuka] = useState(() => new Set());
  const [unduhProv, setUnduhProv] = useState(() => new Set(PROVINSI.map((item) => item.nama)));
  const [cari, setCari] = useState("");

  useEffect(() => {
    let batal = false;
    (async () => {
      const hasil = await Promise.all(
        IRBI_ANCAMAN.map(async (item) => {
          try {
            return [item.id, await muatCsv(item.berkas)];
          } catch {
            return [item.id, null];
          }
        }),
      );
      if (batal) return;
      const berkas = Object.fromEntries(hasil);
      setGagal(hasil.filter(([, rows]) => rows == null).map(([id]) => id));
      setKelompok(susunIrbiNasional(berkas));
      setMuat("siap");
    })();
    return () => {
      batal = true;
    };
  }, []);

  const kolom = ancamanTerpilih([...ancaman]);
  const kueri = cari.trim().toLowerCase();
  const tampil = useMemo(() => {
    if (!kueri) return kelompok;
    return kelompok
      .map((grup) => {
        if (grup.provinsi.toLowerCase().includes(kueri)) return grup;
        const kab = grup.kab.filter((item) => item.nama.toLowerCase().includes(kueri) || item.kode.includes(kueri));
        return kab.length ? { ...grup, kab } : null;
      })
      .filter(Boolean);
  }, [kelompok, kueri]);

  function unduh(jenis) {
    const ids = [...ancaman];
    const provinsi = [...unduhProv];
    if (!ids.length || !provinsi.length) return;
    const baris = barisUnduh(kelompok, { provinsi, ancaman: ids });
    const wilayah = provinsi.length === PROVINSI.length ? "nasional" : provinsi.length === 1 ? provinsi[0].toLowerCase().replace(/[^a-z0-9]+/g, "-") : "beberapa-provinsi";
    const bahaya = ids.length === IRBI_ANCAMAN.length ? "semua" : ids.length === 1 ? ids[0] : "pilihan";
    const nama = `irbi-2025-${bahaya}-${wilayah}.${jenis}`;
    if (jenis === "xlsx") {
      const bytes = xlsxLembar([lembarIrbiNasional(baris, ids)]);
      simpanBerkas(nama, new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      return;
    }
    simpanBerkas(nama, new Blob([csvIrbiNasional(baris, ids)], { type: "text/csv;charset=utf-8" }));
  }

  const unduhSiap = muat === "siap" && ancaman.size > 0 && unduhProv.size > 0;

  return (
    <section className="card" id="irbi-banjir-longsor">
      <header className="card-head">
        <div>
          <h2>IRBI 2025</h2>
          <p>
            Daftar provinsi. Tekan + untuk membuka kabupaten/kota pada ancaman yang dipilih. Tahunan, bukan prakiraan harian.
            IRBI 2025 Banjir & Longsor ada di daftar ini, bersama ancaman lain dari buku yang sama. Banjir bandang tidak disalin ke kolom banjir.
          </p>
        </div>
        <span className="status-pill status-berhasil">Data statis</span>
      </header>
      <div className="logic-body">
        <p className="rekap-note">{IRBI_PENGGUNAAN_INTERNAL}</p>
        <p className="fine">
          Sumber: BNPB, Buku IRBI 2025, terbitan Januari 2026.{" "}
          <a href={IRBI_BUKU_URL} target="_blank" rel="noopener noreferrer">
            Buku IRBI 2025
          </a>
          . Berkas statis di repositori, tanpa waktu ambil harian. Status sumber: Data statis. Sel kosong ditulis IRBI tidak tersedia, bukan nol.
        </p>
        <p>Pantau Bencana v0.1 — proyek data terbuka komunitas, bukan produk BNPB, BMKG, PVMBG, atau KLH.</p>
        {gagal.length ? (
          <p className="banner warn" role="status">
            Berkas belum termuat: {gagal.map((id) => IRBI_ANCAMAN.find((item) => item.id === id)?.nama || id).join(", ")}. Sel ancaman itu tertulis belum terintegrasi.
          </p>
        ) : null}
        <fieldset className="irbi-pilih">
          <legend>Ancaman</legend>
          {IRBI_ANCAMAN.map((item) => (
            <label key={item.id}>
              <input
                type="checkbox"
                checked={ancaman.has(item.id)}
                onChange={(event) => setAncaman((saat) => gantiSet(saat, item.id, event.target.checked))}
              />
              <span>
                {item.nama}
                {item.opsional ? " (opsional)" : ""}
                <span className="fine"> hlm. {item.halaman}</span>
              </span>
            </label>
          ))}
          <span className="irbi-aksi">
            <button type="button" className="button ghost" onClick={() => setAncaman(new Set(IRBI_ANCAMAN.map((item) => item.id)))}>
              Semua ancaman
            </button>
            <button type="button" className="button ghost" onClick={() => setAncaman(new Set(["banjir"]))}>
              Hanya banjir
            </button>
          </span>
        </fieldset>
        <div className="rekap-tools">
          <label className="filter-field">
            Cari
            <input type="search" value={cari} placeholder="Provinsi, kab/kota, atau kode" onChange={(event) => setCari(event.target.value)} />
          </label>
        </div>
        <p className="fine" role="status">
          {muat === "memuat" ? "Memuat tabel IRBI 2025…" : `${tampil.length} provinsi. Kabupaten/kota terbuka hanya pada baris yang ditekan.`}
        </p>
        <ul className="irbi-provinsi">
          {tampil.map((grup) => {
            const buka = terbuka.has(grup.provinsi) || Boolean(kueri && !grup.provinsi.toLowerCase().includes(kueri));
            const panelId = `irbi-kab-${grup.provinsi.replace(/[^a-z0-9]+/gi, "-")}`;
            return (
              <li key={grup.provinsi}>
                <button
                  type="button"
                  className="irbi-buka"
                  aria-expanded={buka}
                  aria-controls={panelId}
                  onClick={() => setTerbuka((saat) => gantiSet(saat, grup.provinsi, !saat.has(grup.provinsi)))}
                >
                  <span aria-hidden="true">{buka ? "−" : "+"}</span>
                  <span>{grup.provinsi}</span>
                  <span className="fine">{grup.kab.length} kab/kota</span>
                </button>
                {buka ? (
                  <div className="table-wrap" id={panelId}>
                    <table className="irbi-kab">
                      <caption>
                        {grup.provinsi}. {kolom.length ? kolom.map((item) => item.nama).join(", ") : "Belum ada ancaman yang dipilih."}
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Kab/Kota</th>
                          {kolom.map((item) => (
                            <th key={item.id} scope="col">
                              {item.nama}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {grup.kab.map((item) => (
                          <tr key={item.kode}>
                            <th scope="row">
                              {item.nama}
                              <span className="fine"> {item.kode}</span>
                            </th>
                            {kolom.map((ancamanItem) => (
                              <td key={ancamanItem.id}>{item.nilai[ancamanItem.id]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        <details className="irbi-unduh">
          <summary>Unduh CSV atau XLSX</summary>
          <p className="fine">Pilih satu, beberapa, atau seluruh provinsi, dan ancaman yang dicentang di atas. Seluruh Indonesia memakai semua provinsi. Berkas memuat kalimat penggunaan internal.</p>
          <div className="irbi-aksi">
            <button type="button" className="button ghost" onClick={() => setUnduhProv(new Set(PROVINSI.map((item) => item.nama)))}>
              Seluruh Indonesia
            </button>
            <button type="button" className="button ghost" onClick={() => setUnduhProv(new Set(terbuka))}>
              Provinsi yang terbuka
            </button>
          </div>
          <fieldset className="irbi-pilih">
            <legend>Provinsi unduhan</legend>
            {PROVINSI.map((item) => (
              <label key={item.kode}>
                <input
                  type="checkbox"
                  checked={unduhProv.has(item.nama)}
                  onChange={(event) => setUnduhProv((saat) => gantiSet(saat, item.nama, event.target.checked))}
                />
                {item.nama}
              </label>
            ))}
          </fieldset>
          <div className="irbi-aksi">
            <button type="button" className="button" onClick={() => unduh("csv")} disabled={!unduhSiap}>
              Unduh CSV
            </button>
            <button type="button" className="button" onClick={() => unduh("xlsx")} disabled={!unduhSiap}>
              Unduh XLSX
            </button>
          </div>
        </details>
      </div>
    </section>
  );
}
