import { useEffect, useState } from "react";
import { INDONESIA_FRAME } from "../lib/geo.js";
import { formatTanggal, formatWib } from "../lib/format.js";
import {
  IMD_RSMC_URL,
  JTWC_URL,
  RUMUS_DAMPAK_SIKLON,
  SIARAN_PERS_URL,
  SIKLON_BELUM,
  SIKLON_HTML_URL,
  SIKLON_JEJAK,
  SIKLON_PETA_URL,
  SIKLON_TCWC_URL,
  analisisDampakIndonesia,
  siklonUsang,
} from "../lib/siklonBmkg.js";

const BERKAS = "data/live/siklon-bmkg.json";
const URUTAN_TINGKAT = ["Kecil", "Disebut BMKG", "Di wilayah pemantauan"];

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

function adaKoordinat(item) {
  return Number.isFinite(Number(item?.lintang)) && Number.isFinite(Number(item?.bujur));
}

function teksPosisi(item) {
  if (!adaKoordinat(item)) return "—";
  const lintang = `${angkaPolos(Math.abs(item.lintang), 1)}° ${item.lintang >= 0 ? "LU" : "LS"}`;
  const bujur = `${angkaPolos(Math.abs(item.bujur), 1)}° ${item.bujur >= 0 ? "BT" : "BB"}`;
  return `${lintang}, ${bujur}`;
}

function labelTcwc(item) {
  if (item.di_dalam_tcwc) return "Dalam TCWC Jakarta";
  if (item.luar_tcwc) return "Luar TCWC Jakarta";
  return "Tidak ditandai";
}

function kelasTingkat(tingkat) {
  if (tingkat === "Di wilayah pemantauan") return "pantau";
  if (tingkat === "Disebut BMKG") return "disebut";
  return "kecil";
}

function lokasiPendek(item) {
  const lokasi = String(item?.lokasi || "").trim();
  if (!lokasi || /^(luar|dalam)\b/i.test(lokasi)) return "";
  return lokasi;
}

function kalimatStatus(sistem) {
  if (!sistem.length) return "Saat ini tidak ada sistem aktif pada halaman BMKG.";
  const tingkat = sistem.map((item) => analisisDampakIndonesia(item).tingkat);
  const utama = tingkat.reduce((terpilih, item) => (
    URUTAN_TINGKAT.indexOf(item) > URUTAN_TINGKAT.indexOf(terpilih) ? item : terpilih
  ), "Kecil");
  const tempat = sistem.map(lokasiPendek);
  const sama = tempat.every((item) => item && item === tempat[0]);
  const di = sama ? ` di ${tempat[0]}` : "";
  return `Saat ini ${sistem.length} sistem aktif${di}. Dampak ke Indonesia: ${utama.toUpperCase()}.`;
}

function kutipanPendek(teks) {
  const rata = String(teks || "").replace(/\s+/g, " ").trim();
  if (!rata) return "";
  const kalimat = rata.match(/^(.+?\.)(?:\s|$)/);
  const pendek = kalimat ? kalimat[1] : rata;
  if (pendek.length <= 160) return pendek;
  return `${pendek.slice(0, 157).trim()}…`;
}

function waktuDaftar(terbit) {
  const cocok = String(terbit || "").match(/^(\d{4}-\d{2}-\d{2})/);
  return cocok ? formatTanggal(cocok[1]) : "tanggal tidak tertulis";
}

function Fakta({ label, nilai }) {
  return (
    <div className="siklon-fakta">
      <p>{label}</p>
      <strong>{nilai}</strong>
    </div>
  );
}

function SkemaPosisi({ sistem }) {
  const lebar = 640;
  const tinggi = 300;
  const titik = sistem.filter(adaKoordinat);
  const batas = {
    west: Math.min(72, INDONESIA_FRAME.west, ...titik.map((item) => Number(item.bujur) - 3)),
    east: Math.max(148, INDONESIA_FRAME.east, ...titik.map((item) => Number(item.bujur) + 3)),
    south: Math.min(-16, INDONESIA_FRAME.south, ...titik.map((item) => Number(item.lintang) - 3)),
    north: Math.max(26, INDONESIA_FRAME.north, ...titik.map((item) => Number(item.lintang) + 3)),
  };
  const xy = (bujur, lintang) => {
    const x = ((bujur - batas.west) / (batas.east - batas.west)) * lebar;
    const y = ((batas.north - lintang) / (batas.north - batas.south)) * tinggi;
    return [x, y];
  };
  const [x0, y0] = xy(INDONESIA_FRAME.west, INDONESIA_FRAME.north);
  const [x1, y1] = xy(INDONESIA_FRAME.east, INDONESIA_FRAME.south);
  return (
    <figure className="siklon-skema">
      <svg viewBox={`0 0 ${lebar} ${tinggi}`} role="img" aria-label="Skema posisi sistem terhadap bingkai Indonesia">
        <rect width={lebar} height={tinggi} className="siklon-skema-laut" />
        <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} className="siklon-skema-indonesia" />
        <text x={x0 + 10} y={y0 + 22}>Indonesia</text>
        {titik.map((item, indeks) => {
          const [x, y] = xy(Number(item.bujur), Number(item.lintang));
          const hasil = analisisDampakIndonesia(item);
          return (
            <g key={item.nama} className={`siklon-titik siklon-titik-${kelasTingkat(hasil.tingkat)}`}>
              <circle cx={x} cy={y} r="7" />
              <text x={x + 12} y={y + (indeks % 2 === 0 ? -8 : 16)}>{item.nama}</text>
            </g>
          );
        })}
      </svg>
      <figcaption>
        Skema posisi dari titik analisis BMKG. Bingkai Indonesia bukan batas administrasi. Lintasan prakiraan tidak ada pada cuplikan.
      </figcaption>
    </figure>
  );
}

function KartuSistem({ item }) {
  const hasil = analisisDampakIndonesia(item);
  const jenis = item.jenis === "bibit" ? "Bibit" : "Siklon";
  return (
    <article className="siklon-kartu">
      <header>
        <h3>{item.nama}</h3>
        <span className={`siklon-lencana siklon-lencana-${item.jenis === "bibit" ? "bibit" : "siklon"}`}>{jenis}</span>
        <span className={`siklon-chip siklon-chip-${kelasTingkat(hasil.tingkat)}`}>{hasil.tingkat}</span>
      </header>
      <div className="siklon-fakta-grid">
        <Fakta label="Posisi" nilai={teksPosisi(item)} />
        <Fakta label="Tekanan" nilai={item.tekanan_hpa == null ? "—" : `${angkaPolos(item.tekanan_hpa)} hPa`} />
        <Fakta label="Angin" nilai={item.angin_knot == null ? "—" : `${angkaPolos(item.angin_knot)} knot`} />
        <Fakta label="Kategori" nilai={item.kategori || "—"} />
        <Fakta label="Jarak ke Indonesia" nilai={hasil.jarak_km == null ? "—" : `${angkaPolos(hasil.jarak_km)} km`} />
        <Fakta label="Wilayah TCWC Jakarta" nilai={labelTcwc(item)} />
      </div>
      <p className="siklon-dampak">Dampak BMKG: {item.dampak || "—"}</p>
      {item.kalimat ? (
        <details>
          <summary>Kalimat BMKG</summary>
          <p>{item.kalimat}</p>
        </details>
      ) : null}
    </article>
  );
}

export function SiklonRingkas({ manifest = null }) {
  const { data, galat } = useCuplikanSiklon();
  const entri = manifest?.datasets?.bmkg_siklon;
  const usang = siklonUsang(entri);
  const ikhtisar = data?.ikhtisar;
  const sistemIkhtisar = Array.isArray(ikhtisar?.sistem) ? ikhtisar.sistem : [];
  const sistemHalaman = Array.isArray(data?.sistem_halaman) ? data.sistem_halaman : [];
  const waktuBerhasil = entri?.fetched_at || data?.fetched_at;
  const tingkatUtama = sistemHalaman.length
    ? sistemHalaman.map((item) => analisisDampakIndonesia(item).tingkat).reduce((terpilih, item) => (
      URUTAN_TINGKAT.indexOf(item) > URUTAN_TINGKAT.indexOf(terpilih) ? item : terpilih
    ), "Kecil")
    : "";
  const daftarSiaran = Array.isArray(data?.siaran_pers?.daftar) ? data.siaran_pers.daftar : [];

  return (
    <section className="card" id="siklon-bibit" aria-label="Siklon">
      <h2>Siklon / Bibit Siklon</h2>
      <p className="siklon-sumber">Sumber: BMKG. Bukan peringatan resmi.</p>
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
          <p className={`siklon-status siklon-status-${sistemHalaman.length ? kelasTingkat(tingkatUtama) : "kosong"}`} role="status">
            {kalimatStatus(sistemHalaman)}
          </p>
          {sistemHalaman.length ? <SkemaPosisi sistem={sistemHalaman} /> : null}
          <h3>Analisis Dampak ke Indonesia</h3>
          {sistemHalaman.length ? (
            <div className="siklon-kartu-daftar">
              {sistemHalaman.map((item) => <KartuSistem key={`${item.jenis || "sistem"}-${item.nama}`} item={item} />)}
            </div>
          ) : (
            <p>Tidak ada sistem aktif. Analisis dampak tidak disusun.</p>
          )}
          {sistemHalaman.length ? (
            <div className="siklon-tabel-bungkus">
              <table className="siklon-tabel">
                <caption>Wilayah terdampak pada halaman BMKG</caption>
                <thead>
                  <tr>
                    <th>Sistem</th>
                    <th>Dampak BMKG</th>
                    <th>Tingkat dasbor</th>
                  </tr>
                </thead>
                <tbody>
                  {sistemHalaman.map((item) => {
                    const hasil = analisisDampakIndonesia(item);
                    return (
                      <tr key={`tabel-${item.nama}`}>
                        <td>{item.nama}</td>
                        <td>{item.dampak || "—"}</td>
                        <td>{hasil.tingkat}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
          <p className="siklon-catatan">Tabel prakiraan lintasan tidak ada pada cuplikan. Yang tersimpan hanya titik analisis.</p>
          <div className="siklon-peta-kepala">
            <h3>Peta Siklon BMKG</h3>
            <a className="btn pri" href={SIKLON_PETA_URL} target="_blank" rel="noopener noreferrer">Buka peta siklon BMKG</a>
          </div>
          <iframe
            className="siklon-peta-bmkg"
            title="Peta Siklon BMKG"
            src={SIKLON_PETA_URL}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          <p className="siklon-catatan">
            Panel ini memuat halaman BMKG. Bukan peta buatan dasbor. Sumber: BMKG.
            {" "}
            <a href={SIKLON_TCWC_URL} target="_blank" rel="noopener noreferrer">Peta TCWC BMKG</a>
          </p>
          <h3>Analisis &amp; Siaran Pers BMKG</h3>
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
          {daftarSiaran.length ? (
            <ul className="siklon-siaran">
              {daftarSiaran.map((item) => (
                <li key={item.url || item.slug}>
                  <a href={item.url} target="_blank" rel="noopener noreferrer">{item.judul}</a>
                  <p>{kutipanPendek(item.kutipan)}</p>
                  <p>
                    {waktuDaftar(item.terbit)}
                    {" · "}
                    <a href={item.url} target="_blank" rel="noopener noreferrer">Baca selengkapnya</a>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p>Tidak ada siaran pers BMKG tentang siklon atau bibit pada daftar yang terbaca.</p>
          )}
          <footer className="siklon-kaki">
            <p><strong>analisis otomatis Pantau Bencana, bukan status resmi.</strong></p>
            <p>
              Waktu ambil {formatWib(data.fetched_at)}.
              {" "}
              {sistemHalaman.some((item) => item.waktu_analisis) ? `Waktu analisis ${formatWib(sistemHalaman.find((item) => item.waktu_analisis)?.waktu_analisis)}.` : "Halaman status tidak memuat jam pembaruan."}
              {" "}
              {ikhtisar?.terbit ? `Ikhtisar tertanggal ${formatTanggal(ikhtisar.terbit)}.` : `Ikhtisar: ${SIKLON_BELUM}.`}
              {" "}
              {data.siaran_pers?.fetched_at ? `Daftar siaran pers diambil ${formatWib(data.siaran_pers.fetched_at)}.` : ""}
            </p>
            {sistemIkhtisar.length ? (
              <p>
                Ikhtisar menyebut {sistemIkhtisar.map((item) => item.nama).join(", ")}.
                {sistemIkhtisar.some((item) => item.dampak) ? "" : " Dampak untuk Indonesia: belum terintegrasi."}
              </p>
            ) : null}
            <details>
              <summary>Rumus tingkat</summary>
              <p>{RUMUS_DAMPAK_SIKLON}</p>
            </details>
            <p>
              Buletin IMD/RSMC New Delhi dan JTWC tidak diambil. Tidak ada angka dari kedua sumber itu.
              {" "}
              <a href={IMD_RSMC_URL} target="_blank" rel="noopener noreferrer">IMD / RSMC New Delhi</a>
              {" · "}
              <a href={JTWC_URL} target="_blank" rel="noopener noreferrer">JTWC</a>
              {" · "}
              <a href={SIARAN_PERS_URL} target="_blank" rel="noopener noreferrer">Daftar Siaran Pers BMKG</a>
              {" · "}
              <a href={SIKLON_HTML_URL} target="_blank" rel="noopener noreferrer">Halaman Siklon Tropis BMKG</a>
            </p>
            <p>{SIKLON_JEJAK} Tidak ada lapisan jejak pada peta dasbor.</p>
            {data.api?.galat ? <p>API TCWC tidak dipakai ({data.api.galat}).</p> : null}
          </footer>
        </>
      ) : null}
    </section>
  );
}
