import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SOURCES } from "../src/lib/sourceCatalog.js";
import { REFRESH_INTERVAL_HOURS } from "../src/lib/schedule.js";
import { SIKLON_API_URL, SIKLON_HTML_URL, SIKLON_PDF_URL, jumlahSistemSiklon, susunCuplikan } from "../src/lib/siklonBmkg.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const berkas = resolve(root, "data/live/siklon-bmkg.json");
const manifes = resolve(root, "data/live/manifest.json");

function aman(teks) {
  return String(teks || "").replace(/eyJ[A-Za-z0-9_-]+/g, "[token]").replace(/\s+/g, " ").slice(0, 180);
}

async function ambilTeks(url, timeoutMs) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: "text/html,application/pdf,application/json,*/*", "User-Agent": "curl/8.5.0" },
  });
  return response;
}

function teksPdf(bytes) {
  const folder = mkdtempSync(resolve(tmpdir(), "siklon-pdf-"));
  const path = resolve(folder, "ikhtisar.pdf");
  try {
    writeFileSync(path, bytes);
    const python = spawnSync(
      "python3",
      [
        "-c",
        "import json,sys\nfrom pypdf import PdfReader\nr=PdfReader(sys.argv[1])\nprint(json.dumps({'text':'\\n'.join((p.extract_text() or '') for p in r.pages)}))",
        path,
      ],
      { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
    );
    if (python.status !== 0) {
      throw new Error(aman(python.stderr || python.stdout || "pypdf gagal"));
    }
    const json = JSON.parse(python.stdout);
    return String(json.text || "");
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

export async function ambilSiklon(now = new Date()) {
  const fetchedAt = now.toISOString();
  let apiHttp = 0;
  let apiGalat = "";
  try {
    const api = await ambilTeks(SIKLON_API_URL, 20000);
    apiHttp = api.status;
    await api.arrayBuffer();
    if (!api.ok) apiGalat = `HTTP ${api.status}`;
  } catch (error) {
    apiGalat = aman(error?.message || error);
  }

  const halaman = await ambilTeks(SIKLON_HTML_URL, 40000);
  const html = await halaman.text();
  if (!halaman.ok) throw new Error(`Halaman Siklon Tropis HTTP ${halaman.status}`);

  let ikhtisarTeks = "";
  let ikhtisarGalat = "";
  let pdfDiubah = "";
  try {
    const pdf = await ambilTeks(SIKLON_PDF_URL, 40000);
    if (!pdf.ok) throw new Error(`Ikhtisar HTTP ${pdf.status}`);
    pdfDiubah = pdf.headers.get("last-modified") || "";
    const bytes = Buffer.from(await pdf.arrayBuffer());
    ikhtisarTeks = teksPdf(bytes);
    if (!ikhtisarTeks.trim()) ikhtisarGalat = "Teks ikhtisar tidak terbaca.";
  } catch (error) {
    ikhtisarGalat = aman(error?.message || error);
  }

  const cuplikan = susunCuplikan({ html, ikhtisarTeks, ikhtisarGalat, apiHttp, apiGalat, fetchedAt, pdfDiubah });
  const badan = `${JSON.stringify(cuplikan, null, 2)}\n`;
  const terbit = cuplikan.ikhtisar.terbit;
  const namaHalaman = cuplikan.sistem_halaman.map((item) => `${item.tahap} ${item.nama}`).join(", ");
  const namaIkhtisar = cuplikan.ikhtisar.sistem.map((item) => item.nama).join(", ");
  return {
    badan,
    cuplikan,
    observedAt: pdfDiubah ? new Date(pdfDiubah).toISOString() : terbit ? `${terbit}T00:00:00+07:00` : null,
    sourceUpdatedAt: pdfDiubah ? new Date(pdfDiubah).toISOString() : null,
    observedLabel: [
      `Halaman Siklon Tropis: ${cuplikan.status_teks}`,
      namaHalaman ? `Disebut: ${namaHalaman}` : "",
      "Tanpa jam pembaruan pada halaman",
      terbit ? `Ikhtisar tertanggal ${terbit}` : "",
      namaIkhtisar ? `Ikhtisar menyebut ${namaIkhtisar}` : "",
    ].filter(Boolean).join(". ") + ".",
    recordCount: jumlahSistemSiklon(cuplikan),
    apiHttp,
  };
}

function tulisManifes(hasil) {
  const source = SOURCES.find((item) => item.id === "bmkg_siklon");
  const previous = existsSync(manifes) ? JSON.parse(readFileSync(manifes, "utf8")) : { datasets: {} };
  const hash = createHash("sha256").update(hasil.badan).digest("hex");
  previous.datasets = previous.datasets || {};
  previous.datasets.bmkg_siklon = {
    id: "bmkg_siklon",
    nama: source.nama,
    instansi: source.instansi,
    source: source.nama,
    url: source.officialUrl,
    license: "Sumber: BMKG.",
    mode: "snapshot",
    update_type: source.updateType,
    access: source.access,
    frequency: source.updateType,
    limitation: source.limitation,
    fungsi: source.fungsi,
    expected_max_age_hours: source.expectedMaxAgeHours,
    schedule_interval_hours: REFRESH_INTERVAL_HOURS,
    fetched_at: hasil.cuplikan.fetched_at,
    observed_at: hasil.observedAt,
    observed_label: hasil.observedLabel,
    source_updated_at: hasil.sourceUpdatedAt,
    record_count: hasil.recordCount,
    status: "ok",
    error: null,
    file: "data/live/siklon-bmkg.json",
    content_hash: hash,
    kept_previous: false,
    gagal_berturut: 0,
  };
  writeFileSync(manifes, `${JSON.stringify(previous, null, 2)}\n`);
}

const dipanggilLangsung = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (dipanggilLangsung) {
  const hasil = await ambilSiklon();
  writeFileSync(berkas, hasil.badan);
  tulisManifes(hasil);
  console.log(
    `siklon: halaman ${hasil.cuplikan.status_teks}; ikhtisar ${hasil.cuplikan.ikhtisar.status}; api ${hasil.apiHttp}; sistem ${hasil.recordCount}`,
  );
}
