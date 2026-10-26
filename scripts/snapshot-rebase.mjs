// Memasang ulang cuplikan yang sudah diambil di atas ujung cabang.
// Dipakai bila git pull --rebase bentrok, supaya unduhan panjang tidak diulang.
// Argumen: <sha-cuplikan> <sha-hulu>
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const BERKAS_CAP = [
  "data/live/bmkg-cap-kab.csv",
  "data/live/bmkg-cap-prov.csv",
  "data/live/bmkg-cap-kab-meta.json",
  "data/live/bmkg-cap-geom.json",
  "data/live/bmkg-cap.csv",
];

export const BERKAS_PRAKIRAAN = [
  "data/live/bmkg-prakiraan-kab.csv",
  "data/live/bmkg-prakiraan-kab-meta.json",
  "data/live/bmkg_prakiraan.csv",
];

export const BERKAS_TURUNAN = new Set([
  "data/live/banjir-ringkasan.json",
  "data/live/rekap-harian.json",
]);

export function waktuIso(value) {
  const time = Date.parse(value ?? "");
  return Number.isFinite(time) ? time : 0;
}

export function sisiLebihBaru(waktuKita, waktuHulu) {
  return waktuKita > waktuHulu ? "kita" : "hulu";
}

export function gabungManifest(hulu, kita) {
  if (!hulu || typeof hulu !== "object") return kita ?? null;
  if (!kita || typeof kita !== "object") return hulu;
  const datasets = { ...(hulu.datasets || {}) };
  for (const [id, entry] of Object.entries(kita.datasets || {})) {
    const ada = datasets[id];
    if (!ada || waktuIso(entry?.fetched_at) > waktuIso(ada?.fetched_at)) datasets[id] = entry;
  }
  const puncak = waktuIso(kita.generated_at) > waktuIso(hulu.generated_at) ? kita : hulu;
  const generatedAt = waktuIso(kita.generated_at) > waktuIso(hulu.generated_at) ? kita.generated_at : hulu.generated_at;
  return {
    ...puncak,
    datasets,
    generated_at: generatedAt || puncak.generated_at || null,
  };
}

function git(args) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const detail = error.stderr?.toString?.().trim();
    const wrapped = new Error(detail || error.message);
    wrapped.stderr = detail || "";
    throw wrapped;
  }
}

function existsAt(sha, file) {
  try {
    git(["cat-file", "-e", `${sha}:${file}`]);
    return true;
  } catch {
    return false;
  }
}

function showText(sha, file) {
  try {
    return git(["show", `${sha}:${file}`]);
  } catch {
    return null;
  }
}

function readJson(sha, file) {
  const text = showText(sha, file);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function applyFile(sha, file) {
  if (existsAt(sha, file)) {
    git(["checkout", sha, "--", file]);
    return;
  }
  try {
    git(["rm", "-f", "--", file]);
  } catch {
    // Berkas memang tidak ada di pohon kerja.
  }
}

function waktuCap(meta) {
  if (!meta || typeof meta !== "object") return 0;
  return Math.max(waktuIso(meta.fetched_at), waktuIso(meta.rss_published));
}

function waktuPrakiraan(meta) {
  if (!meta || typeof meta !== "object") return 0;
  return Math.max(waktuIso(meta.observed_at), waktuIso(meta.fetched_at));
}

function main() {
  const kita = process.argv[2];
  const huluArg = process.argv[3] || "HEAD";
  if (!/^[0-9a-f]{7,40}$/i.test(kita || "")) {
    console.error("SHA cuplikan tidak sah.");
    process.exit(1);
  }
  const hulu = git(["rev-parse", "--verify", huluArg]).trim();
  const parent = git(["rev-parse", "--verify", `${kita}^`]).trim();
  const berubah = git(["diff", "--name-only", parent, kita])
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data/"));

  const capSisi = sisiLebihBaru(waktuCap(readJson(kita, BERKAS_CAP[2])), waktuCap(readJson(hulu, BERKAS_CAP[2])));
  const prakSisi = sisiLebihBaru(
    waktuPrakiraan(readJson(kita, BERKAS_PRAKIRAAN[1])),
    waktuPrakiraan(readJson(hulu, BERKAS_PRAKIRAAN[1])),
  );

  const biasa = [];
  let manifest = false;
  for (const file of berubah) {
    if (BERKAS_TURUNAN.has(file) || BERKAS_CAP.includes(file) || BERKAS_PRAKIRAAN.includes(file)) continue;
    if (file === "data/live/manifest.json") {
      manifest = true;
      continue;
    }
    biasa.push(file);
  }
  for (const file of biasa) applyFile(kita, file);
  if (berubah.some((file) => BERKAS_CAP.includes(file)) && capSisi === "kita") {
    for (const file of BERKAS_CAP) applyFile(kita, file);
  }
  if (berubah.some((file) => BERKAS_PRAKIRAAN.includes(file)) && prakSisi === "kita") {
    for (const file of BERKAS_PRAKIRAAN) applyFile(kita, file);
  }
  if (manifest) {
    const gabungan = gabungManifest(readJson(hulu, "data/live/manifest.json"), readJson(kita, "data/live/manifest.json"));
    const sekarang = readJson(hulu, "data/live/manifest.json");
    if (gabungan && JSON.stringify(gabungan) !== JSON.stringify(sekarang)) {
      writeFileSync("data/live/manifest.json", `${JSON.stringify(gabungan, null, 2)}\n`);
    }
  }
  console.log(
    `Pasang ulang: ${biasa.length} berkas, cap=${capSisi}, prakiraan=${prakSisi}, manifest=${manifest ? "gabung" : "tetap"}.`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
