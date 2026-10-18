---
name: indonesia-geodata
description: Handle Indonesian places, Kemendagri codes, time zones, and aggregation for the Karhutla dashboard. Use when joining provinsi or kabupaten, formatting WIB, or choosing a BMKG adm4 code.
---

# Indonesia geodata

Join places on official names and codes. Do not invent a boundary from a latitude box.

## When to use

- A province or kabupaten name is normalized, filtered, or aggregated.
- A BMKG `adm4` code is added.
- Times are formatted, a dasarian is described, or WITA/WIT is relevant.
- IRBI, DIBI, or a future boundary file is matched to the six priority provinces.

## Places

Priority provinces, spelled this way in `public/config.json`: Riau, Jambi, Sumatera Selatan, Kalimantan Barat, Kalimantan Tengah, Kalimantan Selatan.

Representative kelurahan already checked against the BMKG forecast API (Kemendagri code, then the name the API returned):

| Provinsi | adm4 | Kelurahan, kecamatan, kota |
| --- | --- | --- |
| Riau | 14.71.05.1001 | Padang Bulan, Senapelan, Kota Pekanbaru |
| Jambi | 15.71.01.1001 | Simpang IV Sipin, Telanaipura, Kota Jambi |
| Sumatera Selatan | 16.71.01.1001 | Tiga-puluh-lima Ilir, Ilir Barat Dua, Kota Palembang |
| Kalimantan Barat | 61.71.05.1001 | Sungaibangkong, Pontianak Kota, Kota Pontianak |
| Kalimantan Tengah | 62.71.01.1001 | Pahandut, Pahandut, Kota Palangkaraya |
| Kalimantan Selatan | 63.71.01.1001 | Mantuil, Banjarmasin Selatan, Kota Banjarmasin |

These are point samples for the 3-day forecast, not province averages. Document that next to the numbers. Code `14.71.01.1001` returns 404; do not reuse it. New codes must be requested once and the response name stored. Do not guess a code from a list that was not checked.

`src/lib/geo.js` boxes are not kabupaten boundaries. `assignProvince` may remain for unit tests. `normalizeHotspotRow` must not call it. Unnamed detections are **Belum terpetakan**.

IRBI names come from the 2025 book. Do not retitle a kabupaten to force a join. Component scores that the book page does not include stay blank.

DIBI kabupaten rows in the Satu Data compilation are all-hazard counts. Do not aggregate them into "kejadian karhutla per kabupaten". The national series for jenis `KEBAKARAN HUTAN DAN LAHAN` is the series that may be stored.

## Time

- Display clock times in WIB, `Asia/Jakarta`, UTC+7, no daylight saving. Suffix the formatted string with ` WIB`.
- Keep the source clock as published. FIRMS acquisition times in the file are UTC until a label converts them. BMKG `local_datetime` is the local time in the API. Kalsel local times can fall on a different calendar date from WIB because that province is WITA (UTC+8); do not rewrite them to WIB and still call them local.
- `analysis_date` from BMKG is UTC without a `Z`. Append `Z` once.
- Schedule display: cron `17 */3 * * *` UTC is 07:17, 10:17, 13:17, 16:17, 19:17, 22:17, 01:17, and 04:17 WIB. Do not move it back to minute 0.
- Dasarian means the BMKG climate periods (dates 1–10, 11–20, and 21 through the end of the month), not "the next 14 days".

## Workflow

1. Search the row's own `provinsi` / `kabupaten` fields before any spatial join.
2. If an official boundary file is still absent, stop and mark the row unplaced. Do not expand the box list to "improve" placement.
3. Format with `formatWib` in `src/lib/format.js` rather than a one-off `toLocaleString` that forgets the zone.
4. Add a self-check when a new code or a new unplaced-province rule is introduced.

## Verification

- A FIRMS CSV without province names does not become Riau, Kalteng, or Lainnya via coordinates.
- Forecast cards name the kelurahan and say the horizon is 3 hari.
- Two clocks are visible: when we fetched, and when the source observed or published.
