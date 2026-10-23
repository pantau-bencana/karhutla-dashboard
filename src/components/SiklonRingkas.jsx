import { useEffect, useState } from "react";
import { formatTanggal, formatWib } from "../lib/format.js";
import {
  SIKLON_BELUM,
  SIKLON_HTML_URL,
  SIKLON_JEJAK,
  SIKLON_TCWC_URL,
  SIKLON_WINDY_LABEL,
  SIKLON_WINDY_URL,
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

export function SiklonRingkas() {
  const { data, galat } = useCuplikanSiklon();

  const ikhtisar = data?.ikhtisar;
  const sistem = Array.isArray(ikhtisar?.sistem) ? ikhtisar.sistem : [];

  return (
    <section className="card" id="siklon-bibit" aria-label="Siklon">
      <h2>Siklon / Bibit Siklon</h2>
      <p>
        Cakupan nasional. Saringan provinsi tidak mengubah status ini. Bukan peringatan resmi.
        {" "}
        Sumber: BMKG.
      </p>
      {galat ? <p role="alert">{galat} Status siklon tidak diisi.</p> : null}
      {!data && !galat ? <p role="status">Memuat cuplikan siklon…</p> : null}
      {data ? (
        <>
          <p>
            Status halaman Siklon Tropis: {data.status_teks || data.status || "tidak ada data"}.
            {" "}
            Nama sistem pada halaman itu: {data.sistem_halaman?.length ? data.sistem_halaman.map((item) => item.nama).join(", ") : "tidak ada"}.
          </p>
          {ikhtisar?.status === "ok" && sistem.length ? (
            <ul>
              {sistem.map((item) => (
                <li key={item.nama}>
                  Ikhtisar menyebut {item.tahap} {item.nama}{item.lokasi ? ` di ${item.lokasi}` : ""}.
                  {item.dampak ? ` Dampak yang ditulis dokumen: ${item.dampak}` : " Dampak untuk Indonesia: belum terintegrasi."}
                  {" "}
                  Ini bukan status Ada pada halaman Siklon Tropis dan bukan jejak.
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
        <a href={SIKLON_TCWC_URL} target="_blank" rel="noopener noreferrer">Detail BMKG TCWC</a>
        {" · "}
        <a href={data?.url_halaman || SIKLON_HTML_URL} target="_blank" rel="noopener noreferrer">Halaman Siklon Tropis BMKG</a>
        {" · "}
        <a href={SIKLON_WINDY_URL} target="_blank" rel="noopener noreferrer">{SIKLON_WINDY_LABEL}</a>
      </p>
      <p>{SIKLON_JEJAK} Tidak ada lapisan jejak pada peta.</p>
    </section>
  );
}
