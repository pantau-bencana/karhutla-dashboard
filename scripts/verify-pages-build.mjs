import { existsSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";

const raw = String(process.argv[2] ?? "").trim();
const prefix = !raw || raw === "/" ? "./" : raw.endsWith("/") ? raw : `${raw}/`;
const html = readFileSync("dist/index.html", "utf8");

assert.match(
  html,
  new RegExp(`${prefix.replaceAll("/", "\\/")}assets\\/`),
  `index.html harus memuat aset di bawah ${prefix}assets/`,
);
assert.equal(html.includes('src="/assets/'), false, "Aset tidak boleh di akar domain");
assert.equal(html.includes('href="/assets/'), false, "CSS tidak boleh di akar domain");

for (const file of ["dist/config.json", "dist/favicon.svg", "dist/data/sample/hotspot.csv", "dist/data/sample/ispu.csv"]) {
  assert.equal(existsSync(file), true, `Berkas hilang: ${file}`);
}

const config = JSON.parse(readFileSync("dist/config.json", "utf8"));
assert.equal(String(config.firms?.mapKey ?? "").trim(), "", "config.json yang dipublikasikan tidak boleh berisi MAP_KEY");
for (const dataset of config.datasets ?? []) {
  const url = String(dataset.csvUrl ?? "");
  assert.equal(url.startsWith("/"), false, `${dataset.id} csvUrl tidak boleh diawali /`);
}

console.log(`Build Pages siap. Prefiks aset: ${prefix}`);
