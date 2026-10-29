import { useEffect, useState } from "react";
import { PetaPosisiSiklon } from "./PetaPosisiSiklon.jsx";
import { dekatDaratan, teksDekat } from "../lib/dekatDaratan.js";
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
  terapkanKurasiDampak,
} from "../lib/siklonBmkg.js";
import { agensiSistem, daftarSistemSiklon, labelPetaSiklon } from "../lib/siklonTampil.js";

const BERKAS = "data/live/siklon-bmkg.json";
const BERKAS_KURASI = "data/siklon-dampak-manual.json";
const URUTAN_TINGKAT = ["Kecil", "Disebut BMKG", "Di wilayah pemantauan"];

let cuplikanJanji = null;

function ambilJson(path) {
  return fetch(new URL(path, document.baseURI).href, { cache: "no-store" }).then(async (response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  });
}

function ambilCuplikanSiklon() {
  if (!cuplikanJanji) {
    cuplikanJanji = Promise.all([
      ambilJson(BERKAS),
      ambilJson(BERKAS_KURASI).catch(() => ({ entri: [] })),
    ])
      .then(([json, kurasi]) => terapkanKurasiDampak(json, kurasi, Date.now()))
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
  if (agensiSistem(item) !== "BMKG") return "Bukan produk TCWC";
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

function kalimatDekat(item) {
  if (!adaKoordinat(item)) return null;
  return dekatDaratan(item.lintang, item.bujur);
}

function KartuSistem({ item }) {
  const hasil = analisisDampakIndonesia(item);
  const dekat = teksDekat(kalimatDekat(item));
  const jenis = item.jenis === "bibit" ? "Bibit" : "Siklon";
  const agensi = agensiSistem(item);
  return (
    <article className="siklon-kartu">
      <header>
        <h3>{item.nama}</h3>
        <span className={`siklon-lencana siklon-lencana-${item.jenis === "bibit" ? "bibit" : "siklon"}`}>{jenis}</span>
        <span className="siklon-lencana">{agensi}</span>
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
      <p className="siklon-dampak">
        {agensi === "BMKG" ? `Dampak BMKG: ${item.dampak || "—"}` : "Potensi dampak: -"}
        {item.url_infografis ? (
          <>
            {" "}
            <a href={item.url_infografis} target="_blank" rel="noopener noreferrer">Infografis BMKG</a>
          </>
        ) : null}
      </p>
      <p className="siklon-dampak">
        Sumber: {agensi}
        {(item.dampak_manual || item.dampak_otomatis) && item.sumber_manual?.url ? (
          <>
            {" · "}
            <a href={item.sumber_manual.url} target="_blank" rel="noopener noreferrer">{item.sumber_manual.label}</a>
          </>
        ) : null}
      </p>
      {dekat ? (
        <>
          <p className="siklon-dekat">Terdekat dengan: {dekat.negara}</p>
          <p className="siklon-dekat">Ke Indonesia: {dekat.indonesia}</p>
        </>
      ) : (
        <p className="siklon-dekat">Jarak tidak dihitung karena koordinat tidak ada.</p>
      )}
      {item.kalimat ? (
        <details>
          <summary>{agensi === "BMKG" ? "Informasi BMKG" : `Kalimat ${agensi}`}</summary>
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
  const semuaSistem = daftarSistemSiklon(data);
  const waktuBerhasil = entri?.fetched_at || data?.fetched_at;
  const tingkatUtama = semuaSistem.length
    ? semuaSistem.map((item) => analisisDampakIndonesia(item).tingkat).reduce((terpilih, item) => (
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
          <p className={`siklon-status siklon-status-${semuaSistem.length ? kelasTingkat(tingkatUtama) : "kosong"}`} role="status">
            {kalimatStatus(semuaSistem)}
          </p>
          {semuaSistem.length ? <PetaPosisiSiklon sistem={semuaSistem} /> : null}
          <h3>Analisis Dampak ke Indonesia</h3>
          {semuaSistem.length ? (
            <div className="siklon-kartu-daftar">
              {semuaSistem.map((item) => (
                <KartuSistem key={`${agensiSistem(item)}-${item.jenis || "sistem"}-${item.nama}`} item={item} />
              ))}
            </div>
          ) : (
            <p>Tidak ada sistem aktif. Analisis dampak tidak disusun.</p>
          )}
          {semuaSistem.length ? (
            <div className="siklon-tabel-bungkus">
              <table className="siklon-tabel">
                <caption>Wilayah potensi terdampak</caption>
                <thead>
                  <tr>
                    <th>Sistem</th>
                    <th>Potensi dampak</th>
                    <th>Tingkat potensi dampak</th>
                    <th>Sumber</th>
                  </tr>
                </thead>
                <tbody>
                  {semuaSistem.map((item) => {
                    const hasil = analisisDampakIndonesia(item);
                    const teks = agensiSistem(item) === "BMKG" ? (item.dampak && item.dampak !== "-" ? item.dampak : "") : "";
                    const tautan = item.url_infografis || "";
                    return (
                      <tr key={`tabel-${agensiSistem(item)}-${item.nama}`}>
                        <td>{item.nama}</td>
                        <td>
                          {teks || null}
                          {teks && tautan ? " " : null}
                          {tautan ? (
                            <a href={tautan} target="_blank" rel="noopener noreferrer">Infografis BMKG</a>
                          ) : null}
                          {!teks && !tautan ? "-" : null}
                        </td>
                        <td>{hasil.tingkat}</td>
                        <td>
                          {agensiSistem(item)}
                          {(item.dampak_manual || item.dampak_otomatis) && item.sumber_manual?.url ? (
                            <>
                              {" "}
                              <a href={item.sumber_manual.url} target="_blank" rel="noopener noreferrer">{item.sumber_manual.label}</a>
                            </>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="siklon-catatan">
                Pada halaman BMKG judul tabelnya Wilayah Terdampak, dengan kolom Cuaca Ekstrem, Gelombang Tinggi, dan Angin Kencang. Frasa potensi dampak tidak tertulis di halaman itu. Sel BMKG diisi dari teks kolom itu, kalimat dampak langsung atau tidak langsung beserta batas waktunya, dan tautan berkas infografis bila BMKG menuliskannya. Tanda minus berarti isian itu kosong. Gambar tanpa teks atau tautan tidak dibaca. Bila sel BMKG hanya tanda minus, isian kurasi yang masih berlaku dapat mengisi teks itu sampai waktu berlakunya. Lewat waktu itu isian diabaikan. Teks halaman yang bukan tanda minus tetap dipakai. Sumber isian kurasi ditampilkan di kolom Sumber. JMA dan JTWC tidak menyebut wilayah di Indonesia, jadi selnya -.
              </p>
            </div>
          ) : null}
          <p className="siklon-catatan">Tabel prakiraan lintasan tidak ada pada cuplikan. Yang tersimpan hanya titik analisis.</p>
          <div className="siklon-peta-kepala">
            <div>
              <h3>Peta Siklon BMKG</h3>
              <p className="siklon-catatan">Peta TCWC BMKG dibuka di tab baru. Sumber: BMKG. Peta itu tidak disematkan di dasbor.</p>
            </div>
            <a className="btn pri" href={SIKLON_TCWC_URL} target="_blank" rel="noopener noreferrer">Buka peta siklon BMKG</a>
          </div>
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
              Buletin IMD tidak diambil. JMA dan JTWC dipakai sebagai pembanding posisi, bukan sebagai peringatan resmi Indonesia.
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
