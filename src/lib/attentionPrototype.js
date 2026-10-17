// Urutan prototipe dari data pembanding. Bukan peringkat resmi BMKG.

export const PROTOTYPE_LABEL = "Prototipe – berbasis data pembanding terbuka, bukan data resmi BMKG";
export const DRY_DAY_MM = 1;
export const MIN_RAIN_DAYS = 12;
export const LIST_SIZE = 20;
export const CLASS_WEIGHT = Object.freeze({ Tinggi: 2, Sedang: 1, Rendah: 0 });

const NAME_ALIASES = Object.freeze({
  "LUBUK LINGGAU": "LUBUKLINGGAU",
});

export function normalizePlaceName(value) {
  const plain = String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\bKABUPATEN\b/g, " ")
    .replace(/\bKOTA\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return NAME_ALIASES[plain] || plain;
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function mean(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function groupRows(rows) {
  const groups = new Map();
  for (const row of rows ?? []) {
    const kode = String(row.kode ?? "").trim();
    const key = kode || `${row.provinsi}|${normalizePlaceName(row.kabupaten)}`;
    const current = groups.get(key) ?? {
      kode,
      provinsi: row.provinsi || "—",
      kabupaten: row.kabupaten || "—",
      lintang: finite(row.lintang),
      bujur: finite(row.bujur),
      dates: [],
    };
    if (current.lintang == null) current.lintang = finite(row.lintang);
    if (current.bujur == null) current.bujur = finite(row.bujur);
    current.dates.push(row);
    groups.set(key, current);
  }
  return [...groups.values()];
}

export function placeRainTable(rows) {
  return groupRows(rows)
    .map((group) => {
      const rain = group.dates.map((row) => finite(row.curahHujan)).filter((value) => value != null);
      const wind = group.dates.map((row) => finite(row.anginKmj)).filter((value) => value != null);
      const dates = group.dates.map((row) => row.tanggal).filter(Boolean).sort();
      return {
        kabupaten: group.kabupaten,
        provinsi: group.provinsi,
        kode: group.kode,
        lintang: group.lintang,
        bujur: group.bujur,
        hujanMm: rain.length ? rain.reduce((sum, value) => sum + value, 0) : null,
        hariKering: rain.filter((value) => value < DRY_DAY_MM).length,
        hariNilai: rain.length,
        anginMaks: wind.length ? Math.max(...wind) : null,
        dari: dates[0] || "",
        sampai: dates.at(-1) || "",
      };
    })
    .sort((a, b) => String(a.kabupaten).localeCompare(String(b.kabupaten), "id"));
}

export function placeFwiTable(rows) {
  return groupRows(rows)
    .map((group) => {
      const fwi = group.dates.map((row) => finite(row.fwi)).filter((value) => value != null);
      const dates = group.dates.map((row) => row.tanggal).filter(Boolean).sort();
      return {
        kabupaten: group.kabupaten,
        provinsi: group.provinsi,
        fwiRata: mean(fwi),
        hari: fwi.length,
        dari: dates[0] || "",
        sampai: dates.at(-1) || "",
      };
    })
    .sort((a, b) => String(a.kabupaten).localeCompare(String(b.kabupaten), "id"));
}

export function buildComparisonAttention({ irbiRows, rainRows, fwiRows } = {}) {
  const irbiByKey = new Map();
  for (const row of irbiRows ?? []) {
    if (!Number.isFinite(Number(row.indeks))) continue;
    const key = `${row.provinsi}|${normalizePlaceName(row.kabupaten)}`;
    if (!irbiByKey.has(key)) irbiByKey.set(key, row);
  }
  const fwiByKode = new Map();
  for (const group of groupRows(fwiRows)) {
    const values = group.dates.map((row) => finite(row.fwi)).filter((value) => value != null);
    fwiByKode.set(group.kode || `${group.provinsi}|${normalizePlaceName(group.kabupaten)}`, {
      fwiRata: mean(values),
      fwiHari: values.length,
    });
  }

  const dates = (rainRows ?? []).map((row) => row.tanggal).filter(Boolean).sort();
  const candidates = [];
  let tanpaIrbi = 0;
  let hariKurang = 0;
  for (const group of groupRows(rainRows)) {
    const irbi = irbiByKey.get(`${group.provinsi}|${normalizePlaceName(group.kabupaten)}`);
    if (!irbi || CLASS_WEIGHT[irbi.kelas] == null) {
      tanpaIrbi += 1;
      continue;
    }
    const rain = group.dates.map((row) => finite(row.curahHujan)).filter((value) => value != null);
    if (rain.length < MIN_RAIN_DAYS) {
      hariKurang += 1;
      continue;
    }
    const probs = group.dates.map((row) => finite(row.peluang)).filter((value) => value != null);
    const wind = group.dates.map((row) => finite(row.anginKmj)).filter((value) => value != null);
    const fwi = fwiByKode.get(group.kode) ?? fwiByKode.get(`${group.provinsi}|${normalizePlaceName(group.kabupaten)}`) ?? {};
    candidates.push({
      kabupaten: irbi.kabupaten,
      provinsi: irbi.provinsi,
      kode: group.kode,
      lintang: group.lintang,
      bujur: group.bujur,
      hujanMm: rain.reduce((sum, value) => sum + value, 0),
      hariKering: rain.filter((value) => value < DRY_DAY_MM).length,
      hariNilai: rain.length,
      peluangRata: mean(probs),
      anginMaks: wind.length ? Math.max(...wind) : null,
      indeks: Number(irbi.indeks),
      kelas: irbi.kelas,
      bobotKelas: CLASS_WEIGHT[irbi.kelas],
      fwiRata: fwi.fwiRata ?? null,
      fwiHari: fwi.fwiHari ?? 0,
    });
  }

  candidates.sort((a, b) =>
    b.bobotKelas - a.bobotKelas
    || b.hariKering - a.hariKering
    || a.hujanMm - b.hujanMm
    || b.indeks - a.indeks
    || String(a.kabupaten).localeCompare(String(b.kabupaten), "id"),
  );

  return {
    label: PROTOTYPE_LABEL,
    dari: dates[0] || "",
    sampai: dates.at(-1) || "",
    zona: "Asia/Jakarta",
    ambangMm: DRY_DAY_MM,
    minimumHari: MIN_RAIN_DAYS,
    bobotKelas: CLASS_WEIGHT,
    jumlahTitik: groupRows(rainRows).length,
    tanpaIrbi,
    hariKurang,
    rows: candidates.slice(0, LIST_SIZE).map((row, index) => ({ ...row, urutan: index + 1 })),
  };
}
