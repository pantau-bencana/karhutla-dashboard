import { pageHref } from "../lib/route.js";
import { monitoringSources } from "../lib/sourceStatus.js";
import { formatAmbang } from "../lib/format.js";

const FLOW = [
  "Sumber data",
  "Validasi dan normalisasi",
  "Filter tanggal/wilayah",
  "Pemetaan dan analisis",
  "Tampilan dashboard",
];

const STATUS_CLASS = {
  aktif: "status-berhasil",
  contoh: "status-contoh",
  "CSV yang dikonfigurasi": "status-csv",
  "belum terhubung": "status-off",
  "rencana pengembangan": "status-rencana",
};

function resolveHref(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  try {
    return new URL(url, document.baseURI).href;
  } catch {
    return url;
  }
}

export function LogicPage({ config, feeds, configError }) {
  const sources = monitoringSources({ config, feeds });
  const thresholds = config?.peringatan;

  return (
    <main className="wrap main logic-page">
      <p className="back-row">
        <a className="button" href={pageHref("dashboard")}>
          Kembali ke dashboard
        </a>
      </p>

      <div className="banner sample" role="note">
        <strong>Ini penjelasan prototipe, bukan peringatan resmi.</strong>
        <p>
          Data contoh bukan data operasional. Status Waspada, Siaga, dan Awas pada dasbor belum menjadi peringatan
          resmi BNPB atau BMKG.
        </p>
      </div>

      {configError ? (
        <div className="banner error" role="alert">
          <strong>Konfigurasi belum termuat.</strong>
          <p>{configError}</p>
        </div>
      ) : null}

      <section className="card logic-card" aria-labelledby="alur-heading">
        <header className="card-head">
          <div>
            <h2 id="alur-heading">Alur singkat</h2>
            <p>Dari berkas atau API sampai angka yang terlihat di dasbor.</p>
          </div>
        </header>
        <div className="logic-body">
          <ol className="flow">
            {FLOW.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="flow-caption">
            Sumber data → validasi dan normalisasi → filter tanggal/wilayah → pemetaan dan analisis → tampilan
            dashboard.
          </p>
        </div>
      </section>

      <section className="card logic-card" aria-labelledby="sumber-heading">
        <header className="card-head">
          <div>
            <h2 id="sumber-heading">A. Sumber data</h2>
            <p>
              Hotspot dapat bersumber dari NASA FIRMS, lewat API atau CSV. Sumber lain yang saat ini tertulis di
              konfigurasi adalah SiPongi, cuaca dan FDRS (BMKG), IRBI, serta ISPU. Status di samping mengikuti yang
              benar-benar dipakai, bukan rencana.
            </p>
          </div>
        </header>
        <div className="logic-body">
          {sources.length ? (
            <ul className="sources">
              {sources.map((source) => (
                <li key={source.id}>
                  <div className="source-top">
                    <h3>{source.nama}</h3>
                    <span className={`status-pill ${STATUS_CLASS[source.status] || ""}`}>{source.status}</span>
                  </div>
                  <dl>
                    <div>
                      <dt>Instansi</dt>
                      <dd>{source.instansi}</dd>
                    </div>
                    <div>
                      <dt>Jalur</dt>
                      <dd>{source.saluran}</dd>
                    </div>
                    <div>
                      <dt>{source.berkas && !source.tautan ? "Berkas" : "Tautan"}</dt>
                      <dd>
                        {source.tautan ? (
                          <a href={source.tautan} target="_blank" rel="noreferrer">
                            {source.tautanLabel || source.tautan}
                          </a>
                        ) : source.berkas ? (
                          <a href={resolveHref(source.berkas)}>{source.berkas}</a>
                        ) : (
                          "Tidak ada tautan sumber di konfigurasi"
                        )}
                      </dd>
                    </div>
                  </dl>
                  <p className="fine">{source.catatan}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">Belum ada sumber yang dapat diperiksa.</p>
          )}
        </div>
      </section>

      <section className="card logic-card" aria-labelledby="lapisan-heading">
        <header className="card-head">
          <div>
            <h2 id="lapisan-heading">B. Lapisan peta</h2>
            <p>Hanya lapisan yang sudah ada di aplikasi yang disebut berjalan.</p>
          </div>
        </header>
        <div className="logic-body stack">
          <div>
            <h3 className="logic-sub">Sudah berjalan</h3>
            <ul className="plain-list">
              <li>
                <strong>Titik hotspot.</strong> Setiap titik digambar di lintang dan bujur yang ada pada data. Warna
                mengikuti kelas kepercayaan. Koordinat tidak digeser agar muat di layar.
              </li>
              <li>
                <strong>Peta dasar OpenStreetMap.</strong> Ini hanya latar peta, bukan data kebakaran.
              </li>
            </ul>
          </div>
          <div>
            <h3 className="logic-sub">Bukan overlay batas resmi</h3>
            <p>
              Jika satu baris hotspot tidak memuat nama provinsi, aplikasi menebak provinsi dari kotak koordinat kasar.
              Kotak itu tidak digambar di peta dan bukan batas provinsi atau kabupaten resmi. Titik di dekat
              perbatasan bisa masuk provinsi yang salah. Berkas contoh sudah berisi nama provinsi, jadi tebakan ini
              baru dipakai pada CSV FIRMS yang tidak punya kolom provinsi.
            </p>
          </div>
          <div>
            <h3 className="logic-sub">Belum diterapkan</h3>
            <ul className="plan-list">
              <li>
                <span className="status-pill status-rencana">rencana pengembangan</span>
                Batas administrasi resmi provinsi dan kabupaten
              </li>
              <li>
                <span className="status-pill status-rencana">rencana pengembangan</span>
                Batas kawasan gambut, kawasan hutan, atau konsesi
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="card logic-card" aria-labelledby="olah-heading">
        <header className="card-head">
          <div>
            <h2 id="olah-heading">C. Pengolahan dan analisis</h2>
            <p>Langkah yang dijalankan aplikasi terhadap data yang berhasil dimuat.</p>
          </div>
        </header>
        <div className="logic-body">
          <ol className="plain-list numbered">
            <li>Membaca CSV dan menolak isi yang ternyata halaman web, misalnya halaman masuk.</li>
            <li>
              Menormalkan kolom. Nama Indonesia dan nama FIRMS dikenali, misalnya tanggal atau acq_date, lintang atau
              latitude, bujur atau longitude.
            </li>
            <li>Menyaring titik menurut tanggal dan provinsi yang dipilih.</li>
            <li>Menghitung jumlah titik hotspot pada rentang tanggal itu.</li>
            <li>
              Menampilkan tingkat kepercayaan jika kolomnya terisi. Nilainya dikelompokkan menjadi tinggi, nominal,
              atau rendah. Jika kolom kosong, titik ditandai nominal agar tetap punya warna.
            </li>
            <li>
              Jika jumlah hotspot dan nilai FWI (FDRS) sama-sama ada, status provinsi memakai tingkat yang lebih
              tinggi di antara keduanya. Jika FWI tidak ada, status hanya berasal dari jumlah hotspot.
            </li>
          </ol>
          <p className="fine">
            Ambang Waspada, Siaga, dan Awas yang dipakai sekarang bersifat ilustratif dan belum menjadi peringatan
            resmi BNPB atau BMKG.
            {thresholds ? ` ${formatAmbang(thresholds)}` : " Angkanya dibaca dari konfigurasi prototipe."}
          </p>
          {thresholds?.catatan ? <p className="fine">{thresholds.catatan}</p> : null}
        </div>
      </section>

      <section className="card logic-card" aria-labelledby="hasil-heading">
        <header className="card-head">
          <div>
            <h2 id="hasil-heading">D. Hasil yang ditampilkan</h2>
            <p>Keluaran yang ada di halaman dasbor saat ini.</p>
          </div>
        </header>
        <div className="logic-body">
          <ul className="plain-list">
            <li>Peta sebaran titik hotspot.</li>
            <li>Jumlah titik dan grafik tren.</li>
            <li>Ringkasan serta tabel per provinsi.</li>
            <li>Status prototipe berdasarkan hotspot dan/atau FWI.</li>
            <li>Tabel dataset lain: SiPongi, IRBI, cuaca dan FDRS, serta ISPU.</li>
          </ul>
          <p className="fine">
            Tabel IRBI tidak mengikuti filter tanggal karena datanya tahunan. Tabel dan grafik lain mengikuti tanggal
            yang dipilih.
          </p>
        </div>
      </section>
    </main>
  );
}
