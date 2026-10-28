import { useEffect, useState } from "react";
import { formatTanggal, formatWib } from "../lib/format.js";
import {
  SIKLON_BELUM,
  SIKLON_HTML_URL,
  SIKLON_JEJAK,
  SIKLON_TCWC_URL,
  siklonUsang,
} from "../lib/siklonBmkg.js";

const BERKAS = "data/live/siklon-bmkg.json";

let cuplikanJanji = null;

function ambilCuplikanSiklon() {
  if (!cuplikanJanji) {
    cuplikanJanji = fetch(new URL(BERKAS, document.baseURI).href, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .catch((error) => {
        cuplikanJanji = null;
        throw error;
      });
  }
  return cuplikanJanji;
}

export function useCuplikanSiklon() {
  const [data, setData] = useState(null);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    let batal = false;
    ambilCuplikanSiklon()
      .then((json) => {
        if (!batal) setData(json);
      })
      .catch((error) => {
        if (!batal) setGalat(error.message || "Cuplikan siklon tidak termuat.");
      });
    return () => {
      batal = true;
    };
  }, []);

  return { data, galat };
}

function letakSistem(item) {
  if (item.luar_tcwc) return "Di luar wilayah pemantauan (AoM) TCWC Jakarta.";
  if (item.di_dalam_tcwc) return "Di dalam wilayah pemantauan TCWC Jakarta.";
  return "Tidak ditandai di dalam wilayah pemantauan TCWC Jakarta.";
}

export function SiklonRingkas({ manifest = null }) {
  const { data, galat } = useCuplikanSiklon();
  const entri = manifest?.datasets?.bmkg_siklon;
  const usang = siklonUsang(entri);

  const ikhtisar = data?.ikhtisar;
  const sistem = Array.isArray(ikhtisar?.sistem) ? ikhtisar.sistem : [];
  const sistemHalaman = Array.isArray(data?.sistem_halaman) ? data.sistem_halaman : [];
  const waktuBerhasil = entri?.fetched_at || data?.fetched_at;

  return (
    <section className="card" id="siklon-bibit" aria-label="Siklon">
      <h2>Siklon / Bibit Siklon</h2>
      <p>
        Cakupan nasional. Saringan provinsi tidak mengubah status ini. Bukan peringatan resmi.
        {" "}
        Sumber: BMKG.
      </p>
      {usang ? (
        <p className="banner warn" role="status">
          <strong>Data siklon tertunda.</strong>
          Pembaruan terakhir gagal{entri?.error ? ` (${entri.error})` : ""} dan cuplikan sebelumnya tetap ditampilkan.
          {" "}
          Waktu ambil terakhir yang berhasil: {formatWib(waktuBerhasil)}.
          {" "}
          Periksa halaman Siklon Tropis BMKG untuk status terkini.
        </p>
      ) : null}
      {galat ? <p role="alert">{galat} Status siklon tidak diisi.</p> : null}
      {!data && !galat ? <p role="status">Memuat cuplikan siklon…</p> : null}
      {data ? (
        <>
          <p>
            Status halaman Siklon Tropis: {data.status_teks || data.status || "tidak ada data"}.
            {" "}
            Nama sistem pada halaman itu: {sistemHalaman.length ? sistemHalaman.map((item) => item.nama).join(", ") : "tidak ada"}.
          </p>
          {sistemHalaman.length ? (
            <>
              <ul>
                {sistemHalaman.map((item) => (
                  <li key={`${item.jenis || "sistem"}-${item.nama}`}>
                    {item.tahap ? `${item.tahap} ` : ""}{item.nama}.
                    {item.kalimat ? ` Kalimat halaman: ${item.kalimat}` : ""}
                    {" "}
                    {letakSistem(item)}
                    {" "}
                    {item.dampak
                      ? `Dampak yang ditulis: ${item.dampak}`
                      : "Tidak ada kalimat dampak untuk wilayah Indonesia pada cuplikan ini."}
                  </li>
                ))}
              </ul>
              <p className="fine">
                Sistem di luar wilayah pemantauan TCWC Jakarta atau tanpa kalimat dampak untuk Indonesia tetap ditampilkan di sini dan tidak menyalakan tanda merah pada navigasi.
              </p>
            </>
          ) : null}
          {ikhtisar?.status === "ok" && sistem.length ? (
            <ul>
              {sistem.map((item) => (
                <li key={item.nama}>
                  Ikhtisar menyebut {item.tahap} {item.nama}{item.lokasi ? ` di ${item.lokasi}` : ""}.
                  {item.dampak ? ` Dampak yang ditulis dokumen: ${item.dampak}` : " Dampak untuk Indonesia: belum terintegrasi."}
                  {" "}
                  Kalimat ini dari ikhtisar cuaca harian, bukan dari status halaman, dan bukan jejak.
                </li>
              ))}
            </ul>
          ) : (
            <p>Nama sistem, tahap, dan dampak dari ikhtisar: {SIKLON_BELUM}.</p>
          )}
          <p>
            Waktu ambil {formatWib(data.fetched_at)}.
            {" "}
            {ikhtisar?.terbit ? `Ikhtisar tertanggal ${formatTanggal(ikhtisar.terbit)}.` : "Halaman status tidak memuat jam pembaruan."}
            {" "}
            {data.pdf_diubah ? `Berkas ikhtisar diubah ${formatWib(data.pdf_diubah)}.` : ""}
            {" "}
            {data.api?.galat ? `API TCWC tidak dipakai (${data.api.galat}).` : ""}
          </p>
        </>
      ) : null}
      <p className="siklon-tautan">
        <a className="button" href={SIKLON_TCWC_URL} target="_blank" rel="noopener noreferrer">Peta TCWC BMKG</a>
        <a className="button" href={SIKLON_HTML_URL} target="_blank" rel="noopener noreferrer">Halaman Siklon Tropis BMKG</a>
      </p>
      <p className="fine">Peta dan halaman dibuka di situs BMKG. Status tautan: Tautan saja. Sumber: BMKG.</p>
      <p>{SIKLON_JEJAK} Tidak ada lapisan jejak pada peta.</p>
    </section>
  );
}
