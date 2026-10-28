// Memutuskan apakah cuplikan live terlalu tua untuk menunggu cron berikutnya.
// Workflow penjaga memakai exit code ini: 0 = masih baru, 42 = perlu workflow_dispatch.
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CAP_WATCH_MINUTES, PRAKIRAAN_SLOT_GRACE_MS, STALE_SNAPSHOT_HOURS, slotPrakiraanTerakhir } from "../src/lib/schedule.js";
import { siklonPerluTanda } from "../src/lib/siklonBmkg.js";

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

function runCreatedAt(run) {
  const time = new Date(run?.createdAt ?? run?.created_at ?? 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

// Slot menit 0 tanpa run sukses, dan tanpa run yang masih antre, perlu dipicu.
// Run gagal tidak menutup slot. Run yang masih berjalan menutupnya supaya unduhan tidak ganda.
export function prakiraanSlotMissed(runs, now = new Date(), graceMs = PRAKIRAAN_SLOT_GRACE_MS) {
  const list = Array.isArray(runs) ? runs : [];
  if (list.some((run) => ACTIVE_RUN.has(run?.status))) return false;
  const slot = slotPrakiraanTerakhir(now);
  if (slot == null) return false;
  if (now.getTime() - slot < graceMs) return false;
  const covered = list.some((run) => {
    if (runCreatedAt(run) < slot) return false;
    if (run?.conclusion) return run.conclusion === "success";
    return run?.status === "completed";
  });
  return !covered;
}

function readManifest(manifestPath) {
  if (!existsSync(manifestPath)) return null;
  try {
    return JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    return null;
  }
}

function writeOutputs(fields) {
  for (const [key, value] of Object.entries(fields)) {
    const line = `${key}=${value}`;
    console.log(line);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${line}\n`);
  }
}

function readRunList(name) {
  if (!process.env[name]) return null;
  try {
    const parsed = JSON.parse(process.env[name]);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function main() {
  const manifestPath = resolve(root, "data/live/manifest.json");
  const manifest = readManifest(manifestPath);
  const generatedAt = manifest?.generated_at ?? null;
  const age = manifestAgeHours(generatedAt);
  const dispatch = manifestNeedsRefresh(generatedAt);
  const ageLabel = Number.isFinite(age) ? age.toFixed(2) : "tidak-ada";
  console.log(`generated_at=${generatedAt ?? "tidak-ada"} umur_jam=${ageLabel} batas_jam=${STALE_SNAPSHOT_HOURS}`);
  const capRuns = readRunList("CAP_RUNS_JSON");
  const dispatchCap = capRuns ? capRunMissed(capRuns) : false;
  if (capRuns) console.log(`cap_run=${capRuns.length} batas_menit=${CAP_WATCH_MINUTES}`);
  const prakiraanRuns = readRunList("PRAKIRAAN_RUNS_JSON");
  const dispatchPrakiraan = prakiraanRuns ? prakiraanSlotMissed(prakiraanRuns) : false;
  if (prakiraanRuns) {
    const slot = slotPrakiraanTerakhir();
    console.log(`prakiraan_run=${prakiraanRuns.length} slot=${slot ? new Date(slot).toISOString() : "tidak-ada"}`);
  }
  const tandaSiklon = siklonPerluTanda(manifest?.datasets?.bmkg_siklon);
  if (tandaSiklon) {
    const pesan = "Siklon BMKG gagal lebih dari satu siklus berturut-turut. Cuplikan sebelumnya masih dipakai. Periksa halaman Siklon Tropis.";
    console.log(pesan);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${pesan}\n`);
  }
  writeOutputs({
    dispatch: dispatch ? "true" : "false",
    dispatch_cap: dispatchCap ? "true" : "false",
    dispatch_prakiraan: dispatchPrakiraan ? "true" : "false",
    siklon_tanda: tandaSiklon ? "true" : "false",
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
