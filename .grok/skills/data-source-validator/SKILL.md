---
name: data-source-validator
description: Check provenance, freshness, licenses, and honest status before a Karhutla dataset is shown as connected. Use when adding a source, reviewing a manifest, or deciding between live, static, snapshot, and link-only.
---

# Data source validator

Prefer a gap with an official link over a substitute that looks official. An open dataset may appear only as a comparison layer.

## When to use

- A pull request adds or relabels a source.
- A feed is empty, late, duplicated, or secretly sample data.
- Someone proposes a token found in a public JavaScript bundle, a scraped table, or an undocumented path.

## Status set

Assign one status and do not soften it in the UI:

| Status | When |
| --- | --- |
| Aktif | The last scheduled fetch succeeded and the file in the manifest is what the page shows. |
| Data statis | An official publication stored in the repo, not refetched as if it were live. Example: IRBI 2025 table. |
| Snapshot/arsip | A dated copy. Missing dates are listed, not invented. |
| Tautan saja | Official page or file exists, but there is no documented API or download that this repo is allowed to pull. |
| Belum terhubung | Nothing is loaded, or a required secret is absent (FIRMS without `FIRMS_MAP_KEY`). |
| Gagal/stale | The last fetch failed. Show the previous file if one exists, with the failure and the age. |

Smoke images waiting on BMKG's written permission: **Tautan saja – menunggu izin BMKG**.

## Checks

1. **Identity.** Instansi, product name, official URL, access type (API, unduhan, layanan peta/GIS, data statis, tautan portal), and whether a key is required.
2. **License and attribution.** BMKG text and numbers that we are allowed to call: **Sumber: BMKG**. IRBI quoted from the 2025 book without changing scores. DIBI compilation: ODC-BY, cite BNPB Satu Data. Open-Meteo: CC BY 4.0. CAMS for the air-quality comparison: Copernicus. NASA FIRMS: cite NASA FIRMS.
3. **Time.** Fetch time (WIB) and the source's own time (satellite pass, `analysis_date`, bulletin time, IRBI year, DIBI edition). If the age exceeds the expected frequency, the badge is **Data tertunda**.
4. **Completeness.** Record count matches the file. Duplicate hotspot detections are not deleted silently; if a later rule drops duplicates, record the rule. Missing smoke mornings and missing ISPU days stay empty.
5. **Horizon.** 3 days for the open forecast. H+0..H+7 for SPARTAN images. Dasarian is not 14 rolling days. CAP is nowcast context, not a seasonal outlook.
6. **Secrets.** Reject `mapKey` in `public/`, `src/` components, logs, and commits. Reject ISPU or SPARTAN bearer tokens copied from page source. Reject the third-party Magma scraper.
7. **Comparison.** Badge text is exactly **Pembanding (data terbuka, bukan resmi)**. The official row remains, with its real status, and the comparison is nested under it.

## Verified decisions (17 Oct 2026)

Do not reopen these without a new official document:

- SiPongi+ (`https://sipongi.gakkum.kehutanan.go.id/`) is a portal, not an API. **Tautan saja**. The old menlhk host does not resolve.
- Official ISPU (`https://ispu.kemenlh.go.id/app/`) has no documented public API. Do not use a bearer token from the bundle. Breakpoints for an estimated comparison come from Permen LHK No. 14 Tahun 2020 and must be labeled perkiraan, not KLH ISPU.
- inaRISK portal and the karhutla ImageServer stay **Tautan saja** until a non-raster table or an approved overlay exists.
- `datacuaca.bmkg.go.id` behind a Cloudflare challenge is not a usable API.
- MAGMA `https://magma.esdm.go.id/` is **Tautan saja**. Paths `/api`, `/docs`, and `/rss` are not a documented feed. Volcano levels need a letter to PVMBG / Badan Geologi through `https://ppid.esdm.go.id/`.
- A 14-day kab/kota karhutla ranking has no verified BMKG product. Status **menunggu data resmi BMKG (FDRS/potensi karhutla per kab/kota)**. Permission request: `https://ptsp.bmkg.go.id/`.

## Workflow

1. Read the manifest entry and the file it points at. Do not trust the label alone.
2. If a URL is cited, it must have been requested and returned a real document or a deliberate link-only status. Do not invent a 200.
3. Put the limitation in the Sumber Data row in plain Indonesian: what must not be concluded.
4. Run the refresh once without `FIRMS_MAP_KEY` and confirm hotspot stays failed/absent rather than **Aktif**.

## Verification

- Setiap baris Sumber Data punya instansi, tautan, jenis akses, status, waktu, dan keterbatasan.
- Sample CSV masih berisi `DATA CONTOH` dan tidak dipakai sebagai deteksi di Ringkasan.
- Tidak ada kunci di `git grep` pada sumber, manifes, dan `dist/`.
