---
name: geospatial-gis
description: Change maps, layers, coordinates, or geographic filters in the Karhutla dashboard. Use for Leaflet, GeoJSON, hotspot markers, clustering, layer toggles, and administrative placement.
---

# Geospatial GIS

The map is Leaflet in `src/components/HotspotMap.jsx`. The basemap is OpenStreetMap tiles. There is no PostGIS and no paid tile service. Keep the Indonesia frame, `minZoom`, and `maxBounds` behavior that `npm run check` already asserts (`INDONESIA_FRAME`, `fitBounds`, no hard-coded `setView([-2.2, 118]`).

## When to use

- Markers, popups, zoom, or the Indonesia frame change.
- A layer is added to Peta dan Data.
- Province or kabupaten filters change.
- Someone proposes bounding boxes, clustering, or a GeoJSON boundary.

## Rules

- Plot a point only when latitude and longitude are finite and inside a sane range. Do not shift coordinates to force them on screen.
- One layer is active at a time on Peta dan Data unless the user explicitly turns others on. Do not stack hotspot, hazard, smoke, FDRS, rain, wind, and Kualitas Udara (ISPU) by default. ISPU stations are points, not a kabupaten/kota choropleth.
- Hotspot markers are satellite detections. Popup and legend must not say the point is a confirmed fire. Sample rows are not drawn. A numbered dark circle at low zoom is a count of detections in a cell, not a confidence class. Single points use confidence colors.
- If a row has no official province or kabupaten name, set **Belum terpetakan** and the sentence **belum dapat dipetakan secara administratif**. Do not assign a province from the rough boxes in `src/lib/geo.js`. Those boxes remain a tested helper and, only if documented, a centroid for an openly labeled comparison layer. They are not administrative boundaries.
- Do not download, store, or commit administrative-boundary shapefiles or GeoJSON. Identify a hotspot from the BIG MapServer at request time. Keep only names and codes in `data/live`. If no desa polygon matches, show **Wilayah desa belum teridentifikasi**. Do not guess a desa. The rough boxes in `src/lib/geo.js` are not boundaries.
- inaRISK karhutla hazard is an ImageServer raster, not a tidy kabupaten table. Leave it as **Tautan saja** (`https://inarisk2.bnpb.go.id/portal/`) until a documented, stable way to draw it exists. Do not screenshot or crop BMKG images onto the map.
- Klasifikasi DAS (`Klasifikasi_DAS_KLHK` MapServer) is for a future Banjir tab. Do not add it to the Karhutla map in passing. If a request times out, continue without it.
- Wind barbs or arrows must not be used to claim a fire's origin.
- CAP polygons, if stored later, come from the official CAP XML. Do not digitize them from a screenshot.

## Workflow

1. Read `HotspotMap.jsx`, `src/lib/geo.js`, and the active layer control before editing.
2. Keep hash routing. Do not introduce `react-router` or a path that breaks relative Pages assets.
3. Preserve popup fields already shown: time, satellite, confidence class, FRP when present, and the sample flag.
4. Filter by the province name on the row. Rows marked **Belum terpetakan** stay out of a named province and out of the prototype warning list.
5. Run `npm run check`. For a visible map change, load the preview and confirm Indonesia is framed, the layer toggle does not turn every layer on, and an empty selection still shows the national frame.

## Verification

- Sample self-check counts stay intact.
- No new dependency is required to pan the existing map.
- A point without an official name is visible as unplaced, not quietly dropped into a neighboring province.
