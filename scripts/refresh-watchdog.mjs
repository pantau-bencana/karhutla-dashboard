// Memutuskan apakah cuplikan live terlalu tua untuk menunggu cron berikutnya.
// Workflow penjaga memakai exit code ini: 0 = masih baru, 42 = perlu workflow_dispatch.
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { STALE_SNAPSHOT_HOURS } from "../src/lib/schedule.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function manifestAgeHours(generatedAt, now = new Date()) {
  if (!generatedAt) return Number.POSITIVE_INFINITY;
  const then = new Date(generatedAt);
  if (Number.isNaN(then.getTime())) return Number.POSITIVE_INFINITY;
  return (now.getTime() - then.getTime()) / 3600000;
}

export function manifestNeedsRefresh(generatedAt, now = new Date(), maxHours = STALE_SNAPSHOT_HOURS) {
  return manifestAgeHours(generatedAt, now) > maxHours;
}

function readGeneratedAt(manifestPath) {
  if (!existsSync(manifestPath)) return null;
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  return manifest.generated_at ?? null;
}

function writeOutput(dispatch) {
  const line = `dispatch=${dispatch ? "true" : "false"}`;
  console.log(line);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${line}\n`);
}

function main() {
  const manifestPath = resolve(root, "data/live/manifest.json");
  const generatedAt = readGeneratedAt(manifestPath);
  const age = manifestAgeHours(generatedAt);
  const dispatch = manifestNeedsRefresh(generatedAt);
  const ageLabel = Number.isFinite(age) ? age.toFixed(2) : "tidak-ada";
  console.log(`generated_at=${generatedAt ?? "tidak-ada"} umur_jam=${ageLabel} batas_jam=${STALE_SNAPSHOT_HOURS}`);
  writeOutput(dispatch);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
