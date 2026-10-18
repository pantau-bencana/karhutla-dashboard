// Status sumber untuk halaman logika. Nilai kunci FIRMS tidak pernah disalin ke hasil.

export const FIRMS_HOME = "https://firms.modaps.eosdis.nasa.gov/";

function text(value) {
  return String(value ?? "").trim();
}

function firmsCatatan(firms, keySet, live) {
  const detail = [firms.sumber, firms.area ? `area ${firms.area}` : "", firms.rentangHari ? `${firms.rentangHari} hari` : ""]
    .filter(Boolean)
    .join(", ");
  if (live) {
    return `API sedang dibaca${detail ? ` (${detail})` : ""}. Kunci tidak ditampilkan di halaman ini. Jendela hari API mengikuti konfigurasi, bukan tanggal yang dipilih di dasbor. Hasilnya tetap bahan prototipe, bukan peringatan resmi.`;
  }
  if (keySet) {
    return "Kunci FIRMS terpasang di konfigurasi, tetapi API tidak sedang mengisi peta. Permintaan dapat gagal karena jaringan atau CORS. Nilai kunci tidak ditampilkan. Bila cuplikan terakhir ada, dasbor memakai cuplikan itu. Data contoh hotspot tidak dipakai.";
  }
  return "Hotspot pada situs publik dibaca dari cuplikan data/live. Kunci API saat ini kosong, jadi FIRMS tidak dihubungi dari peramban. Halaman ini tidak menampilkan nilainya. Berkas contoh hotspot tidak ditampilkan.";
}

function csvStatus(dataset, feed) {
  const hasUrl = Boolean(text(dataset?.csvUrl));
  if (feed?.asal === "snapshot" && !feed.contoh) return feed.status === "usang" ? "cuplikan terakhir" : "cuplikan";
  if (!hasUrl || feed?.status === "gagal") return "belum terhubung";
  if (dataset?.contoh || feed?.status === "contoh" || feed?.contoh) return "contoh";
  if (!feed || feed.status === "berhasil" || feed.status === "cadangan") return "CSV yang dikonfigurasi";
  return "belum terhubung";
}

function csvCatatan(dataset, feed, status, { sedangDipakai }) {
  const parts = [];
  if (status === "cuplikan" || status === "cuplikan terakhir") {
    parts.push("Yang dipakai adalah cuplikan data/live, bukan berkas contoh.");
    if (status === "cuplikan terakhir") parts.push(feed?.error || "Menampilkan cuplikan terakhir.");
  } else if (status === "contoh") {
    parts.push("Yang dipakai adalah berkas CSV contoh, bukan data operasional dan bukan aliran langsung.");
  } else if (status === "CSV yang dikonfigurasi") {
    parts.push("CSV pada konfigurasi berhasil dibaca. Ini berkas atau tautan yang dipasang, bukan jaminan data resmi waktu nyata.");
  } else {
    parts.push(feed?.error ? `Sumber gagal dimuat: ${feed.error}` : "Sumber ini belum berhasil dibaca.");
  }
  if (feed?.status === "cadangan" && sedangDipakai) {
    parts.push("Berkas ini mengisi dasbor karena permintaan API FIRMS gagal.");
  }
  if (!sedangDipakai && dataset?.id === "hotspot") {
    parts.push("Berkas ini tidak sedang mengisi peta karena API FIRMS berhasil. Ia tetap tersimpan sebagai cadangan.");
  }
  if (dataset?.id === "irbi" && status !== "belum terhubung") {
    parts.push("Angka IRBI bersifat tahunan dan tidak mengikuti filter tanggal.");
  }
  return parts.join(" ");
}

function csvRow(dataset, feed, options) {
  const status = csvStatus(dataset, feed);
  const url = text(dataset.csvUrl);
  const external = /^https?:\/\//i.test(url);
  return {
    id: dataset.id,
    nama: dataset.nama || dataset.id,
    instansi: dataset.instansi || "—",
    saluran: "CSV",
    status,
    catatan: csvCatatan(dataset, feed, status, options),
    tautan: external ? url : "",
    tautanLabel: external ? "Tautan CSV pada konfigurasi" : "",
    berkas: !external && url ? url : "",
  };
}

export function monitoringSources({ config, feeds } = {}) {
  if (!config) {
    return [
      {
        id: "firms-api",
        nama: "Titik panas NASA FIRMS",
        instansi: "NASA FIRMS",
        saluran: "API",
        status: "belum terhubung",
        catatan:
          "Konfigurasi belum termuat, jadi sambungan sumber belum dapat diperiksa. Halaman ini tidak menampilkan kunci API.",
        tautan: FIRMS_HOME,
        tautanLabel: "firms.modaps.eosdis.nasa.gov",
        berkas: "",
      },
    ];
  }

  const firms = config?.firms ?? {};
  const keySet = text(firms.mapKey).length > 0;
  const datasets = Array.isArray(config?.datasets) ? config.datasets : [];
  const byId = new Map((feeds ?? []).filter((feed) => feed?.id).map((feed) => [feed.id, feed]));
  const hotspot = byId.get("hotspot");
  const firmsLive = Boolean(keySet && hotspot?.asal === "firms" && hotspot?.status === "berhasil");

  const rows = [
    {
      id: "firms-api",
      nama: "Titik panas NASA FIRMS",
      instansi: "NASA FIRMS",
      saluran: "API",
      status: firmsLive ? "aktif" : "belum terhubung",
      catatan: firmsCatatan(firms, keySet, firmsLive),
      tautan: FIRMS_HOME,
      tautanLabel: "firms.modaps.eosdis.nasa.gov",
      berkas: "",
    },
  ];

  for (const dataset of datasets) {
    if (!dataset?.id) continue;
    const feed = byId.get(dataset.id);
    if (dataset.id === "hotspot") {
      rows.push(csvRow(dataset, feed, { sedangDipakai: !firmsLive }));
      continue;
    }
    rows.push(csvRow(dataset, feed, { sedangDipakai: true }));
  }

  return rows;
}
