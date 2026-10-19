import { pageHref } from "../lib/route.js";
import { PriorityIndicators } from "./PriorityIndicators.jsx";
import { Term } from "./Term.jsx";

const FLOW = [
  { nama: "Pengumpulan data", data: "API BMKG, RSS CAP, CKAN DIBI, tabel IRBI, dan FIRMS bila kunci ada." },
  { nama: "Pemeriksaan data", data: "CSV yang ternyata halaman web ditolak. Gagal unduh menyimpan berkas terakhir." },
  { nama: "Penyeragaman data", data: "Kolom tanggal, wilayah, dan angka dipakai dengan nama yang sama." },
  { nama: "Penempatan pada wilayah", data: "Nama resmi pada data. Tanpa nama: belum dapat dipetakan secara administratif." },
  { nama: "Overlay dan pembacaan indikator", data: "Satu lapisan pada satu waktu. Lapisan tidak digabung otomatis." },
  { nama: "Penentuan wilayah perhatian", data: "Alasan terlihat. Tidak ada skor resmi atau rekomendasi operasi otomatis." },
  { nama: "Penyajian", data: "Ringkasan, peta, logika, sumber, dan glosarium." },
  { nama: "Pembaruan dan arsip", data: "Jadwal tiap 3 jam. Tanggal tanpa berkas tetap kosong." },
];

const ROWS = [
  ["Hotspot", "Lokasi deteksi satelit yang perlu diperiksa.", "Bukan titik api dan bukan prakiraan besok.", "Alasan perhatian hanya jika data resmi tersambung.", "Situs memakai cuplikan data/live. Berkas contoh hotspot tidak ditampilkan."],
  ["inaRISK", "Bahaya dasar karhutla.", "Portal dan layanan raster, bukan tabel kabupaten.", "Belum memakai alasan bahaya dasar tinggi dari peta ini.", "Tautan saja. Raster inaRISK tidak digambar."],
  ["IRBI 2025", "Membandingkan risiko tahunan.", "Skor buku, tidak mengikuti tanggal.", "Konteks tahunan, bukan urutan 14 hari.", "Halaman 294–307. Komponen yang tidak ada di buku dikosongkan."],
  ["Asap", "Sebaran asap terpantau.", "Halaman dan citra resmi.", "Tidak menjadi alasan perhatian.", "Tautan saja – menunggu izin BMKG. Arsip citra mati. Tidak ada gambar buatan."],
  ["FDRS", "Kemudahan terbakar menurut BMKG.", "Citra SPARTAN hingga H+7 sesuai produk BMKG.", "Belum menjadi alasan perhatian.", "menunggu data resmi BMKG. Tidak didigitasi. Bukan 10 atau 14 hari."],
  ["Hujan", "Konteks basah atau kering.", "API 3 hari memuat nilai tp, bukan peluang persen. Dasarian hanya tautan.", "Tidak dipakai untuk menebak titik api.", "Produk dasarian, curah hujan tinggi, dan narasi sepekan tidak dikorek. Pembanding 14 hari terpisah dan tidak menjadi peluang BMKG."],
  ["Angin", "Arah dan kecepatan jangka pendek.", "wd dan ws pada prakiraan 3 hari, km/jam menurut dokumentasi BMKG.", "Bukan penentu asal kebakaran.", "Satu kelurahan per provinsi prioritas. Vektor satelit hanya tautan. Angin 14 hari pada titik wakil hanya pembanding."],
  ["Kualitas Udara (ISPU)", "Dampak asap pada mutu udara di lokasi stasiun.", "Nilai stasiun, bukan seluruh kabupaten. Bukan bukti tunggal asal karhutla.", "Tidak masuk daftar perhatian.", "Tanpa API resmi: belum terhubung. Hanya Hari Ini dan Historis. Tidak ada prediksi. CAMS tidak ditampilkan di lapisan ini."],
];

export function LogicPage() {
  return (
    <main className="wrap main logic-page">
      <p className="back-row">
        <a className="button" href={pageHref("ringkasan")}>
          Kembali ke ringkasan
        </a>
      </p>
      <div className="banner sample" role="note">
        <strong>Ini penjelasan prototipe, bukan peringatan resmi.</strong>
        <p>Jumlah deteksi pada Peta dan Data adalah pengamatan satelit, bukan penetapan operasional. Sumber yang belum tersambung ditulis Tautan saja atau Tidak tersedia. Berkas contoh tidak ditampilkan.</p>
      </div>

      <section className="card">
        <header className="card-head">
          <div>
            <h2>Arahan yang direncanakan</h2>
            <p>Bukan klaim bahwa daftar ini sudah dihitung.</p>
          </div>
        </header>
        <div className="logic-body">
          <p>
            Daftar yang ditampilkan berjudul Prioritas kesiapsiagaan 14 hari (FWI hanya 9 hari). Jenisnya pemodelan
            pihak ketiga (Metode A+), bukan prakiraan resmi BMKG/BNPB. FDRS dan potensi karhutla BMKG tetap tautan:
            horizon API 3 hari, citra SPARTAN hingga H+7 sesuai produk BMKG, bukan prakiraan 14 hari resmi.
          </p>
          <p>
            Daftar 15–20 kabupaten/kota tidak diurutkan dari IRBI, citra, atau prakiraan terbuka. Tabel hujan dan FWI
            terbuka pada Peta dan Data, bila ada, adalah angka pembanding pada titik wakil. Itu bukan daftar prioritas
            dan bukan daftar risiko.
          </p>
        </div>
      </section>

      <section className="card">
        <header className="card-head">
          <div>
            <h2>Indikator</h2>
            <p>Fungsi, cara membaca, peran pada wilayah perhatian, dan yang tidak boleh disimpulkan.</p>
          </div>
        </header>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Fungsi</th>
                <th scope="col">Cara membaca</th>
                <th scope="col">Wilayah perhatian</th>
                <th scope="col">Keterbatasan</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, index) =>
                    index === 0 ? (
                      <th key={cell} scope="row">
                        {cell}
                      </th>
                    ) : (
                      <td key={cell}>{cell}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <PriorityIndicators rinci />

      <section className="card">
        <header className="card-head">
          <div>
            <h2>Alur</h2>
            <p>Delapan tahap dari sumber sampai arsip.</p>
          </div>
        </header>
        <div className="logic-body">
          <ol className="flow flow-wide">
            {FLOW.map((step) => (
              <li key={step.nama}>
                {step.nama}
                <span className="flow-note">{step.data}</span>
              </li>
            ))}
          </ol>
          <p className="flow-caption">
            Sumber Data → Validasi → Penyeragaman → Pemetaan → Overlay → Wilayah Perhatian → Dashboard → Arsip
          </p>
        </div>
      </section>

      <section className="card">
        <header className="card-head">
          <div>
            <h2>Batas wilayah</h2>
          </div>
        </header>
        <div className="logic-body">
          <ul className="plan-list">
            <li>
              <span className="status-pill status-rencana">rencana pengembangan</span>
              Berkas batas administrasi di repositori. Nama wilayah hotspot datang dari kueri BIG saat pembaruan, tanpa menyimpan geometri.
            </li>
            <li>
              <span className="status-pill status-rencana">rencana pengembangan</span>
              Batas kawasan gambut, kawasan hutan, atau konsesi
            </li>
          </ul>
          <p>
            Nama wilayah yang tidak ada pada data tidak ditebak dari kotak koordinat. Baris itu ditandai belum dapat
            dipetakan secara administratif.
          </p>
        </div>
      </section>
    </main>
  );
}
