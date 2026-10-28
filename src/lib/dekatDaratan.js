import daratan from "./daratanNaturalEarth.json" with { type: "json" };

function haversine(lat1, lon1, lat2, lon2) {
  const r = 6371;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dphi = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dphi / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(a)));
}

function diDalam(lat, lon, coords) {
  let dalam = false;
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i, i += 1) {
    const [x1, y1] = coords[j];
    const [x2, y2] = coords[i];
    const silang = (y2 > lat) !== (y1 > lat) && lon < ((x1 - x2) * (lat - y2)) / (y1 - y2) + x2;
    if (silang) dalam = !dalam;
  }
  return dalam;
}

function jarakGaris(lat, lon, coords) {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < coords.length - 1; i += 1) {
    const a = coords[i];
    const b = coords[i + 1];
    if (Math.abs(a[0] - b[0]) > 180) continue;
    const panjang = haversine(a[1], a[0], b[1], b[0]);
    const steps = Math.max(1, Math.round(panjang / 20));
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps;
      const la = a[1] + (b[1] - a[1]) * t;
      const lo = a[0] + (b[0] - a[0]) * t;
      const jarak = haversine(lat, lon, la, lo);
      if (jarak < best) best = jarak;
    }
  }
  return best;
}

export function dekatDaratan(lintang, bujur) {
  const lat = Number(lintang);
  const lon = Number(bujur);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  let negara = { nama: "", jarak_km: Number.POSITIVE_INFINITY };
  let daratanIndonesia = Number.POSITIVE_INFINITY;
  for (const item of daratan.negara) {
    let jarak = Number.POSITIVE_INFINITY;
    for (const cincin of item.c) {
      if (diDalam(lat, lon, cincin)) {
        jarak = 0;
        break;
      }
      jarak = Math.min(jarak, jarakGaris(lat, lon, cincin));
    }
    if (item.k === "IDN") daratanIndonesia = Math.min(daratanIndonesia, jarak);
    if (jarak < negara.jarak_km) negara = { nama: item.n, jarak_km: jarak };
  }
  let kota = { nama: "", jarak_km: Number.POSITIVE_INFINITY };
  for (const item of daratan.kota_indonesia) {
    const jarak = haversine(lat, lon, item.y, item.x);
    if (jarak < kota.jarak_km) kota = { nama: item.n, jarak_km: jarak };
  }
  const indonesia = Number.isFinite(kota.jarak_km) && kota.jarak_km - daratanIndonesia <= 80
    ? { nama: kota.nama, jarak_km: Math.round(kota.jarak_km) }
    : { nama: "daratan Indonesia", jarak_km: Math.round(daratanIndonesia) };
  return {
    negara: { nama: negara.nama, jarak_km: Math.round(negara.jarak_km) },
    indonesia,
    sumber: daratan.lisensi,
  };
}

export function teksDekat(hasil) {
  if (!hasil) return null;
  const jarak = (nama, km) => (km === 0 ? `${nama}, pada daratan menurut garis pantai acuan` : `${nama}, ± ${km} km`);
  return {
    negara: jarak(hasil.negara.nama, hasil.negara.jarak_km),
    indonesia: jarak(hasil.indonesia.nama, hasil.indonesia.jarak_km),
  };
}
