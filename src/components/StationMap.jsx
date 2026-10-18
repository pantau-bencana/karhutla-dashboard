import { useEffect, useRef } from "react";
import L from "leaflet";
import { frameIndonesia, framePoints } from "./HotspotMap.jsx";

const COLORS = {
  Baik: "#1b7f3a",
  Sedang: "#2f6fed",
  "Tidak Sehat": "#ca8a04",
  "Sangat Tidak Sehat": "#dc2626",
  Berbahaya: "#111111",
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

function popupHtml(station) {
  return `
    <div class="popup">
      <strong>${escapeHtml(station.stasiun)}</strong>
      <div>${escapeHtml(station.kabupaten)}</div>
      <div>ISPU ${escapeHtml(station.ispu)} · ${escapeHtml(station.kategori)}</div>
      <div>Parameter kritis: ${escapeHtml(station.parameter)}</div>
      <div>${escapeHtml(station.waktu || "waktu tidak tersedia")}</div>
      <div>Sumber: ${escapeHtml(station.sumber)}</div>
    </div>
  `;
}

export function StationMap({ stations, selectedId, onSelect, active = true }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const stationsRef = useRef(stations ?? []);
  const selectedRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    stationsRef.current = stations ?? [];
    selectedRef.current = selectedId;
    onSelectRef.current = onSelect;
  }, [stations, selectedId, onSelect]);

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

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer || !active) return undefined;
    let cancelled = false;
    let tries = 0;
    const draw = () => {
      if (cancelled || !mapRef.current || !layerRef.current) return;
      map.invalidateSize({ pan: false, animate: false });
      const size = map.getSize();
      if ((size.x < 80 || size.y < 80) && tries < 20) {
        tries += 1;
        window.requestAnimationFrame(draw);
        return;
      }
      layer.clearLayers();
      const latlngs = [];
      for (const station of stationsRef.current) {
        const latlng = [station.lintang, station.bujur];
        latlngs.push(latlng);
        const marker = L.circleMarker(latlng, {
          radius: station.id === selectedRef.current ? 9 : 7,
          color: "#1c1915",
          weight: station.id === selectedRef.current ? 3 : 1,
          fillColor: COLORS[station.kategori] ?? "#78716c",
          fillOpacity: 0.9,
        });
        marker.bindPopup(popupHtml(station));
        marker.on("click", () => onSelectRef.current?.(station.id));
        marker.addTo(layer);
      }
      const selected = stationsRef.current.find((station) => station.id === selectedRef.current);
      if (selected) framePoints(map, [[selected.lintang, selected.bujur]]);
      else if (latlngs.length) framePoints(map, latlngs);
      else frameIndonesia(map);
    };
    draw();
    return () => {
      cancelled = true;
    };
  }, [stations, selectedId, active]);

  return <div ref={containerRef} className="map-canvas" role="region" aria-label="Peta stasiun ISPU" />;
}
