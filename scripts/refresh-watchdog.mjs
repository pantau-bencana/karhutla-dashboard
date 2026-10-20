// Memutuskan apakah cuplikan live terlalu tua untuk menunggu cron berikutnya.
// Workflow penjaga memakai exit code ini: 0 = masih baru, 42 = perlu workflow_dispatch.
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CAP_WATCH_MINUTES, STALE_SNAPSHOT_HOURS } from "../src/lib/schedule.js";

const ACTIVE_RUN = new Set(["in_progress", "queued", "pending", "waiting", "requested"]);

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

export function capRunMissed(runs, now = new Date(), maxMinutes = CAP_WATCH_MINUTES) {
  const list = Array.isArray(runs) ? runs : [];
  if (list.some((run) => ACTIVE_RUN.has(run?.status))) return false;
  const newest = list
    .map((run) => new Date(run?.createdAt ?? run?.created_at ?? 0).getTime())
    .filter((time) => Number.isFinite(time) && time > 0)
    .sort((left, right) => right - left)[0];
  if (!newest) return true;
  return (now.getTime() - newest) / 60000 > maxMinutes;
}

function readGeneratedAt(manifestPath) {
  if (!existsSync(manifestPath)) return null;
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  return manifest.generated_at ?? null;
}

function writeOutputs(fields) {
  for (const [key, value] of Object.entries(fields)) {
    const line = `${key}=${value}`;
    console.log(line);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${line}\n`);
  }
}

function readCapRuns() {
  if (!process.env.CAP_RUNS_JSON) return null;
  try {
    const parsed = JSON.parse(process.env.CAP_RUNS_JSON);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function main() {
  const manifestPath = resolve(root, "data/live/manifest.json");
  const generatedAt = readGeneratedAt(manifestPath);
  const age = manifestAgeHours(generatedAt);
  const dispatch = manifestNeedsRefresh(generatedAt);
  const ageLabel = Number.isFinite(age) ? age.toFixed(2) : "tidak-ada";
  console.log(`generated_at=${generatedAt ?? "tidak-ada"} umur_jam=${ageLabel} batas_jam=${STALE_SNAPSHOT_HOURS}`);
  const capRuns = readCapRuns();
  const dispatchCap = capRuns ? capRunMissed(capRuns) : false;
  if (capRuns) console.log(`cap_run=${capRuns.length} batas_menit=${CAP_WATCH_MINUTES}`);
  writeOutputs({
    dispatch: dispatch ? "true" : "false",
    dispatch_cap: dispatchCap ? "true" : "false",
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
