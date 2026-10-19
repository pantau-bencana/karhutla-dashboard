// Metode A+ — peringkat kesiapsiagaan 14 hari dari model pihak ketiga.
// Ambang FFMC/DC adalah literatur FDRS ASEAN (de Groot dkk. 2007), diterapkan pada nilai model.

export const PRIORITAS_JUDUL = "Prioritas kesiapsiagaan 14 hari (FWI hanya 9 hari)";
export const PRIORITAS_JENIS = "pemodelan pihak ketiga";
export const AMBANG_LABEL =
  "ambang literatur FDRS ASEAN diterapkan pada nilai model, bukan kelas BMKG";
export const PRIORITAS_DISCLAIMER =
  "Peringkat model pihak ketiga, bukan prakiraan resmi BMKG/BNPB. Disusun otomatis dari model cuaca ECMWF (lewat Copernicus GWIS dan Open-Meteo), deteksi satelit NASA FIRMS, dan IRBI 2025 (data statis). Ambang FFMC/DC berasal dari literatur FDRS ASEAN (de Groot dkk. 2007) dan diterapkan pada nilai model. Ini bukan FDRS BMKG, bukan kelas kemudahan terbakar BMKG, dan bukan status siaga.";
export const DAFTAR_KOSONG =
  "Tidak ada kab/kota dalam cakupan yang memenuhi syarat kering dan cuaca kebakaran pada periode ini";
export const CATATAN_SATU_TITIK = "hanya 1 titik sampel";
export const CATATAN_HOTSPOT =
  "Hotspot adalah deteksi satelit, bukan kebakaran terkonfirmasi, dan dapat berasal dari sumber panas lain (gunung api, industri, dan semacamnya).";

export const DAFTAR_PANJANG = 15;
export const MIN_LENGKAP = 30;
export const I2_MIN = 0.5;
export const FFMC_AMBANG = 78;
export const FFMC_HARI_MIN = 3;
export const DC_AMBANG = 260;
export const GWIS_HARI_MIN = 5;
export const HOTSPOT_LANTAI = 50;
export const HOTSPOT_HARI_MIN = 2;
export const ENSEMBLE_MAX_JAM = 36;
export const GWIS_MAX_JAM = 48;
export const FIRMS_BLOK_MAX_JAM = 24;
export const TITIK_MAKS = 5;
export const GRID_DERAJAT = 0.25;

export const CAKUPAN_PROVINSI = Object.freeze([
  "Riau",
  "Jambi",
  "Sumatera Selatan",
  "Kalimantan Barat",
  "Kalimantan Tengah",
  "Kalimantan Selatan",
]);

export function kodeKan(value) {
  const text = String(value ?? "").trim();
  if (/^\d{2}\.\d{2}$/.test(text)) return text;
  const digits = text.replace(/\D/g, "");
  if (digits.length === 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return text;
}

export function percentileInc(values, p) {
  const sorted = (values ?? []).filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  const n = sorted.length;
  if (!n) return null;
  if (n === 1) return sorted[0];
  const rank = (n - 1) * p;
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  if (low === high) return sorted[low];
  return sorted[low] * (high - rank) + sorted[high] * (rank - low);
}

export function p75(values) {
  return percentileInc(values, 0.75);
}

// Indeks floor((n-1)*p), tanpa interpolasi. Pada snapshot 19 Okt 2026 ini menghasilkan 231.
export function kuantilIndeks(values, p) {
  const sorted = (values ?? []).filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[index];
}

export function percentRanks(values) {
  const indexed = [];
  (values ?? []).forEach((value, index) => {
    if (!Number.isFinite(value)) return;
    indexed.push({ index, value });
  });
  const n = indexed.length;
  const out = (values ?? []).map(() => null);
  if (!n) return out;
  if (n === 1) {
    out[indexed[0].index] = 1;
    return out;
  }
  indexed.sort((a, b) => a.value - b.value || a.index - b.index);
  let cursor = 0;
  while (cursor < n) {
    let end = cursor;
    while (end < n && indexed[end].value === indexed[cursor].value) end += 1;
    const average = (cursor + 1 + end) / 2;
    const rank = (average - 1) / (n - 1);
    for (let i = cursor; i < end; i += 1) out[indexed[i].index] = rank;
    cursor = end;
  }
  return out;
}

export function agregasiHotspot(rows) {
  const groups = new Map();
  for (const row of rows ?? []) {
    const conf = String(row.kepercayaan ?? row.kelasKepercayaan ?? "").toLowerCase();
    if (conf !== "n" && conf !== "h" && conf !== "nominal" && conf !== "tinggi") continue;
    const kode = kodeKan(row.kode_kabupaten ?? row.kodeKabupaten ?? row.kode);
    if (!kode) continue;
    const current = groups.get(kode) ?? {
      kode,
      kab: String(row.kabupaten ?? "").trim(),
      prov: String(row.provinsi ?? "").trim(),
      jumlah: 0,
      tanggal: [],
    };
    current.jumlah += 1;
    const tanggal = String(row.tanggal ?? "").slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) current.tanggal.push(tanggal);
    if (!current.kab && row.kabupaten) current.kab = String(row.kabupaten).trim();
    if (!current.prov && row.provinsi) current.prov = String(row.provinsi).trim();
    groups.set(kode, current);
  }
  return [...groups.values()].map((group) => ({
    kode: group.kode,
    kab: group.kab,
    prov: group.prov,
    jumlah: group.jumlah,
    hari: new Set(group.tanggal).size,
    berurutan: longestStreak(group.tanggal),
  }));
}

export function longestStreak(dates) {
  const unique = [...new Set((dates ?? []).filter(Boolean))].sort();
  if (!unique.length) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i += 1) {
    const delta = (Date.parse(`${unique[i]}T00:00:00Z`) - Date.parse(`${unique[i - 1]}T00:00:00Z`)) / 86400000;
    if (delta === 1) run += 1;
    else if (delta > 1) run = 1;
    best = Math.max(best, run);
  }
  return best;
}

function jarak2(a, b) {
  const dx = a.bujur - b.bujur;
  const dy = a.lintang - b.lintang;
  return dx * dx + dy * dy;
}

export function farthestPointSample(nodes, limit = TITIK_MAKS) {
  const pool = (nodes ?? []).filter((node) => Number.isFinite(node?.lintang) && Number.isFinite(node?.bujur));
  if (pool.length <= limit) return pool.slice();
  const center = {
    lintang: pool.reduce((sum, node) => sum + node.lintang, 0) / pool.length,
    bujur: pool.reduce((sum, node) => sum + node.bujur, 0) / pool.length,
  };
  let start = 0;
  let best = Infinity;
  pool.forEach((node, index) => {
    const distance = jarak2(node, center);
    if (distance < best) {
      best = distance;
      start = index;
    }
  });
  const chosen = [pool[start]];
  const rest = pool.filter((_, index) => index !== start);
  while (chosen.length < limit && rest.length) {
    let pick = 0;
    let far = -1;
    rest.forEach((node, index) => {
      const nearest = Math.min(...chosen.map((item) => jarak2(node, item)));
      if (nearest > far) {
        far = nearest;
        pick = index;
      }
    });
    chosen.push(rest.splice(pick, 1)[0]);
  }
  return chosen;
}

export function gridNodesInRing(minLon, minLat, maxLon, maxLat, step = GRID_DERAJAT) {
  const nodes = [];
  const epsilon = step / 1000;
  const startLon = Math.ceil((minLon - epsilon) / step) * step;
  const startLat = Math.ceil((minLat - epsilon) / step) * step;
  for (let lintang = startLat; lintang <= maxLat + epsilon; lintang += step) {
    for (let bujur = startLon; bujur <= maxLon + epsilon; bujur += step) {
      const lon = Math.round(bujur * 1000) / 1000;
      const lat = Math.round(lintang * 1000) / 1000;
      nodes.push({ lintang: lat, bujur: lon });
    }
  }
  return nodes;
}

function num(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function round3(value) {
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 1000) / 1000;
}

export function syaratBaris(row) {
  const gwisHari = num(row?.gwis_hari);
  const i2 = num(row?.I2);
  const i3 = num(row?.I3);
  const i4 = num(row?.I4);
  const dataOk = gwisHari != null && gwisHari >= GWIS_HARI_MIN && i2 != null && (i3 != null || i4 != null);
  const kering = i2 != null && i2 >= I2_MIN;
  const cuaca = (num(row?.ffmc78_hari) ?? -1) >= FFMC_HARI_MIN || (num(row?.dc_maks) ?? -1) >= DC_AMBANG;
  return {
    data_ok: dataOk,
    G_kering: kering,
    G_cuaca: cuaca,
    lolos: dataOk && kering && cuaca,
  };
}

function bandingSkor(a, b) {
  const skor = (b.skor ?? -1) - (a.skor ?? -1);
  if (skor) return skor;
  return String(a.kode).localeCompare(String(b.kode), "en");
}

export function nilaiKab(rows) {
  const list = (rows ?? []).map((row) => ({ ...row, kode: kodeKan(row.kode) }));
  const syarat = list.map((row) => syaratBaris(row));
  const rI1 = percentRanks(list.map((row) => (syaratBaris(row).data_ok ? num(row.I1) : null)));
  const rI2 = percentRanks(list.map((row) => (syaratBaris(row).data_ok ? num(row.I2) : null)));
  const rI3 = percentRanks(list.map((row) => (syaratBaris(row).data_ok ? num(row.I3) : null)));
  const rI4 = percentRanks(list.map((row) => (syaratBaris(row).data_ok ? num(row.I4) : null)));
  const scored = list.map((row, index) => {
    const gate = syarat[index];
    const ranks = [rI1[index], rI2[index], rI3[index], rI4[index]];
    const present = ranks.filter((value) => value != null);
    const skor = gate.data_ok && present.length ? present.reduce((sum, value) => sum + value, 0) / present.length : null;
    return {
      ...row,
      ...gate,
      rI1: rI1[index],
      rI2: rI2[index],
      rI3: rI3[index],
      rI4: rI4[index],
      skor,
      skor_tampil: round3(skor),
      n_titik: num(row.n_titik),
      satu_titik: num(row.n_titik) === 1,
    };
  });
  const lengkap = scored.filter((row) => row.skor != null).sort(bandingSkor);
  lengkap.forEach((row, index) => {
    row.peringkat_semua = index + 1;
  });
  const lolos = lengkap.filter((row) => row.lolos);
  lolos.forEach((row, index) => {
    row.peringkat_daftar = index + 1;
  });
  return scored.map((row) => {
    const ranked = lengkap.find((item) => item.kode === row.kode && item.kab === row.kab);
    return ranked ? { ...row, peringkat_semua: ranked.peringkat_semua, peringkat_daftar: ranked.peringkat_daftar ?? null } : { ...row, peringkat_semua: null, peringkat_daftar: null };
  });
}

export function ambangHotspot(counts) {
  const positive = (counts ?? []).filter((value) => Number.isFinite(value) && value > 0);
  const p95 = kuantilIndeks(positive, 0.95);
  if (p95 == null) return HOTSPOT_LANTAI;
  return Math.max(p95, HOTSPOT_LANTAI);
}

export function statusDaftar(row, panjang = DAFTAR_PANJANG) {
  if (!row || row.cakupan === false) return "di luar cakupan pemeringkatan";
  if (row.lolos && row.peringkat_daftar != null && row.peringkat_daftar <= panjang) return `peringkat ${row.peringkat_daftar}`;
  if (row.lolos && row.peringkat_daftar != null) return `di luar ${panjang} besar (peringkat skor ${row.peringkat_daftar})`;
  return "tidak lolos syarat: kering/cuaca";
}

export function blokHotspot(nasional, peringkat, ambang) {
  const byKode = new Map((peringkat ?? []).map((row) => [kodeKan(row.kode), row]));
  const rows = (nasional ?? [])
    .filter((row) => Number(row.jumlah) >= ambang && Number(row.berurutan) >= HOTSPOT_HARI_MIN)
    .map((row) => {
      const kode = kodeKan(row.kode);
      const match = byKode.get(kode);
      const dasar = match
        ? match
        : { cakupan: false, lolos: false, peringkat_daftar: null, kab: row.kab, prov: row.prov, kode };
      return {
        kode,
        kab: row.kab || match?.kab || "",
        prov: row.prov || match?.prov || "",
        jumlah: Number(row.jumlah),
        hari: Number(row.hari ?? row.berurutan),
        berurutan: Number(row.berurutan),
        status: statusDaftar(dasar),
      };
    })
    .sort((a, b) => b.jumlah - a.jumlah || a.kab.localeCompare(b.kab, "id"));
  return rows;
}

export function susunPrioritas({ kab, nasional, firmsObservedAt, ensembleFetchedAt, gwisFetchedAt, gwisHari, gwisTanggal }) {
  const peringkat = nilaiKab(kab);
  const counts = (nasional ?? []).map((row) => Number(row.jumlah));
  const p95 = kuantilIndeks(counts.filter((value) => value > 0), 0.95);
  const ambang = ambangHotspot(counts);
  const blok = blokHotspot(nasional, peringkat, ambang);
  const dalamBlok = new Set(blok.map((row) => row.kode));
  const lolos = peringkat.filter((row) => row.lolos).sort(bandingSkor);
  const daftar = lolos.slice(0, DAFTAR_PANJANG).map((row) => ({
    ...row,
    dalam_blok: dalamBlok.has(row.kode),
  }));
  return {
    metode: "A+",
    judul: PRIORITAS_JUDUL,
    jenis: PRIORITAS_JENIS,
    label_ambang: AMBANG_LABEL,
    disclaimer: PRIORITAS_DISCLAIMER,
    catatan_hotspot: CATATAN_HOTSPOT,
    daftar_kosong: DAFTAR_KOSONG,
    panjang_daftar: DAFTAR_PANJANG,
    ensemble_fetched_at: ensembleFetchedAt || null,
    gwis_fetched_at: gwisFetchedAt || null,
    gwis_hari: gwisHari ?? null,
    gwis_tanggal: gwisTanggal ?? [],
    firms_observed_at: firmsObservedAt || null,
    p95_hotspot: p95,
    ambang_hotspot: ambang,
    kab_lengkap: peringkat.filter((row) => row.data_ok).length,
    lolos: lolos.length,
    baris: peringkat,
    daftar,
    blok,
  };
}

function umurJam(iso, now) {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return Infinity;
  return (now.getTime() - then) / 3600000;
}

export function alasanKesegaran(snapshot, now = new Date()) {
  if (!snapshot) return ["cuplikan prioritas belum ada"];
  const alasan = [];
  if (umurJam(snapshot.ensemble_fetched_at, now) > ENSEMBLE_MAX_JAM) {
    alasan.push("run ensemble lebih dari 36 jam");
  }
  const gwisHari = Number(snapshot.gwis_hari);
  if (umurJam(snapshot.gwis_fetched_at, now) > GWIS_MAX_JAM || !Number.isFinite(gwisHari) || gwisHari < GWIS_HARI_MIN) {
    alasan.push("FWI GWIS lebih dari 48 jam atau kurang dari 5 hari prakiraan");
  }
  if (Number(snapshot.kab_lengkap) < MIN_LENGKAP) {
    alasan.push("kab/kota dengan data lengkap kurang dari 30");
  }
  return alasan;
}

export function firmsBlokUsang(snapshot, now = new Date()) {
  if (!snapshot?.firms_observed_at) return "cuplikan FIRMS tidak ada";
  if (umurJam(snapshot.firms_observed_at, now) > FIRMS_BLOK_MAX_JAM) return "snapshot FIRMS lebih dari 24 jam";
  return "";
}

export function tampilanPrioritas(snapshot, now = new Date()) {
  const alasan = alasanKesegaran(snapshot, now);
  const dasar = {
    judul: PRIORITAS_JUDUL,
    jenis: PRIORITAS_JENIS,
    disclaimer: PRIORITAS_DISCLAIMER,
    label_ambang: AMBANG_LABEL,
    catatan_hotspot: CATATAN_HOTSPOT,
    daftar_kosong: DAFTAR_KOSONG,
  };
  const cuplikan = {
    catatan_cuplikan: snapshot?.catatan_cuplikan || "",
    gwis_fetched_until: snapshot?.gwis_fetched_until || null,
  };
  if (alasan.length) {
    return { ...dasar, ...cuplikan, tersedia: false, alasan, daftar: [], blok: [], blok_alasan: "" };
  }
  const blokAlasan = firmsBlokUsang(snapshot, now);
  return {
    ...dasar,
    tersedia: true,
    alasan: [],
    daftar: snapshot.daftar ?? [],
    blok: blokAlasan ? [] : snapshot.blok ?? [],
    blok_alasan: blokAlasan,
    ambang_hotspot: snapshot.ambang_hotspot,
    p95_hotspot: snapshot.p95_hotspot,
    ensemble_fetched_at: snapshot.ensemble_fetched_at,
    gwis_fetched_at: snapshot.gwis_fetched_at,
    gwis_hari: snapshot.gwis_hari,
    gwis_tanggal: snapshot.gwis_tanggal ?? [],
    firms_observed_at: snapshot.firms_observed_at,
    kab_lengkap: snapshot.kab_lengkap,
    lolos: snapshot.lolos,
    ...cuplikan,
  };
}
