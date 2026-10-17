import { useEffect, useRef } from "react";
import L from "leaflet";
import { formatAngka, formatTanggal, formatWaktu } from "../lib/format.js";

const COLORS = {
  tinggi: "#b42318",
  nominal: "#c2410c",
  rendah: "#ca8a04",
};

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

export function HotspotMap({ points }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;
    const map = L.map(containerRef.current, {
      scrollWheelZoom: true,
      zoomControl: true,
    }).setView([-2.2, 118], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
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
    const place = () => {
      map.stop();
      map.invalidateSize({ pan: false, animate: false });
      if (latlngs.length === 0) {
        map.setView([-2.2, 118], 5, { animate: false });
      } else if (latlngs.length === 1) {
        map.setView(latlngs[0], 7, { animate: false });
      } else {
        map.fitBounds(latlngs, { padding: [28, 28], maxZoom: 7, animate: false });
      }
      if (map.getZoom() < 4) map.setView([-2.2, 118], 5, { animate: false });
    };
    place();
    window.requestAnimationFrame(place);
  }, [points]);

  return <div ref={containerRef} className="map-canvas" role="region" aria-label="Peta sebaran titik panas" />;
}
