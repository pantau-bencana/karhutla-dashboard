import { useEffect, useRef } from "react";
import L from "leaflet";
import { kotakProvinsi, muatFiturKab } from "../lib/batasProvinsi.js";
import { kunciTampilanIndonesia, muatWilayah, petaSiap } from "../lib/kunciPeta.js";
import { GWIS_ATTRIBUTION, GWIS_CREDIT, GWIS_FWI_LAYER, GWIS_WMS } from "../lib/gwisFwi.js";
import { formatTanggal, formatWaktu } from "../lib/format.js";
import { clusterCellDegrees } from "../lib/hotspotWindow.js";
import { basemapLayer } from "../lib/basemap.js";
import {
  BIG_SERVICE,
  BIG_SOURCE_LABEL,
  CONFIDENCE_COLORS,
  DESA_LINE_ZOOM,
  DESA_UNIDENTIFIED,
  WILAYAH_UNAVAILABLE,
  hotspotKey,
} from "../lib/bigWilayah.js";

const COLORS = CONFIDENCE_COLORS;

const PADDING = [20, 20];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

const KEPERCAYAAN = { tinggi: "Tinggi (merah)", nominal: "Sedang (oranye)", rendah: "Rendah (kuning)", tidak_diketahui: "Tidak diketahui" };

function wilayahBaris(point) {
  if (point.wilayahStatus === "gagal" || (!point.wilayahStatus && !point.kecamatan && !point.desa && !point.kabupaten)) {
    return WILAYAH_UNAVAILABLE;
  }
  const desa = escapeHtml(point.desa || DESA_UNIDENTIFIED);
  const kodeDesa = point.kodeDesa ? ` (${escapeHtml(point.kodeDesa)})` : "";
  const kecamatan = point.kecamatan ? `${escapeHtml(point.kecamatan)}${point.kodeKecamatan ? ` (${escapeHtml(point.kodeKecamatan)})` : ""}` : "—";
  const kabupaten = point.kabupaten ? `${escapeHtml(point.kabupaten)}${point.kodeKabupaten ? ` (${escapeHtml(point.kodeKabupaten)})` : ""}` : "—";
  const provinsi = point.provinsi && point.provinsi !== "Belum terpetakan" ? `${escapeHtml(point.provinsi)}${point.kodeProvinsi ? ` (${escapeHtml(point.kodeProvinsi)})` : ""}` : "—";
  return `Desa/kelurahan: ${desa}${kodeDesa}<br>Kecamatan: ${kecamatan}<br>Kab/kota: ${kabupaten}<br>Provinsi: ${provinsi}`;
}

function popupHtml(point) {
  const sample = point.contoh ? `<div class="popup-sample">Data contoh</div>` : "";
  const kelas = KEPERCAYAAN[point.kelasKepercayaan] || point.kelasKepercayaan || "—";
  const lintang = point.lintangTeks || point.lintang;
  const bujur = point.bujurTeks || point.bujur;
  return `
    <div class="popup">
      <strong>Titik panas</strong>
      ${sample}
      <div>${escapeHtml(formatTanggal(point.tanggal))}, ${escapeHtml(formatWaktu(point.waktu))}</div>
      <div>Satelit: ${escapeHtml(point.satelit || "—")}</div>
      <div>Kepercayaan asli: ${escapeHtml(point.kepercayaan || "—")}</div>
      <div>Kelas tampilan: ${escapeHtml(kelas)}. Nominal berarti sedang, bukan tingkat bahaya.</div>
      <div>Koordinat FIRMS: ${escapeHtml(lintang)}, ${escapeHtml(bujur)}</div>
      <div>${wilayahBaris(point)}</div>
      <div>Sumber wilayah: ${escapeHtml(BIG_SOURCE_LABEL)}</div>
    </div>
  `;
}

function usableCoordinate(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -85 && lat <= 85 && lon >= -180 && lon <= 180;
}

function clusterCell(zoom) {
  return clusterCellDegrees(zoom);
}

function drawHotspots(map, layer, points, selectedKey, onSelect) {
  layer.clearLayers();
  const renderer = map._hotRenderer || (map._hotRenderer = L.canvas({ padding: 0.15 }));
  const cell = clusterCell(map.getZoom() || 4);
  const latlngs = [];
  const addPoint = (point) => {
    const lat = Number(point.lintang);
    const lon = Number(point.bujur);
    if (!usableCoordinate(lat, lon)) return;
    const dikenal = point.kelasKepercayaan === "tinggi" || point.kelasKepercayaan === "nominal" || point.kelasKepercayaan === "rendah";
    const color = COLORS[point.kelasKepercayaan] ?? COLORS.tidak_diketahui;
    const selected = selectedKey && hotspotKey(point) === selectedKey;
    const radius = point.kelasKepercayaan === "tinggi" ? 8 : point.kelasKepercayaan === "nominal" ? 6 : 5;
    const marker = L.circleMarker([lat, lon], {
      renderer,
      radius: selected ? radius + 3 : radius,
      color: selected ? "#111827" : "#1c1917",
      weight: selected ? 3 : 2,
      fillColor: color,
      fillOpacity: 0.95,
      dashArray: dikenal ? null : "2 2",
    });
    marker.bindPopup(popupHtml(point));
    marker.on("click", () => onSelect?.(point));
    marker.addTo(layer);
    latlngs.push([lat, lon]);
  };
  if (!cell) {
    for (const point of points) addPoint(point);
    return latlngs;
  }
  const groups = new Map();
  for (const point of points) {
    const lat = Number(point.lintang);
    const lon = Number(point.bujur);
    if (!usableCoordinate(lat, lon)) continue;
    const key = `${Math.floor(lon / cell)}:${Math.floor(lat / cell)}`;
    const group = groups.get(key) ?? { lat: 0, lon: 0, count: 0, members: [] };
    group.lat += lat;
    group.lon += lon;
    group.count += 1;
    group.members.push(point);
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    const meanLat = group.lat / group.count;
    const meanLon = group.lon / group.count;
    let anchor = group.members[0];
    let best = Infinity;
    for (const member of group.members) {
      const lat = Number(member.lintang);
      const lon = Number(member.bujur);
      const distance = (lat - meanLat) ** 2 + (lon - meanLon) ** 2;
      if (distance < best) {
        best = distance;
        anchor = member;
      }
    }
    if (group.count === 1) {
      addPoint(anchor);
      continue;
    }
    const lat = Number(anchor.lintang);
    const lon = Number(anchor.bujur);
    const marker = L.marker([lat, lon], { icon: clusterIcon(group.members, map.getZoom() || 4) });
    marker.bindTooltip(`${group.count} deteksi satelit dalam petak ini. Cincin membagi kuning rendah, oranye sedang, merah tinggi, dan abu-abu tidak diketahui. Angka bukan kelas confidence. Perbesar untuk memisahkan titik.`, { direction: "top" });
    marker.on("click", () => {
      map.setView([lat, lon], Math.min((map.getZoom() || 4) + 2, 12));
    });
    marker.addTo(layer);
    latlngs.push([lat, lon]);
  }
  return latlngs;
}

function classCounts(members) {
  const counts = { rendah: 0, nominal: 0, tinggi: 0, lain: 0 };
  for (const point of members) {
    const kelas = point?.kelasKepercayaan;
    if (kelas === "rendah" || kelas === "nominal" || kelas === "tinggi") counts[kelas] += 1;
    else counts.lain += 1;
  }
  return counts;
}

function shareGradient(counts, total) {
  const parts = [
    [counts.rendah, COLORS.rendah],
    [counts.nominal, COLORS.nominal],
    [counts.tinggi, COLORS.tinggi],
    [counts.lain, "#a8a29e"],
  ];
  const stops = [];
  let cursor = 0;
  const safe = total || 1;
  for (const [count, color] of parts) {
    if (!count) continue;
    const next = cursor + (count / safe) * 100;
    stops.push(`${color} ${cursor.toFixed(2)}% ${next.toFixed(2)}%`);
    cursor = next;
  }
  return stops.length ? `conic-gradient(${stops.join(",")})` : "#d6d3d1";
}

function clusterIcon(members, zoom) {
  const count = members.length;
  const label = String(count);
  const cap = zoom < 5 ? 16 : 20;
  const size = Math.min(cap, 14 + Math.max(0, label.length - 2) * 2);
  const gradient = shareGradient(classCounts(members), count);
  const font = label.length >= 4 ? 7 : label.length === 3 ? 8 : 10;
  return L.divIcon({
    className: "hotspot-cluster",
    html: `<span style="background:${gradient}"><b style="font-size:${font}px">${label}</b></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function ClusterLegend() {
  return (
    <p className="cluster-note">
      <span className="cluster-key" aria-hidden="true"><b>n</b></span>
      <span>
        Cincin pada zoom kecil membagi petak menjadi kuning (rendah), oranye (sedang), merah (tinggi), dan abu-abu (tidak diketahui). Angka di tengah adalah jumlah deteksi dalam petak itu, bukan kelas confidence. Perbesar peta sampai tiap titik terpisah.
      </span>
    </p>
  );
}

function mapReady(map) {
  return petaSiap(map);
}

export function frameIndonesia(map, modeRef) {
  const ok = kunciTampilanIndonesia(map, { muatUlang: true, padding: PADDING });
  if (ok && modeRef) modeRef.current = "indonesia";
  return ok;
}

export function framePoints(map, latlngs, modeRef) {
  if (!mapReady(map)) return false;
  const usable = (latlngs ?? []).filter((pair) => usableCoordinate(pair?.[0], pair?.[1]));
  if (!usable.length) return frameIndonesia(map, modeRef);
  const bounds = L.latLngBounds(usable);
  if (usable.length === 1) bounds.extend([usable[0][0] + 0.15, usable[0][1] + 0.15]);
  const ok = muatWilayah(map, bounds, PADDING);
  if (!ok) map.fitBounds(usable, { padding: PADDING, maxZoom: 8, animate: false });
  if (modeRef) modeRef.current = "points";
  return true;
}

export function frameWilayah(map, nama, modeRef) {
  if (!nama) return frameIndonesia(map, modeRef);
  return muatFiturKab()
    .then((fitur) => {
      const kotak = kotakProvinsi(fitur, nama);
      if (!kotak || !mapReady(map)) return frameIndonesia(map, modeRef);
      const bounds = L.latLngBounds([kotak.south, kotak.west], [kotak.north, kotak.east]);
      const ok = muatWilayah(map, bounds, PADDING);
      if (ok && modeRef) modeRef.current = "points";
      return ok;
    })
    .catch(() => frameIndonesia(map, modeRef));
}

function syncMinZoom(map) {
  kunciTampilanIndonesia(map, { muatUlang: false, padding: PADDING });
}

function desaExportUrl(bounds, width, height) {
  const params = new URLSearchParams({
    bbox: `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`,
    bboxSR: "4326",
    imageSR: "4326",
    size: `${width},${height}`,
    layers: "show:4",
    transparent: "true",
    format: "png32",
    f: "image",
  });
  return `${BIG_SERVICE}/export?${params}`;
}

export function HotspotMap({ points, frame = "indonesia", wilayah = "", active = true, mapApi, selectedKey = "", onSelect, fwiDate = "" }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const fwiLayerRef = useRef(null);
  const modeRef = useRef("indonesia");
  const latlngsRef = useRef([]);
  const pointsRef = useRef(points ?? []);
  const selectedRef = useRef(selectedKey);
  const onSelectRef = useRef(onSelect);
  const drawRef = useRef(() => {});
  const desaLayerRef = useRef(null);
  const pointsSignatureRef = useRef("");
  const wilayahRef = useRef(wilayah);
  const wilayahTerpasang = useRef(wilayah);
  wilayahRef.current = wilayah;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;
    const map = L.map(containerRef.current, {
      scrollWheelZoom: true,
      zoomControl: true,
      zoomAnimation: false,
      fadeAnimation: false,
      zoomSnap: 0,
      zoomDelta: 0.5,
      minZoom: 0,
      maxBoundsViscosity: 1,
      worldCopyJump: false,
    });
    basemapLayer().addTo(map);
    map.createPane("gwisFwi");
    map.getPane("gwisFwi").style.zIndex = 250;
    desaLayerRef.current = L.layerGroup().addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const redraw = () => {
      if (!layerRef.current || !mapRef.current) return;
      latlngsRef.current = drawHotspots(mapRef.current, layerRef.current, pointsRef.current ?? [], selectedRef.current, onSelectRef.current);
    };
    drawRef.current = redraw;
    map.on("zoomend", redraw);

    let sizeKey = "";
    const onResize = () => {
      const lebar = containerRef.current?.clientWidth || 0;
      const tinggi = containerRef.current?.clientHeight || 0;
      const key = `${Math.round(lebar)}x${Math.round(tinggi)}`;
      if (lebar < 80 || tinggi < 80 || key === sizeKey) return;
      sizeKey = key;
      map.invalidateSize({ pan: false, animate: false });
      if (modeRef.current === "points") syncMinZoom(map);
      else if (wilayahRef.current) frameWilayah(map, wilayahRef.current, modeRef);
      else frameIndonesia(map, modeRef);
    };
    map.on("resize", onResize);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
    observer?.observe(containerRef.current);

    let desaTimer = 0;
    const drawDesaLines = () => {
      const overlay = desaLayerRef.current;
      if (!overlay) return;
      overlay.clearLayers();
      if ((map.getZoom() || 0) < DESA_LINE_ZOOM) return;
      const size = map.getSize();
      const width = Math.max(64, Math.min(1024, Math.round(size.x)));
      const height = Math.max(64, Math.min(1024, Math.round(size.y)));
      const bounds = map.getBounds();
      const image = L.imageOverlay(desaExportUrl(bounds, width, height), bounds, { opacity: 0.85, interactive: false });
      image.on("error", () => overlay.removeLayer(image));
      image.addTo(overlay);
    };
    const scheduleDesa = () => {
      window.clearTimeout(desaTimer);
      desaTimer = window.setTimeout(drawDesaLines, 350);
    };
    map.on("moveend", scheduleDesa);

    if (mapApi) {
      mapApi.current = {
        showIndonesia() {
          modeRef.current = "indonesia";
          frameIndonesia(mapRef.current, modeRef);
        },
        focus(latlngs) {
          modeRef.current = "points";
          framePoints(mapRef.current, latlngs, modeRef);
        },
      };
    }

    return () => {
      observer?.disconnect();
      if (mapApi) mapApi.current = null;
      window.clearTimeout(desaTimer);
      if (fwiLayerRef.current) {
        map.removeLayer(fwiLayerRef.current);
        fwiLayerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      desaLayerRef.current = null;
    };
  }, [mapApi]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    if (fwiLayerRef.current) {
      map.removeLayer(fwiLayerRef.current);
      fwiLayerRef.current = null;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fwiDate)) return undefined;
    const layer = L.tileLayer.wms(GWIS_WMS, {
      layers: GWIS_FWI_LAYER,
      styles: "default",
      format: "image/png",
      transparent: true,
      version: "1.3.0",
      uppercase: true,
      time: fwiDate,
      opacity: 0.72,
      pane: "gwisFwi",
      attribution: `${GWIS_CREDIT}. ${GWIS_ATTRIBUTION}`,
    });
    layer.addTo(map);
    fwiLayerRef.current = layer;
    return () => {
      if (fwiLayerRef.current) {
        map.removeLayer(fwiLayerRef.current);
        fwiLayerRef.current = null;
      }
    };
  }, [fwiDate]);

  onSelectRef.current = onSelect;
  useEffect(() => {
    pointsRef.current = points ?? [];
    selectedRef.current = selectedKey;
    drawRef.current();
  }, [points, selectedKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !active) return undefined;
    let signature = points?.length || 0;
    for (const point of points ?? []) {
      signature = Math.imul(signature, 33) + Math.round(Number(point.lintang) * 1e5);
      signature = Math.imul(signature, 33) + Math.round(Number(point.bujur) * 1e5);
    }
    const unchanged = String(signature) === pointsSignatureRef.current;
    pointsSignatureRef.current = String(signature);
    // Memilih baris mengganti identitas array tanpa mengubah koordinat.
    // Jangan kembalikan tampilan ke seluruh Indonesia setelah fokus desa.
    const wilayahBerubah = wilayahRef.current !== wilayahTerpasang.current;
    wilayahTerpasang.current = wilayahRef.current;
    if (unchanged && modeRef.current === "points" && !wilayahBerubah) return undefined;
    let cancelled = false;
    let tries = 0;
    const apply = () => {
      if (cancelled || !mapRef.current) return;
      map.invalidateSize({ pan: false, animate: false });
      const size = map.getSize();
      if ((size.x < 80 || size.y < 80) && tries < 20) {
        tries += 1;
        window.requestAnimationFrame(apply);
        return;
      }
      if (!mapReady(map)) return;
      if (frame === "points" && latlngsRef.current.length) framePoints(map, latlngsRef.current, modeRef);
      else if (wilayahRef.current) frameWilayah(map, wilayahRef.current, modeRef);
      else frameIndonesia(map, modeRef);
      drawRef.current();
    };
    apply();
    return () => {
      cancelled = true;
    };
  }, [frame, points, active, wilayah]);

    return <div ref={containerRef} className="map-canvas hotspot-map" role="region" aria-label="Peta sebaran titik panas" />;
}
