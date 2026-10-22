import { useEffect, useRef } from "react";
import L from "leaflet";
import { osmTileLayer } from "../lib/basemap.js";
import { kunciTampilanIndonesia } from "../lib/kunciPeta.js";
import { frameIndonesia, framePoints, frameWilayah } from "./HotspotMap.jsx";

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

export function StationMap({ stations, selectedId, onSelect, active = true, wilayah = "" }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const modeRef = useRef("indonesia");
  const stationsRef = useRef(stations ?? []);
  const selectedRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  const wilayahRef = useRef(wilayah);
  wilayahRef.current = wilayah;

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
    osmTileLayer(L).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const muat = () => {
      if (modeRef.current === "points") kunciTampilanIndonesia(map, { muatUlang: false });
      else if (wilayahRef.current) frameWilayah(map, wilayahRef.current, modeRef);
      else frameIndonesia(map, modeRef);
    };
    muat();
    let sizeKey = "";
    const onResize = () => {
      const lebar = containerRef.current?.clientWidth || 0;
      const tinggi = containerRef.current?.clientHeight || 0;
      const key = `${Math.round(lebar)}x${Math.round(tinggi)}`;
      if (lebar < 80 || tinggi < 80 || key === sizeKey) return;
      sizeKey = key;
      map.invalidateSize({ animate: false, pan: false });
      muat();
    };
    map.on("resize", onResize);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
    observer?.observe(containerRef.current);

    return () => {
      observer?.disconnect();
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
      if (selected) framePoints(map, [[selected.lintang, selected.bujur]], modeRef);
      else if (latlngs.length) framePoints(map, latlngs, modeRef);
      else if (wilayahRef.current) frameWilayah(map, wilayahRef.current, modeRef);
      else frameIndonesia(map, modeRef);
    };
    draw();
    return () => {
      cancelled = true;
    };
  }, [stations, selectedId, active, wilayah]);

  return <div ref={containerRef} className="map-canvas" role="region" aria-label="Peta stasiun ISPU" />;
}
