import { DESA_UNIDENTIFIED, desaLabel, wilayahGroupKey } from "./bigWilayah.js";

function blankCounts() {
  return { jumlah: 0, rendah: 0, nominal: 0, tinggi: 0, points: [] };
}

function addCount(bucket, point) {
  bucket.jumlah += 1;
  const kelas = point?.kelasKepercayaan;
  if (kelas === "rendah" || kelas === "nominal" || kelas === "tinggi") bucket[kelas] += 1;
  bucket.points.push(point);
}

function byTotalThenName(label) {
  return (a, b) => b.jumlah - a.jumlah || label(a).localeCompare(label(b), "id") || String(a.key).localeCompare(String(b.key));
}

export function buildHotspotTree(points) {
  const provinces = new Map();
  for (const point of points ?? []) {
    if (point?.wilayahStatus === "gagal") continue;
    const provName = point?.provinsi && point.provinsi !== "Belum terpetakan" ? point.provinsi : "Belum terpetakan";
    let prov = provinces.get(provName);
    if (!prov) {
      prov = { key: provName, provinsi: provName, ...blankCounts(), kecamatan: new Map() };
      provinces.set(provName, prov);
    }
    addCount(prov, point);
    const kecKey = wilayahGroupKey(point, "kecamatan");
    let kec = prov.kecamatan.get(kecKey);
    if (!kec) {
      kec = {
        key: kecKey,
        kecamatan: point?.kecamatan || "—",
        kodeKecamatan: point?.kodeKecamatan || "",
        kabupaten: point?.kabupaten || "",
        ...blankCounts(),
        desa: new Map(),
      };
      prov.kecamatan.set(kecKey, kec);
    }
    addCount(kec, point);
    if (point?.desa && desaLabel(point) !== DESA_UNIDENTIFIED) {
      const desaKey = wilayahGroupKey(point, "desa");
      let desa = kec.desa.get(desaKey);
      if (!desa) {
        desa = { key: desaKey, desa: point.desa, kodeDesa: point?.kodeDesa || "", ...blankCounts() };
        kec.desa.set(desaKey, desa);
      }
      addCount(desa, point);
    }
  }
  return [...provinces.values()]
    .sort(byTotalThenName((row) => row.provinsi))
    .map((prov) => ({
      ...prov,
      kecamatan: [...prov.kecamatan.values()]
        .sort(byTotalThenName((row) => row.kecamatan))
        .map((kec) => ({
          ...kec,
          desa: [...kec.desa.values()].sort(byTotalThenName((row) => row.desa)),
        })),
    }));
}
