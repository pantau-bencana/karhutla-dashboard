import { useEffect, useMemo, useState } from "react";
import { formatWib } from "../../lib/format.js";
import { ringkasTingkat } from "../../lib/gunungApi.js";
import { hariCuplikan } from "../../lib/laporanHarian.js";
import { barisPeriodeAktif, kelasPeringkat, susunPeringkatHotspot } from "../../lib/peringkatHotspot.js";
import { loadAll } from "../../lib/loadData.js";
import { DaftarPerhatian } from "../components/DaftarPerhatian.jsx";
import { KartuBanjir, KartuGunung, KartuKarhutla, KartuSiklon } from "../components/KartuBahaya.jsx";
import { StatusSumber } from "../components/StatusSumber.jsx";
import { JENDELA_WAKTU, batangTanggal, susunButir, susunStatusSumber } from "../susunRingkasan.js";

function ambilJson(path, sinyal) {
  return fetch(new URL(path, document.baseURI).href, { cache: "no-store", signal: sinyal }).then(async (response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  });
}

function titikJendela(baris, jendela, wilayah) {
  if (jendela === "hari") {
    const hari = hariCuplikan(baris);
    return (baris || []).filter((titik) => {
      if (String(titik?.tanggal || "").slice(0, 10) !== hari) return false;
      if (wilayah && titik.provinsi !== wilayah) return false;
      return Number.isFinite(Number(titik?.lintang)) && Number.isFinite(Number(titik?.bujur));
    });
  }
  return barisPeriodeAktif(baris, { hours: Number(jendela), province: wilayah });
}

function hitungKelas(baris) {
  const hitung = { merah: 0, oranye: 0, kuning: 0 };
  for (const titik of baris) {
    const kelas = kelasPeringkat(titik);
    if (kelas === "merah" || kelas === "oranye" || kelas === "kuning") hitung[kelas] += 1;
  }
  return hitung;
}

export function SummaryPage({ wilayah, setWilayah, jendela, setJendela, cari, setCari, muat, onMuat }) {
  const [paket, setPaket] = useState(null);
  const [galat, setGalat] = useState("");
  const [banjirGalat, setBanjirGalat] = useState("");
  const [gunungGalat, setGunungGalat] = useState("");
  const [siklonGalat, setSiklonGalat] = useState("");

  useEffect(() => {
    const kontrol = new AbortController();
    setGalat("");
    setBanjirGalat("");
    setGunungGalat("");
    setSiklonGalat("");
    const tugas = async () => {
      const config = await ambilJson("config.json", kontrol.signal);
      const [feeds, banjir, gunung, siklon, manifes] = await Promise.all([
        loadAll(config),
        ambilJson("data/live/banjir-ringkasan.json", kontrol.signal).catch((error) => {
          setBanjirGalat(error.message || "Cuplikan banjir tidak termuat.");
          return null;
        }),
        ambilJson("data/live/gunung-api.json", kontrol.signal).catch((error) => {
          setGunungGalat(error.message || "Cuplikan gunung api tidak termuat.");
          return null;
        }),
        ambilJson("data/live/siklon-bmkg.json", kontrol.signal).catch((error) => {
          setSiklonGalat(error.message || "Cuplikan siklon tidak termuat.");
          return null;
        }),
        ambilJson("data/live/manifest.json", kontrol.signal).catch(() => null),
      ]);
      if (!kontrol.signal.aborted) setPaket({ config, feeds, banjir, gunung, siklon, manifes });
    };
    tugas().catch((error) => {
      if (error.name !== "AbortError") setGalat(error.message || "Ringkasan tidak termuat.");
    });
    return () => kontrol.abort();
  }, [muat]);

  const hotspot = paket?.feeds?.find((feed) => feed.id === "hotspot");
  const bolehHotspot = hotspot && !hotspot.contoh && (hotspot.status === "berhasil" || hotspot.status === "usang");
  const baris = useMemo(
    () => (bolehHotspot ? titikJendela(hotspot.rows, jendela, wilayah) : []),
    [bolehHotspot, hotspot, jendela, wilayah],
  );
  const peringkat = useMemo(() => susunPeringkatHotspot(baris, { tingkat: "provinsi" }).baris, [baris]);
  const provinsiPilihan = useMemo(() => {
    const nama = new Set(paket?.config?.provinsiPrioritas || []);
    for (const titik of bolehHotspot ? hotspot.rows : []) {
      if (titik?.provinsi && titik.provinsi !== "Belum terpetakan") nama.add(titik.provinsi);
    }
    return [...nama].sort((kiri, kanan) => kiri.localeCompare(kanan, "id"));
  }, [paket, bolehHotspot, hotspot]);

  const gunung = Array.isArray(paket?.gunung?.gunung) ? paket.gunung.gunung : [];
  const ringkas = ringkasTingkat(gunung);
  const tabBanjir = paket?.banjir?.tabs?.find((tab) => tab.id === "hari-ini");
  const sistem = (paket?.siklon?.sistem_halaman || []).filter((item) => String(item.agensi || "BMKG").toUpperCase() === "BMKG");
  const butir = susunButir({
    gunung,
    banjirBaris: tabBanjir?.rows || [],
    peringkatProvinsi: peringkat,
    sistemBmkg: sistem,
    wilayah,
    waktuGunung: formatWib(paket?.gunung?.fetched_at),
    waktuBanjir: formatWib(paket?.banjir?.cap?.fetched_at || paket?.banjir?.pembaruan_terakhir),
    waktuHotspot: formatWib(hotspot?.observedAt),
    waktuSiklon: formatWib(paket?.siklon?.fetched_at),
  });
  const waktu = [paket?.gunung?.fetched_at, paket?.banjir?.pembaruan_terakhir, hotspot?.fetchedAt, paket?.siklon?.fetched_at]
    .filter(Boolean)
    .sort()
    .at(-1);
  const jendelaLabel = JENDELA_WAKTU.find(([id]) => id === jendela)?.[1] || "Hari cuplikan";

  return (
    <div className="v3-ringkas">
      <header className="v3-judul-bar">
        <div>
          <h1>Ringkasan</h1>
          <p>Yang perlu perhatian di Indonesia. Bukan peringatan resmi.</p>
        </div>
        <div className="v3-alat">
          <label>
            Wilayah
            <select value={wilayah} onChange={(event) => setWilayah(event.target.value)}>
              <option value="">Semua wilayah</option>
              {provinsiPilihan.map((nama) => <option key={nama} value={nama}>{nama}</option>)}
            </select>
          </label>
          <label>
            Jendela waktu
            <select value={jendela} onChange={(event) => setJendela(event.target.value)}>
              {JENDELA_WAKTU.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
          <label className="v3-cari">
            Cari
            <input value={cari} onChange={(event) => setCari(event.target.value)} placeholder="Cari perhatian" />
          </label>
          <p className="v3-diperbarui">Diperbarui {waktu ? formatWib(waktu) : "…"}</p>
          <button type="button" className="v3-muat" onClick={onMuat}>Muat ulang</button>
        </div>
      </header>
      {galat ? <p className="v3-kosong" role="alert">{galat}</p> : null}
      {!paket && !galat ? <p className="v3-kosong" role="status">Memuat cuplikan…</p> : null}
      {paket ? (
        <>
          <div className="v3-atas">
            <DaftarPerhatian butir={butir} cari={cari} />
            <StatusSumber
              daftar={susunStatusSumber(paket.manifes?.datasets)}
              banjir={paket.banjir ? { siap: true, diambil: paket.banjir.pembaruan_terakhir || paket.banjir.cap?.fetched_at } : { siap: false, status: banjirGalat || "Tidak termuat" }}
            />
          </div>
          <div className="v3-bawah">
            <KartuKarhutla feed={hotspot} jumlah={baris.length} hitung={hitungKelas(baris)} batang={batangTanggal(baris)} jendelaLabel={jendelaLabel} />
            <KartuBanjir total={tabBanjir?.total} galat={banjirGalat} />
            <KartuGunung hitung={ringkas.hitung} tingkat={ringkas.tingkatTertinggi} galat={gunungGalat} ada={gunung.length > 0} />
            <KartuSiklon status={paket.siklon?.status_teks || paket.siklon?.status} sistem={sistem} galat={siklonGalat} />
          </div>
        </>
      ) : null}
      <details className="v3-kartu v3-definisi">
        <summary>Metadata dan definisi</summary>
        <ul>
          <li>Perlu perhatian memuat gunung Level IV (Awas) dan Level III (Siaga), kabupaten/kota banjir berstatus Awas atau Siaga, siklon BMKG yang punya teks potensi dampak, dan hingga tiga provinsi dengan deteksi satelit kepercayaan tinggi terbanyak.</li>
          <li>Hotspot adalah deteksi satelit, bukan kebakaran terkonfirmasi. Banjir pada kartu ini adalah analisis dasbor, bukan status resmi BMKG atau BNPB.</li>
          <li>Lapisan pembanding tidak masuk daftar ini dan tidak menetapkan Awas, Siaga, atau Waspada.</li>
          <li>Waktu di atas adalah waktu ambil atau observasi yang tersimpan pada cuplikan. Tanggal tanpa deteksi tidak ditambahkan pada grafik.</li>
        </ul>
      </details>
    </div>
  );
}
