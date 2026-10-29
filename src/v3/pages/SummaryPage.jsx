import { useEffect, useMemo, useState } from "react";
import { formatWib } from "../../lib/format.js";
import { ringkasTingkat } from "../../lib/gunungApi.js";
import { hariCuplikan } from "../../lib/laporanHarian.js";
import { barisPeriodeAktif, kelasPeringkat } from "../../lib/peringkatHotspot.js";
import { loadAll } from "../../lib/loadData.js";
import { terapkanKurasiDampak } from "../../lib/siklonBmkg.js";
import { KartuBanjir, KartuGunung, KartuKarhutla, KartuSiklon } from "../components/KartuBahaya.jsx";
import { StatusSumber } from "../components/StatusSumber.jsx";
import { JENDELA_WAKTU, kalimatLaporanHariIni, susunStatusSumber, trenTujuhHari } from "../susunRingkasan.js";

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

export function SummaryPage({ wilayah, setWilayah, jendela, setJendela, muat, onMuat }) {
  const [paket, setPaket] = useState(null);
  const [galat, setGalat] = useState("");
  const [banjirGalat, setBanjirGalat] = useState("");
  const [gunungGalat, setGunungGalat] = useState("");
  const [siklonGalat, setSiklonGalat] = useState("");
  const [tersalin, setTersalin] = useState(false);

  useEffect(() => {
    const kontrol = new AbortController();
    setGalat("");
    setBanjirGalat("");
    setGunungGalat("");
    setSiklonGalat("");
    const tugas = async () => {
      const config = await ambilJson("config.json", kontrol.signal);
      const [feeds, banjir, gunung, siklonMentah, kurasiDampak, manifes] = await Promise.all([
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
        ambilJson("data/siklon-dampak-manual.json", kontrol.signal).catch(() => ({ entri: [] })),
        ambilJson("data/live/manifest.json", kontrol.signal).catch(() => null),
      ]);
      const siklon = siklonMentah ? terapkanKurasiDampak(siklonMentah, kurasiDampak) : null;
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
  const sistemLaporan = wilayah
    ? sistem.filter((item) => [item.dampak, item.lokasi, item.kalimat, item.nama].some((teks) => String(teks || "").toLowerCase().includes(wilayah.toLowerCase())))
    : sistem;
  const gunungSaring = wilayah
    ? gunung.filter((item) => `${item.lokasi || ""} ${item.nama || ""}`.toLowerCase().includes(wilayah.toLowerCase()))
    : gunung;
  const barisBanjir = (tabBanjir?.rows || []).filter((item) => !wilayah || item.provinsi === wilayah);
  const banjirAwas = wilayah ? barisBanjir.filter((item) => item.status === "Awas").length : tabBanjir?.total?.awas;
  const banjirSiaga = wilayah ? barisBanjir.filter((item) => item.status === "Siaga").length : tabBanjir?.total?.siaga;
  const petaHotspot = new Map();
  if (bolehHotspot) {
    for (const titik of hotspot.rows) {
      if (wilayah && titik.provinsi !== wilayah) continue;
      const hari = String(titik?.tanggal || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(hari)) continue;
      petaHotspot.set(hari, (petaHotspot.get(hari) || 0) + 1);
    }
  }
  const barisTren = bolehHotspot
    ? hotspot.rows.filter((titik) => !wilayah || titik.provinsi === wilayah)
    : [];
  const tren = trenTujuhHari(barisTren);
  const waktu = [paket?.gunung?.fetched_at, paket?.banjir?.pembaruan_terakhir, hotspot?.fetchedAt, paket?.siklon?.fetched_at]
    .filter(Boolean)
    .sort()
    .at(-1);
  const jendelaLabel = JENDELA_WAKTU.find(([id]) => id === jendela)?.[1] || "Hari cuplikan";
  const kalimat = kalimatLaporanHariIni({
    adaHotspot: Boolean(bolehHotspot),
    jumlahHotspot: baris.length,
    hitungTanggalHotspot: petaHotspot,
    jendelaLabel,
    wilayah,
    banjirSiap: Boolean(tabBanjir && banjirAwas != null && banjirSiaga != null),
    banjirAwas,
    banjirSiaga,
    gunungSiap: Boolean(paket?.gunung && !gunungGalat),
    gunungAwas: gunungSaring.filter((item) => item.tingkat === "Awas"),
    gunungSiaga: gunungSaring.filter((item) => item.tingkat === "Siaga"),
    siklonSiap: Boolean(paket?.siklon && !siklonGalat),
    sistem: sistemLaporan,
    waktuLabel: waktu ? formatWib(waktu) : "",
  });

  return (
    <div className="v3-ringkas">
      <header className="v3-judul-bar">
        <div>
          <h1>Ringkasan</h1>
          <p>Cuplikan bahaya di Indonesia. Bukan peringatan resmi.</p>
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
          <p className="v3-diperbarui">Diperbarui {waktu ? formatWib(waktu) : "…"}</p>
          <button type="button" className="v3-muat" onClick={onMuat}>Muat ulang</button>
        </div>
      </header>
      {galat ? <p className="v3-kosong" role="alert">{galat}</p> : null}
      {!paket && !galat ? <p className="v3-kosong" role="status">Memuat cuplikan…</p> : null}
      {paket ? (
        <>
          <div className="v3-bawah">
            <KartuKarhutla feed={hotspot} jumlah={baris.length} hitung={hitungKelas(baris)} tren={tren} jendelaLabel={jendelaLabel} />
            <KartuBanjir total={tabBanjir?.total} galat={banjirGalat} />
            <KartuGunung hitung={ringkas.hitung} tingkat={ringkas.tingkatTertinggi} galat={gunungGalat} ada={gunung.length > 0} />
            <KartuSiklon status={paket.siklon?.status_teks || paket.siklon?.status} sistem={sistem} galat={siklonGalat} />
          </div>
          <section className="v3-kartu v3-laporan" aria-labelledby="v3-laporan-judul">
            <header className="v3-kartu-kepala">
              <h2 id="v3-laporan-judul">Ringkasan Laporan Hari Ini</h2>
              <button
                type="button"
                className="v3-salin"
                onClick={() => {
                  const teks = kalimat.join("\n");
                  const tandai = () => {
                    setTersalin(true);
                    window.setTimeout(() => setTersalin(false), 2000);
                  };
                  const cadangan = () => {
                    const area = document.createElement("textarea");
                    area.value = teks;
                    area.setAttribute("readonly", "");
                    area.style.position = "fixed";
                    area.style.left = "-9999px";
                    document.body.appendChild(area);
                    area.select();
                    const berhasil = document.execCommand("copy");
                    area.remove();
                    if (berhasil) tandai();
                  };
                  if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(teks).then(tandai).catch(cadangan);
                    return;
                  }
                  cadangan();
                }}
              >
                {tersalin ? "Tersalin" : "Salin"}
              </button>
            </header>
            {kalimat.length ? kalimat.map((barisKalimat) => <p key={barisKalimat}>{barisKalimat}</p>) : (
              <p className="v3-samar">Tidak ada kalimat. Cuplikan untuk cakupan ini belum ada.</p>
            )}
          </section>
          <StatusSumber
            daftar={susunStatusSumber(paket.manifes?.datasets)}
            banjir={paket.banjir ? { siap: true, diambil: paket.banjir.pembaruan_terakhir || paket.banjir.cap?.fetched_at } : { siap: false, status: banjirGalat || "Tidak termuat" }}
          />
        </>
      ) : null}
      <details className="v3-kartu v3-definisi">
        <summary>Metadata dan definisi</summary>
        <ul>
          <li>Hotspot adalah deteksi satelit, bukan kebakaran terkonfirmasi. Banjir pada kartu ini adalah analisis dasbor, bukan status resmi BMKG atau BNPB.</li>
          <li>Grafik Karhutla memakai tanggal pada cuplikan, paling banyak tujuh hari hingga hari terakhir. Hari tanpa baris ditandai tidak ada, bukan nol. Bila cuplikan lebih pendek dari tujuh hari, yang tampil hanya rentang itu.</li>
          <li>Lapisan pembanding tidak menetapkan Awas, Siaga, atau Waspada.</li>
        </ul>
      </details>
    </div>
  );
}
