import { createHash } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SOURCES } from "../src/lib/sourceCatalog.js";
import { GUNUNG_INTERVAL_HOURS } from "../src/lib/schedule.js";
import {
  URL_LETUSAN,
  URL_TINGKAT,
  URL_VONA,
  bacaInformasiLetusan,
  bacaTingkatAktivitas,
  bacaVona,
  dalamJam,
} from "../src/lib/gunungApi.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const berkas = resolve(root, "data/live/gunung-api.json");
const manifes = resolve(root, "data/live/manifest.json");

function aman(teks) {
  return String(teks || "").replace(/\s+/g, " ").slice(0, 180);
}

async function ambilHtml(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(40000),
    headers: { Accept: "text/html", "User-Agent": "curl/8.5.0" },
  });
  const html = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!html.trim() || /<html/i.test(html) === false) throw new Error("Halaman kosong.");
  return html;
}

function bacaJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function tulisTeks(path, teks) {
  const sementara = `${path}.tmp`;
  writeFileSync(sementara, teks);
  renameSync(sementara, path);
}

export function intisariGunung(cuplikan) {
  if (!cuplikan || typeof cuplikan !== "object") return null;
  return {
    gunung: cuplikan.gunung || [],
    letusan: cuplikan.letusan || [],
    vona: cuplikan.vona || [],
    status_tingkat: cuplikan.status_tingkat || "",
    status_letusan: cuplikan.status_letusan || "",
    status_vona: cuplikan.status_vona || "",
  };
}

function hashIsi(cuplikan) {
  return createHash("sha256").update(JSON.stringify(intisariGunung(cuplikan))).digest("hex");
}

async function ambilBagian(nama, url, baca, saring) {
  try {
    const html = await ambilHtml(url);
    const daftar = baca(html);
    if (nama === "tingkat" && !/Tingkat Aktivitas/i.test(html)) throw new Error("Tabel tingkat aktivitas tidak ada.");
    if (nama !== "tingkat" && !daftar.length && !/timeline-item|timeline-day/i.test(html)) {
      throw new Error("Daftar berita tidak terbaca.");
    }
    return { status: "ok", galat: "", daftar: saring ? daftar.filter(saring) : daftar };
  } catch (error) {
    return { status: "gagal", galat: aman(error?.message || error), daftar: null };
  }
}

export function susunCuplikan({ tingkat, letusan, vona, lama, fetchedAt }) {
  const gunung = tingkat.status === "ok" ? tingkat.daftar : (Array.isArray(lama?.gunung) ? lama.gunung : []);
  const beritaLetusan = letusan.status === "ok" ? letusan.daftar : (Array.isArray(lama?.letusan) ? lama.letusan : []);
  const beritaVona = vona.status === "ok" ? vona.daftar : (Array.isArray(lama?.vona) ? lama.vona : []);
  return {
    fetched_at: fetchedAt,
    sumber: "PVMBG",
    url_tingkat: URL_TINGKAT,
    url_letusan: URL_LETUSAN,
    url_vona: URL_VONA,
    koordinat: "Halaman Tingkat Aktivitas tidak memuat koordinat.",
    status_tingkat: tingkat.status,
    galat_tingkat: tingkat.status === "ok" ? "" : tingkat.galat,
    kept_tingkat: tingkat.status !== "ok" && gunung.length > 0,
    status_letusan: letusan.status,
    galat_letusan: letusan.status === "ok" ? "" : letusan.galat,
    kept_letusan: letusan.status !== "ok" && beritaLetusan.length > 0,
    status_vona: vona.status,
    galat_vona: vona.status === "ok" ? "" : vona.galat,
    kept_vona: vona.status !== "ok" && beritaVona.length > 0,
    gunung,
    letusan: beritaLetusan,
    vona: beritaVona,
  };
}

function materiEntri(entri) {
  return JSON.stringify({
    status: entri?.status || "",
    content_hash: entri?.content_hash || "",
    record_count: entri?.record_count ?? null,
    kept_previous: Boolean(entri?.kept_previous),
    error: entri?.error || "",
    update_type: entri?.update_type || "",
    expected_max_age_hours: entri?.expected_max_age_hours ?? null,
  });
}

function tulisManifes(cuplikan, hash, berubah) {
  const source = SOURCES.find((item) => item.id === "pvmbg_gunung");
  const previous = bacaJson(manifes) || { datasets: {} };
  previous.datasets = previous.datasets || {};
  const lama = previous.datasets.pvmbg_gunung || null;
  const gagal = cuplikan.status_tingkat !== "ok";
  const entri = {
    id: "pvmbg_gunung",
    nama: source.nama,
    instansi: source.instansi,
    source: source.nama,
    url: source.officialUrl,
    license: "Sumber: PVMBG.",
    mode: "snapshot",
    update_type: source.updateType,
    access: source.access,
    frequency: source.updateType,
    limitation: source.limitation,
    fungsi: source.fungsi,
    expected_max_age_hours: source.expectedMaxAgeHours,
    schedule_interval_hours: GUNUNG_INTERVAL_HOURS,
    fetched_at: berubah ? cuplikan.fetched_at : (lama?.fetched_at || cuplikan.fetched_at),
    observed_at: berubah ? cuplikan.fetched_at : (lama?.observed_at || cuplikan.fetched_at),
    observed_label: gagal
      ? "Halaman Tingkat Aktivitas gagal dibaca. Cuplikan sebelumnya tetap bila ada."
      : `Halaman Tingkat Aktivitas: ${cuplikan.gunung.length} gunung. Informasi letusan ${cuplikan.letusan.length}. VONA ${cuplikan.vona.length}. Koordinat tidak ada pada halaman itu.`,
    source_updated_at: berubah ? cuplikan.fetched_at : (lama?.source_updated_at || cuplikan.fetched_at),
    record_count: cuplikan.gunung.length,
    status: gagal && !cuplikan.gunung.length ? "failed" : (gagal ? "failed" : "ok"),
    error: gagal ? cuplikan.galat_tingkat : null,
    file: cuplikan.gunung.length ? "data/live/gunung-api.json" : null,
    content_hash: hash,
    kept_previous: Boolean(cuplikan.kept_tingkat),
  };
  if (materiEntri(lama) === materiEntri(entri)) return false;
  previous.datasets.pvmbg_gunung = entri;
  tulisTeks(manifes, `${JSON.stringify(previous, null, 2)}\n`);
  return true;
}

const dipanggilLangsung = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (dipanggilLangsung) {
  const fetchedAt = new Date().toISOString();
  const sekarang = new Date();
  const lama = bacaJson(berkas);
  const [tingkat, letusan, vona] = await Promise.all([
    ambilBagian("tingkat", URL_TINGKAT, bacaTingkatAktivitas),
    ambilBagian("letusan", URL_LETUSAN, bacaInformasiLetusan, (item) => dalamJam(item.waktu, sekarang, 72)),
    ambilBagian("vona", URL_VONA, bacaVona, (item) => dalamJam(item.waktu, sekarang, 72)),
  ]);
  const cuplikan = susunCuplikan({ tingkat, letusan, vona, lama, fetchedAt });
  if (!cuplikan.gunung.length && tingkat.status !== "ok") {
    console.log(`gunung: tingkat gagal (${tingkat.galat}). Tidak ada cuplikan untuk ditulis.`);
    process.exit(0);
  }
  const hash = hashIsi(cuplikan);
  const sama = lama && hash === hashIsi(lama);
  if (!sama) tulisTeks(berkas, `${JSON.stringify(cuplikan, null, 2)}\n`);
  const manifesBerubah = tulisManifes(cuplikan, hash, !sama);
  console.log(sama && !manifesBerubah
    ? "gunung: isi tidak berubah. Tidak ada commit."
    : `gunung: tingkat ${cuplikan.status_tingkat} ${cuplikan.gunung.length}; letusan ${cuplikan.status_letusan} ${cuplikan.letusan.length}; vona ${cuplikan.status_vona} ${cuplikan.vona.length}`);
}
