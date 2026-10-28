import { useEffect, useRef } from "react";
import L from "leaflet";
import { osmTileLayer } from "../lib/basemap.js";
import { dekatDaratan, teksDekat } from "../lib/dekatDaratan.js";
import { INDONESIA_FRAME } from "../lib/geo.js";
import { analisisDampakIndonesia } from "../lib/siklonBmkg.js";

const WARNA = {
  kecil: "#15803d",
  disebut: "#b45309",
  pantau: "#b42318",
};

function kelasTingkat(tingkat) {
  if (tingkat === "Di wilayah pemantauan") return "pantau";
  if (tingkat === "Disebut BMKG") return "disebut";
  return "kecil";
}

function adaKoordinat(item) {
  const lat = Number(item?.lintang);
  const lon = Number(item?.bujur);
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 85 && Math.abs(lon) <= 180;
}

export function PetaPosisiSiklon({ sistem }) {
  const node = useRef(null);
  const kunci = sistem.map((item) => `${item.nama}:${item.lintang}:${item.bujur}`).join("|");

  useEffect(() => {
    const el = node.current;
    if (!el) return undefined;
    const map = L.map(el, { scrollWheelZoom: false, zoomControl: true });
    osmTileLayer(L).addTo(map);
    const grup = L.layerGroup().addTo(map);
    const gambar = () => {
      grup.clearLayers();
      const batas = L.latLngBounds(
        [INDONESIA_FRAME.south, INDONESIA_FRAME.west],
        [INDONESIA_FRAME.north, INDONESIA_FRAME.east],
      );
      for (const item of sistem) {
        if (!adaKoordinat(item)) continue;
        const lat = Number(item.lintang);
        const lon = Number(item.bujur);
        batas.extend([lat, lon]);
        const tingkat = analisisDampakIndonesia(item).tingkat;
        const warna = WARNA[kelasTingkat(tingkat)];
        const dekat = teksDekat(dekatDaratan(lat, lon));
        const penanda = L.circleMarker([lat, lon], {
          radius: 8,
          color: "#fff",
          weight: 2,
          fillColor: warna,
          fillOpacity: 1,
        });
        penanda.bindTooltip(item.nama, { permanent: true, direction: "top", offset: [0, -8], className: "siklon-label" });
        const teks = dekat
          ? `${item.nama}<br>Terdekat dengan: ${dekat.negara}<br>Ke Indonesia: ${dekat.indonesia}`
          : item.nama;
        penanda.bindPopup(teks);
        penanda.addTo(grup);
      }
      if (batas.isValid()) map.fitBounds(batas.pad(0.2), { animate: false, padding: [16, 16] });
    };
    gambar();
    const timer = window.setTimeout(() => {
      map.invalidateSize();
      gambar();
    }, 80);
    return () => {
      window.clearTimeout(timer);
      map.remove();
    };
  }, [kunci, sistem]);

  return (
    <figure className="siklon-peta-gambar">
      <div ref={node} className="siklon-peta-osm" />
      <figcaption>
        Peta dasar OpenStreetMap, dengan batas negara dan nama yang ada pada peta itu. Titik adalah posisi analisis yang ditulis BMKG. Bukan lintasan prakiraan dan bukan peta resmi.
        Jarak ke daratan memakai garis pantai Natural Earth 1:50m (domain publik), bukan angka BMKG.
      </figcaption>
    </figure>
  );
}
