import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tanggalJakarta } from "../src/lib/gwisFwi.js";
import { daftarKabkota } from "../src/lib/kabProvinsi.js";
import { SIPONGI_API, ringkasSipongi } from "../src/lib/sipongiHotspot.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CSV = resolve(root, "data/live/sipongi-hotspot.csv");
const META = resolve(root, "data/live/sipongi-hotspot-meta.json");
const KONFIG = "https://opsroom.sipongidata.my.id/api/konfigurasi";
const AGENT = { "User-Agent": "curl/8.5.0", Accept: "application/json" };
const HARI = 6;

function mundur(iso, hari) {
  const [tahun, bulan, tanggal] = iso.split("-").map(Number);
  const nilai = new Date(Date.UTC(tahun, bulan - 1, tanggal));
  nilai.setUTCDate(nilai.getUTCDate() - hari);
  return nilai.toISOString().slice(0, 10);
}

async function ambilJson(url) {
  const response = await fetch(url, { headers: AGENT });
  const teks = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
  const jenis = response.headers.get("content-type") || "";
  if (!jenis.includes("json")) throw new Error(`Bukan JSON (${jenis || "tanpa jenis"}) ${url}`);
  return JSON.parse(teks);
}

export async function ambilSipongi(now = new Date()) {
  const akhir = tanggalJakarta(now);
  const tanggal = Array.from({ length: HARI }, (_, indeks) => mundur(akhir, HARI - 1 - indeks));
  const konfig = await ambilJson(KONFIG);
  const satelit = konfig?.sumber_satelit === "nasa" ? "all-nasa" : konfig?.sumber_satelit === "lapan" ? "all-lapan" : "";
  if (!satelit) throw new Error("Konfigurasi SiPongi tidak menyebut sumber_satelit nasa atau lapan.");
  const katalog = daftarKabkota();
  const baris = [];
  const lepas = [];
  for (const hari of tanggal) {
    const url = new URL(SIPONGI_API);
    url.searchParams.set("startdate", `${hari} 00:00:00`);
    url.searchParams.set("enddate", `${hari} 23:59:59`);
    url.searchParams.set("satelit", satelit);
    url.searchParams.set("confidence", "all");
    url.searchParams.set("provinsi", "all");
    const badan = await ambilJson(url);
    const data = Array.isArray(badan?.data) ? badan.data : null;
    if (!data) throw new Error(`Sebaran ${hari} tidak berisi data.`);
    const ringkas = ringkasSipongi(data, hari, katalog);
    for (const [kode, sel] of ringkas.sel) {
      baris.push({ tanggal: hari, kode, ...sel });
    }
    for (const item of ringkas.lepas) lepas.push({ tanggal: hari, ...item });
  }
  baris.sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.kode.localeCompare(b.kode));
  mkdirSync(dirname(CSV), { recursive: true });
  const kepala = "tanggal,kode,jumlah,high,medium,low";
  const isi = baris.map((item) => [item.tanggal, item.kode, item.jumlah, item.high, item.medium, item.low].join(","));
  writeFileSync(CSV, `${kepala}\n${isi.join("\n")}\n`);
  const meta = {
    status: "ok",
    fetched_at: now.toISOString(),
    url: SIPONGI_API,
    satelit,
    confidence: "all",
    tanggal,
    record_count: baris.length,
    lepas,
  };
  writeFileSync(META, `${JSON.stringify(meta, null, 2)}\n`);
  return { ditulis: true, baris: baris.length, lepas: lepas.length, tanggal, satelit };
}

const dipanggil = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (dipanggil) {
  ambilSipongi()
    .then((hasil) => console.log(`SiPongi ditulis: ${hasil.baris} baris, ${hasil.lepas} lepas.`))
    .catch((error) => {
      console.log(`SiPongi tidak ditulis: ${error.message}`);
      process.exitCode = 0;
    });
}
