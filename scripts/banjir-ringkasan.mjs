import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { susunRingkasan } from "../src/lib/banjirSusun.js";
import { parseCsv } from "../src/lib/csv.js";
import { HUJAN_PEMBANDING_MODEL } from "../src/lib/hujanPembanding.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(root, "data/live/banjir-ringkasan.json");

function readCsv(relative) {
  const full = resolve(root, relative);
  if (!existsSync(full)) return [];
  return parseCsv(readFileSync(full, "utf8"));
}

function readJson(relative) {
  const full = resolve(root, relative);
  if (!existsSync(full)) return {};
  try {
    return JSON.parse(readFileSync(full, "utf8"));
  } catch {
    return {};
  }
}

const capMeta = readJson("data/live/bmkg-cap-kab-meta.json");
const prakiraanMeta = readJson("data/live/bmkg-prakiraan-kab-meta.json");
const hujanMeta = readJson("data/live/hujan-pembanding-kab-meta.json");
const dibiRows = readCsv("data/bnpb/banjir-2024.csv");
const ringkas = susunRingkasan(
  {
    banjir: readCsv("data/static/irbi-2025-banjir.csv"),
    capAlerts: readCsv("data/live/bmkg-cap-kab.csv"),
    capMeta,
    prakiraanRows: readCsv("data/live/bmkg-prakiraan-kab.csv"),
    prakiraanStatus: existsSync(resolve(root, "data/live/bmkg-prakiraan-kab.csv")) ? "ok" : "gagal",
    prakiraanFetchedAt: prakiraanMeta.fetched_at || "",
    prakiraanObservedAt: prakiraanMeta.observed_at || "",
    pendudukRows: readCsv("data/static/penduduk-kabkota.csv"),
    dibiRows,
    dibiLoaded: dibiRows.length > 0,
    dasarianRows: readCsv("data/manual/bmkg-pdcht-dasarian.csv"),
    dasarianStatus: existsSync(resolve(root, "data/manual/bmkg-pdcht-dasarian.csv")) ? "ok" : "gagal",
    hujanRows: readCsv("data/live/hujan-pembanding-kab.csv"),
    hujanStatus: hujanMeta.status === "ok" && hujanMeta.model === HUJAN_PEMBANDING_MODEL ? "ok" : "gagal",
    hujanFetchedAt: hujanMeta.fetched_at || "",
  },
  new Date(),
);
function tanpaWaktuTulis(text) {
  if (!text) return "";
  try {
    const data = JSON.parse(text);
    delete data.generated_at;
    return JSON.stringify(data);
  } catch {
    return text;
  }
}

const previous = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
const next = `${JSON.stringify(ringkas)}\n`;
if (tanpaWaktuTulis(previous) === tanpaWaktuTulis(next)) {
  console.log("Ringkasan banjir tidak berubah.");
} else {
  writeFileSync(OUT, next);
  console.log(`Ringkasan banjir: ${ringkas.tabs.map((tab) => `${tab.id} ${tab.total.kab}`).join(", ")}.`);
}
