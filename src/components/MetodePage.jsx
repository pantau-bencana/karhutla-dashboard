import { Badge } from "./Badge.jsx";
import { ANALISIS_BUKAN_RESMI, ANALISIS_MATRIKS, ANALISIS_NAMA, ANALISIS_WARNA } from "../lib/analisisPantauBencana.js";
import { BNPB_RESOURCE_URL, DAMPAK_HISTORIS_CATATAN, HISTORIS_BANJIR_CATATAN, HISTORIS_DISCLAIMER } from "../lib/bnpbBanjir.js";
import { BMKG_CAP_DOCS, BMKG_CAP_RSS } from "../lib/capKab.js";
import { BMKG_DOCS_URL } from "../lib/bmkgForecast.js";
import { IKLIM_BMKG_URL } from "../lib/dasarianManual.js";
import { BATAS_KAB_SUMBER } from "../lib/batasKab.js";
import { BIG_SERVICE } from "../lib/bigWilayah.js";
import { BPS_PENDUDUK_URL, PENDUDUK_BUKAN_TERPAPAR, RUMAH_BELUM } from "../lib/pendudukKab.js";
import { IRBI_BANJIR_TERVERIFIKASI, IRBI_BUKU_BANJIR_URL, IRBI_PENGGUNAAN_INTERNAL } from "../lib/floodMatrix.js";
import {
  HUJAN_GPM_CATATAN,
  HUJAN_PEMBANDING_JENIS,
  HUJAN_PEMBANDING_LISENSI,
  HUJAN_PEMBANDING_MODEL,
  HUJAN_PEMBANDING_URL,
  HUJAN_TANPA_NOWCAST,
  HUJAN_TITIK_BATAS,
} from "../lib/hujanPembanding.js";
import { CUACA_DISCLAIMER, CUACA_RUJUKAN, PEMETAAN_CUACA, PRAKIRAAN_BATAS } from "../lib/prakiraanHujan.js";
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

      <section className="card" id="petunjuk-banjir">
        <h2>Petunjuk perhitungan banjir</h2>
        <p className="banner warn" role="note">
          <strong>Penggunaan internal.</strong>
          <span> {IRBI_PENGGUNAAN_INTERNAL.replace(/^Penggunaan internal\.\s*/, "")}</span>
        </p>
        <p>
          {ANALISIS_NAMA}. {ANALISIS_BUKAN_RESMI}
        </p>
        <h3>Langkah</h3>
        <ol className="plain-list">
          <li>Buka tab 0–3 jam. Warna memakai peringatan CAP BMKG yang tersimpan. Istilah severity dan event dibiarkan apa adanya. Tab ini tidak memakai prakiraan 3 hari. Bila belum ada cuplikan yang lebih baru, cuplikan terakhir tetap dipakai.</li>
          <li>Pada tab Hari ini, Besok, atau Lusa, baca satu titik sampel per kab/kota. {PEMETAAN_CUACA}</li>
          <li>Cocokkan kabupaten/kota ke kelas banjir IRBI 2025. Tanpa kelas, tulisannya IRBI tidak tersedia dan tidak ada status matriks.</li>
          <li>Pasangkan keparahan (CAP pada tab 0–3 jam, atau pemetaan cuaca pada tab hari) dengan kelas IRBI pada matriks di bawah. Hasilnya Awas, Siaga, atau Waspada.</li>
          <li>Pada tab 0–3 jam, peringatan yang masa berlakunya sudah lewat tetap diwarnai sebagai data terakhir, dengan label bahwa masa berlaku sudah lewat. Itu bukan peringatan yang masih berlaku. Wilayah tanpa peringatan pada cuplikan nasional diwarnai abu-abu. Itu bukan pernyataan aman.</li>
          <li>Tanpa data — prakiraan titik tidak ada, kelas IRBI tidak ada pada cuaca yang masuk matriks, keparahan CAP yang tidak masuk matriks, atau cuplikan CAP belum bertanda cakupan nasional — wilayah diarsir. Arsir bukan angka nol. Kode cuaca yang belum dikenali tidak diarsir; warnanya abu-abu.</li>
        </ol>
        <h3>Matriks 3×3</h3>
        <p>
          Baris adalah keparahan. Pada tab 0–3 jam itu istilah CAP. Pada tab hari itu hasil pemetaan teks cuaca. Kolom kelas IRBI menghasilkan status analisis.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Keparahan CAP</th>
                <th scope="col">IRBI Tinggi</th>
                <th scope="col">IRBI Sedang</th>
                <th scope="col">IRBI Rendah</th>
              </tr>
            </thead>
            <tbody>
              {["Extreme", "Severe", "Moderate"].map((severity) => (
                <tr key={severity}>
                  <th scope="row">{severity}</th>
                  {["Tinggi", "Sedang", "Rendah"].map((kelas) => {
                    const hit = ANALISIS_MATRIKS.find((row) => row.severity === severity && row.kelas === kelas);
                    return (
                      <td key={kelas}>
                        <span
                          className="analisis-pill"
                          style={{ background: ANALISIS_WARNA[hit.status], color: hit.status === "Awas" ? "#fff" : "#1c1915" }}
                        >
                          {hit.status}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>Keparahan Minor dan Unknown pada CAP tidak masuk matriks. Sel tanpa kelas IRBI tidak diwarnai sebagai Awas, Siaga, atau Waspada bila cuacanya masuk matriks.</p>
        <h3>Kode cuaca pada tab hari</h3>
        <p>{PEMETAAN_CUACA}</p>
        <p>{CUACA_DISCLAIMER}</p>
        <ul className="plain-list">
          {CUACA_RUJUKAN.map(([nama, href]) => (
            <li key={href}>
              <a href={href} target="_blank" rel="noopener noreferrer">
                {nama}
              </a>
            </li>
          ))}
        </ul>
        <h3>Waktu yang sah</h3>
        <ul className="plain-list">
          <li>0–3 jam: nowcast CAP. Berlaku kira-kira dari waktu terbit sampai kedaluwarsa pada berkas CAP, biasanya beberapa jam. Bukan status 3 hari.</li>
          <li>Hari ini, Besok, Lusa: prakiraan cuaca resmi 3 hari pada satu titik per kab/kota. Tanggal tab dihitung dari hari ini zona WIB. Slot yang dihitung adalah slot yang tanggal local_datetime-nya sama dengan tanggal tab. Waktu pada titik tidak ditulis ulang menjadi WIB.</li>
        </ul>
        <h3>Data Pembanding curah hujan</h3>
        <p>
          Lapisan ini terpisah dari warna Awas, Siaga, dan Waspada. Angkanya jumlah hujan harian pada koordinat titik adm4 yang sama, dari{" "}
          <a href={HUJAN_PEMBANDING_URL} target="_blank" rel="noopener noreferrer">Open-Meteo</a>
          , model {HUJAN_PEMBANDING_MODEL}. Jenis datanya {HUJAN_PEMBANDING_JENIS}. Satuan mm. Lisensi{" "}
          <a href={HUJAN_PEMBANDING_LISENSI} target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
          . Nilai itu tidak masuk matriks dan tidak menetapkan Awas, Siaga, atau Waspada. {HUJAN_TANPA_NOWCAST} {HUJAN_TITIK_BATAS} Bila prakiraan BMKG untuk Hari ini, Besok, atau Lusa tidak ada, angka mm tetap tampil pada tabel dan tooltip tanpa mewarnai poligon. {HUJAN_GPM_CATATAN} Bila pengambilan gagal, cuplikan model yang sama tetap ditampilkan beserta waktu ambilnya.
        </p>
        <h3>Satu titik per kabupaten/kota</h3>
        <p>{PRAKIRAAN_BATAS}</p>
        <p>{PEMETAAN_CUACA}</p>
        <h3>Sumber</h3>
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
            . {PRAKIRAAN_BATAS} {PEMETAAN_CUACA}
          </li>
          <li>
            IRBI 2025 banjir: {IRBI_BANJIR_TERVERIFIKASI}{" "}
            <a href={IRBI_BUKU_BANJIR_URL} target="_blank" rel="noopener noreferrer">
              Buku IRBI 2025, tabel banjir
            </a>
            .
          </li>
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
          <li>
            Penduduk kabupaten/kota, proyeksi 2026:{" "}
            <a href={BPS_PENDUDUK_URL} target="_blank" rel="noopener noreferrer">
              Jumlah Penduduk menurut Kabupaten/Kota, BPS
            </a>
            . Tiap baris menyimpan URL sumbernya. Rumah tangga/KK hanya terisi untuk DKI Jakarta, Banten, dan Jawa Timur. Selain itu tertulis {RUMAH_BELUM}. Angka yang tampil adalah {PENDUDUK_BUKAN_TERPAPAR}.
          </li>
          <li>
            Peta kab/kota memakai berkas batas yang disimpan dari layanan BIG{" "}
            <a href={BIG_SERVICE} target="_blank" rel="noopener noreferrer">
              BATAS_WILAYAH
            </a>
            . {BATAS_KAB_SUMBER} Kode pada berkas penduduk mengikuti kode kabupaten di layanan itu, bukan kode BPS yang tertulis di dalam kalimat sumber. Nama wilayah hotspot tetap diisi saat pembaruan, tanpa menyimpan geometri hotspot.
          </li>
        </ul>
        <h3>Batasan</h3>
        <ul className="plain-list">
          <li>Awas, Siaga, dan Waspada pada peta ini adalah analisis dasbor, bukan status resmi BMKG atau BNPB.</li>
          <li>Satu titik per kab/kota bukan rata-rata wilayah dan, di luar enam kelurahan yang sudah dicek, bukan ibu kota yang diverifikasi. Kecamatan dan kelurahan tidak ditampilkan di halaman Banjir.</li>
          <li>Empat kab/kota tanpa kelas banjir di Buku IRBI 2025 halaman 212–227 tetap kosong: Adm. Kep. Seribu, Bangli, Kep. Siau Tagulandang Biaro, dan Kota Ternate.</li>
          <li>Cuplikan kejadian BNPB 2024 yang tersimpan tidak dipakai untuk menyatakan provinsi lain tidak tercantum di tabel nasional.</li>
          <li>{HISTORIS_BANJIR_CATATAN} Kolom Historis tetap “Cuplikan DIBI belum tersedia” bila cuplikan itu tidak termuat.</li>
          <li>{HISTORIS_DISCLAIMER}</li>
          <li>Potensi penduduk terdampak dan potensi rumah terdampak memakai total kab/kota BPS. potensi = total kab/kota (BPS), bukan estimasi jumlah terpapar. Halaman inaRISK yang menampilkan jiwa terpapar tidak dipakai.</li>
          <li>
            Penduduk terdampak dan rumah terdampak pada rincian kab/kota tertulis belum tersedia. {DAMPAK_HISTORIS_CATATAN} Angka provinsi tidak dipakai sebagai angka kabupaten.
          </li>
          <li>{BATAS_KAB_SUMBER}</li>
          <li>Cuplikan CAP yang belum bertanda cakupan nasional tidak dipakai untuk menyatakan suatu kabupaten aman.</li>
          <li>Dropdown DAS bertuliskan belum terintegrasi. Klasifikasi DAS belum terintegrasi dan tidak memuat data DAS.</li>
        </ul>
        <h3>Rujukan</h3>
        <ul className="plain-list">
          <li>
            <a href={BMKG_CAP_DOCS} target="_blank" rel="noopener noreferrer">
              Data Peringatan Dini Cuaca BMKG
            </a>
          </li>
          <li>
            <a href={BMKG_CAP_RSS} target="_blank" rel="noopener noreferrer">
              RSS nowcast BMKG
            </a>
          </li>
          <li>
            <a href={BMKG_DOCS_URL} target="_blank" rel="noopener noreferrer">
              Dokumentasi prakiraan cuaca BMKG
            </a>
          </li>
          <li>
            <a href={IRBI_BUKU_BANJIR_URL} target="_blank" rel="noopener noreferrer">
              Buku IRBI 2025, tabel banjir halaman 212–227
            </a>
          </li>
          <li>
            <a href={BNPB_RESOURCE_URL} target="_blank" rel="noopener noreferrer">
              Resource kejadian bencana kabupaten 2024, BNPB
            </a>
          </li>
          <li>
            <a href={BPS_PENDUDUK_URL} target="_blank" rel="noopener noreferrer">
              Tabel proyeksi penduduk kabupaten/kota, BPS
            </a>
          </li>
          <li>
            <a href={IKLIM_BMKG_URL} target="_blank" rel="noopener noreferrer">
              Iklim BMKG
            </a>
          </li>
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
