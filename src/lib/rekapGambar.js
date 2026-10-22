import { REKAP_IDENTITAS, REKAP_KOSONG, legendaRekap } from "./rekapHarian.js";

const BINGKAI = { west: 94.5, east: 141.5, south: -11.5, north: 6.5 };

function proyeksi(lon, lat, kotak) {
  const x = kotak.x + ((lon - BINGKAI.west) / (BINGKAI.east - BINGKAI.west)) * kotak.w;
  const y = kotak.y + ((BINGKAI.north - lat) / (BINGKAI.north - BINGKAI.south)) * kotak.h;
  return [x, y];
}

function gambarGeometri(ctx, geometry, kotak) {
  const bagian = geometry?.type === "Polygon" ? [geometry.coordinates] : geometry?.type === "MultiPolygon" ? geometry.coordinates : [];
  for (const poligon of bagian) {
    ctx.beginPath();
    for (const cincin of poligon) {
      cincin.forEach(([lon, lat], index) => {
        const [x, y] = proyeksi(lon, lat, kotak);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
    }
    ctx.fill();
  }
}

function bungkus(ctx, teks, x, y, lebar, tinggiBaris) {
  const kata = String(teks ?? "").split(/\s+/).filter(Boolean);
  let baris = "";
  let cursor = y;
  for (const item of kata) {
    const lanjut = baris ? `${baris} ${item}` : item;
    if (ctx.measureText(lanjut).width > lebar && baris) {
      ctx.fillText(baris, x, cursor);
      baris = item;
      cursor += tinggiBaris;
    } else baris = lanjut;
  }
  if (baris) ctx.fillText(baris, x, cursor);
  return cursor + tinggiBaris;
}

export function gambarRekap(canvas, { fitur = [], warna = () => "#e2e8f0", judul, subjudul, sumber, tabel = [], catatan, param } = {}) {
  const ctx = canvas.getContext("2d");
  canvas.width = 1920;
  canvas.height = 1080;
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, 1920, 1080);
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 42px sans-serif";
  ctx.fillText(judul || "Rekap Harian", 56, 72);
  ctx.font = "24px sans-serif";
  ctx.fillStyle = "#334155";
  bungkus(ctx, subjudul || "", 56, 112, 1800, 30);

  const peta = { x: 56, y: 168, w: 1040, h: 680 };
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(peta.x, peta.y, peta.w, peta.h);
  for (const item of fitur) {
    ctx.fillStyle = warna(item.kode) || "#e2e8f0";
    gambarGeometri(ctx, item.geometry, peta);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.lineWidth = 0.6;
  for (const item of fitur) {
    const bagian = item.geometry?.type === "Polygon" ? [item.geometry.coordinates] : item.geometry?.type === "MultiPolygon" ? item.geometry.coordinates : [];
    for (const poligon of bagian) {
      ctx.beginPath();
      for (const cincin of poligon) {
        cincin.forEach(([lon, lat], index) => {
          const [x, y] = proyeksi(lon, lat, peta);
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
      }
      ctx.stroke();
    }
  }

  ctx.fillStyle = "#0f172a";
  ctx.font = "700 28px sans-serif";
  ctx.fillText("Kab/kota teratas", 1140, 210);
  ctx.font = "22px sans-serif";
  const atas = tabel.slice(0, 12);
  if (!atas.length) {
    ctx.fillStyle = "#64748b";
    ctx.fillText(REKAP_KOSONG, 1140, 260);
  }
  atas.forEach((item, index) => {
    const y = 260 + index * 48;
    ctx.fillStyle = index % 2 ? "#f1f5f9" : "#ffffff";
    ctx.fillRect(1140, y - 28, 720, 44);
    ctx.fillStyle = "#0f172a";
    ctx.font = "600 22px sans-serif";
    const nama = `${index + 1}. ${item.nama}`;
    ctx.fillText(nama.length > 32 ? `${nama.slice(0, 31)}…` : nama, 1152, y);
    ctx.font = "18px sans-serif";
    ctx.fillStyle = "#475569";
    ctx.fillText(String(item.provinsi || ""), 1152, y + 22);
    ctx.fillStyle = "#0f172a";
    ctx.font = "600 20px sans-serif";
    const nilai = String(item.teks || "");
    ctx.fillText(nilai.length > 28 ? `${nilai.slice(0, 27)}…` : nilai, 1560, y + 8);
  });

  let legendaX = 56;
  ctx.font = "18px sans-serif";
  for (const item of legendaRekap(param).slice(0, 5)) {
    ctx.fillStyle = item.warna;
    ctx.fillRect(legendaX, 868, 18, 18);
    ctx.fillStyle = "#334155";
    ctx.fillText(item.label, legendaX + 24, 883);
    legendaX += Math.min(280, 36 + ctx.measureText(item.label).width);
    if (legendaX > 1500) break;
  }

  ctx.fillStyle = "#334155";
  ctx.font = "18px sans-serif";
  const catatanY = bungkus(ctx, sumber || "", 56, 920, 1800, 24);
  bungkus(ctx, `${catatan || ""} ${REKAP_IDENTITAS}`, 56, Math.min(catatanY, 1000), 1800, 24);
  return canvas;
}
