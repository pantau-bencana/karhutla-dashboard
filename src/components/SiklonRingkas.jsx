import { useEffect, useState } from "react";
import { formatTanggal, formatWib } from "../lib/format.js";
import {
  IMD_RSMC_URL,
  JTWC_URL,
  RUMUS_DAMPAK_SIKLON,
  SIARAN_PERS_URL,
  SIKLON_BELUM,
  SIKLON_HTML_URL,
  SIKLON_JEJAK,
  SIKLON_TCWC_URL,
  analisisDampakIndonesia,
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

function angkaPolos(nilai, digit = 0) {
  const angka = Number(nilai);
  if (!Number.isFinite(angka)) return "";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: digit,
    maximumFractionDigits: digit,
    useGrouping: false,
  }).format(angka);
}

function waktuDaftar(terbit) {
  const cocok = String(terbit || "").match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/);
  if (!cocok) return terbit || "waktu tidak tertulis";
  return `${formatTanggal(cocok[1])}, ${cocok[2]}.${cocok[3]} (jam pada daftar BMKG, zona waktu tidak tertulis)`;
}

function teksKoordinat(item) {
  if (!Number.isFinite(Number(item.lintang)) || !Number.isFinite(Number(item.bujur))) {
    return "Koordinat titik analisis tidak ada pada halaman.";
  }
  const lintang = `${angkaPolos(Math.abs(item.lintang), 1)}° ${item.lintang >= 0 ? "LU" : "LS"}`;
  const bujur = `${angkaPolos(Math.abs(item.bujur), 1)}° ${item.bujur >= 0 ? "BT" : "BB"}`;
  return `Posisi titik analisis BMKG: ${lintang}, ${bujur}.`;
}

function teksIntensitas(item) {
  const bagian = [];
  if (item.tekanan_hpa != null) bagian.push(`tekanan ${angkaPolos(item.tekanan_hpa)} hPa`);
  if (item.angin_knot != null) bagian.push(`angin rata-rata ${angkaPolos(item.angin_knot)} knot`);
  if (item.kategori) bagian.push(`kategori pada data titik ${item.kategori}`);
  if (!bagian.length) return "Tekanan, angin, dan kategori tidak ada pada titik analisis.";
  return `Pada titik analisis: ${bagian.join(", ")}. Satuan mengikuti label halaman BMKG.`;
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
          <h3>Analisis &amp; Siaran Pers BMKG</h3>
          <p>
            Kutipan dari halaman Siklon Tropis dan daftar siaran pers. Teks di bawah ini disalin dari BMKG, bukan ringkasan yang disusun dasbor.
            {" "}
            Sumber: BMKG.
          </p>
          {sistemHalaman.length ? (
            <ul>
              {sistemHalaman.map((item) => (
                <li key={`dampak-${item.nama}`}>
                  {item.tahap ? `${item.tahap} ` : ""}{item.nama}. Dampak pada halaman Siklon Tropis: {item.dampak || "tidak ada kalimat"}.
                </li>
              ))}
            </ul>
          ) : (
            <p>Tidak ada sistem aktif. Kutipan dampak tidak disusun.</p>
          )}
          {data.siaran_pers?.status === "gagal" ? (
            <p className="banner warn" role="status">
              <strong>Daftar siaran pers tertunda.</strong>
              {data.siaran_pers.galat ? ` ${data.siaran_pers.galat}` : " Daftar siaran pers gagal dimuat."}
              {" "}
              {data.siaran_pers.kept_previous
                ? `Kutipan sebelumnya tetap ditampilkan. Waktu ambil daftar terakhir yang berhasil: ${formatWib(data.siaran_pers.fetched_at)}.`
                : "Tidak ada kutipan sebelumnya."}
              {" "}
              Periksa daftar Siaran Pers BMKG.
            </p>
          ) : null}
          {Array.isArray(data.siaran_pers?.daftar) && data.siaran_pers.daftar.length ? (
            <ul>
              {data.siaran_pers.daftar.map((item) => (
                <li key={item.url || item.slug}>
                  <a href={item.url} target="_blank" rel="noopener noreferrer">{item.judul}</a>
                  {" "}
                  Waktu pada daftar: {waktuDaftar(item.terbit)}.
                  {item.kutipan ? ` Kutipan: ${item.kutipan}` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p>Tidak ada siaran pers BMKG tentang siklon atau bibit pada daftar yang terbaca.</p>
          )}
          <p className="fine">Kutipan siaran pers tidak mengubah tingkat dampak. Tingkat hanya memakai teks dampak halaman Siklon Tropis dan tanda wilayah TCWC Jakarta.</p>
          <p className="fine">
            Waktu ambil daftar {formatWib(data.siaran_pers?.fetched_at)}.
            {" "}
            <a href={SIARAN_PERS_URL} target="_blank" rel="noopener noreferrer">Daftar Siaran Pers BMKG</a>
          </p>
          <h3>Analisis Dampak ke Indonesia</h3>
          <p>
            <strong>analisis otomatis Pantau Bencana, bukan status resmi.</strong>
            {" "}
            {RUMUS_DAMPAK_SIKLON}
          </p>
          {sistemHalaman.length ? sistemHalaman.map((item) => {
            const hasil = analisisDampakIndonesia(item);
            return (
              <article key={`analisis-${item.nama}`}>
                <p><strong>{item.tahap ? `${item.tahap} ` : ""}{item.nama}</strong></p>
                <p>
                  {teksKoordinat(item)}
                  {" "}
                  {item.waktu_analisis ? `Waktu analisis ${formatWib(item.waktu_analisis)}.` : "Waktu analisis tidak ada pada halaman."}
                  {" "}
                  {teksIntensitas(item)}
                </p>
                <p>Dampak yang ditulis halaman: {item.dampak || "-"}.</p>
                <p>{letakSistem(item)}</p>
                <p>
                  {hasil.jarak_km == null
                    ? "Jarak tidak dihitung karena koordinat tidak ada pada halaman."
                    : `Jarak ke titik terdekat pada bingkai Indonesia dasbor: ${angkaPolos(hasil.jarak_km)} km. Bingkai itu bukan batas administrasi.`}
                </p>
                <p>Tingkat untuk cakupan yang disebut: {hasil.tingkat}.</p>
                <ul>
                  {hasil.wilayah.map((wilayah) => (
                    <li key={`${item.nama}-${wilayah.nama}`}>
                      {wilayah.nama}: {wilayah.tingkat}.
                      {wilayah.kutipan ? ` Kutipan halaman: ${wilayah.kutipan}` : ""}
                    </li>
                  ))}
                </ul>
                {hasil.tingkat === "Kecil" ? (
                  <p>Tidak ada nama provinsi pada teks dampak BMKG, jadi tidak disusun tingkat per provinsi.</p>
                ) : null}
              </article>
            );
          }) : (
            <p>Tidak ada sistem aktif. Analisis dampak tidak disusun.</p>
          )}
          <p className="fine">
            Buletin IMD/RSMC New Delhi dan JTWC tidak diambil pada pembaruan ini. Tidak ada angka dari kedua sumber itu.
            {" "}
            <a href={IMD_RSMC_URL} target="_blank" rel="noopener noreferrer">IMD / RSMC New Delhi</a>
            {" · "}
            <a href={JTWC_URL} target="_blank" rel="noopener noreferrer">JTWC</a>
            {" "}
            Waktu ambil halaman siklon {formatWib(data.fetched_at)}.
          </p>
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
