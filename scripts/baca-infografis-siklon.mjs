import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { bacaTeksInfografis, LABEL_INFOGRAFIS_OTOMATIS, yakinCukup } from "../src/lib/bacaInfografis.js";
import { daftarInfografis } from "../src/lib/siklonBmkg.js";
import { kunciNamaSiklon } from "../src/lib/siklonTampil.js";

function barisTsv(tsv) {
  const baris = [];
  for (const barisMentah of String(tsv || "").split(/\n/)) {
    const kolom = barisMentah.split("\t");
    if (kolom.length < 12 || kolom[0] !== "5") continue;
    const yakin = Number(kolom[10]);
    const teks = kolom[11].trim();
    if (!teks || !Number.isFinite(yakin) || yakin < 0) continue;
    baris.push({
      yakin,
      teks,
      baris: Number(kolom[4]) || 0,
      blok: `${kolom[1]}:${kolom[2]}:${kolom[3]}:${kolom[4]}`,
    });
  }
  return baris;
}

function teksDariBaris(baris) {
  let kunci = "";
  const keluar = [];
  let sekarang = [];
  for (const item of baris) {
    if (kunci && item.blok !== kunci) {
      keluar.push(sekarang.map((kata) => kata.teks).join(" "));
      sekarang = [];
    }
    kunci = item.blok;
    sekarang.push(item);
  }
  if (sekarang.length) keluar.push(sekarang.map((kata) => kata.teks).join(" "));
  return keluar.join("\n");
}

function yakinBagian(baris, teks) {
  const awal = baris.findIndex((item) => /dampak/i.test(item.teks));
  const akhir = baris.findIndex((item) => /malaka|gelombang|lebat/i.test(item.teks) && baris.indexOf(item) > awal);
  const potongan = baris.slice(awal >= 0 ? awal : 0, akhir >= 0 ? akhir + 8 : baris.length);
  const dipakai = potongan.filter((item) => teks.toLowerCase().includes(item.teks.toLowerCase()));
  return (dipakai.length ? dipakai : potongan).map((item) => item.yakin);
}

function ocrBerkas(bytes) {
  const folder = mkdtempSync(resolve(tmpdir(), "siklon-infografis-"));
  const path = resolve(folder, "infografis.jpg");
  try {
    writeFileSync(path, bytes);
    const hasil = spawnSync("tesseract", [path, "stdout", "-l", "ind+eng", "--psm", "6", "tsv"], {
      encoding: "utf8",
      timeout: 60000,
    });
    if (hasil.status !== 0) return null;
    return hasil.stdout;
  } catch {
    return null;
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

async function unduhGambar(url) {
  const response = await fetch(url, {
    headers: { Accept: "image/*", "User-Agent": "curl/8.5.0" },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) return null;
  const tipe = response.headers.get("content-type") || "";
  if (!tipe.startsWith("image/")) return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1000 || bytes.length > 8000000) return null;
  return bytes;
}

export async function bacaInfografisOtomatis(html) {
  const daftar = daftarInfografis(html);
  const entri = [];
  for (const sistem of daftar) {
    for (const url of sistem.berkas) {
      try {
        const bytes = await unduhGambar(url);
        if (!bytes) continue;
        const tsv = ocrBerkas(bytes);
        if (!tsv) continue;
        const baris = barisTsv(tsv);
        const teks = teksDariBaris(baris);
        const hasil = bacaTeksInfografis(teks);
        if (!hasil) continue;
        if (kunciNamaSiklon(hasil.sistem) !== kunciNamaSiklon(sistem.nama)) continue;
        if (!yakinCukup(yakinBagian(baris, hasil.potensi_dampak))) continue;
        entri.push({
          sistem: sistem.nama,
          potensi_dampak: hasil.potensi_dampak,
          sumber: { label: LABEL_INFOGRAFIS_OTOMATIS, url },
          berlaku_hingga: hasil.berlaku_hingga,
          diperbarui: hasil.diperbarui,
        });
        break;
      } catch {
        continue;
      }
    }
  }
  return {
    catatan: LABEL_INFOGRAFIS_OTOMATIS,
    entri,
  };
}
