import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { feature as topoFeature } from "topojson-client";
import { BATAS_KAB_FILE } from "../lib/batasKab.js";
import { basemapLayer } from "../lib/basemap.js";
import { kotakProvinsi } from "../lib/batasProvinsi.js";
import { kunciTampilanIndonesia, muatWilayah, tampilanMasihIndonesia } from "../lib/kunciPeta.js";
import { WARNA_KOSONG } from "../lib/petaTema.js";
import { KeteranganMobile } from "./KeteranganMobile.jsx";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

export function PetaKab({ isi = {}, garis = {}, judul, catatan, legenda = [], kosongLabel = "Belum cukup data", provinsi = "" }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const dataRef = useRef(null);
  const isiRef = useRef(isi);
  const garisRef = useRef(garis);
  const kosongRef = useRef(kosongLabel);
  const provinsiRef = useRef(provinsi);
  const [galat, setGalat] = useState("");
  isiRef.current = isi;
  garisRef.current = garis;
  kosongRef.current = kosongLabel;
  provinsiRef.current = provinsi;

  function tampilkan(map) {
    const nama = provinsiRef.current;
    const geo = dataRef.current;
    if (nama && geo?.features) {
      const kotak = kotakProvinsi(geo.features, nama);
      if (kotak) {
        const bounds = L.latLngBounds([kotak.south, kotak.west], [kotak.north, kotak.east]);
        if (muatWilayah(map, bounds)) return;
      }
    }
    kunciTampilanIndonesia(map, { muatUlang: !nama && tampilanMasihIndonesia(map) });
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return undefined;
    const map = L.map(container, {
      scrollWheelZoom: true,
      zoomAnimation: false,
      fadeAnimation: false,
      zoomSnap: 0,
      zoomDelta: 0.5,
      minZoom: 0,
      maxBoundsViscosity: 1,
      worldCopyJump: false,
    });
    basemapLayer().addTo(map);
    const muatIndonesia = () => tampilkan(map);
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
      const lebar = container.clientWidth || 0;
      const tinggi = container.clientHeight || 0;
      const key = `${Math.round(lebar)}x${Math.round(tinggi)}`;
      if (lebar < 80 || tinggi < 80 || key === sizeKey) return;
      sizeKey = key;
      map.invalidateSize({ animate: false, pan: false });
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
        tampilkan(map);
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !dataRef.current) return;
    tampilkan(map);
  }, [provinsi]);

  return (
    <section className="card">
      <header className="card-head">
        <div>
          <h2>{judul}</h2>
          <p className="peta-penjelas">{catatan}</p>
        </div>
      </header>
      {galat ? <p className="banner warn" role="status">{galat}</p> : null}
      <div ref={containerRef} className="map-canvas" role="application" aria-label={judul} />
      <KeteranganMobile>
        <p>{catatan}</p>
      </KeteranganMobile>
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
