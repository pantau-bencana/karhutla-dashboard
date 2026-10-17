import { looksLikeCsv, parseCsv } from "./csv.js";
import { REFRESH_INTERVAL_HOURS } from "./schedule.js";
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
  const provinsi = String(raw.provinsi ?? raw.province ?? "").trim() || "Belum terpetakan";
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

function normalizePrakiraan(raw) {
  return {
    tanggal: String(raw.tanggal ?? "").slice(0, 10),
    waktuLokal: raw.waktu_lokal || "",
    provinsi: raw.provinsi || "—",
    kotkab: raw.kotkab || "",
    kecamatan: raw.kecamatan || "",
    desa: raw.desa || "",
    adm4: raw.adm4 || "",
    suhu: num(raw.suhu_c),
    kelembapan: num(raw.kelembapan_pct),
    curahHujan: num(raw.curah_hujan_tp),
    anginKmj: num(raw.kec_angin_kmj),
    arahAngin: raw.arah_angin || "",
    cuaca: raw.cuaca || "",
    analysisUtc: raw.analysis_utc || "",
  };
}

function normalizeCap(raw) {
  return {
    id: raw.id || "",
    judul: raw.judul || "",
    kejadian: raw.kejadian || "",
    tingkat: raw.tingkat || "",
    mulai: raw.mulai || "",
    berakhir: raw.berakhir || "",
    wilayah: raw.wilayah || "",
    url: raw.url || "",
  };
}

function normalizeDibi(raw) {
  return {
    tahun: String(raw.tahun ?? ""),
    jenis: raw.jenis || "",
    jumlah: num(raw.jumlah),
    cakupan: raw.cakupan || "Nasional",
    keterangan: raw.keterangan || "",
  };
}

function normalizePembandingCuaca(raw) {
  return {
    tanggal: String(raw.tanggal ?? "").slice(0, 10),
    provinsi: raw.provinsi || "—",
    curahHujan: num(raw.curah_hujan_mm),
    suhu: num(raw.suhu_c),
    kelembapan: num(raw.kelembapan_pct),
    anginKmj: num(raw.kec_angin_kmj),
    hariTanpaHujan: num(raw.hari_tanpa_hujan),
  };
}

function normalizeFwiGwis(raw) {
  return {
    tanggal: String(raw.tanggal ?? "").slice(0, 10),
    provinsi: raw.provinsi || "—",
    kabupaten: raw.kabupaten || "",
    fwi: num(raw.fwi),
  };
}

const NORMALIZERS = {
  hotspot: (raw, contoh) => normalizeHotspotRow(raw, { contoh }),
  sipongi: (raw) => normalizeSipongi(raw),
  irbi: (raw) => normalizeIrbi(raw),
  bmkg: (raw) => normalizeBmkg(raw),
  ispu: (raw) => normalizeIspu(raw),
  bmkg_prakiraan: (raw) => normalizePrakiraan(raw),
  fdrs_pembanding: (raw) => normalizePembandingCuaca(raw),
  ispu_pembanding: (raw) => normalizeIspu(raw),
  bmkg_cap: (raw) => normalizeCap(raw),
  dibi_karhutla: (raw) => normalizeDibi(raw),
};

function metaFromEntry(entry) {
  if (!entry) return {};
  return {
    updateType: entry.update_type || "",
    mode: entry.mode || "snapshot",
    fetchedAt: entry.fetched_at || "",
    observedAt: entry.observed_at || "",
    observedLabel: entry.observed_label || "",
    sourceUpdatedAt: entry.source_updated_at || entry.observed_at || "",
    expectedMaxAgeHours: entry.expected_max_age_hours,
    scheduleIntervalHours: entry.schedule_interval_hours || REFRESH_INTERVAL_HOURS,
    sumber: entry.source || "",
    lisensi: entry.license || "",
    frekuensi: entry.frequency || "",
    recordCount: entry.record_count,
    method: entry.method || "",
    provider: entry.provider || "",
    officialUrl: entry.official_url || entry.url || "",
    limitation: entry.limitation || "",
    access: entry.access || "",
    fungsi: entry.fungsi || "",
    comparesTo: entry.compares_to || "",
    urlTampil: entry.url || "",
    ...(entry.nama ? { nama: entry.nama } : {}),
    ...(entry.instansi ? { instansi: entry.instansi } : {}),
  };
}

function sampleTiming(dataset, rows) {
  const dates = (rows ?? []).map((row) => row.tanggal).filter(Boolean).sort();
  const years = (rows ?? []).map((row) => String(row.tahun ?? "")).filter(Boolean).sort();
  let observedAt = "";
  let observedLabel = "Tidak ada cap waktu pada berkas contoh.";
  let maxAge = 24 * 14;
  if (dates.length) {
    observedAt = `${dates.at(-1)}T16:59:00.000Z`;
    observedLabel = dates[0] === dates.at(-1) ? `${dates.at(-1)} (berkas contoh)` : `${dates[0]} – ${dates.at(-1)} (berkas contoh)`;
  } else if (years.length) {
    observedAt = `${years.at(-1)}-12-31T17:00:00.000Z`;
    observedLabel = `Tahun ${years.at(-1)} pada berkas contoh`;
    maxAge = 24 * 30 * 18;
  }
  return {
    updateType: "Contoh",
    mode: "contoh",
    fetchedAt: "",
    observedAt,
    observedLabel,
    sourceUpdatedAt: observedAt,
    expectedMaxAgeHours: maxAge,
    scheduleIntervalHours: REFRESH_INTERVAL_HOURS,
    limitation: dataset.lisensi || "",
  };
}

async function readManifest(resolveUrl, fetchImpl) {
  try {
    const response = await fetchImpl(resolveUrl("data/live/manifest.json"), { cache: "no-store" });
    if (!response?.ok) return null;
    return JSON.parse(await response.text());
  } catch {
    return null;
  }
}

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

async function trySnapshot(dataset, entry, fetchImpl, resolveUrl) {
  if (!entry?.file || (entry.status !== "ok" && !entry.kept_previous)) return null;
  try {
    const rows = await readDataset({ ...dataset, csvUrl: entry.file, contoh: false }, fetchImpl, resolveUrl);
    const meta = metaFromEntry(entry);
    return blankFeed(dataset, {
      ...meta,
      status: entry.status === "ok" ? "berhasil" : "usang",
      contoh: false,
      asal: "snapshot",
      error: entry.status === "ok" ? "" : entry.error || "Menampilkan snapshot terakhir.",
      rows,
      urlTampil: meta.urlTampil || dataset.csvUrl,
    });
  } catch {
    return null;
  }
}

function withSampleClock(feed, dataset) {
  if (!feed?.contoh || feed.updateType) return feed;
  return { ...feed, ...sampleTiming(dataset, feed.rows) };
}

export async function loadAll(config, deps = {}) {
  const fetchImpl = deps.fetchImpl ?? globalThis.fetch;
  const resolveUrl =
    deps.resolveUrl ??
    ((url) => {
      if (/^https?:\/\//i.test(url)) return url;
      return new URL(url, document.baseURI).href;
    });
  const manifest = deps.manifest === undefined ? await readManifest(resolveUrl, fetchImpl) : deps.manifest;
  const datasets = Array.isArray(config?.datasets) ? config.datasets : [];
  const feeds = await Promise.all(
    datasets.map(async (dataset) => {
      if (!dataset?.id) {
        return blankFeed(
          { id: "tanpa-id", nama: "Dataset tanpa id" },
          { error: "Dataset di config.json tidak memiliki id." },
        );
      }
      const snapshot = await trySnapshot(dataset, manifest?.datasets?.[dataset.id], fetchImpl, resolveUrl);
      if (snapshot) return snapshot;
      if (dataset.id === "hotspot") {
        return withSampleClock(await loadHotspot(dataset, config, fetchImpl, resolveUrl), dataset);
      }
      try {
        const rows = await readDataset(dataset, fetchImpl, resolveUrl);
        return withSampleClock(
          blankFeed(dataset, {
            status: dataset.contoh ? "contoh" : "berhasil",
            error: "",
            rows,
            asal: "csv",
          }),
          dataset,
        );
      } catch (error) {
        return blankFeed(dataset, { status: "gagal", error: error.message, rows: [] });
      }
    }),
  );

  for (const id of ["bmkg_prakiraan", "fdrs_pembanding", "ispu_pembanding", "bmkg_cap", "dibi_karhutla"]) {
    const entry = manifest?.datasets?.[id];
    if (!entry?.file) continue;
    const snapshot = await trySnapshot(
      {
        id,
        nama: entry.nama || id,
        instansi: entry.instansi || "",
        csvUrl: entry.file,
        frekuensi: entry.frequency || "",
        lisensi: entry.license || "",
      },
      entry,
      fetchImpl,
      resolveUrl,
    );
    if (snapshot) feeds.push(snapshot);
  }

  const peta = await loadOptionalCsv(
    { id: "hotspot_peta", nama: "Peta hotspot darat", csvUrl: "data/live/hotspot-peta.csv" },
    (raw) => normalizeHotspotRow(raw, { contoh: false }),
    fetchImpl,
    resolveUrl,
  );
  if (peta) {
    try {
      const metaUrl = resolveUrl("data/live/hotspot-peta-meta.json");
      const response = await fetchImpl(metaUrl);
      if (response.ok) peta.petaMeta = await response.json();
    } catch {
      peta.petaMeta = null;
    }
    feeds.push(peta);
  }
  const fwi = await loadOptionalCsv(
    { id: "fwi_gwis_pembanding", nama: "FWI GWIS", csvUrl: "data/live/fwi_gwis_pembanding.csv" },
    normalizeFwiGwis,
    fetchImpl,
    resolveUrl,
  );
  if (fwi && !feeds.some((feed) => feed.id === "fwi_gwis_pembanding")) feeds.push(fwi);

  feeds.manifest = manifest;
  return feeds;
}

async function loadOptionalCsv(dataset, normalizer, fetchImpl, resolveUrl) {
  try {
    const records = await fetchCsv(resolveUrl(dataset.csvUrl), fetchImpl);
    const rows = records.map((raw) => normalizer(raw)).filter(Boolean);
    if (!rows.length) return null;
    return blankFeed(dataset, {
      status: "berhasil",
      contoh: false,
      error: "",
      rows,
      asal: "snapshot",
    });
  } catch {
    return null;
  }
}
