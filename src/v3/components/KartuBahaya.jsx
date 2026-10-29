import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { formatAngka, formatTanggalPendek } from "../../lib/format.js";

function Bingkai({ judul, catatan, href, aksi, lembut = false, children }) {
  return (
    <article className={lembut ? "v3-kartu v3-kartu-lembut" : "v3-kartu"}>
      <header className="v3-kartu-kepala">
        <h2>{judul}</h2>
        {catatan ? <span className="v3-samar">{catatan}</span> : null}
      </header>
      {children}
      <a className="v3-tautan" href={href}>{aksi}</a>
    </article>
  );
}

export function KartuKarhutla({ feed, jumlah, hitung, batang, jendelaLabel }) {
  const boleh = feed && !feed.contoh && (feed.status === "berhasil" || feed.status === "usang");
  return (
    <Bingkai judul="Karhutla" catatan={jendelaLabel} href="#/karhutla/peta" aksi="Buka peta" lembut>
      {boleh ? (
        <>
          <p className="v3-angka">{formatAngka(jumlah)}</p>
          <p className="v3-angka-catatan">Deteksi satelit, bukan kebakaran terkonfirmasi.</p>
          <p className="v3-legenda">
            <span>{formatAngka(hitung.merah)} kepercayaan tinggi</span>
            <span>{formatAngka(hitung.oranye)} sedang</span>
            <span>{formatAngka(hitung.kuning)} rendah</span>
          </p>
          {batang.length ? (
            <div className="v3-grafik" aria-label="Jumlah deteksi pada tanggal yang ada di cuplikan">
              <ResponsiveContainer width="100%" height={88}>
                <BarChart data={batang} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="hari" tickFormatter={formatTanggalPendek} tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(nilai) => [formatAngka(nilai), "Deteksi"]} labelFormatter={formatTanggalPendek} />
                  <Bar dataKey="jumlah" fill="#5b5bd6" radius={[4, 4, 0, 0]} barSize={28} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
              <p className="v3-grafik-catatan">Hanya tanggal yang ada pada cuplikan. Tanggal kosong tidak diisi.</p>
            </div>
          ) : null}
        </>
      ) : (
        <p className="v3-angka-catatan">{feed?.error || "Cuplikan titik panas tidak ditampilkan."} Tidak ada hitungan pada kartu ini.</p>
      )}
    </Bingkai>
  );
}

export function KartuBanjir({ total, galat }) {
  const nilai = !total ? (galat ? "Tidak termuat" : "Memuat…") : (total.awas > 0 ? "Awas" : total.siaga > 0 ? "Siaga" : total.waspada > 0 ? "Waspada" : "Tanpa status");
  return (
    <Bingkai judul="Banjir" catatan="Hari ini" href="#/banjir" aksi="Buka banjir">
      <p className="v3-angka">{nilai}</p>
      <p className="v3-angka-catatan">Analisis dasbor, bukan status resmi.</p>
      {total ? (
        <ul className="v3-hitung-daftar">
          <li><i className="v3-kotak v3-kotak-awas" /> Awas {formatAngka(total.awas)}</li>
          <li><i className="v3-kotak v3-kotak-siaga" /> Siaga {formatAngka(total.siaga)}</li>
          <li><i className="v3-kotak v3-kotak-waspada" /> Waspada {formatAngka(total.waspada)}</li>
        </ul>
      ) : (
        <p className="v3-angka-catatan">{galat || "Menunggu cuplikan analisis."}</p>
      )}
    </Bingkai>
  );
}

export function KartuGunung({ hitung, tingkat, galat, ada }) {
  return (
    <Bingkai judul="Gunung api" catatan="Tingkat aktivitas" href="#/gunung-api" aksi="Buka gunung api">
      <p className="v3-angka">{galat && !ada ? "Tidak termuat" : (tingkat || "Memuat…")}</p>
      <p className="v3-angka-catatan">Sumber: PVMBG. Level IV Awas dan Level III Siaga masuk Perlu perhatian.</p>
      {ada ? (
        <ul className="v3-hitung-daftar">
          <li><i className="v3-kotak v3-kotak-awas" /> Awas {formatAngka(hitung.Awas)}</li>
          <li><i className="v3-kotak v3-kotak-siaga" /> Siaga {formatAngka(hitung.Siaga)}</li>
          <li><i className="v3-kotak v3-kotak-waspada" /> Waspada {formatAngka(hitung.Waspada)}</li>
          <li><i className="v3-kotak v3-kotak-normal" /> Normal {formatAngka(hitung.Normal)}</li>
        </ul>
      ) : (
        <p className="v3-angka-catatan">{galat || "Cuplikan tingkat aktivitas belum ada."}</p>
      )}
    </Bingkai>
  );
}

export function KartuSiklon({ status, sistem, galat }) {
  return (
    <Bingkai judul="Siklon" catatan="BMKG" href="#/siklon" aksi="Buka siklon">
      <p className="v3-angka v3-angka-kecil">{galat ? "Tidak termuat" : (status || "Memuat…")}</p>
      <p className="v3-angka-catatan">Sumber: BMKG. Baris JMA dan JTWC tidak dihitung di kartu ini.</p>
      {sistem.length ? (
        <ul className="v3-siklon">
          {sistem.map((item) => (
            <li key={item.nama}>
              <strong>{item.nama}</strong>
              <span>{item.dampak && item.dampak !== "-" ? item.dampak : "Potensi dampak: -"}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="v3-angka-catatan">{galat || "Tidak ada sistem BMKG pada cuplikan."}</p>
      )}
    </Bingkai>
  );
}
