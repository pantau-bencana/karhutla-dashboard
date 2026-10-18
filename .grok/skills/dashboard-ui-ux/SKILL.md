---
name: dashboard-ui-ux
description: Change the Karhutla dashboard interface, layout, navigation, or copy. Use for React pages, KPI cards, charts, accessibility, Bahasa Indonesia wording, and the hazard tabs.
---

# Dashboard UI

The UI is React 18, Vite 6, Leaflet, and Recharts 2. Hash routes only, because GitHub Pages serves the site from `/karhutla-dashboard/`. Bahasa Indonesia for leaders: short summary, detail on demand. Footer sentence stays exact: `Prototipe internal Dit. PD BNPB. Jangan dipublikasikan tanpa persetujuan.`

## When to use

- Pages, navigation, cards, tables, charts, badges, or glossary links change.
- A hazard tab (Karhutla, Banjir, Gunung Api) is added or the empty states are edited.
- Copy might over-claim that sample data, a prototype score, or a forecast is official.

## Information architecture

Karhutla is the built hazard. Its pages:

1. **Ringkasan Pimpinan** — last update, source status counts, national map only when the hotspot feed is not sample data, attention list only from non-sample feeds, week trend only when a real archive exists, and the 14-day ranking structure.
2. **Peta dan Data** — filters and one active layer at a time (hotspot, inaRISK, IRBI, smoke, FDRS, rain, wind, Kualitas Udara (ISPU)). There is no ISPU module in the main navigation and no Prediksi control on that layer. A selected province shows area, period, update time, source, role, and limitation.
3. **Logika Pemantauan** — indicator table plus the eight-step flow.
4. **Sumber Data** — one row per source with the honest status set.
5. **Glosarium** — shared across hazards, searchable, alphabetical. Links use `#/glosarium/{id}` because the route is already a hash.

Gunung Api stays a skeleton: the same tab strip, then one placeholder. Status text **Belum terhubung / menunggu data**. List planned indicators and sources. No map, no invented numbers, no sample data presented as live. Banjir has an internal prototype for Aceh and Bengkulu only: an inaRISK flood-risk map and a 33-row IRBI/DIBI matrix. Every inaRISK or IRBI element carries **Prototipe internal – menunggu izin tertulis BNPB**. Do not turn that into an official warning, a priority rank, or a forecast.

Hazard tabs must be data-driven from one config list so a later hazard does not require a new router.

## Presentation rules

- Every card or chart that shows a dataset also shows fetch time in WIB and the source's own observation or publication time, plus a badge: **Realtime / mendekati realtime**, **Berkala (tiap X jam)**, **Harian**, **Tahunan / statis**, **Estimasi**, or **Contoh**. If older than the expected frequency, show **Data tertunda** and the age.
- Header on every page: **Terakhir diperbarui** and **Pembaruan berikutnya** in WIB. The browser may recheck the manifest about every 15 minutes without resetting filters or jumping to the top.
- Status pills use **Aktif**, **Data statis**, **Snapshot/arsip**, **Tautan saja**, **Belum terhubung**, **Gagal/stale**. Comparison layers use exactly **Pembanding (data terbuka, bukan resmi)**.
- Prototype levels Normal / Waspada / Siaga / Awas stay on Peta dan Data, labeled as a prototype indicator. They are not the executive attention list while inputs are sample data. Disclose formula, weights, thresholds, and period.
- The 14-day kabupaten list is a structure, not a ranking, until BMKG publishes FDRS or karhutla potential per kabupaten. Status: **menunggu data resmi BMKG (FDRS/potensi karhutla per kab/kota)**. Do not build it from forecast images. IRBI 2025 may appear beside it only as annual static context, labeled with the year, never as a 14-day forecast.
- BMKG figures say **Sumber: BMKG**. Do not crop official images or drop the logo. Prefer a link.
- Glossary terms in prose use a link or tooltip to `#/glosarium/{id}`. Do not invent definitions.
- Do not put `mapKey` in a component. The Logika page must still contain the phrase `rencana pengembangan` and must not contain the substring `mapKey`.

## Workflow

1. Read `src/App.jsx`, `src/components/SiteHeader.jsx`, and `src/styles.css` before adding a page.
2. Reuse existing classes (`card`, `banner`, `status-pill`, `button`, `flow`). Add a class only when none fits.
3. Keep the page usable at a narrow width: stack the flow and the header the way the existing media queries do.
4. After a visible change, run the preview and exercise the changed path (filters, layer, glossary search, hazard tab), not only a screenshot.

## Verification

- `npm run check` still finds **Logika Pemantauan** in the header and the disclaimer in the footer.
- Sample data is visibly **Data contoh** or absent from Ringkasan.
- Banjir and Gunung Api show no fabricated counts.
