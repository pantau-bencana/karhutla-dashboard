import { Badge } from "./Badge.jsx";
import { ANALISIS_BUKAN_RESMI, ANALISIS_MATRIKS, ANALISIS_NAMA, ANALISIS_WARNA } from "../lib/analisisPantauBencana.js";
import { BNPB_RESOURCE_URL } from "../lib/bnpbBanjir.js";
import { BMKG_CAP_DOCS, BMKG_CAP_RSS } from "../lib/capKab.js";
import { BMKG_DOCS_URL } from "../lib/bmkgForecast.js";
import { IKLIM_BMKG_URL } from "../lib/dasarianManual.js";
import { PRAKIRAAN_BATAS } from "../lib/prakiraanHujan.js";
import { decorateSources } from "../lib/sourceCatalog.js";
import { GlossaryPage } from "./GlossaryPage.jsx";
import { MetodeAplus } from "./MetodeAplus.jsx";

const KINDS = [
  ["akt", "Aktif", "Observasi", "Diukur atau dideteksi langsung (satelit, stasiun)."],
  ["tun", "Prakiraan", "Prakiraan", "Perkiraan masa depan dari model; ada ketidakpastian."],
  ["pem", "Pembanding, bukan BMKG/KLHK", "Model pembanding", "Dihitung lembaga lain; bukan produk BMKG/KLH."],
  ["sta", "Data statis", "Data statis", "Terbit sekali per periode, tidak berubah harian."],
  ["tau", "Tautan saja", "Tautan saja", "Dashboard hanya mengarahkan ke sumber resmi."],
];

function badgeKind(status) {
  const text = String(status || "");
  if (text === "Aktif") return "akt";
  if (text.includes("Pembanding") || text.includes("pembanding")) return "pem";
  if (text.includes("Prototipe")) return "pro";
  if (text.includes("statis") || text.includes("Statis")) return "sta";
  if (text.includes("Tautan") || text.includes("tautan")) return "tau";
  if (text.includes("Belum") || text.includes("Gagal") || text.includes("Rencana")) return "tun";
  return "tau";
}

export function MetodePage({ manifest, anchor = "", term = "" }) {
  const sources = decorateSources(manifest);
  return (
    <main className="wrap main">
      <header className="page-head">
        <div>
          <h1>Sumber dan batasan data</h1>
          <p className="lead">Jenis data, sumber, kapan diperbarui, dan apa yang tidak boleh dibaca sebagai produk resmi.</p>
        </div>
      </header>

      <section className="card">
        <h2>Jenis data yang dibedakan</h2>
        <ul className="plain-list">
          {KINDS.map(([kind, badge, title, note]) => (
            <li key={kind}>
              <Badge kind={kind}>{badge}</Badge> {title}. {note}
            </li>
          ))}
        </ul>
        <p className="fine">Alur singkat: ambil dari sumber terbuka, tandai tertunda bila basi, cocokkan ke batas BIG hanya bila layanan menjawab, lalu tulis jenis, sumber, dan waktu di samping angka.</p>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Sumber dan batasan data</h2>
          <p>Status mengikuti cuplikan terakhir. Waktu data tampil di tiap tab.</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Sumber</th>
                <th scope="col">Indikator</th>
                <th scope="col">Status</th>
                <th scope="col">Izin / ketentuan</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <tr key={source.id}>
                  <th scope="row">
                    <a href={source.officialUrl} target="_blank" rel="noopener noreferrer">{source.nama}</a>
                    <small>{source.instansi}</small>
                  </th>
                  <td>{source.fungsi}</td>
                  <td><Badge kind={badgeKind(source.status)}>{source.status}</Badge></td>
                  <td>{source.access}{source.limitation ? ` · ${source.limitation}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" id="analisis-banjir">
        <h2>{ANALISIS_NAMA}</h2>
        <p>{ANALISIS_BUKAN_RESMI} Nowcast CAP hanya berlaku kira-kira 0–3 jam dan tidak diubah menjadi status 3 hari.</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Keparahan CAP (istilah asli)</th>
                <th scope="col">Kelas banjir IRBI 2025</th>
                <th scope="col">Analisis</th>
              </tr>
            </thead>
            <tbody>
              {ANALISIS_MATRIKS.map((row) => (
                <tr key={`${row.severity}-${row.kelas}`}>
                  <th scope="row">{row.severity}</th>
                  <td>{row.kelas}</td>
                  <td>
                    <span
                      className="analisis-pill"
                      style={{ background: ANALISIS_WARNA[row.status], color: row.status === "Awas" ? "#fff" : "#1c1915" }}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>Keparahan Minor, Unknown, atau sel tanpa kelas IRBI tidak masuk matriks dan tidak diwarnai. Tanpa peringatan yang masih berlaku, wilayah tidak diwarnai.</p>
        <ul className="plain-list">
          <li>
            CAP nowcast:{" "}
            <a href={BMKG_CAP_DOCS} target="_blank" rel="noopener noreferrer">
              Data Peringatan Dini Cuaca BMKG
            </a>{" "}
            dan{" "}
            <a href={BMKG_CAP_RSS} target="_blank" rel="noopener noreferrer">
              RSS nowcast
            </a>
            . Sumber: BMKG.
          </li>
          <li>
            Prakiraan 3 hari, terpisah dari CAP:{" "}
            <a href={BMKG_DOCS_URL} target="_blank" rel="noopener noreferrer">
              API prakiraan cuaca
            </a>
            . {PRAKIRAAN_BATAS}
          </li>
          <li>IRBI 2025: tabel dikutip dari buku BNPB yang sudah ada di repositori (Aceh dan Bengkulu, dengan halaman). Provinsi lain tidak diisi.</li>
          <li>
            Kejadian banjir 2024:{" "}
            <a href={BNPB_RESOURCE_URL} target="_blank" rel="noopener noreferrer">
              tabel kabupaten BNPB
            </a>
            . Berkas diletakkan manual di data/bnpb/. Sel kosong bukan nol.
          </li>
          <li>
            Dasarian tetap isian manual. Portal iklim:{" "}
            <a href={IKLIM_BMKG_URL} target="_blank" rel="noopener noreferrer">
              iklim.bmkg.go.id
            </a>
            .
          </li>
          <li>Batas wilayah diminta ke layanan BIG saat peta dibuka. Berkas batas tidak disimpan di repositori.</li>
        </ul>
      </section>

      <MetodeAplus anchor={anchor} />

      <GlossaryPage embedded term={term} />

      <div className="split">
        <section className="card">
          <h2>Fungsi bagi pengambil keputusan</h2>
          <p>Hotspot menunjukkan di mana ada deteksi panas sekarang. FWI pembanding menunjukkan kemudahan terbakar menurut model pihak ketiga, bukan FDRS BMKG. IRBI adalah konteks risiko jangka panjang. ISPU, bila nanti terhubung, adalah dampak asap di stasiun pemantau.</p>
        </section>
        <section className="card">
          <h2>Batasan</h2>
          <p>Hotspot bukan konfirmasi kebakaran. FWI GWIS memakai kelas sendiri, tidak sama dengan kelas FDRS BMKG. Tidak ada prediksi ISPU. Daftar prioritas adalah pemodelan pihak ketiga (Metode A+), bukan prakiraan resmi BMKG/BNPB. FWI pada daftar hanya 9 hari.</p>
        </section>
      </div>
    </main>
  );
}
