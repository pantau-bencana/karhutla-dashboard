import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { feature as topoFeature } from "topojson-client";
import { BATAS_KAB_FILE } from "../lib/batasKab.js";
import { osmTileLayer } from "../lib/basemap.js";
import { kunciTampilanIndonesia, tampilanMasihIndonesia } from "../lib/kunciPeta.js";
import { WARNA_KOSONG } from "../lib/petaTema.js";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

export function PetaKab({ isi = {}, garis = {}, judul, catatan, legenda = [], kosongLabel = "Belum cukup data" }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const dataRef = useRef(null);
  const isiRef = useRef(isi);
  const garisRef = useRef(garis);
  const kosongRef = useRef(kosongLabel);
  const [galat, setGalat] = useState("");
  isiRef.current = isi;
  garisRef.current = garis;
  kosongRef.current = kosongLabel;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return undefined;
    const map = L.map(container, {
      scrollWheelZoom: true,
      zoomSnap: 0,
      zoomDelta: 0.5,
      minZoom: 0,
      maxBoundsViscosity: 1,
      worldCopyJump: false,
    });
    osmTileLayer(L).addTo(map);
    const muatIndonesia = () => {
      kunciTampilanIndonesia(map, { muatUlang: tampilanMasihIndonesia(map) });
    };
    muatIndonesia();
    layerRef.current = L.geoJSON(null, {
      style: (feature) => gaya(feature, isiRef.current, garisRef.current),
      onEachFeature: (feature, layer) => {
        layer.bindTooltip(tooltip(feature, isiRef.current, garisRef.current, kosongRef.current), { sticky: true });
      },
    }).addTo(map);
    mapRef.current = map;
    let sizeKey = "";
    const onResize = () => {
      const size = map.getSize();
      const key = `${Math.round(size.x)}x${Math.round(size.y)}`;
      if (!key || key === "0x0" || key === sizeKey) return;
      sizeKey = key;
      muatIndonesia();
    };
    map.on("resize", onResize);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
    observer?.observe(container);
    let batal = false;
    fetch(new URL(BATAS_KAB_FILE, document.baseURI).href)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((topo) => {
        if (batal) return;
        const geo = topoFeature(topo, topo.objects.kabupaten);
        dataRef.current = geo;
        layerRef.current.clearLayers();
        layerRef.current.addData(geo);
        layerRef.current.setStyle((feature) => gaya(feature, isiRef.current, garisRef.current));
        map.invalidateSize({ animate: false, pan: false });
      })
      .catch((error) => {
        if (!batal) setGalat(error.message || "Batas kabupaten/kota tidak termuat.");
      });
    return () => {
      batal = true;
      observer?.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    const geo = dataRef.current;
    if (!layer || !geo) return;
    layer.setStyle((feature) => gaya(feature, isi, garis));
    layer.eachLayer((item) => {
      const feature = item.feature;
      if (!feature) return;
      item.setTooltipContent(tooltip(feature, isi, garis, kosongLabel));
    });
  }, [isi, garis, kosongLabel]);

  return (
    <section className="card">
      <header className="card-head">
        <div>
          <h2>{judul}</h2>
          <p>{catatan}</p>
        </div>
      </header>
      {galat ? <p className="banner warn" role="status">{galat}</p> : null}
      <div ref={containerRef} className="map-canvas" role="application" aria-label={judul} />
      {legenda.length ? (
        <ul className="peta-legenda">
          {legenda.map((item) => (
            <li key={item.label}>
              <i className="legenda-dot" style={{ background: item.warna }} /> {item.label}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function gaya(feature, isi, garis) {
  const kode = String(feature?.properties?.kode || "");
  const warna = isi[kode]?.warna || WARNA_KOSONG;
  const tepi = garis[kode]?.warna;
  return {
    color: tepi || "#ffffff",
    weight: tepi ? 1.6 : 0.4,
    fillColor: warna,
    fillOpacity: isi[kode] ? 0.72 : 0.35,
  };
}

function tooltip(feature, isi, garis, kosongLabel) {
  const kode = String(feature?.properties?.kode || "");
  const nama = feature?.properties?.nama || kode;
  const provinsi = feature?.properties?.provinsi || "";
  const isiTeks = isi[kode]?.teks || kosongLabel;
  const garisTeks = garis[kode]?.teks ? `<br>${escapeHtml(garis[kode].teks)}` : "";
  return `<strong>${escapeHtml(nama)}</strong><br>${escapeHtml(provinsi)}<br>${escapeHtml(isiTeks)}${garisTeks}`;
}
