import { existsSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";

const raw = String(process.argv[2] ?? "").trim();
const prefix = !raw || raw === "/" ? "./" : raw.endsWith("/") ? raw : `${raw}/`;
const html = readFileSync("dist/index.html", "utf8");
const prefixV2 = prefix === "./" ? "./" : `${prefix}v2/`;
const htmlV2 = readFileSync("dist/v2/index.html", "utf8");

assert.match(html, /Pantau Bencana v0\.1/, "Akar situs tetap v0.1");
assert.match(
  html,
  new RegExp(`${prefix.replaceAll("/", "\\/")}assets\\/`),
  `index.html harus memuat aset di bawah ${prefix}assets/`,
);
assert.equal(html.includes('src="/assets/'), false, "Aset tidak boleh di akar domain");
assert.equal(html.includes('href="/assets/'), false, "CSS tidak boleh di akar domain");
assert.equal(html.includes("/v2/assets/"), false, "Akar situs tidak boleh memuat aset v0.2");

assert.match(htmlV2, /Pantau Bencana v0\.2/, "dist/v2 harus berlabel v0.2");
assert.match(
  htmlV2,
  new RegExp(`${prefixV2.replaceAll("/", "\\/")}assets\\/`),
  `dist/v2/index.html harus memuat aset di bawah ${prefixV2}assets/`,
);
assert.equal(htmlV2.includes('src="/assets/'), false, "Aset v0.2 tidak boleh di akar domain");
assert.equal(existsSync("dist/v2/config.json"), true, "config.json v0.2 hilang");
assert.equal(existsSync("dist/v2/data/sample/hotspot.csv"), true, "Data v0.2 tidak tersalin");

for (const file of [
  "dist/config.json",
  "dist/favicon.svg",
  "dist/data/sample/hotspot.csv",
  "dist/data/sample/ispu.csv",
  "dist/data/manual/bmkg-pdcht-dasarian.csv",
]) {
  assert.equal(existsSync(file), true, `Berkas hilang: ${file}`);
}

const config = JSON.parse(readFileSync("dist/config.json", "utf8"));
assert.equal(String(config.firms?.mapKey ?? "").trim(), "", "config.json yang dipublikasikan tidak boleh berisi MAP_KEY");
for (const dataset of config.datasets ?? []) {
  const url = String(dataset.csvUrl ?? "");
  assert.equal(url.startsWith("/"), false, `${dataset.id} csvUrl tidak boleh diawali /`);
}

console.log(`Build Pages siap. Prefiks aset: ${prefix}`);
