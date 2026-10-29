import { useEffect, useState } from "react";
import { Badge } from "./Badge.jsx";
import { OfficialLinks } from "./OfficialLinks.jsx";
import { formatWib } from "../lib/format.js";
import { URL_LETUSAN, URL_MAGMA, URL_TINGKAT, URL_VONA, URL_VSI, ringkasTingkat } from "../lib/gunungApi.js";

const BERKAS = "data/live/gunung-api.json";
let janji = null;

export function useCuplikanGunung() {
  const [data, setData] = useState(null);
  const [galat, setGalat] = useState("");
  useEffect(() => {
    let batal = false;
    if (!janji) {
      janji = fetch(new URL(BERKAS, document.baseURI).href, { cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .catch((error) => {
          janji = null;
          throw error;
        });
    }
    janji
      .then((json) => {
        if (!batal) setData(json);
      })
      .catch((error) => {
        if (!batal) setGalat(error.message || "Cuplikan gunung api tidak termuat.");
      });
    return () => {
      batal = true;
    };
  }, []);
  return { data, galat };
}

function berita(data) {
  return [...(data?.letusan || []), ...(data?.vona || [])]
    .filter((item) => item?.waktu)
    .sort((kiri, kanan) => String(kanan.waktu).localeCompare(String(kiri.waktu)));
}

export function RingkasGunung({ data, galat }) {
  const gunung = Array.isArray(data?.gunung) ? data.gunung : [];
  const { hitung, puncak, tingkatTertinggi } = ringkasTingkat(gunung);
  if (galat && !gunung.length) return <p role="alert">{galat} Tidak ada hitungan tingkat aktivitas.</p>;
  if (!data && !galat) return <p role="status">Memuat cuplikan gunung api…</p>;
  if (!gunung.length) return <p>Cuplikan tingkat aktivitas belum ada. Status tidak diisi.</p>;
  const nama = puncak.map((item) => item.nama).join(", ");
  return (
    <>
      <p>
        {hitung.Awas} Level IV Awas, {hitung.Siaga} Level III Siaga, {hitung.Waspada} Level II Waspada, {hitung.Normal} Level I Normal.
        {nama ? ` Tertinggi saat ini ${tingkatTertinggi}: ${nama}.` : " Tidak ada gunung di atas Normal."}
      </p>
      <p>
        Sumber: PVMBG. Diambil {formatWib(data.fetched_at)}.
        {" "}
        <a href={URL_TINGKAT} target="_blank" rel="noopener noreferrer">Halaman Tingkat Aktivitas</a>.
      </p>
    </>
  );
}

export function VolcanoPage() {
  const { data, galat } = useCuplikanGunung();
  const gunung = Array.isArray(data?.gunung) ? data.gunung : [];
  const kabar = berita(data);
  return (
    <main className="wrap main">
      <header className="page-head">
        <div>
          <h1>Gunung Api</h1>
          <p className="lead">Sumber: PVMBG. Tingkat aktivitas dan berita letusan dari halaman publik MAGMA Indonesia. Bukan peringatan karhutla.</p>
        </div>
        <div className="badges">
          <Badge kind="tau">Sumber: PVMBG</Badge>
          <OfficialLinks links={[
            { href: URL_MAGMA, label: "MAGMA Indonesia" },
            { href: URL_VSI, label: "PVMBG" },
          ]} />
        </div>
      </header>
      <section className="card">
        <h2>Tingkat aktivitas</h2>
        <RingkasGunung data={data} galat={galat} />
        {data?.kept_tingkat ? <p className="banner warn" role="status">Pembacaan tingkat aktivitas terakhir gagal. Daftar sebelumnya tetap ditampilkan.</p> : null}
        <p>{data?.koordinat || "Koordinat tidak ada pada halaman Tingkat Aktivitas, jadi peta titik tidak digambar."}</p>
        {gunung.length ? (
          <div className="table-wrap">
            <table>
              <caption>Gunung api menurut tingkat aktivitas</caption>
              <thead>
                <tr>
                  <th>Tingkat</th>
                  <th>Nama</th>
                  <th>Lokasi</th>
                  <th>Sumber</th>
                </tr>
              </thead>
              <tbody>
                {gunung.map((item) => (
                  <tr key={item.nama}>
                    <td>Level {item.level} {item.tingkat}</td>
                    <td>{item.nama}</td>
                    <td>{item.lokasi || "—"}</td>
                    <td><a href={item.url || URL_TINGKAT} target="_blank" rel="noopener noreferrer">PVMBG</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
      <section className="card">
        <h2>Berita letusan</h2>
        <p>
          Informasi Letusan dan VONA pada 72 jam terakhir di halaman pertama MAGMA.
          {" "}
          <a href={URL_LETUSAN} target="_blank" rel="noopener noreferrer">Informasi Letusan</a>
          {" · "}
          <a href={URL_VONA} target="_blank" rel="noopener noreferrer">VONA</a>.
        </p>
        {data?.kept_letusan || data?.kept_vona ? <p className="banner warn" role="status">Sebagian berita gagal dimuat. Daftar sebelumnya tetap dipakai untuk bagian yang gagal.</p> : null}
        {kabar.length ? (
          <ul className="plain-list">
            {kabar.map((item) => (
              <li key={`${item.jenis}-${item.gunung}-${item.waktu}`}>
                <a href={item.url} target="_blank" rel="noopener noreferrer">{item.gunung}</a>
                {" · "}{item.jenis === "vona" ? "VONA" : "Informasi Letusan"}
                {" · "}{formatWib(item.waktu) || item.waktu_teks}
                {item.tinggi_kolom_m != null ? ` · kolom abu ${item.tinggi_kolom_m} m` : ""}
                <br />
                {item.teks}
              </li>
            ))}
          </ul>
        ) : (
          <p>Tidak ada berita letusan atau VONA dalam 72 jam pada halaman yang terbaca.</p>
        )}
      </section>
    </main>
  );
}
