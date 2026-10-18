---
name: fire-risk-analyst
description: Interpret hotspots, weather, and fire danger for the Karhutla dashboard without presenting a prototype score as an official warning. Use for trends, thresholds, FDRS, the attention list, and the 14-day kabupaten ranking.
---

# Fire risk analyst

The dashboard supports situational awareness for leaders. It does not issue an official BNPB or BMKG warning and it does not predict tomorrow's fire points.

## When to use

- Warning levels, thresholds, trends, or the attention list change.
- Someone wants a 14-day kabupaten ranking, an FWI calculation, or a combined risk score.
- Copy describes hotspot counts, drought, rain, or smoke as a forecast of fire.

## What the numbers mean

- A hotspot (titik panas) is a satellite detection. It is not a confirmed fire (titik api) and not a field-verified incident. Confidence (`low` / `nominal` / `high`, or a MODIS number) is a detection quality flag. The code treats text `h` / `high` / `tinggi` or a number ≥ 80 as high confidence. That rule is a prototype grouping, not a NASA decree to put in the glossary as law.
- The prototype province status is the higher of two levels: hotspot count versus thresholds 8 / 20 / 45, and maximum FWI versus 6 / 13 / 21, over the selected date range. Say the formula, the thresholds, and the period next to the table. Call it a prototype indicator. Do not show it as the Ringkasan attention list while those inputs are sample rows.
- Attention reasons must be traceable and visible, for example "ada hotspot terdeteksi" or "bahaya dasar tinggi", and only from feeds that are not sample data. No hidden score and no automatic operational recommendation.
- Week-long hotspot or ISPU charts appear only when a real non-sample archive exists. Missing days stay missing.
- BMKG open forecast is 3 days at 3-hour steps for one representative kelurahan per priority province. Rain in that feed is the API field `tp` for the slot, not a probability in percent and not a 10-day or 14-day total. Wind is `wd` plus `ws` in km/h as documented by BMKG. Do not convert that forecast into FWI.
- SPARTAN FDRS images, when shown as links, cover observation plus H+0 through H+7. Write **hingga H+7 sesuai produk BMKG**. Do not stretch the horizon to 10 or 14 days and do not digitize a PNG into a table.
- Dasarian products are three periods of about ten days in a month (1–10, 11–20, 21–end). They are not a rolling 14-day daily forecast. Link them; do not scrape them.
- IRBI 2025 karhutla scores are an annual index from the official book (pages 294–307, 467 kabupaten/kota). They do not follow the date filter and they are not a forecast.
- Historical DIBI counts that this project can filter to kebakaran hutan dan lahan are national, 2010–2024. Do not rank kabupaten from the all-hazard kabupaten table.

## 14-day ranking

The requested product is a list of 15–20 kabupaten/kota for the next 14 days using BMKG fire danger and karhutla potential, overlaid with inaRISK and historical incidents. No official BMKG data product for that ranking was verified. Keep the structure and set the status to **menunggu data resmi BMKG (FDRS/potensi karhutla per kab/kota)**. Do not fill it from the 3-day forecast, from Open-Meteo, or from images. Weights, thresholds, and period stay unpublished until they are agreed, and any future formula must be printed next to the list.

Open comparison series (Open-Meteo rain, humidity, wind) may sit beside an official gap. Badge **Pembanding (data terbuka, bukan resmi)**. They are not fire danger. CAMS PM2.5 is not shown inside Kualitas Udara (ISPU) and is not converted into an ISPU category.

## Workflow

1. Read `src/lib/derive.js` and `src/lib/warning.js` before changing a threshold. Update `public/config.json` and the self-check together if a sample expectation changes. Prefer not to change the sample formula.
2. If a new composite is unavoidable, document formula, weights, thresholds, period, and the sentence that it is a prototype indicator, not an official warning.
3. Keep sample assertions: last seven sample days 2026-10-10 through 2026-10-16 contain 158 hotspots, with the province statuses the self-check already names.

## Verification

- Ringkasan does not list sample provinces as areas that need attention.
- No control says "hotspot besok" or draws predicted fire points.
- FDRS copy says H+7 when it talks about the SPARTAN horizon, and 3 hari when it talks about the open forecast API.
