import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { formatAngka, formatTanggal, formatTanggalPendek } from "../lib/format.js";
import { ringkasTingkat } from "../lib/gunungApi.js";
import { hariCuplikan } from "../lib/laporanHarian.js";
import { loadAll } from "../lib/loadData.js";
import { kelasPeringkat, susunPeringkatHotspot } from "../lib/peringkatHotspot.js";
import { batangTanggal, namaGunungPerLevel, susunButir, susunUbin, ubahHari } from "./susunRingkasan.js";

const AWAL = 5;
const LEVEL = [
  [4, "Level IV", "awas"],
  [3, "Level III", "siaga"],
  [2, "Level II", "waspada"],
  [1, "Level I", "normal"],
];

function ambilJson(path, sinyal) {
  return fetch(new URL(path, document.baseURI).href, { cache: "no-store", signal: sinyal }).then(async (response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  });
}

function jamWib(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function TipGelap({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="v2o-tip-grafik">
      <strong>{formatTanggal(label)}</strong>
      <span>{formatAngka(payload[0].value)} deteksi satelit</span>
    </div>
  );
}

function IkonMuat() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M13.2 8a5.2 5.2 0 1 1-1.4-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M13.4 2.8v3.2H10.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RingkasanV2() {
  const [muat, setMuat] = useState(0);
  const [paket, setPaket] = useState(null);
  const [galat, setGalat] = useState("");
  const [banjirGalat, setBanjirGalat] = useState("");
  const [buka, setBuka] = useState(false);

  useEffect(() => {
    const kontrol = new AbortController();
    setGalat("");
    setBanjirGalat("");
    const tugas = async () => {
      const config = await ambilJson("config.json", kontrol.signal);
      const [feeds, banjir, gunung, siklon] = await Promise.all([
        loadAll(config),
        ambilJson("data/live/banjir-ringkasan.json", kontrol.signal).catch((error) => {
          setBanjirGalat(error.message || "Cuplikan banjir tidak termuat.");
          return null;
        }),
        ambilJson("data/live/gunung-api.json", kontrol.signal).catch(() => null),
        ambilJson("data/live/siklon-bmkg.json", kontrol.signal).catch(() => null),
      ]);
      if (!kontrol.signal.aborted) setPaket({ feeds, banjir, gunung, siklon });
    };
    tugas().catch((error) => {
      if (error.name !== "AbortError") setGalat(error.message || "Ringkasan tidak termuat.");
    });
    return () => kontrol.abort();
  }, [muat]);

  const hotspot = paket?.feeds?.find((feed) => feed.id === "hotspot");
  const boleh = hotspot && !hotspot.contoh && (hotspot.status === "berhasil" || hotspot.status === "usang");
  const baris = boleh ? hotspot.rows : [];
  const hari = hariCuplikan(baris);
  const hariIni = baris.filter((titik) => String(titik?.tanggal || "").slice(0, 10) === hari);
  const peringkat = susunPeringkatHotspot(hariIni, { tingkat: "provinsi" }).baris;
  const batang = batangTanggal(baris);
  const ubah = ubahHari(batang);
  const merah = hariIni.filter((titik) => kelasPeringkat(titik) === "merah").length;
  const gunung = Array.isArray(paket?.gunung?.gunung) ? paket.gunung.gunung : [];
  const namaLevel = namaGunungPerLevel(gunung);
  const ringkas = ringkasTingkat(gunung);
  const tab = paket?.banjir?.tabs?.find((item) => item.id === "hari-ini");
  const sistem = (paket?.siklon?.sistem_halaman || []).filter((item) => String(item.agensi || "BMKG").toUpperCase() === "BMKG");
  const butir = susunButir({
    gunung,
    banjirBaris: tab?.rows || [],
    peringkatProvinsi: peringkat,
    sistemBmkg: sistem,
  });
  const ubin = susunUbin({
    adaHotspot: Boolean(boleh),
    jumlahHotspot: hariIni.length,
    merahHotspot: merah,
    banjir: tab?.total || null,
    siklonStatus: paket?.siklon?.status_teks || (paket ? "Tidak termuat" : ""),
    sistemBmkg: sistem,
    gunung,
    gunungGalat: Boolean(paket && !paket.gunung),
  });
  const waktu = [hotspot?.fetchedAt, paket?.banjir?.pembaruan_terakhir, paket?.gunung?.fetched_at, paket?.siklon?.fetched_at].filter(Boolean).sort().at(-1);
  const tampak = buka ? butir : butir.slice(0, AWAL);

  return (
    <div className="v2o">
      <header className="v2o-kepala">
        <div>
          <h1>Ringkasan</h1>
          <p>Apa yang perlu diperhatikan di Indonesia hari ini</p>
        </div>
        <button type="button" className="v2o-diperbarui" onClick={() => setMuat((nilai) => nilai + 1)}>
          <IkonMuat />
          Diperbarui {waktu ? `${jamWib(waktu)} WIB` : "…"}
        </button>
      </header>
      {galat ? <p className="v2o-kosong" role="alert">{galat}</p> : null}
      {!paket && !galat ? <p className="v2o-kosong" role="status">Memuat cuplikan…</p> : null}
      {paket ? (
        <>
          <div className="v2o-atas">
            <section className="v2o-kartu" aria-labelledby="v2o-perhatian">
              <header className="v2o-kartu-kepala">
                <h2 id="v2o-perhatian">Perlu perhatian <span>{butir.length}</span></h2>
                {butir.length > AWAL ? (
                  <button type="button" className="v2o-tautan" onClick={() => setBuka((nilai) => !nilai)}>
                    {buka ? "Ciutkan" : "Lihat semua"}
                  </button>
                ) : null}
              </header>
              {tampak.length ? (
                <ul className="v2o-daftar">
                  {tampak.map((item) => (
                    <li key={item.id} className="v2o-baris">
                      <span className={`v2o-pil v2o-pil-${item.tingkat}`}>{item.label}</span>
                      <div>
                        <p className="v2o-judul">{item.judul}</p>
                        <p className="v2o-rinci">{item.rincian}</p>
                      </div>
                      <a className="v2o-aksi" href={item.href}>{item.aksi}</a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="v2o-kosong">Tidak ada butir pada ambang ini. Gunung di bawah Level III, banjir di bawah Siaga, siklon tanpa teks dampak BMKG ke Indonesia, dan provinsi tanpa deteksi kepercayaan tinggi tidak dimasukkan.</p>
              )}
            </section>
            <section className="v2o-kartu" aria-labelledby="v2o-status">
              <header className="v2o-kartu-kepala">
                <h2 id="v2o-status">Status per bencana</h2>
              </header>
              <ul className="v2o-ubin">
                {ubin.map((item) => (
                  <li key={item.id}>
                    <div>
                      <p className="v2o-judul">{item.nama}</p>
                      <p className="v2o-rinci">{item.baris}</p>
                    </div>
                    <p className={`v2o-status v2o-status-${item.warna}`}><i />{item.status}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <div className="v2o-bawah">
            <article className="v2o-kartu v2o-lembut">
              <header className="v2o-kartu-kepala">
                <h2>Karhutla</h2>
                <span className="v2o-samar">{hari ? formatTanggalPendek(hari) : "Hari cuplikan"}</span>
              </header>
              {boleh ? (
                <>
                  <p className="v2o-angka">{formatAngka(hariIni.length)}</p>
                  {ubah ? (
                    <p className={ubah.selisih > 0 ? "v2o-delta v2o-delta-naik" : ubah.selisih < 0 ? "v2o-delta v2o-delta-turun" : "v2o-delta"}>
                      {ubah.persen == null
                        ? `${ubah.selisih > 0 ? "+" : ""}${formatAngka(ubah.selisih)} vs ${formatTanggalPendek(ubah.lalu.hari)}`
                        : `${ubah.selisih > 0 ? "+" : ""}${formatAngka(ubah.persen, 1)}% vs ${formatTanggalPendek(ubah.lalu.hari)}`}
                    </p>
                  ) : (
                    <p className="v2o-samar">Hari pembanding tidak ada pada cuplikan.</p>
                  )}
                  <p className="v2o-samar">Deteksi satelit, bukan kebakaran terkonfirmasi. {formatAngka(merah)} kepercayaan tinggi.</p>
                  {batang.length ? (
                    <div className="v2o-grafik">
                      <ResponsiveContainer width="100%" height={120}>
                        <BarChart data={batang}>
                          <XAxis dataKey="hari" tickFormatter={formatTanggalPendek} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                          <Tooltip content={<TipGelap />} cursor={{ fill: "rgba(91,91,214,0.08)" }} />
                          <Bar dataKey="jumlah" fill="#5b5bd6" radius={[5, 5, 0, 0]} barSize={22} isAnimationActive={false} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : null}
                  <p className="v2o-samar">Hanya tanggal yang ada pada cuplikan. Tanggal kosong tidak diisi.</p>
                </>
              ) : (
                <p className="v2o-samar">{hotspot?.error || "Cuplikan titik panas tidak ditampilkan."} Tidak ada hitungan pada kartu ini.</p>
              )}
              <a className="v2o-tautan" href="#/karhutla/peta">Buka peta</a>
            </article>
            <article className="v2o-kartu">
              <header className="v2o-kartu-kepala">
                <h2>Siklon</h2>
                <span className="v2o-samar">BMKG</span>
              </header>
              <p className="v2o-angka v2o-angka-kecil">{paket.siklon?.status_teks || "Tidak termuat"}</p>
              <ul className="v2o-siklon">
                {sistem.map((item) => {
                  const hasil = butir.find((baris) => baris.id === `siklon-${item.nama}`);
                  return (
                    <li key={item.nama}>
                      <i className={hasil ? "v2o-titik v2o-titik-oranye" : "v2o-titik v2o-titik-hijau"} />
                      <div>
                        <strong>{item.nama}</strong>
                        <span>{hasil ? hasil.rincian : "Potensi dampak: -"}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {!sistem.length ? <p className="v2o-samar">Tidak ada sistem BMKG pada cuplikan.</p> : null}
              <a className="v2o-tautan" href="#/siklon">Buka siklon</a>
            </article>
            <article className="v2o-kartu">
              <header className="v2o-kartu-kepala">
                <h2>Gunung Api</h2>
                <span className="v2o-samar">{ringkas.tingkatTertinggi || "PVMBG"}</span>
              </header>
              {gunung.length ? (
                <>
                  <div className="v2o-batang" aria-hidden="true">
                    {LEVEL.map(([level, label, warna]) => {
                      const jumlah = namaLevel[level].length;
                      if (!jumlah) return null;
                      return (
                        <div key={level} className={`v2o-seg v2o-seg-${warna}`} style={{ flexGrow: jumlah }} title={`${label}: ${namaLevel[level].join(", ")}`}>
                          <span className="v2o-tip">{label}: {namaLevel[level].join(", ")}</span>
                        </div>
                      );
                    })}
                  </div>
                  <ul className="v2o-legenda">
                    {LEVEL.map(([level, label, warna]) => (
                      <li key={level}>
                        <i className={`v2o-kotak v2o-seg-${warna}`} />
                        {label}
                        <strong>{namaLevel[level].length}</strong>
                      </li>
                    ))}
                  </ul>
                  <p className="v2o-samar">Arahkan kursor ke batang untuk nama gunung. {formatAngka(gunung.length)} gunung pada cuplikan.</p>
                </>
              ) : (
                <p className="v2o-samar">Cuplikan tingkat aktivitas belum ada.</p>
              )}
              <a className="v2o-tautan" href="#/gunung-api">Buka gunung api</a>
            </article>
            <article className="v2o-kartu">
              <header className="v2o-kartu-kepala">
                <h2>Banjir</h2>
                <span className="v2o-samar">Hari ini</span>
              </header>
              {tab?.total ? (
                <ul className="v2o-hitung">
                  <li><i className="v2o-titik v2o-titik-merah" /> Awas <strong>{formatAngka(tab.total.awas)}</strong></li>
                  <li><i className="v2o-titik v2o-titik-oranye" /> Siaga <strong>{formatAngka(tab.total.siaga)}</strong></li>
                  <li><i className="v2o-titik v2o-titik-kuning" /> Waspada <strong>{formatAngka(tab.total.waspada)}</strong></li>
                </ul>
              ) : (
                <p className="v2o-samar">{banjirGalat || "Cuplikan analisis belum ada."}</p>
              )}
              <p className="v2o-samar">Analisis dasbor, bukan status resmi BMKG atau BNPB.</p>
              <a className="v2o-tautan" href="#/banjir">Buka banjir</a>
            </article>
          </div>
        </>
      ) : null}
    </div>
  );
}
