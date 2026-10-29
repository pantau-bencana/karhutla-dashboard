import { useEffect, useState } from "react";
import { Badge } from "../../components/Badge.jsx";
import { OfficialLinks } from "../../components/OfficialLinks.jsx";
import { formatWib } from "../../lib/format.js";
import { URL_LETUSAN, URL_MAGMA, URL_TINGKAT, URL_VONA, URL_VSI, ringkasTingkat } from "../../lib/gunungApi.js";

const TINGKAT = ["Awas", "Siaga", "Waspada", "Normal"];

function ambil(sinyal) {
  return fetch(new URL("data/live/gunung-api.json", document.baseURI).href, { cache: "no-store", signal: sinyal }).then(async (response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  });
}

function Kelompok({ nama, daftar }) {
  const [buka, setBuka] = useState(false);
  return (
    <section className="v3-tingkat">
      <button type="button" aria-expanded={buka} onClick={() => setBuka((nilai) => !nilai)}>
        <span>{nama} ({daftar.length})</span>
        <span aria-hidden="true">{buka ? "−" : "+"}</span>
      </button>
      {buka ? (
        daftar.length ? (
          <ul>
            {daftar.map((item) => (
              <li key={item.nama}>
                <a href={item.url || URL_TINGKAT} target="_blank" rel="noopener noreferrer">{item.nama}</a>
                <span>{item.lokasi || "—"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>Tidak ada gunung pada tingkat ini.</p>
        )
      ) : null}
    </section>
  );
}

export function GunungPage({ muat = 0 }) {
  const [data, setData] = useState(null);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    const kontrol = new AbortController();
    setGalat("");
    ambil(kontrol.signal)
      .then((json) => setData(json))
      .catch((error) => {
        if (error.name !== "AbortError") setGalat(error.message || "Cuplikan gunung api tidak termuat.");
      });
    return () => kontrol.abort();
  }, [muat]);

  const gunung = Array.isArray(data?.gunung) ? data.gunung : [];
  const { hitung, puncak, tingkatTertinggi } = ringkasTingkat(gunung);
  const kabar = [...(data?.letusan || []), ...(data?.vona || [])]
    .filter((item) => item?.waktu)
    .sort((kiri, kanan) => String(kanan.waktu).localeCompare(String(kiri.waktu)));
  const nama = puncak.map((item) => item.nama).join(", ");

  return (
    <main className="wrap main v3-gunung">
      <div className="badges v3-gunung-lencana">
        <Badge kind="tau">Sumber: PVMBG</Badge>
        <OfficialLinks links={[
          { href: URL_MAGMA, label: "MAGMA Indonesia" },
          { href: URL_VSI, label: "PVMBG" },
        ]} />
      </div>
      <section className="card">
        <h2>Tingkat aktivitas</h2>
        {galat && !gunung.length ? <p role="alert">{galat} Tidak ada hitungan tingkat aktivitas.</p> : null}
        {!data && !galat ? <p role="status">Memuat cuplikan gunung api…</p> : null}
        {gunung.length ? (
          <p>
            {hitung.Awas} Level IV Awas, {hitung.Siaga} Level III Siaga, {hitung.Waspada} Level II Waspada, {hitung.Normal} Level I Normal.
            {nama ? ` Tertinggi saat ini ${tingkatTertinggi}: ${nama}.` : " Tidak ada gunung di atas Normal."}
            {" "}Sumber: PVMBG. Diambil {formatWib(data.fetched_at)}.
          </p>
        ) : null}
        {data?.kept_tingkat ? <p className="banner warn" role="status">Pembacaan tingkat aktivitas terakhir gagal. Daftar sebelumnya tetap ditampilkan.</p> : null}
        <p>{data?.koordinat || "Koordinat tidak ada pada halaman Tingkat Aktivitas, jadi peta titik tidak digambar."}</p>
        <div className="v3-tingkat-daftar">
          {TINGKAT.map((namaTingkat) => (
            <Kelompok
              key={namaTingkat}
              nama={namaTingkat}
              daftar={gunung.filter((item) => item.tingkat === namaTingkat)}
            />
          ))}
        </div>
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
          <p>{data ? "Tidak ada berita letusan atau VONA dalam 72 jam pada halaman yang terbaca." : null}</p>
        )}
      </section>
    </main>
  );
}
