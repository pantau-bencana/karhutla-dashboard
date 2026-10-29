import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SOURCES } from "../src/lib/sourceCatalog.js";
import { SIKLON_INTERVAL_HOURS } from "../src/lib/schedule.js";
import { SIKLON_API_URL, SIKLON_HTML_URL, SIKLON_PDF_URL, SIARAN_PERS_URL, bacaSiaranPers, gabungSiaran, gagalSiklonBerturut, jumlahSistemSiklon, susunCuplikan, terapkanKurasiDampak } from "../src/lib/siklonBmkg.js";
import { JMA_DAFTAR_URL, JMA_HALAMAN_URL, bacaTargetJma, sistemDariPrakiraanJma, urlPrakiraanJma } from "../src/lib/siklonJma.js";
import { JTWC_ABIO_URL, JTWC_ABPW_URL, bacaTeksJtwc } from "../src/lib/siklonJtwc.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const berkas = resolve(root, "data/live/siklon-bmkg.json");
const manifes = resolve(root, "data/live/manifest.json");
const berkasKurasi = resolve(root, "public/data/siklon-dampak-manual.json");

function aman(teks) {
  return String(teks || "").replace(/eyJ[A-Za-z0-9_-]+/g, "[token]").replace(/\s+/g, " ").slice(0, 180);
}

async function ambilTeks(url, timeoutMs) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: "text/html,application/pdf,application/json,*/*", "User-Agent": "curl/8.5.0" },
  });
  return response;
}

function teksPdf(bytes) {
  const folder = mkdtempSync(resolve(tmpdir(), "siklon-pdf-"));
  const path = resolve(folder, "ikhtisar.pdf");
  try {
    writeFileSync(path, bytes);
    const python = spawnSync(
      "python3",
      [
        "-c",
        "import json,sys\nfrom pypdf import PdfReader\nr=PdfReader(sys.argv[1])\nprint(json.dumps({'text':'\\n'.join((p.extract_text() or '') for p in r.pages)}))",
        path,
      ],
      { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
    );
    if (python.status !== 0) {
      throw new Error(aman(python.stderr || python.stdout || "pypdf gagal"));
    }
    const json = JSON.parse(python.stdout);
    return String(json.text || "");
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

export async function ambilSiklon(now = new Date()) {
  const fetchedAt = now.toISOString();
  let apiHttp = 0;
  let apiGalat = "";
  try {
    const api = await ambilTeks(SIKLON_API_URL, 20000);
    apiHttp = api.status;
    await api.arrayBuffer();
    if (!api.ok) apiGalat = `HTTP ${api.status}`;
  } catch (error) {
    apiGalat = aman(error?.message || error);
  }

  const halaman = await ambilTeks(SIKLON_HTML_URL, 40000);
  const html = await halaman.text();
  if (!halaman.ok) throw new Error(`Halaman Siklon Tropis HTTP ${halaman.status}`);

  let ikhtisarTeks = "";
  let ikhtisarGalat = "";
  let pdfDiubah = "";
  try {
    const pdf = await ambilTeks(SIKLON_PDF_URL, 40000);
    if (!pdf.ok) throw new Error(`Ikhtisar HTTP ${pdf.status}`);
    pdfDiubah = pdf.headers.get("last-modified") || "";
    const bytes = Buffer.from(await pdf.arrayBuffer());
    ikhtisarTeks = teksPdf(bytes);
    if (!ikhtisarTeks.trim()) ikhtisarGalat = "Teks ikhtisar tidak terbaca.";
  } catch (error) {
    ikhtisarGalat = aman(error?.message || error);
  }

  let siaranHasil = { status: "gagal", galat: "", daftar: [] };
  try {
    const siaran = await ambilTeks(SIARAN_PERS_URL, 20000);
    const htmlSiaran = await siaran.text();
    if (!siaran.ok) throw new Error(`Siaran pers HTTP ${siaran.status}`);
    siaranHasil = { ...bacaSiaranPers(htmlSiaran), fetched_at: fetchedAt };
  } catch (error) {
    siaranHasil = { status: "gagal", galat: aman(error?.message || error), daftar: [] };
  }
  let siaranLama = null;
  if (existsSync(berkas)) {
    try {
      siaranLama = JSON.parse(readFileSync(berkas, "utf8"))?.siaran_pers || null;
    } catch {
      siaranLama = null;
    }
  }
  const siaranPers = gabungSiaran(siaranHasil, siaranLama);

  const cuplikan = susunCuplikan({ html, ikhtisarTeks, ikhtisarGalat, apiHttp, apiGalat, fetchedAt, pdfDiubah, siaranPers });
  const badan = `${JSON.stringify(cuplikan, null, 2)}\n`;
  const terbit = cuplikan.ikhtisar.terbit;
  const namaHalaman = cuplikan.sistem_halaman.map((item) => `${item.tahap} ${item.nama}`).join(", ");
  const namaIkhtisar = cuplikan.ikhtisar.sistem.map((item) => item.nama).join(", ");
  return {
    badan,
    cuplikan,
    observedAt: fetchedAt,
    sourceUpdatedAt: fetchedAt,
    observedLabel: [
      `Halaman Siklon Tropis: ${cuplikan.status_teks}`,
      namaHalaman ? `Disebut: ${namaHalaman}` : "",
      "Tanpa jam pembaruan pada halaman",
      terbit ? `Ikhtisar tertanggal ${terbit}` : "",
      namaIkhtisar ? `Ikhtisar menyebut ${namaIkhtisar}` : "",
    ].filter(Boolean).join(". ") + ".",
    recordCount: jumlahSistemSiklon(cuplikan),
    apiHttp,
  };
}

function intisariBlok(blok) {
  if (!blok || typeof blok !== "object") return null;
  return {
    status: blok.status || "",
    kept_previous: Boolean(blok.kept_previous),
    sistem: Array.isArray(blok.sistem) ? blok.sistem : [],
  };
}

export function intisariSiklon(cuplikan) {
  if (!cuplikan || typeof cuplikan !== "object") return null;
  const siaran = cuplikan.siaran_pers || {};
  const ikhtisar = cuplikan.ikhtisar || {};
  return {
    status: cuplikan.status || "",
    status_teks: cuplikan.status_teks || "",
    sistem_halaman: Array.isArray(cuplikan.sistem_halaman) ? cuplikan.sistem_halaman : [],
    ikhtisar: {
      status: ikhtisar.status || "",
      terbit: ikhtisar.terbit || "",
      sistem: Array.isArray(ikhtisar.sistem) ? ikhtisar.sistem : [],
    },
    jejak: cuplikan.jejak || "",
    siaran: {
      status: siaran.status || "",
      daftar: Array.isArray(siaran.daftar) ? siaran.daftar : [],
      kept_previous: Boolean(siaran.kept_previous),
    },
    pemantau: {
      jma: intisariBlok(cuplikan.pemantau?.jma),
      jtwc: intisariBlok(cuplikan.pemantau?.jtwc),
    },
  };
}

export function isiSiklonSama(lama, baru) {
  return JSON.stringify(intisariSiklon(lama)) === JSON.stringify(intisariSiklon(baru));
}

function hashIsi(cuplikan) {
  return createHash("sha256").update(JSON.stringify(intisariSiklon(cuplikan))).digest("hex");
}

function bacaJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function cuplikanUtuh(cuplikan) {
  if (!cuplikan || (cuplikan.status !== "Ada" && cuplikan.status !== "Tidak Ada")) return false;
  if (!String(cuplikan.status_teks || "").trim()) return false;
  if (cuplikan.status === "Ada" && !Array.isArray(cuplikan.sistem_halaman)) return false;
  if (cuplikan.status === "Tidak Ada" && cuplikan.sistem_halaman?.length) return false;
  return true;
}

function tulisTeks(path, teks) {
  const sementara = `${path}.tmp`;
  writeFileSync(sementara, teks);
  renameSync(sementara, path);
}

function materiEntri(entri) {
  return JSON.stringify({
    status: entri?.status || "",
    content_hash: entri?.content_hash || "",
    record_count: entri?.record_count ?? null,
    file: entri?.file || "",
    kept_previous: Boolean(entri?.kept_previous),
    mode: entri?.mode || "",
    gagal_berturut: Number(entri?.gagal_berturut) || 0,
    update_type: entri?.update_type || "",
    frequency: entri?.frequency || "",
    expected_max_age_hours: entri?.expected_max_age_hours ?? null,
    schedule_interval_hours: entri?.schedule_interval_hours ?? null,
    observed_at: entri?.observed_at || "",
    observed_label: entri?.observed_label || "",
    source_updated_at: entri?.source_updated_at || "",
  });
}

function sumberSiklon() {
  const source = SOURCES.find((item) => item.id === "bmkg_siklon");
  if (!source) throw new Error("Katalog bmkg_siklon tidak ada.");
  return source;
}

function dasarEntri(source) {
  return {
    id: source.id,
    nama: source.nama,
    instansi: source.instansi,
    source: source.nama,
    url: source.officialUrl,
    license: source.id === "bmkg_siklon" ? "Sumber: BMKG." : "Bukan peringatan resmi Indonesia.",
    mode: "snapshot",
    update_type: source.updateType,
    access: source.access,
    frequency: source.updateType,
    limitation: source.limitation,
    fungsi: source.fungsi,
    expected_max_age_hours: source.expectedMaxAgeHours,
    schedule_interval_hours: SIKLON_INTERVAL_HOURS,
  };
}

function simpanSemua(entriMenurutId) {
  const previous = bacaJson(manifes) || { datasets: {} };
  previous.datasets = previous.datasets || {};
  let berubah = false;
  for (const [id, entri] of Object.entries(entriMenurutId)) {
    if (!entri) continue;
    if (materiEntri(previous.datasets[id]) === materiEntri(entri)) continue;
    previous.datasets[id] = entri;
    berubah = true;
  }
  if (!berubah) return false;
  tulisTeks(manifes, `${JSON.stringify(previous, null, 2)}\n`);
  return true;
}

function simpanManifes(entri) {
  return simpanSemua({ bmkg_siklon: entri });
}

export function catatGagalSiklon(entriLama, pesan, entriTambahan = {}) {
  const source = sumberSiklon();
  const adaBerkas = Boolean(entriLama?.file && entriLama.content_hash && existsSync(resolve(root, entriLama.file)));
  const gagal = Math.min(gagalSiklonBerturut(entriLama), 2);
  const pesanAman = aman(pesan);
  const entri = adaBerkas
    ? {
      ...dasarEntri(source),
      fetched_at: entriLama.fetched_at,
      observed_at: entriLama.observed_at,
      observed_label: entriLama.observed_label,
      source_updated_at: entriLama.source_updated_at,
      record_count: entriLama.record_count,
      status: "failed",
      error: entriLama.status === "failed" && entriLama.error ? entriLama.error : pesanAman,
      file: entriLama.file,
      content_hash: entriLama.content_hash,
      kept_previous: true,
      gagal_berturut: gagal,
      checked_at: new Date().toISOString(),
    }
    : {
      ...dasarEntri(source),
      fetched_at: null,
      observed_at: null,
      observed_label: "",
      source_updated_at: null,
      record_count: 0,
      status: "failed",
      error: pesanAman,
      file: null,
      content_hash: null,
      kept_previous: false,
      gagal_berturut: gagal,
      checked_at: new Date().toISOString(),
    };
  return { berubah: simpanSemua({ bmkg_siklon: entri, ...entriTambahan }), isiBerubah: false, gagal: true };
}

export function terapkanHasilSiklon(hasil, entriTambahan = {}) {
  const source = sumberSiklon();
  const cuplikanLama = bacaJson(berkas);
  const entriLama = bacaJson(manifes)?.datasets?.bmkg_siklon || null;
  if (!cuplikanUtuh(hasil?.cuplikan) || !String(hasil?.badan || "").trim()) {
    return catatGagalSiklon(entriLama, "Cuplikan siklon kosong atau tidak utuh.");
  }
  const hash = hashIsi(hasil.cuplikan);
  const sama = Boolean(cuplikanLama) && isiSiklonSama(cuplikanLama, hasil.cuplikan);
  if (!sama) {
    const teks = hasil.badan.endsWith("\n") ? hasil.badan : `${hasil.badan}\n`;
    tulisTeks(berkas, teks);
  }
  const entri = {
    ...dasarEntri(source),
    fetched_at: sama ? (entriLama?.fetched_at || cuplikanLama?.fetched_at || hasil.cuplikan.fetched_at) : hasil.cuplikan.fetched_at,
    observed_at: sama ? (entriLama?.observed_at || hasil.observedAt) : hasil.observedAt,
    observed_label: sama && entriLama?.observed_label ? entriLama.observed_label : hasil.observedLabel,
    source_updated_at: sama ? (entriLama?.source_updated_at || hasil.sourceUpdatedAt) : hasil.sourceUpdatedAt,
    record_count: hasil.recordCount,
    status: "ok",
    error: null,
    file: "data/live/siklon-bmkg.json",
    content_hash: hash,
    kept_previous: false,
    gagal_berturut: 0,
  };
  const manifesBerubah = simpanSemua({ bmkg_siklon: entri, ...entriTambahan });
  return { berubah: !sama || manifesBerubah, isiBerubah: !sama, gagal: false };
}

async function ambilJsonPublik(url) {
  const response = await ambilTeks(url, 20000);
  const teks = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return JSON.parse(teks);
}

export async function ambilJma(now = new Date()) {
  const fetchedAt = now.toISOString();
  const daftar = bacaTargetJma(await ambilJsonPublik(JMA_DAFTAR_URL));
  const sistem = [];
  for (const item of daftar) {
    const url = urlPrakiraanJma(item.tropicalCyclone);
    if (!url) throw new Error("Id sistem JMA tidak dikenali.");
    const satu = sistemDariPrakiraanJma(item, await ambilJsonPublik(url));
    if (!satu) throw new Error(`Prakiraan ${item.tropicalCyclone} tidak memuat pusat analisis.`);
    sistem.push(satu);
  }
  return {
    status: "ok",
    galat: "",
    fetched_at: fetchedAt,
    kept_previous: false,
    url: JMA_HALAMAN_URL,
    produk: JMA_DAFTAR_URL,
    sistem,
  };
}

export async function ambilJtwc(now = new Date()) {
  const fetchedAt = now.toISOString();
  const sistem = [];
  for (const [produk, url] of [["ABPW", JTWC_ABPW_URL], ["ABIO", JTWC_ABIO_URL]]) {
    const response = await ambilTeks(url, 20000);
    const teks = await response.text();
    if (!response.ok) throw new Error(`${produk} HTTP ${response.status}`);
    if (!/MSGID\/GENADMIN\/JOINT TYPHOON WRNCEN/i.test(teks)) throw new Error(`${produk} bukan advisory JTWC.`);
    sistem.push(...bacaTeksJtwc(teks, produk));
  }
  return {
    status: "ok",
    galat: "",
    fetched_at: fetchedAt,
    kept_previous: false,
    url: JTWC_ABPW_URL,
    produk: "ABPW+ABIO",
    sistem,
  };
}

export function pertahankanPemantau(lama, pesan) {
  const sistem = Array.isArray(lama?.sistem) ? lama.sistem : [];
  if (lama?.status === "gagal" && JSON.stringify(lama.sistem || []) === JSON.stringify(sistem)) return lama;
  return {
    status: "gagal",
    galat: aman(pesan),
    fetched_at: lama?.fetched_at || "",
    kept_previous: sistem.length > 0,
    url: lama?.url || "",
    produk: lama?.produk || "",
    sistem,
  };
}

function hashBlok(blok) {
  return createHash("sha256").update(JSON.stringify(intisariBlok(blok))).digest("hex");
}

function entriPemantau(id, blok) {
  const source = SOURCES.find((item) => item.id === id);
  const entriLama = bacaJson(manifes)?.datasets?.[id] || null;
  const ok = blok?.status === "ok";
  const sistem = Array.isArray(blok?.sistem) ? blok.sistem : [];
  const waktu = sistem.map((item) => item.waktu_analisis).filter(Boolean).sort().at(-1) || null;
  const nama = sistem.map((item) => item.nama).filter(Boolean).join(", ");
  return {
    ...dasarEntri(source),
    fetched_at: ok ? blok.fetched_at : (entriLama?.fetched_at || blok?.fetched_at || null),
    observed_at: ok ? (waktu || blok.fetched_at) : (entriLama?.observed_at || waktu || null),
    observed_label: ok
      ? (nama ? `${source.nama}: ${nama}. Bukan peringatan resmi Indonesia.` : `${source.nama}: tidak ada sistem pada produk ini.`)
      : (entriLama?.observed_label || ""),
    source_updated_at: ok ? waktu : (entriLama?.source_updated_at || null),
    record_count: sistem.length,
    status: ok ? "ok" : "failed",
    error: ok ? null : (blok?.galat || "Gagal diambil."),
    file: sistem.length || ok ? "data/live/siklon-bmkg.json" : null,
    content_hash: hashBlok(blok),
    kept_previous: ok ? false : Boolean(blok?.kept_previous),
    gagal_berturut: ok ? 0 : Math.min(gagalSiklonBerturut(entriLama), 2),
  };
}

function bacaKurasiDampak() {
  const json = bacaJson(berkasKurasi);
  return json && typeof json === "object" ? json : { entri: [] };
}

function denganPemantau(cuplikan, jma, jtwc) {
  const dasar = {
    ...cuplikan,
    sistem_halaman: (Array.isArray(cuplikan?.sistem_halaman) ? cuplikan.sistem_halaman : []).map((item) => ({
      ...item,
      agensi: item.agensi || "BMKG",
    })),
    pemantau: { jma, jtwc },
  };
  return terapkanKurasiDampak(dasar, bacaKurasiDampak(), Date.now());
}

async function ambilBlok(nama, ambil, lama) {
  try {
    return await ambil();
  } catch (error) {
    console.log(`${nama}: gagal diambil (${aman(error?.message || error)}). Cuplikan sebelumnya tetap.`);
    return pertahankanPemantau(lama, error?.message || error);
  }
}

const dipanggilLangsung = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (dipanggilLangsung) {
  const lama = bacaJson(berkas);
  let hasil = null;
  let galatBmkg = "";
  try {
    hasil = await ambilSiklon();
  } catch (error) {
    galatBmkg = aman(error?.message || error);
    console.log(`bmkg: gagal diambil (${galatBmkg}). Cuplikan sebelumnya tetap.`);
  }
  const jma = await ambilBlok("jma", ambilJma, lama?.pemantau?.jma);
  const jtwc = await ambilBlok("jtwc", ambilJtwc, lama?.pemantau?.jtwc);
  const tambahan = {
    jma_siklon: entriPemantau("jma_siklon", jma),
    jtwc_siklon: entriPemantau("jtwc_siklon", jtwc),
  };
  if (hasil && cuplikanUtuh(hasil.cuplikan)) {
    const cuplikan = denganPemantau(hasil.cuplikan, jma, jtwc);
    const simpan = terapkanHasilSiklon({
      ...hasil,
      cuplikan,
      badan: `${JSON.stringify(cuplikan, null, 2)}\n`,
    }, tambahan);
    if (simpan.gagal) console.log("siklon: cuplikan tidak utuh. Berkas sebelumnya tidak ditimpa.");
    else if (simpan.berubah) {
      console.log(
        `siklon: berubah. halaman ${cuplikan.status_teks}; jma ${jma.status} ${jma.sistem.length}; jtwc ${jtwc.status} ${jtwc.sistem.length}`,
      );
    } else console.log("siklon: isi tidak berubah. Cap waktu pengambilan diabaikan. Tidak ada commit.");
  } else if (cuplikanUtuh(lama)) {
    const cuplikan = denganPemantau(lama, jma, jtwc);
    const teks = `${JSON.stringify(cuplikan, null, 2)}\n`;
    const sama = isiSiklonSama(lama, cuplikan);
    if (!sama) tulisTeks(berkas, teks);
    const entriLama = bacaJson(manifes)?.datasets?.bmkg_siklon || null;
    const simpan = catatGagalSiklon(entriLama, galatBmkg || "Cuplikan BMKG tidak utuh.", tambahan);
    console.log(`bmkg: cuplikan sebelumnya tetap.${sama && !simpan.berubah ? "" : " Pemantau lain diperbarui bila isinya berubah."}`);
  } else {
    const entriLama = bacaJson(manifes)?.datasets?.bmkg_siklon || null;
    catatGagalSiklon(entriLama, galatBmkg || "Cuplikan BMKG tidak utuh.", tambahan);
    console.log("bmkg: tidak ada cuplikan utuh untuk dipertahankan.");
  }
}
