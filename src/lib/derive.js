export function addDays(iso, amount) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function inDateRange(iso, from, to) {
  if (!iso) return false;
  if (from && iso < from) return false;
  if (to && iso > to) return false;
  return true;
}

export function defaultRange(rows, days = 7) {
  const dates = (rows ?? [])
    .map((row) => row.tanggal)
    .filter(Boolean)
    .sort();
  if (!dates.length) return { from: "", to: "" };
  const to = dates[dates.length - 1];
  const from = addDays(to, -(days - 1));
  return { from: from < dates[0] ? dates[0] : from, to };
}

export function enumerateDates(from, to, fallbackRows) {
  if (from && to && from <= to) {
    const dates = [];
    let cursor = from;
    let guard = 0;
    while (cursor <= to && guard < 400) {
      dates.push(cursor);
      cursor = addDays(cursor, 1);
      guard += 1;
    }
    if (dates.length && dates.length <= 120) return dates;
  }
  const found = new Set();
  for (const row of fallbackRows ?? []) {
    if (row.tanggal && inDateRange(row.tanggal, from, to)) found.add(row.tanggal);
  }
  return [...found].sort();
}

export function latestIspu(rows) {
  const usable = (rows ?? []).filter((row) => row.tanggal && Number.isFinite(row.ispu));
  if (!usable.length) return null;
  const maxDate = usable.reduce((max, row) => (row.tanggal > max ? row.tanggal : max), usable[0].tanggal);
  let best = null;
  for (const row of usable) {
    if (row.tanggal !== maxDate) continue;
    if (!best || row.ispu > best.ispu) best = row;
  }
  return best;
}

function provinceNames(priority, hotspots) {
  const names = new Set(priority ?? []);
  for (const row of hotspots ?? []) {
    if (row?.wilayahStatus === "gagal") continue;
    if (row.provinsi) names.add(row.provinsi);
  }
  names.delete("Lainnya");
  names.delete("Belum terpetakan");
  return [...names];
}

function confidenceBucket(row) {
  if (row?.kelasKepercayaan === "tinggi") return "tinggi";
  if (row?.kelasKepercayaan === "rendah") return "rendah";
  return "nominal";
}

export function deriveDashboard({
  hotspots = [],
  ispu = [],
  bmkg = [],
  sipongi = [],
  irbi = [],
  province = "",
  from = "",
  to = "",
  config,
}) {
  const priority = config?.provinsiPrioritas ?? [];
  const rangeInvalid = Boolean(from && to && from > to);

  const points = rangeInvalid
    ? []
    : hotspots.filter((row) => {
        if (!inDateRange(row.tanggal, from, to)) return false;
        if (province && row.provinsi !== province) return false;
        return Number.isFinite(row.lintang) && Number.isFinite(row.bujur);
      });

  const datedHotspots = rangeInvalid
    ? []
    : hotspots.filter((row) => inDateRange(row.tanggal, from, to) && (!province || row.provinsi === province));
  const belumTerverifikasi = datedHotspots.filter((row) => row.wilayahStatus === "gagal").length;
  const names = province ? [province] : provinceNames(priority, datedHotspots);

  const provinsiDeteksi = names
    .map((name) => {
      const rows = datedHotspots.filter((row) => row.provinsi === name && row.wilayahStatus !== "gagal");
      return {
        provinsi: name,
        prioritas: priority.includes(name),
        jumlah: rows.length,
        rendah: rows.filter((row) => confidenceBucket(row) === "rendah").length,
        nominal: rows.filter((row) => confidenceBucket(row) === "nominal").length,
        tinggi: rows.filter((row) => confidenceBucket(row) === "tinggi").length,
      };
    })
    .filter((row) => row.jumlah > 0)
    .sort((a, b) => a.provinsi.localeCompare(b.provinsi, "id"));

  const ispuScoped = rangeInvalid
    ? []
    : ispu.filter((row) => inDateRange(row.tanggal, from, to) && (!province || row.provinsi === province));

  const dates = rangeInvalid ? [] : enumerateDates(from, to, [...hotspots, ...ispu]);
  const hasLainnya = points.some((point) => point.provinsi && !priority.includes(point.provinsi));
  const hotspotSeries = province ? [province] : [...priority, ...(hasLainnya ? ["Lainnya"] : [])];

  const hotspotTrend = dates.map((tanggal) => {
    const item = { tanggal };
    for (const name of hotspotSeries) item[name] = 0;
    for (const point of points) {
      if (point.tanggal !== tanggal) continue;
      const key = !province && point.provinsi && !priority.includes(point.provinsi) ? "Lainnya" : point.provinsi;
      if (Object.prototype.hasOwnProperty.call(item, key)) item[key] += 1;
    }
    return item;
  });

  const ispuSeries = (province ? [province] : priority).filter((name) =>
    ispuScoped.some((row) => row.provinsi === name && Number.isFinite(row.ispu)),
  );
  const ispuTrend = dates.map((tanggal) => {
    const item = { tanggal };
    for (const name of ispuSeries) {
      const values = ispuScoped
        .filter((row) => row.tanggal === tanggal && row.provinsi === name && Number.isFinite(row.ispu))
        .map((row) => row.ispu);
      item[name] = values.length ? Math.max(...values) : null;
    }
    return item;
  });

  const sipongiMap = new Map();
  if (!rangeInvalid) {
    for (const row of sipongi) {
      if (province && row.provinsi !== province) continue;
      if (!inDateRange(row.tanggal, from, to)) continue;
      const current = sipongiMap.get(row.provinsi) ?? { provinsi: row.provinsi, jumlah: 0, luas: 0 };
      current.jumlah += row.jumlah || 0;
      current.luas += row.luas || 0;
      sipongiMap.set(row.provinsi, current);
    }
  }

  return {
    rangeInvalid,
    points,
    summary: {
      hotspot: points.length,
      tinggi: points.filter((point) => point.kelasKepercayaan === "tinggi").length,
      belumTerverifikasi,
      rendah: datedHotspots.filter((row) => row.wilayahStatus !== "gagal" && confidenceBucket(row) === "rendah").length,
      nominal: datedHotspots.filter((row) => row.wilayahStatus !== "gagal" && confidenceBucket(row) === "nominal").length,
      ispuTerkini: latestIspu(ispuScoped),
    },
    provinsiDeteksi,
    hotspotTrend,
    hotspotSeries,
    ispuTrend,
    ispuSeries,
    sipongiRows: [...sipongiMap.values()].sort((a, b) => b.jumlah - a.jumlah),
    irbiRows: irbi
      .filter((row) => !province || row.provinsi === province)
      .slice()
      .sort(
        (a, b) =>
          String(a.kabupaten || "").localeCompare(String(b.kabupaten || ""), "id") ||
          String(a.provinsi || "").localeCompare(String(b.provinsi || ""), "id"),
      ),
  };
}
