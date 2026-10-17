import { looksLikeCsv, parseCsv } from "./csv.js";
import { assignProvince } from "./geo.js";
import { kategoriIspu, kelasKepercayaan } from "./warning.js";

export function num(value) {
  if (value == null || value === "") return null;
  const number = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

export function firmsRequestUrl(firms = {}) {
  const key = String(firms.mapKey ?? "").trim();
  const source = firms.sumber || "VIIRS_SNPP_NRT";
  const area = firms.area || "95,-11,141,6";
  const days = firms.rentangHari || 7;
  return `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(key)}/${encodeURIComponent(source)}/${area}/${days}`;
}

export function redactFirmsUrl(url) {
  return String(url).replace(/\/api\/area\/csv\/[^/]+\//, "/api/area/csv/***/");
}

export async function fetchCsv(url, fetchImpl = fetch, timeoutMs = 20000) {
  let response;
  try {
    response = await fetchImpl(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "text/csv,text/plain,*/*" },
    });
  } catch (error) {
    const name = error?.name;
    if (name === "TimeoutError" || name === "AbortError") {
      throw new Error("Waktu permintaan habis.");
    }
    throw new Error("Gagal menghubungi sumber (jaringan atau CORS).");
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  const check = looksLikeCsv(text);
  if (!check.ok) throw new Error(check.reason);
  return parseCsv(text);
}

function blankFeed(dataset, extra) {
  return {
    id: dataset.id,
    nama: dataset.nama || dataset.id,
    instansi: dataset.instansi || "—",
    csvUrl: dataset.csvUrl || "",
    frekuensi: dataset.frekuensi || "—",
    lisensi: dataset.lisensi || "",
    terakhirDiperbarui: dataset.terakhirDiperbarui || "",
    contoh: Boolean(dataset.contoh),
    asal: "csv",
    status: "gagal",
    error: "",
    urlTampil: dataset.csvUrl || "",
    rows: [],
    ...extra,
  };
}

export function normalizeHotspotRow(raw, { contoh = false } = {}) {
  const lintang = num(raw.lintang ?? raw.latitude);
  const bujur = num(raw.bujur ?? raw.longitude);
  let provinsi = String(raw.provinsi ?? raw.province ?? "").trim();
  if (!provinsi && lintang != null && bujur != null) provinsi = assignProvince(lintang, bujur);
  const kepercayaan = raw.kepercayaan ?? raw.confidence ?? "";
  const keterangan = raw.keterangan ?? "";
  return {
    tanggal: String(raw.tanggal ?? raw.acq_date ?? "").slice(0, 10),
    waktu: raw.waktu ?? raw.acq_time ?? "",
    lintang,
    bujur,
    provinsi: provinsi || "Lainnya",
    kabupaten: raw.kabupaten ?? "",
    satelit: raw.satelit ?? raw.satellite ?? "",
    kepercayaan: String(kepercayaan),
    kelasKepercayaan: kelasKepercayaan(kepercayaan),
    frp: num(raw.frp),
    kecerahan: num(raw.kecerahan ?? raw.brightness ?? raw.bright_ti4),
    keterangan,
    contoh: contoh || /data contoh/i.test(keterangan),
  };
}

function normalizeSipongi(raw) {
  return {
    tanggal: String(raw.tanggal ?? "").slice(0, 10),
    provinsi: raw.provinsi || "—",
    jumlah: num(raw.jumlah_hotspot) ?? 0,
    luas: num(raw.luas_terbakar_ha) ?? 0,
  };
}

function normalizeIrbi(raw) {
  return {
    tahun: raw.tahun || "",
    provinsi: raw.provinsi || "—",
    kabupaten: raw.kabupaten || "—",
    bahaya: num(raw.skor_bahaya),
    kerentanan: num(raw.skor_kerentanan),
    kapasitas: num(raw.skor_kapasitas),
    indeks: num(raw.indeks_risiko),
    kelas: raw.kelas_risiko || "—",
  };
}

function normalizeBmkg(raw) {
  return {
    tanggal: String(raw.tanggal ?? "").slice(0, 10),
    provinsi: raw.provinsi || "—",
    curahHujan: num(raw.curah_hujan_mm),
    suhu: num(raw.suhu_c),
    kelembapan: num(raw.kelembapan_pct),
    angin: num(raw.kec_angin_ms),
    fwi: num(raw.fwi),
    kelasFdrs: raw.kelas_fdrs || "",
  };
}

function normalizeIspu(raw) {
  const ispu = num(raw.ispu);
  return {
    tanggal: String(raw.tanggal ?? "").slice(0, 10),
    provinsi: raw.provinsi || "—",
    kota: raw.kota || "",
    ispu,
    kategori: kategoriIspu(ispu),
    parameter: raw.parameter_dominan || "",
    pm25: num(raw.pm25),
  };
}

const NORMALIZERS = {
  hotspot: (raw, contoh) => normalizeHotspotRow(raw, { contoh }),
  sipongi: (raw) => normalizeSipongi(raw),
  irbi: (raw) => normalizeIrbi(raw),
  bmkg: (raw) => normalizeBmkg(raw),
  ispu: (raw) => normalizeIspu(raw),
};

async function readDataset(dataset, fetchImpl, resolveUrl) {
  const url = resolveUrl(dataset.csvUrl);
  const records = await fetchCsv(url, fetchImpl);
  const normalize = NORMALIZERS[dataset.id] ?? ((raw) => raw);
  return records.map((raw) => normalize(raw, Boolean(dataset.contoh)));
}

async function loadHotspot(dataset, config, fetchImpl, resolveUrl) {
  const key = String(config?.firms?.mapKey ?? "").trim();
  if (!key) {
    try {
      const rows = await readDataset(dataset, fetchImpl, resolveUrl);
      return blankFeed(dataset, {
        status: dataset.contoh ? "contoh" : "berhasil",
        error: "",
        rows,
        urlTampil: dataset.csvUrl,
        asal: "csv",
      });
    } catch (error) {
      return blankFeed(dataset, { status: "gagal", error: error.message, rows: [] });
    }
  }

  const liveUrl = firmsRequestUrl(config.firms);
  try {
    const records = await fetchCsv(liveUrl, fetchImpl);
    const rows = records.map((raw) => normalizeHotspotRow(raw, { contoh: false }));
    return blankFeed(dataset, {
      contoh: false,
      status: "berhasil",
      error: "",
      rows,
      urlTampil: redactFirmsUrl(liveUrl),
      asal: "firms",
    });
  } catch (error) {
    try {
      const rows = await readDataset(dataset, fetchImpl, resolveUrl);
      return blankFeed(dataset, {
        status: "cadangan",
        error: `FIRMS gagal (${error.message}). Memakai CSV cadangan.`,
        rows,
        urlTampil: dataset.csvUrl,
        asal: "csv",
      });
    } catch (fallbackError) {
      return blankFeed(dataset, {
        status: "gagal",
        error: `FIRMS gagal (${error.message}). CSV cadangan juga gagal (${fallbackError.message}).`,
        rows: [],
        urlTampil: redactFirmsUrl(liveUrl),
        asal: "firms",
      });
    }
  }
}

export async function loadAll(config, deps = {}) {
  const fetchImpl = deps.fetchImpl ?? globalThis.fetch;
  const resolveUrl =
    deps.resolveUrl ??
    ((url) => {
      if (/^https?:\/\//i.test(url)) return url;
      return new URL(url, document.baseURI).href;
    });
  const datasets = Array.isArray(config?.datasets) ? config.datasets : [];
  return Promise.all(
    datasets.map(async (dataset) => {
      if (!dataset?.id) {
        return blankFeed(
          { id: "tanpa-id", nama: "Dataset tanpa id" },
          { error: "Dataset di config.json tidak memiliki id." },
        );
      }
      if (dataset.id === "hotspot") return loadHotspot(dataset, config, fetchImpl, resolveUrl);
      try {
        const rows = await readDataset(dataset, fetchImpl, resolveUrl);
        return blankFeed(dataset, {
          status: dataset.contoh ? "contoh" : "berhasil",
          error: "",
          rows,
          asal: "csv",
        });
      } catch (error) {
        return blankFeed(dataset, { status: "gagal", error: error.message, rows: [] });
      }
    }),
  );
}
