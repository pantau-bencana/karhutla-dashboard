export const SINGKATAN = {
  Riau: "Riau",
  Jambi: "Jambi",
  "Sumatera Selatan": "Sumsel",
  "Kalimantan Barat": "Kalbar",
  "Kalimantan Tengah": "Kalteng",
  "Kalimantan Selatan": "Kalsel",
  "Kalimantan Timur": "Kaltim",
  "Sumatera Utara": "Sumut",
  "Nusa Tenggara Timur": "NTT",
  Lainnya: "Lainnya",
};

export function shortName(name) {
  return SINGKATAN[name] ?? name;
}

// Bingkai tampilan peta, sedikit lebih luas dari ujung daratan yang umum
// disebut (sekitar Pulau Rondo, Pulau Ndana, Pulau Breueh, dan perbatasan
// Merauke). Dipakai hanya untuk posisi awal dan batas zoom. Bukan batas
// administrasi resmi, dan tidak menggeser koordinat titik.
export const INDONESIA_FRAME = Object.freeze({
  south: -11.5,
  west: 94.4,
  north: 6.5,
  east: 141.6,
});

// Acuan ruang di luar bingkai. Geser peta yang dipakai lebih ketat daripada
// kotak ini: hanya sedikit lebih luas dari tampilan yang sudah memuat seluruh
// Indonesia, supaya pulau terluar tidak keluar dari layar.
export const INDONESIA_PAN_LIMIT = Object.freeze({
  south: -12.8,
  west: 92.2,
  north: 8.0,
  east: 143.0,
});

export function areaContains(outer, inner) {
  return (
    outer.south <= inner.south &&
    outer.north >= inner.north &&
    outer.west <= inner.west &&
    outer.east >= inner.east
  );
}

// Kotak kasar untuk CSV FIRMS yang tidak memuat nama provinsi.
// Bukan batas administrasi resmi. Titik di dekat perbatasan bisa keliru.
const BOXES = [
  { name: "Riau", minLon: 100.0, maxLon: 103.9, minLat: -1.1, maxLat: 2.5, lat: 0.7, lon: 101.9 },
  { name: "Jambi", minLon: 101.2, maxLon: 104.6, minLat: -2.75, maxLat: -0.45, lat: -1.6, lon: 103.2 },
  { name: "Sumatera Selatan", minLon: 102.0, maxLon: 106.05, minLat: -4.95, maxLat: -1.55, lat: -3.1, lon: 104.4 },
  { name: "Sumatera Utara", minLon: 97.8, maxLon: 100.15, minLat: 0.55, maxLat: 4.3, lat: 2.2, lon: 99.1 },
  { name: "Kalimantan Barat", minLon: 108.5, maxLon: 114.2, minLat: -3.25, maxLat: 2.15, lat: 0.1, lon: 111.0 },
  { name: "Kalimantan Tengah", minLon: 110.7, maxLon: 115.5, minLat: -3.35, maxLat: -0.55, lat: -1.9, lon: 113.5 },
  { name: "Kalimantan Selatan", minLon: 114.45, maxLon: 116.5, minLat: -4.25, maxLat: -1.45, lat: -3.1, lon: 115.2 },
  { name: "Kalimantan Timur", minLon: 115.4, maxLon: 119.2, minLat: -2.3, maxLat: 2.6, lat: 0.6, lon: 117.0 },
  { name: "Nusa Tenggara Timur", minLon: 118.8, maxLon: 125.3, minLat: -11.1, maxLat: -8.0, lat: -9.2, lon: 121.6 },
];

function dist2(lat1, lon1, lat2, lon2) {
  const x = (lon1 - lon2) * Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180);
  const y = lat1 - lat2;
  return x * x + y * y;
}

export function provinceCenters(names) {
  const want = names ? new Set(names) : null;
  return BOXES.filter((box) => !want || want.has(box.name)).map((box) => ({
    name: box.name,
    lat: box.lat,
    lon: box.lon,
  }));
}

export function assignProvince(lat, lon) {
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "Lainnya";
  const hits = BOXES.filter(
    (box) =>
      longitude >= box.minLon &&
      longitude <= box.maxLon &&
      latitude >= box.minLat &&
      latitude <= box.maxLat,
  );
  if (!hits.length) return "Lainnya";
  hits.sort(
    (a, b) => dist2(latitude, longitude, a.lat, a.lon) - dist2(latitude, longitude, b.lat, b.lon),
  );
  return hits[0].name;
}
