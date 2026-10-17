import { useEffect, useRef } from "react";
import L from "leaflet";
import { INDONESIA_FRAME } from "../lib/geo.js";
import { formatAngka, formatTanggal, formatWaktu } from "../lib/format.js";

const COLORS = {
  tinggi: "#b42318",
  nominal: "#c2410c",
  rendah: "#ca8a04",
};

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

const KEPERCAYAAN = { tinggi: "Tinggi", nominal: "Nominal", rendah: "Rendah" };

function popupHtml(point) {
  const place = point.kabupaten ? `${point.provinsi} — ${point.kabupaten}` : point.provinsi;
  const frp = Number.isFinite(point.frp) ? `<div>FRP: ${escapeHtml(formatAngka(point.frp, 1))} MW</div>` : "";
  const bright = Number.isFinite(point.kecerahan)
    ? `<div>Kecerahan: ${escapeHtml(formatAngka(point.kecerahan, 1))} K</div>`
    : "";
  const sample = point.contoh ? `<div class="popup-sample">Data contoh</div>` : "";
  const kepercayaan = KEPERCAYAAN[point.kelasKepercayaan] || point.kelasKepercayaan || "—";
  return `
    <div class="popup">
      <strong>Titik panas</strong>
      ${sample}
      <div>${escapeHtml(place)}</div>
      <div>${escapeHtml(formatTanggal(point.tanggal))}, ${escapeHtml(formatWaktu(point.waktu))}</div>
      <div>Satelit: ${escapeHtml(point.satelit || "—")}</div>
      <div>Kepercayaan: ${escapeHtml(kepercayaan)}</div>
      ${frp}
      ${bright}
    </div>
  `;
}

function usableCoordinate(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -85 && lat <= 85 && lon >= -180 && lon <= 180;
}

function indonesiaBounds() {
  return L.latLngBounds(
    [INDONESIA_FRAME.south, INDONESIA_FRAME.west],
    [INDONESIA_FRAME.north, INDONESIA_FRAME.east],
  );
}

function mapReady(map) {
  const size = map?.getSize?.();
  return Boolean(size && size.x >= 80 && size.y >= 80);
}

function panEnvelope(map) {
  // Sedikit ruang geser, lebih kecil daripada jarak bingkai ke tepi layar,
  // supaya pulau terluar tidak keluar dari peta.
  return map.getBounds().pad(0.012);
}

export function frameIndonesia(map, modeRef) {
  if (!mapReady(map)) return false;
  const frame = indonesiaBounds();
  map.stop();
  map.setMaxBounds(null);
  map.setMinZoom(0);
  map.fitBounds(frame, { padding: PADDING, animate: false });
  const settled = map.getZoom();
  map.setMinZoom(settled);
  map.setMaxBounds(panEnvelope(map));
  if (!map.getBounds().contains(frame)) {
    map.setMaxBounds(null);
    map.setMinZoom(0);
    map.fitBounds(frame, { padding: PADDING, animate: false });
    map.setMinZoom(map.getZoom());
    map.setMaxBounds(panEnvelope(map));
  }
  if (modeRef) modeRef.current = "indonesia";
  return true;
}

export function framePoints(map, latlngs, modeRef) {
  if (!mapReady(map)) return false;
  const usable = (latlngs ?? []).filter((pair) => usableCoordinate(pair?.[0], pair?.[1]));
  if (!usable.length) return frameIndonesia(map, modeRef);
  map.stop();
  if (usable.length === 1) {
    const zoom = Math.min(8, Math.max(map.getMinZoom() || 0, 7));
    map.setView(usable[0], zoom, { animate: false });
  } else {
    map.fitBounds(usable, { padding: PADDING, maxZoom: 8, animate: false });
  }
  if (modeRef) modeRef.current = "points";
  return true;
}

function countryEnvelope(map) {
  const previousMin = map.getMinZoom();
  map.setMinZoom(0);
  const zoom = map.getBoundsZoom(indonesiaBounds(), false, L.point(20, 20));
  map.setMinZoom(previousMin);
  const center = indonesiaBounds().getCenter();
  const half = map.getSize().divideBy(2);
  const projected = map.options.crs.latLngToPoint(center, zoom);
  const nw = map.options.crs.pointToLatLng(projected.subtract(half), zoom);
  const se = map.options.crs.pointToLatLng(projected.add(half), zoom);
  return L.latLngBounds(nw, se).pad(0.012);
}

function syncMinZoom(map) {
  if (!mapReady(map)) return;
  const center = map.getCenter();
  const zoom = map.getZoom();
  const envelope = countryEnvelope(map);
  const previousMin = map.getMinZoom();
  map.setMinZoom(0);
  const nextMin = map.getBoundsZoom(indonesiaBounds(), false, L.point(20, 20));
  const minZoom = Number.isFinite(nextMin) ? nextMin : previousMin;
  map.setMinZoom(minZoom);
  map.setMaxBounds(envelope);
  map.setView(center, Math.max(zoom, minZoom), { animate: false });
}

export function HotspotMap({ points, frame = "indonesia", active = true, mapApi }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const modeRef = useRef("indonesia");
  const latlngsRef = useRef([]);

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
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    let sizeKey = "";
    const onResize = () => {
      const size = map.getSize();
      const key = `${Math.round(size.x)}x${Math.round(size.y)}`;
      if (!key || key === sizeKey) return;
      sizeKey = key;
      if (modeRef.current === "points") syncMinZoom(map);
      else frameIndonesia(map, modeRef);
    };
    map.on("resize", onResize);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
    observer?.observe(containerRef.current);

    if (mapApi) {
      mapApi.current = {
        showIndonesia() {
          modeRef.current = "indonesia";
          frameIndonesia(mapRef.current, modeRef);
        },
      };
    }

    return () => {
      observer?.disconnect();
      if (mapApi) mapApi.current = null;
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [mapApi]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    const latlngs = [];
    for (const point of points) {
      const lat = Number(point.lintang);
      const lon = Number(point.bujur);
      if (!usableCoordinate(lat, lon)) continue;
      const color = COLORS[point.kelasKepercayaan] ?? COLORS.nominal;
      const radius = point.kelasKepercayaan === "tinggi" ? 7 : point.kelasKepercayaan === "rendah" ? 5 : 6;
      const marker = L.circleMarker([lat, lon], {
        radius,
        color: "#1c1915",
        weight: 1,
        fillColor: color,
        fillOpacity: 0.9,
      });
      marker.bindPopup(popupHtml(point));
      marker.addTo(layer);
      latlngs.push([lat, lon]);
    }
    latlngsRef.current = latlngs;
  }, [points]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !active) return undefined;
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
      else frameIndonesia(map, modeRef);
    };
    apply();
    return () => {
      cancelled = true;
    };
  }, [frame, points, active]);

  return <div ref={containerRef} className="map-canvas" role="region" aria-label="Peta sebaran titik panas" />;
}
