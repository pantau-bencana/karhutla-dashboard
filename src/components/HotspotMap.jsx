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

function popupHtml(point) {
  const place = point.kabupaten ? `${point.provinsi} — ${point.kabupaten}` : point.provinsi;
  const frp = Number.isFinite(point.frp) ? `<div>FRP: ${escapeHtml(formatAngka(point.frp, 1))} MW</div>` : "";
  const bright = Number.isFinite(point.kecerahan)
    ? `<div>Kecerahan: ${escapeHtml(formatAngka(point.kecerahan, 1))} K</div>`
    : "";
  const sample = point.contoh ? `<div class="popup-sample">Data contoh</div>` : "";
  return `
    <div class="popup">
      <strong>Titik panas</strong>
      ${sample}
      <div>${escapeHtml(place)}</div>
      <div>${escapeHtml(formatTanggal(point.tanggal))}, ${escapeHtml(formatWaktu(point.waktu))}</div>
      <div>Satelit: ${escapeHtml(point.satelit || "—")}</div>
      <div>Kepercayaan: ${escapeHtml(point.kepercayaan || "—")} (${escapeHtml(point.kelasKepercayaan)})</div>
      ${frp}
      ${bright}
    </div>
  `;
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
      const color = COLORS[point.kelasKepercayaan] ?? COLORS.nominal;
      const radius = point.kelasKepercayaan === "tinggi" ? 7 : point.kelasKepercayaan === "rendah" ? 5 : 6;
      const marker = L.circleMarker([point.lintang, point.bujur], {
        radius,
        color: "#1c1915",
        weight: 1,
        fillColor: color,
        fillOpacity: 0.9,
      });
      marker.bindPopup(popupHtml(point));
      marker.addTo(layer);
      latlngs.push([point.lintang, point.bujur]);
    }
    if (latlngs.length) {
      map.fitBounds(latlngs, { padding: [28, 28], maxZoom: 8 });
    } else {
      map.setView([-2.2, 118], 5);
    }
    window.setTimeout(() => map.invalidateSize(), 0);
  }, [points]);

  return <div ref={containerRef} className="map-canvas" role="region" aria-label="Peta sebaran titik panas" />;
}
