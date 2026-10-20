import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import { feature as topoFeature, mesh as topoMesh } from "topojson-client";
import { BATAS_KAB_FILE, BATAS_KAB_SUMBER } from "../lib/batasKab.js";
import { barisDampakHistoris } from "../lib/bnpbBanjir.js";
import { osmTileLayer } from "../lib/basemap.js";
import { BANJIR_FRAME, BANJIR_PAN_LIMIT } from "../lib/geo.js";
import { ANALISIS_WARNA, CATATAN_ABU, CATATAN_ABU_HARI, CATATAN_ARSIR, WARNA_TANPA_PERINGATAN } from "../lib/analisisPantauBencana.js";
import {
  FLOOD_PERMISSION,
  IDENTIFY_FAIL,
  INARISK_PORTAL,
  IRBI_TIDAK_TERSEDIA,
  NODATA_LABEL,
  RISK_ATTRIBUTION,
  kodeWilayah,
  legendClass,
} from "../lib/floodMatrix.js";
import { BAHAYA_SERVICE, LEGEND_IMAGE, RISIKO_SERVICE, exportImageUrl, identifyUrl } from "../lib/floodServices.js";
import {
  HUJAN_KELAS,
  HUJAN_PEMBANDING_BADGE,
  HUJAN_PEMBANDING_JENIS,
  HUJAN_PEMBANDING_LISENSI,
  HUJAN_PEMBANDING_MODEL,
  HUJAN_PEMBANDING_SUMBER,
  HUJAN_TANPA_NOWCAST,
  HUJAN_TITIK_BATAS,
  mmPada,
  teksMm,
  warnaHujan,
} from "../lib/hujanPembanding.js";
import { InfoTip } from "./InfoTip.jsx";

function envelopeOf(features) {
  let south = 90;
  let north = -90;
  let west = 180;
  let east = -180;
  const walk = (coords) => {
    if (!coords) return;
    if (typeof coords[0] === "number") {
      const [lon, lat] = coords;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
      south = Math.min(south, lat);
      north = Math.max(north, lat);
      west = Math.min(west, lon);
      east = Math.max(east, lon);
      return;
    }
    coords.forEach(walk);
  };
  for (const feature of features ?? []) walk(feature.geometry?.coordinates);
  if (south > north) return null;
  return { south, north, west, east };
}

async function readJson(url, timeoutMs) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  if (payload?.error) throw new Error(payload.error.message || "Permintaan layanan gagal");
  return payload;
}

let batasCache = null;

async function loadBatas() {
  if (batasCache) return batasCache;
  const response = await fetch(new URL(BATAS_KAB_FILE, document.baseURI).href);
  if (!response.ok) throw new Error(`Batas kabupaten HTTP ${response.status}`);
  const topo = await response.json();
  const geo = topoFeature(topo, topo.objects.kabupaten);
  const provinsi = topoMesh(topo, topo.objects.kabupaten, (left, right) => left?.properties?.provinsi !== right?.properties?.provinsi);
  batasCache = { geo, provinsi };
  return batasCache;
}

function kodeFitur(feature) {
  return kodeWilayah(feature?.properties?.kode || feature?.properties?.kdpkab);
}

function paintOf(feature, kabPaint) {
  return kabPaint?.get(kodeFitur(feature)) ?? null;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

function resolvePaint(feature, kabPaint, tab, bolehKosong) {
  const paint = paintOf(feature, kabPaint);
  if (paint?.kind) return paint;
  if (tab === "cap" && bolehKosong) {
    return { kind: "kosong", fill: WARNA_TANPA_PERINGATAN, status: "", alasan: "", kosongLabel: "Tidak ada peringatan" };
  }
  return { kind: "nodata", fill: "", status: "", alasan: tab === "cap" ? "cakupan" : "prakiraan" };
}

function gayaWilayah(paint, selected, peringatan) {
  if (!peringatan) {
    return { color: "#d6d3d1", weight: selected ? 1 : 0.4, fillColor: "#f4f1ea", fillOpacity: 0.5, dashArray: null };
  }
  if (paint?.kind === "status" && paint.fill) {
    return { color: "#3f3a34", weight: selected ? 1.1 : 0.45, fillColor: paint.fill, fillOpacity: 0.78, dashArray: null };
  }
  if (paint?.kind === "kosong" || paint?.kind === "tak-dikenal") {
    return { color: "#6f6a62", weight: selected ? 1 : 0.45, fillColor: WARNA_TANPA_PERINGATAN, fillOpacity: 0.9, dashArray: null };
  }
  return { color: "#6f6a62", weight: selected ? 1 : 0.4, fillColor: "url(#flood-hatch)", fillOpacity: 1, dashArray: null };
}

function pasangArsir(map, layer) {
  const sample = layer?.getLayers?.()[0];
  if (!map || !sample) return;
  const renderer = map.getRenderer(sample);
  const svg = renderer?._container;
  if (!svg || svg.querySelector("#flood-hatch")) return;
  const ns = "http://www.w3.org/2000/svg";
  const defs = document.createElementNS(ns, "defs");
  const pattern = document.createElementNS(ns, "pattern");
  pattern.setAttribute("id", "flood-hatch");
  pattern.setAttribute("patternUnits", "userSpaceOnUse");
  pattern.setAttribute("width", "8");
  pattern.setAttribute("height", "8");
  pattern.setAttribute("patternTransform", "rotate(40)");
  const rect = document.createElementNS(ns, "rect");
  rect.setAttribute("width", "8");
  rect.setAttribute("height", "8");
  rect.setAttribute("fill", "#efeae2");
  const line = document.createElementNS(ns, "path");
  line.setAttribute("d", "M0 0 L0 8");
  line.setAttribute("stroke", "#8d877c");
  line.setAttribute("stroke-width", "2");
  pattern.append(rect, line);
  defs.append(pattern);
  svg.insertBefore(defs, svg.firstChild);
}

function barisHujan(feature, hujan) {
  if (!hujan?.aktif) return [];
  const item = hujan.indeks?.get(kodeFitur(feature));
  const mm = mmPada(item, hujan.tanggal);
  const angka = mm === undefined || mm == null ? "belum tersedia" : teksMm(mm);
  return [
    `Hujan model: ${angka}`,
    HUJAN_PEMBANDING_JENIS,
    `Jumlah hujan harian. Sumber: ${HUJAN_PEMBANDING_SUMBER}. Diambil ${hujan.waktu}.`,
    hujan.catatan,
  ].filter(Boolean);
}

function tooltipFor(feature, kabPaint, hujan) {
  const nama = feature?.properties?.nama || feature?.properties?.wadmkk || feature?.properties?.provinsi || feature?.properties?.wadmpr;
  const paint = paintOf(feature, kabPaint);
  const lines = [nama];
  if (paint?.status) lines.push(paint.status);
  else if (paint?.kind === "kosong" || paint?.kind === "tak-dikenal") lines.push(paint.kosongLabel || "Tidak ada peringatan");
  else if (paint?.alasan === "irbi") lines.push(IRBI_TIDAK_TERSEDIA);
  const adaModel = paint?.rincian?.some((line) => String(line).startsWith("Hujan model:"));
  if (paint?.kind === "nodata" && !adaModel) lines.push("Tanpa data");
  if (paint?.kind === "nodata" && adaModel) {
    lines.push(...paint.rincian);
  } else {
    if (paint?.rincian?.length) lines.push(...paint.rincian);
    else {
      if (paint?.lampau) lines.push("Data terakhir — masa berlaku sudah lewat, menunggu pembaruan BMKG");
      if (paint?.kind === "tak-dikenal" && paint.cuacaMentah?.length) lines.push(...paint.cuacaMentah);
      if (paint?.status && paint.pendudukBaris?.length) lines.push(...paint.pendudukBaris);
      lines.push(...barisDampakHistoris());
    }
    if (!adaModel) lines.push(...barisHujan(feature, hujan));
  }
  return lines.filter(Boolean).map(escapeHtml).join("<br>");
}

function tooltipTitik(titik, hujan) {
  return [
    titik.nama,
    teksMm(titik.mm),
    HUJAN_PEMBANDING_JENIS,
    `Jumlah hujan harian ${titik.tanggal || ""}. Sumber: ${HUJAN_PEMBANDING_SUMBER}, model ${HUJAN_PEMBANDING_MODEL}.`,
    `Diambil ${hujan.waktu}.`,
    titik.adm4 ? `Titik adm4 ${titik.adm4}` : "",
    hujan.catatan,
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join("<br>");
}

const BANJIR_PADDING = [10, 10];

function banjirBounds() {
  return L.latLngBounds(
    [BANJIR_FRAME.south, BANJIR_FRAME.west],
    [BANJIR_FRAME.north, BANJIR_FRAME.east],
  );
}

function petaSiap(map) {
  const size = map?.getSize?.();
  return Boolean(size && size.x >= 80 && size.y >= 80);
}

function frameBanjir(map) {
  if (!petaSiap(map)) return false;
  const frame = banjirBounds();
  map.stop();
  map.setMinZoom(0);
  map.fitBounds(frame, { padding: BANJIR_PADDING, animate: false });
  const zoom = map.getZoom();
  if (Number.isFinite(zoom)) map.setMinZoom(zoom);
  map.setMaxBounds(
    L.latLngBounds(
      [BANJIR_PAN_LIMIT.south, BANJIR_PAN_LIMIT.west],
      [BANJIR_PAN_LIMIT.north, BANJIR_PAN_LIMIT.east],
    ),
  );
  return true;
}

export function FloodRiskMap({
  province = "",
  onProvince,
  kabPaint,
  nomor,
  tab = "cap",
  bolehKosong = false,
  catatan = [],
  waktuLabel = "—",
  showHujan = false,
  onShowHujan,
  hujan = null,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const kontrolRef = useRef(null);
  const [kontrolSiap, setKontrolSiap] = useState(false);
  const riskRef = useRef(null);
  const bahayaRef = useRef(null);
  const kabRef = useRef(null);
  const lineRef = useRef(null);
  const geomRef = useRef(null);
  const labelRef = useRef(null);
  const hujanRef = useRef(null);
  const tokenRef = useRef(0);
  const identifyRef = useRef(0);
  const identifyHandler = useRef(() => {});
  const provinceRef = useRef(province);
  const inariskRef = useRef(false);
  const [showInarisk, setShowInarisk] = useState(false);
  const [showBahaya, setShowBahaya] = useState(false);
  const [showPeringatan, setShowPeringatan] = useState(true);
  const [showBatas, setShowBatas] = useState(true);
  const [mapError, setMapError] = useState("");
  const [bigNote, setBigNote] = useState("");
  const [identify, setIdentify] = useState("");
  const [legendOk, setLegendOk] = useState(true);
  const [loadingMap, setLoadingMap] = useState(false);

  provinceRef.current = province;
  inariskRef.current = showInarisk;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      zoomAnimation: false,
      fadeAnimation: false,
      zoomSnap: 0,
      zoomDelta: 0.5,
      minZoom: 0,
      maxBoundsViscosity: 1,
    });
    osmTileLayer(L).addTo(map);
    map.createPane("flood-lines");
    map.getPane("flood-lines").style.zIndex = 450;
    const pasang = () => {
      map.invalidateSize({ animate: false, pan: false });
      const batasProv = provinceRef.current ? kabRef.current?.getBounds?.() : null;
      if (batasProv?.isValid?.()) {
        map.fitBounds(batasProv, { padding: [16, 16], animate: false });
        return;
      }
      frameBanjir(map);
    };
    pasang();
    let sizeKey = "";
    const onResize = () => {
      const size = map.getSize();
      const key = `${Math.round(size.x)}x${Math.round(size.y)}`;
      if (!key || key === sizeKey) return;
      sizeKey = key;
      pasang();
    };
    map.on("resize", onResize);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
    observer?.observe(containerRef.current);
    map.on("click", (event) => {
      if (provinceRef.current && inariskRef.current) identifyHandler.current(event);
    });
    const kontrol = L.control({ position: "topright" });
    kontrol.onAdd = () => {
      const div = L.DomUtil.create("div", "hujan-kontrol");
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);
      kontrolRef.current = div;
      return div;
    };
    kontrol.addTo(map);
    mapRef.current = map;
    setKontrolSiap(true);
    return () => {
      observer?.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !showInarisk) {
      riskRef.current?.remove();
      bahayaRef.current?.remove();
      riskRef.current = null;
      bahayaRef.current = null;
      return undefined;
    }
    let timer = 0;
    const draw = () => {
      const size = map.getSize();
      if (!size || size.x < 40 || size.y < 40) return;
      const scale = Math.min(1, 1024 / Math.max(size.x, size.y));
      const width = Math.max(64, Math.round(size.x * scale));
      const height = Math.max(64, Math.round(size.y * scale));
      const bounds = map.getBounds();
      const sw = map.options.crs.project(bounds.getSouthWest());
      const ne = map.options.crs.project(bounds.getNorthEast());
      const bbox = [sw.x, sw.y, ne.x, ne.y];
      const token = ++tokenRef.current;
      const place = (layerRef, service, opacity) => {
        const url = exportImageUrl(service, bbox, width, height);
        if (!layerRef.current) {
          const overlay = L.imageOverlay(url, bounds, { opacity, interactive: false });
          overlay.on("load", () => {
            if (token === tokenRef.current) setMapError("");
          });
          overlay.on("error", () => {
            if (token === tokenRef.current) setMapError("Layanan peta BNPB tidak tersedia");
          });
          overlay.addTo(map);
          layerRef.current = overlay;
          return;
        }
        layerRef.current.setOpacity(opacity);
        layerRef.current.setUrl(url);
        layerRef.current.setBounds(bounds);
      };
      place(riskRef, RISIKO_SERVICE, showBahaya ? 0.55 : 0.75);
      if (showBahaya) place(bahayaRef, BAHAYA_SERVICE, 0.85);
      else if (bahayaRef.current) {
        map.removeLayer(bahayaRef.current);
        bahayaRef.current = null;
      }
    };
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(draw, 450);
    };
    map.on("moveend", schedule);
    schedule();
    return () => {
      window.clearTimeout(timer);
      map.off("moveend", schedule);
    };
  }, [showInarisk, showBahaya]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    let cancelled = false;
    kabRef.current?.remove();
    lineRef.current?.remove();
    geomRef.current?.remove();
    kabRef.current = null;
    lineRef.current = null;
    geomRef.current = null;
    setBigNote("");
    setLoadingMap(true);
    (async () => {
      try {
        const batas = await loadBatas();
        if (cancelled) return;
        const features = batas.geo?.features ?? [];
        const drawn = province ? features.filter((feature) => feature?.properties?.provinsi === province) : features;
        if (!drawn.length) {
          setBigNote("Batas kabupaten/kota tidak tersedia untuk tampilan ini.");
          setLoadingMap(false);
          return;
        }
        kabRef.current = L.geoJSON(
          { type: "FeatureCollection", features: drawn },
          {
            pane: "flood-lines",
            style: (feature) => gayaWilayah(resolvePaint(feature, kabPaint, tab, bolehKosong), Boolean(province), showPeringatan),
            onEachFeature(feature, layer) {
              const tip = tooltipFor(feature, kabPaint, hujan);
              if (tip) layer.bindTooltip(tip, { sticky: true, className: "flood-tip" });
              if (!province) {
                layer.on("click", (event) => {
                  L.DomEvent.stopPropagation(event);
                  const next = feature?.properties?.wadmpr;
                  if (next) onProvince?.(next);
                });
              }
            },
          },
        ).addTo(map);
        pasangArsir(map, kabRef.current);
        kabRef.current.setStyle((feature) =>
          gayaWilayah(resolvePaint(feature, kabPaint, tab, bolehKosong), Boolean(province), showPeringatan),
        );
        const extent = envelopeOf(drawn);
        if (province && extent) {
          map.fitBounds(
            [
              [extent.south, extent.west],
              [extent.north, extent.east],
            ],
            { padding: [16, 16], animate: false },
          );
        } else if (!province) {
          frameBanjir(map);
        }
      } catch {
        if (!cancelled) setBigNote("Berkas batas kabupaten/kota tidak dapat dimuat. Peta wilayah tidak digambar pada pembaruan ini.");
      } finally {
        if (!cancelled) setLoadingMap(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [province, onProvince]);

  useEffect(() => {
    const map = mapRef.current;
    if (kabRef.current && map) pasangArsir(map, kabRef.current);
    kabRef.current?.eachLayer((layer) => {
      const feature = layer.feature;
      const paint = resolvePaint(feature, kabPaint, tab, bolehKosong);
      layer.setStyle(gayaWilayah(paint, Boolean(province), showPeringatan));
      const tip = tooltipFor(feature, kabPaint, hujan);
      if (tip) layer.bindTooltip(tip, { sticky: true, className: "flood-tip" });
      else layer.unbindTooltip();
    });
  }, [province, kabPaint, loadingMap, tab, bolehKosong, showPeringatan, hujan]);

  useEffect(() => {
    const map = mapRef.current;
    hujanRef.current?.remove();
    hujanRef.current = null;
    if (!map || tab === "cap" || !showHujan || !hujan?.indeks) return undefined;
    if (!map.getPane("hujan-pembanding")) {
      map.createPane("hujan-pembanding");
      map.getPane("hujan-pembanding").style.zIndex = 460;
    }
    const group = L.layerGroup();
    for (const item of hujan.indeks.values()) {
      const mm = mmPada(item, hujan.tanggal);
      if (!Number.isFinite(item.lintang) || !Number.isFinite(item.bujur) || !Number.isFinite(mm)) continue;
      if (hujan.kodeTampil && !hujan.kodeTampil.has(item.kode)) continue;
      const marker = L.circleMarker([item.lintang, item.bujur], {
        pane: "hujan-pembanding",
        radius: 5,
        color: "#1c3f66",
        weight: 1,
        fillColor: warnaHujan(mm),
        fillOpacity: 0.92,
      });
      marker.bindTooltip(tooltipTitik({ ...item, mm, tanggal: hujan.tanggal }, hujan), { className: "flood-tip" });
      marker.on("click", (event) => L.DomEvent.stopPropagation(event));
      group.addLayer(marker);
    }
    group.addTo(map);
    hujanRef.current = group;
    return () => {
      group.remove();
      hujanRef.current = null;
    };
  }, [tab, showHujan, hujan, province, loadingMap]);

  useEffect(() => {
    const map = mapRef.current;
    labelRef.current?.remove();
    labelRef.current = null;
    if (!map || !province || !kabRef.current) return undefined;
    const group = L.layerGroup();
    const seen = new Set();
    kabRef.current.eachLayer((layer) => {
      const kode = kodeFitur(layer.feature);
      if (!kode || seen.has(kode)) return;
      const n = nomor?.get(kode);
      if (!n) return;
      seen.add(kode);
      let center = null;
      try {
        center = layer.getCenter();
      } catch {
        center = null;
      }
      if (!center) return;
      group.addLayer(
        L.marker(center, {
          interactive: false,
          keyboard: false,
          icon: L.divIcon({
            className: "flood-num",
            html: `<span>${n}</span>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          }),
        }),
      );
    });
    group.addTo(map);
    labelRef.current = group;
    return () => {
      group.remove();
      if (labelRef.current === group) labelRef.current = null;
    };
  }, [province, nomor, loadingMap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    lineRef.current?.remove();
    lineRef.current = null;
    if (!showBatas) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const batas = await loadBatas();
        if (cancelled || !mapRef.current) return;
        lineRef.current = L.geoJSON(batas.provinsi, {
          pane: "flood-lines",
          interactive: false,
          style: { color: "#143028", weight: province ? 1.6 : 0.8, opacity: 0.9, fillOpacity: 0 },
        }).addTo(mapRef.current);
      } catch {
        if (!cancelled) setBigNote("Garis batas provinsi tidak tersedia. Wilayah kabupaten tetap ditampilkan.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showBatas, province]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !province) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(new URL("data/live/bmkg-cap-geom.json", document.baseURI).href, { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        if (cancelled) return;
        const features = [];
        for (const cap of payload?.caps ?? []) {
          for (const ring of cap.rings ?? []) {
            if (ring.length < 3) continue;
            features.push({
              type: "Feature",
              properties: { cap_id: cap.cap_id, event: cap.event, severity: cap.severity },
              geometry: { type: "Polygon", coordinates: [ring] },
            });
          }
        }
        if (!features.length) return;
        geomRef.current = L.geoJSON(
          { type: "FeatureCollection", features },
          {
            interactive: false,
            style: { color: "#9a3412", weight: 1.2, fillOpacity: 0, dashArray: "2 3" },
          },
        ).addTo(map);
      } catch {
        /* poligon CAP tidak wajib ada pada cuplikan */
      }
    })();
    return () => {
      cancelled = true;
      geomRef.current?.remove();
      geomRef.current = null;
    };
  }, [province]);

  identifyHandler.current = async (event) => {
    const token = ++identifyRef.current;
    setIdentify("Memeriksa nilai indeks…");
    try {
      const payload = await readJson(identifyUrl(event.latlng.lng, event.latlng.lat), 8000);
      if (token !== identifyRef.current) return;
      const reading = legendClass(payload?.value);
      if (reading.kind === "nodata") {
        setIdentify(NODATA_LABEL);
        return;
      }
      const kelas = reading.kelas ? ` Kelas legenda: ${reading.kelas}.` : " Di luar rentang legenda 0–1,0.";
      setIdentify(`Indeks risiko ${reading.teks}.${kelas} Bukan peringatan dini.`);
    } catch {
      if (token === identifyRef.current) setIdentify(IDENTIFY_FAIL);
    }
  };

  return (
    <div className="flood-map-block">
      <fieldset className="layer-checks">
        <legend>Lapisan</legend>
        <span className="layer-with-info">
          <label>
            <input type="checkbox" checked={showPeringatan} onChange={(event) => setShowPeringatan(event.target.checked)} />
            Peringatan
          </label>
          <InfoTip label="Penjelasan lapisan peringatan">
            <p>Awas, Siaga, dan Waspada adalah analisis proyek ini, bukan status resmi BMKG atau BNPB.</p>
            <p>
              {tab === "cap"
                ? "Tab 0–3 jam memasangkan peringatan dini cuaca BMKG (0–3 jam) per kab/kota dengan kelas risiko banjir IRBI 2025 BNPB lewat matriks proyek."
                : "Tab hari memasangkan prakiraan cuaca 3 hari BMKG per kab/kota dengan kelas risiko banjir IRBI 2025 BNPB lewat matriks proyek, termasuk aturan kode cuaca."}
            </p>
            <p>Poligon adalah batas administrasi kab/kota. Merah Awas, jingga Siaga, kuning Waspada, abu-abu tidak ada status, arsir tanpa data.</p>
            <p>Pembaruan terakhir: {waktuLabel}.</p>
            <p>
              <a href="#/sumber-metode/petunjuk-banjir">Petunjuk perhitungan banjir</a>
            </p>
          </InfoTip>
        </span>
        <label>
          <input type="checkbox" checked={showInarisk} onChange={(event) => setShowInarisk(event.target.checked)} />
          Overlay inaRISK
        </label>
        {showInarisk ? (
          <label>
            <input type="checkbox" checked={showBahaya} onChange={(event) => setShowBahaya(event.target.checked)} />
            Bahaya banjir
          </label>
        ) : null}
        <label>
          <input type="checkbox" checked={showBatas} onChange={(event) => setShowBatas(event.target.checked)} />
          Batas provinsi
        </label>
      </fieldset>
      {tab === "cap" ? <p className="fine">{HUJAN_TANPA_NOWCAST}</p> : null}
      <p className="fine">{FLOOD_PERMISSION} Overlay inaRISK mati sampai dinyalakan. Status peta inaRISK belum Aktif.</p>
      {mapError ? (
        <p className="banner warn" role="status">
          <strong>{mapError}</strong>{" "}
          <a href={INARISK_PORTAL} target="_blank" rel="noopener noreferrer">
            Portal inaRISK
          </a>
        </p>
      ) : null}
      {loadingMap ? <p className="fine">Memuat batas kabupaten/kota…</p> : null}
      {bigNote ? <p className="fine">{bigNote}</p> : null}
      <div ref={containerRef} className="map-canvas flood-map" role="application" aria-label="Peta banjir Indonesia" />
      {kontrolSiap && kontrolRef.current
        ? createPortal(
            tab === "cap" ? null : (
              <>
                <label>
                  <input type="checkbox" checked={showHujan} onChange={(event) => onShowHujan?.(event.target.checked)} />
                  Curah hujan model
                </label>
                <InfoTip label="Penjelasan lapisan Data Pembanding curah hujan" align="end">
                  <p>{HUJAN_PEMBANDING_BADGE}. {HUJAN_PEMBANDING_JENIS}.</p>
                  <p>Jumlah hujan harian Open-Meteo, model {HUJAN_PEMBANDING_MODEL}, pada titik adm4 yang sama. Satuan mm. Bukan skala Awas, Siaga, atau Waspada, dan tidak masuk matriks.</p>
                  <p>{HUJAN_TANPA_NOWCAST} {HUJAN_TITIK_BATAS}</p>
                  <p>Bila prakiraan BMKG untuk Hari ini, Besok, atau Lusa tidak ada, angka mm tetap tampil pada tabel dan tooltip. Angka itu tidak menetapkan Awas, Siaga, atau Waspada, dan tidak mewarnai poligon.</p>
                  <p>Diambil {hujan?.waktu || "—"}. Lisensi <a href={HUJAN_PEMBANDING_LISENSI} target="_blank" rel="noopener noreferrer">CC BY 4.0</a>.</p>
                  <p>{hujan?.gpm}</p>
                  <p>
                    <a href="#/sumber-metode/petunjuk-banjir">Petunjuk perhitungan banjir</a>
                  </p>
                </InfoTip>
              </>
            ),
            kontrolRef.current,
          )
        : null}
      <div className="flood-legend" aria-label="Legenda peta">
        {Object.entries(ANALISIS_WARNA).map(([nama, warna]) => (
          <span key={nama}>
            <i style={{ background: warna }} /> {nama}
          </span>
        ))}
        <span>
          <i style={{ background: WARNA_TANPA_PERINGATAN }} />{" "}
          {tab === "cap" ? "Tidak ada peringatan" : "Tidak ada status (cuaca tidak berpotensi banjir)"}
        </span>
        {tab === "cap" ? null : (
          <span>
            <i style={{ background: WARNA_TANPA_PERINGATAN }} /> Tidak terklasifikasi (kode cuaca BMKG belum dikenali)
          </span>
        )}
        <span>
          <i className="swatch-hatch" /> Tanpa data
        </span>
      </div>
      {showHujan ? (
        <div className="flood-legend" aria-label="Legenda hujan model">
          {HUJAN_KELAS.map((kelas) => (
            <span key={kelas.id}>
              <i className="swatch-hujan" style={{ background: kelas.warna }} /> {kelas.label}
            </span>
          ))}
          <span>{HUJAN_PEMBANDING_JENIS}. Bukan warna peringatan.</span>
        </div>
      ) : null}
      <p className="fine">{tab === "cap" ? CATATAN_ABU : CATATAN_ABU_HARI} {CATATAN_ARSIR}</p>
      <p className="fine">{BATAS_KAB_SUMBER}</p>
      {catatan.map((baris) => (
        <p key={baris} className="fine">{baris}</p>
      ))}
      {showInarisk ? (
        <>
          <p className="fine">{RISK_ATTRIBUTION}</p>
          <div className="flood-legend">
            {legendOk ? <img src={LEGEND_IMAGE} alt="Legenda indeks risiko inaRISK" onError={() => setLegendOk(false)} /> : null}
            <p>0–0,3 Rendah. 0,3–0,6 Sedang. 0,6–1,0 Tinggi.</p>
          </div>
          <p className="fine" role="status">
            {province ? identify || "Klik peta untuk membaca indeks pada titik itu." : "Pilih provinsi, lalu klik peta untuk membaca indeks."}
          </p>
        </>
      ) : null}
    </div>
  );
}
