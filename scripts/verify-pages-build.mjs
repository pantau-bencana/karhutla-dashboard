import { existsSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";

const raw = String(process.argv[2] ?? "").trim();
const prefix = !raw || raw === "/" ? "./" : raw.endsWith("/") ? raw : `${raw}/`;
const html = readFileSync("dist/index.html", "utf8");
const prefixV2 = prefix === "./" ? "./" : `${prefix}v2/`;
const prefixV3 = prefix === "./" ? "./" : `${prefix}v3/`;
const htmlV2 = readFileSync("dist/v2/index.html", "utf8");
const htmlV3 = readFileSync("dist/v3/index.html", "utf8");

assert.match(html, /Pantau Bencana v0\.1/, "Akar situs tetap v0.1");
assert.match(
  html,
  new RegExp(`${prefix.replaceAll("/", "\\/")}assets\\/`),
  `index.html harus memuat aset di bawah ${prefix}assets/`,
);
assert.equal(html.includes('src="/assets/'), false, "Aset tidak boleh di akar domain");
assert.equal(html.includes('href="/assets/'), false, "CSS tidak boleh di akar domain");
assert.equal(html.includes("/v2/assets/"), false, "Akar situs tidak boleh memuat aset v0.2");
assert.equal(html.includes("/v3/assets/"), false, "Akar situs tidak boleh memuat aset v0.3");

assert.match(htmlV2, /Pantau Bencana v0\.2/, "dist/v2 harus berlabel v0.2");
assert.match(
  htmlV2,
  new RegExp(`${prefixV2.replaceAll("/", "\\/")}assets\\/`),
  `dist/v2/index.html harus memuat aset di bawah ${prefixV2}assets/`,
);
assert.equal(htmlV2.includes('src="/assets/'), false, "Aset v0.2 tidak boleh di akar domain");
assert.equal(existsSync("dist/v2/config.json"), true, "config.json v0.2 hilang");
assert.equal(existsSync("dist/v2/data/sample/hotspot.csv"), true, "Data v0.2 tidak tersalin");
assert.equal(htmlV2.includes("/v3/assets/"), false, "v0.2 tidak boleh memuat aset v0.3");

assert.match(htmlV3, /Pantau Bencana v0\.3/, "dist/v3 harus berlabel v0.3");
assert.match(
  htmlV3,
  new RegExp(`${prefixV3.replaceAll("/", "\\/")}assets\\/`),
  `dist/v3/index.html harus memuat aset di bawah ${prefixV3}assets/`,
);
assert.equal(htmlV3.includes('src="/assets/'), false, "Aset v0.3 tidak boleh di akar domain");
assert.equal(htmlV3.includes("/v2/assets/"), false, "v0.3 tidak boleh memuat aset v0.2");
assert.equal(existsSync("dist/v3/config.json"), true, "config.json v0.3 hilang");
assert.equal(existsSync("dist/v3/data/sample/hotspot.csv"), true, "Data v0.3 tidak tersalin");
assert.equal(existsSync("dist/v3/data/live/manifest.json"), true, "Cuplikan v0.3 tidak tersalin");

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
