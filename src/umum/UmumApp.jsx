import { useEffect, useMemo, useRef, useState } from "react";
import { parseCsv } from "../lib/csv.js";
import { formatWib } from "../lib/format.js";
import {
  TEKS_STATUS,
  WARNA_STATUS,
  daftarKabupaten,
  hashKab,
  kabTerdekat,
  kodeDariHash,
  parseTitikWakil,
  ringkasHariIni,
  saringKabupaten,
  statusKabupaten,
  tautanTeknis,
} from "./statusUmum.js";

const RINGKASAN_URL = "data/live/banjir-ringkasan.json";
const TITIK_URL = "data/live/titik_wakil.csv";

function dataUrl(rel) {
  const base = import.meta.env.BASE_URL || "./";
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}${rel}`;
}

async function ambil(url, signal) {
  const res = await fetch(url, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`Gagal memuat ${url} (${res.status})`);
  return res;
}

function useHashKode() {
  const [kode, setKode] = useState(() => kodeDariHash(window.location.hash));
  useEffect(() => {
    const sinkron = () => setKode(kodeDariHash(window.location.hash));
    window.addEventListener("hashchange", sinkron);
    return () => window.removeEventListener("hashchange", sinkron);
  }, []);
  return [kode, (berikut) => {
    const hash = hashKab(berikut);
    if (window.location.hash === hash) {
      setKode(berikut || "");
      return;
    }
    window.location.hash = hash;
  }];
}

function BadgeStatus({ status, besar }) {
  const warna = WARNA_STATUS[status] || WARNA_STATUS.Aman;
  return (
    <span
      className={besar ? "umum-badge besar" : "umum-badge"}
      style={{ background: warna.latar, color: warna.tinta, borderColor: warna.border }}
    >
      {status}
    </span>
  );
}

function KartuWaktu({ label, status }) {
  const warna = WARNA_STATUS[status] || WARNA_STATUS.Aman;
  return (
    <div className="umum-waktu" style={{ borderColor: warna.border, background: warna.latar }}>
      <p className="umum-waktu-label">{label}</p>
      <p className="umum-waktu-status" style={{ color: warna.tinta }}>{status}</p>
    </div>
  );
}

function CariLokasi({ daftar, onPilih, disabled }) {
  const [kueri, setKueri] = useState("");
  const [buka, setBuka] = useState(false);
  const [aktif, setAktif] = useState(0);
  const bungkus = useRef(null);
  const hasil = useMemo(() => saringKabupaten(daftar, kueri), [daftar, kueri]);

  useEffect(() => {
    const tutup = (event) => {
      if (bungkus.current && !bungkus.current.contains(event.target)) setBuka(false);
    };
    document.addEventListener("mousedown", tutup);
    return () => document.removeEventListener("mousedown", tutup);
  }, []);

  useEffect(() => {
    setAktif(0);
  }, [kueri]);

  function pilih(item) {
    setKueri("");
    setBuka(false);
    onPilih(item.kode);
  }

  function onKey(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setBuka(true);
      setAktif((i) => Math.min(i + 1, Math.max(hasil.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setAktif((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (buka && hasil[aktif]) pilih(hasil[aktif]);
    } else if (event.key === "Escape") {
      setBuka(false);
    }
  }

  return (
    <div className="umum-cari" ref={bungkus}>
      <label htmlFor="umum-lokasi">Cari kabupaten atau kota</label>
      <input
        id="umum-lokasi"
        type="search"
        autoComplete="off"
        placeholder="Ketik nama wilayah, misalnya Blitar atau Kota Palembang"
        value={kueri}
        disabled={disabled}
        onChange={(event) => {
          setKueri(event.target.value);
          setBuka(true);
        }}
        onFocus={() => setBuka(true)}
        onKeyDown={onKey}
        aria-autocomplete="list"
        aria-expanded={buka}
        aria-controls="umum-hasil-cari"
      />
      {buka && hasil.length > 0 ? (
        <ul id="umum-hasil-cari" className="umum-hasil" role="listbox">
          {hasil.map((item, index) => (
            <li key={item.kode} role="option" aria-selected={index === aktif}>
              <button
                type="button"
                className={index === aktif ? "aktif" : undefined}
                onMouseEnter={() => setAktif(index)}
                onClick={() => pilih(item)}
              >
                <strong>{item.nama}</strong>
                <span>{item.provinsi}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function UmumApp() {
  const [kode, setKode] = useHashKode();
  const [ringkasan, setRingkasan] = useState(null);
  const [titik, setTitik] = useState([]);
  const [galat, setGalat] = useState("");
  const [memuat, setMemuat] = useState(true);
  const [lokasiGalat, setLokasiGalat] = useState("");
  const [mencariLokasi, setMencariLokasi] = useState(false);
  const [sekarang, setSekarang] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setSekarang(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const kontrol = new AbortController();
    setMemuat(true);
    Promise.all([
      ambil(dataUrl(RINGKASAN_URL), kontrol.signal).then((res) => res.json()),
      ambil(dataUrl(TITIK_URL), kontrol.signal).then((res) => res.text()),
    ])
      .then(([json, csv]) => {
        setRingkasan(json);
        setTitik(parseTitikWakil(parseCsv(csv)));
        setGalat("");
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setGalat("Data wilayah belum dapat dimuat. Coba muat ulang halaman.");
      })
      .finally(() => {
        if (!kontrol.signal.aborted) setMemuat(false);
      });
    return () => kontrol.abort();
  }, []);

  const daftar = useMemo(() => daftarKabupaten(ringkasan), [ringkasan]);
  const rekap = useMemo(() => ringkasHariIni(ringkasan, sekarang), [ringkasan, sekarang]);
  const kartu = useMemo(
    () => (kode && ringkasan ? statusKabupaten(ringkasan, kode, sekarang) : null),
    [kode, ringkasan, sekarang],
  );
  const diketahui = Boolean(kartu?.nama);

  function pakaiLokasiSaya() {
    setLokasiGalat("");
    if (!navigator.geolocation) {
      setLokasiGalat("Peramban ini tidak mendukung deteksi lokasi. Silakan cari nama wilayah Anda.");
      return;
    }
    if (!titik.length) {
      setLokasiGalat("Titik wilayah belum siap. Silakan cari nama kabupaten atau kota.");
      return;
    }
    setMencariLokasi(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dekat = kabTerdekat(titik, pos.coords.latitude, pos.coords.longitude);
        setMencariLokasi(false);
        if (!dekat) {
          setLokasiGalat("Lokasi tidak dapat dicocokkan ke kabupaten atau kota. Silakan cari namanya.");
          return;
        }
        setKode(dekat.kode);
      },
      (error) => {
        setMencariLokasi(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLokasiGalat("Izin lokasi ditolak. Silakan ketik nama kabupaten atau kota Anda.");
        } else {
          setLokasiGalat("Lokasi tidak berhasil dideteksi. Silakan ketik nama wilayah Anda.");
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  const warnaUtama = WARNA_STATUS[kartu?.utama] || WARNA_STATUS.Aman;
  const diperbarui = ringkasan?.pembaruan_terakhir || ringkasan?.generated_at;

  return (
    <div className="umum">
      <header className="umum-kepala">
        <p className="umum-merek">Pantau Bencana</p>
        <h1>Apakah wilayah Anda aman dari banjir?</h1>
        <p className="umum-lead">
          Cek kabupaten atau kota Anda. Jawabannya dibuat sederhana: aman, waspada, siaga, atau awas — plus apa yang perlu dilakukan.
        </p>
      </header>

      <section className="umum-pencarian" aria-label="Pilih lokasi">
        <CariLokasi daftar={daftar} onPilih={setKode} disabled={memuat || Boolean(galat)} />
        <button type="button" className="umum-lokasi-btn" onClick={pakaiLokasiSaya} disabled={memuat || mencariLokasi}>
          {mencariLokasi ? "Mencari lokasi…" : "Gunakan lokasi saya"}
        </button>
        {lokasiGalat ? <p className="umum-catatan" role="status">{lokasiGalat}</p> : null}
      </section>

      {memuat ? <p className="umum-catatan">Memuat data wilayah…</p> : null}
      {galat ? <p className="umum-galat" role="alert">{galat}</p> : null}

      {diketahui ? (
        <section className="umum-kartu" style={{ borderColor: warnaUtama.aksen, background: warnaUtama.latar }} aria-live="polite">
          <p className="umum-wilayah">
            {kartu.nama}
            {kartu.provinsi ? <span> · {kartu.provinsi}</span> : null}
          </p>
          <BadgeStatus status={kartu.utama} besar />
          <p className="umum-pesan" style={{ color: warnaUtama.tinta }}>{TEKS_STATUS[kartu.utama]}</p>
          <div className="umum-tiga">
            <KartuWaktu label="Sekarang (0–3 jam)" status={kartu.sekarang} />
            <KartuWaktu label="Hari ini" status={kartu.hariIni} />
            <KartuWaktu label="Besok" status={kartu.besok} />
          </div>
          <button type="button" className="umum-ganti" onClick={() => setKode("")}>
            Cek wilayah lain
          </button>
        </section>
      ) : (
        <section className="umum-ringkas" aria-label="Ringkasan nasional hari ini">
          <h2>Cek lokasi Anda lebih dulu</h2>
          <p>
            Ketik nama kabupaten atau kota, atau tekan <strong>Gunakan lokasi saya</strong>.
            Hasilnya langsung menjawab apakah ada potensi banjir dan apa yang perlu dilakukan.
          </p>
          {ringkasan ? (
            <>
              <p className="umum-angka">
                Hari ini ada <strong>{rekap.jumlah} kabupaten/kota</strong> berstatus:{" "}
                <strong className="n-awas">{rekap.awas.length} Awas</strong>,{" "}
                <strong className="n-siaga">{rekap.siaga.length} Siaga</strong>,{" "}
                <strong className="n-waspada">{rekap.waspada.length} Waspada</strong>.
              </p>
              {rekap.awas.length || rekap.siaga.length ? (
                <div className="umum-chips">
                  <p>Pilih wilayah berstatus Awas atau Siaga untuk melihat kartu statusnya:</p>
                  <ul>
                    {rekap.awas.map((item) => (
                      <li key={`awas-${item.kode}`}>
                        <button type="button" className="chip awas" onClick={() => setKode(item.kode)}>
                          {item.nama}
                          <BadgeStatus status="Awas" />
                        </button>
                      </li>
                    ))}
                    {rekap.siaga.map((item) => (
                      <li key={`siaga-${item.kode}`}>
                        <button type="button" className="chip siaga" onClick={() => setKode(item.kode)}>
                          {item.nama}
                          <BadgeStatus status="Siaga" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p>Tidak ada kabupaten/kota berstatus Awas atau Siaga pada prakiraan hari ini.</p>
              )}
            </>
          ) : null}
        </section>
      )}

      {diperbarui ? (
        <p className="umum-update">Data diperbarui {formatWib(diperbarui)}.</p>
      ) : null}

      <aside className="umum-disclaimer" role="note">
        <p>
          <strong>Bukan sumber resmi.</strong> Dasbor ini adalah proyek data terbuka pribadi, bukan
          produk atau saluran peringatan BNPB, BMKG, BPBD, atau instansi pemerintah lain, dan tidak
          terafiliasi dengan lembaga tersebut. Keputusan evakuasi resmi wajib mengikuti arahan BPBD,
          BMKG, dan aparat setempat.
        </p>
        <p>
          Dalam keadaan darurat, hubungi <a href="tel:112"><strong>112</strong></a>.
        </p>
      </aside>

      <a className="umum-teknis" href={tautanTeknis()}>
        Mode Teknis
      </a>
    </div>
  );
}
