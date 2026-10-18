import { readFileSync } from "node:fs";
import { parseCsv } from "../src/lib/csv.js";
import { DASARIAN_FILE, validateDasarian } from "../src/lib/dasarianManual.js";
import { kodeWilayah } from "../src/lib/floodMatrix.js";

const irbi = parseCsv(readFileSync("data/static/irbi-2025-banjir-aceh-bengkulu.csv", "utf8"));
const expected = irbi.map((row) => kodeWilayah(row.kode_wilayah));
const text = readFileSync(DASARIAN_FILE, "utf8");
const errors = validateDasarian(text, expected);
if (errors.length) {
  console.error("Isian dasarian ditolak.");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
const filled = parseCsv(text).filter((row) => String(row.status ?? "").trim()).length;
console.log(filled ? `Isian dasarian sah. ${filled} baris berstatus.` : "Isian dasarian sah. Belum ada status yang diisi.");
