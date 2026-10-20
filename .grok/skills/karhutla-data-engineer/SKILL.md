---
name: karhutla-data-engineer
description: Integrate, normalize, and snapshot public data for the Karhutla dashboard. Use when adding or changing fetch jobs, data/live, the manifest, FIRMS, BMKG, BNPB, timestamps, fallbacks, or CSV/JSON contracts.
---

# Karhutla data engineer

Stack this skill assumes: Vite static site, no application server. Scheduled GitHub Actions fetches server-side into `data/live/` plus a manifest. The browser reads those files first and falls back per dataset. Do not add a paid API, a CORS proxy, or a backend.

## When to use

- A dataset is added, refreshed, or its status changes.
- `scripts/refresh-live-data.mjs`, `.github/workflows/refresh-data.yml`, or `src/lib/loadData.js` is touched.
- Someone asks to connect FIRMS, BMKG, SiPongi, inaRISK, IRBI, ISPU, DIBI, or a comparison layer.

## Architecture

- Crons in `refresh-data.yml` are `17 */3 * * *` and `47 1-23/3 * * *` UTC. Keep them equal to `REFRESH_CRON` and `REFRESH_CRON_CADANGAN` in `src/lib/schedule.js`. Display the sooner next run in WIB (Asia/Jakarta, UTC+7). Do not move either cron back to minute 0; GitHub can drop a schedule without creating a run.
- `refresh-watchdog.yml` cron is `7 * * * *`. It dispatches `refresh-data.yml` only when the live manifest is older than 4 hours and no refresh run is already active. It also dispatches `refresh-cap.yml` when that workflow has no run newer than `CAP_WATCH_MINUTES` in `src/lib/schedule.js`. It uses `actions: write` and its own concurrency group, not `pages`.
- After `git pull --rebase` or `git reset --hard`, the refresh and CAP workflows run `npm ci` again before `npm run build`. A rebase onto `main` can add a dependency the first install did not have.
- The commit step must `git fetch` and `git pull --rebase` before push, retry when the push is rejected, and regenerate the snapshot if rebase conflicts. Never force-push. Push the checked-out branch, not `main`, when the dispatch is on another branch.
- A data commit by `github-actions[bot]` does not trigger `pages.yml`. Keep the `deploy-pages` job inside `refresh-data.yml`.
- Concurrency group `pages` uses `cancel-in-progress: false` and `queue: max`.
- Log `wilayah_gagal` and `big_queries` in the workflow output. `big_queries` is the BIG MapServer query count on that refresh.
- Commit `data/live` only when material fields change (status, content hash, record count, error, observed time, file, kept_previous, mode). On failure, keep the last good file.
- `public/config.json` datasets that the self-check owns stay the five sample ids (`hotspot`, `sipongi`, `irbi`, `bmkg`, `ispu`) with `contoh: true` until a real snapshot replaces that feed at read time. Extra feeds (forecast, comparison, CAP, DIBI) come from the manifest, not from new sample rows.
- Secret `FIRMS_MAP_KEY` exists only as a GitHub Actions secret. Never write it to source, `public/config.json`, the bundle, logs, the manifest, or a pull request. `firms_key` in the manifest is `used` or `absent`.

## Workflow

1. Confirm the product has an official documented API or download. If it does not, leave status **Tautan saja** and a real URL. Do not guess endpoints, scrape HTML, or reuse a token found in a website bundle.
2. Fetch server-side with a neutral User-Agent such as `curl/8.5.0` for BMKG. A browser-like User-Agent has returned HTTP 403 on `api.bmkg.go.id`.
3. Normalize to CSV or JSON under `data/live/` (static publications may live in `data/static/`). Store `fetched_at`, `observed_at` or `source_updated_at`, `observed_label`, `update_type`, `expected_max_age_hours`, record count, status `ok` or `failed`, and `kept_previous` when the previous file is retained.
4. Map snake_case manifest fields to the feed the UI already understands. Do not invent missing days, images, or kabupaten names.
5. If `FIRMS_MAP_KEY` is absent, do not call the area API and do not mark hotspot **Aktif**. The public UI does not show the sample file. Missing official feeds are **Tautan saja** or **Tidak tersedia**. With the key, use the documented area API (`VIIRS_SNPP_NRT`, at most 5 days, Indonesia frame). Province stays `Belum terpetakan` until an official boundary file exists. Hotspot rows are satellite detections, not confirmed fires.
6. Re-run `node scripts/refresh-live-data.mjs` without a key in the environment, then `npm run check`.

## Allowed sources (verified 17 Oct 2026)

Integrate now, no key, attribute **Sumber: BMKG** on BMKG products:

- Prakiraan cuaca: `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4={kode Kemendagri}`. JSON, 3 days, 3-hour steps, includes `ws` and `wd`, updated twice daily, 60 requests/minute/IP. Docs: `https://data.bmkg.go.id/prakiraan-cuaca/`. Use one documented representative kelurahan per priority province, not a silent province aggregate. Horizon label is **3 hari**. This is wind, humidity, and rain-slot context. It is not FDRS and not a 14-day karhutla potential.
- Peringatan dini cuaca CAP (optional context): RSS `https://www.bmkg.go.id/alerts/nowcast/id`, then each `{kode}_alert.xml`. Reference: `https://github.com/infoBMKG/data-cap`. Do not scrape the HTML nowcast page.

BNPB, no key:

- DIBI compilation via CKAN: `https://data.bnpb.go.id/api/3/action/package_show?id=data-bencana-indonesia` (ODC-BY). Datastore search works when the XLSX download returns Cloudflare 403. The national "jenis bencana" table includes `KEBAKARAN HUTAN DAN LAHAN` for 2010–2024. Province and kabupaten tables in that package are all-hazard totals. Do not filter them into karhutla counts. Store the national karhutla series as dated static/periodic data and say so.
- Checked 20 Oct 2026, public CKAN only, no login: there is no kabupaten/kota BANJIR count series for 2011–2025. Resource `21044ffd-c397-4b3c-acbd-5adaa03d79e3` is 510 all-hazard year totals. Packages `jumlah-kejadian-dan-dampak-bencana-tahun-2010` through `2023` link public Google Drive folders of `stat_by_wil_{provinsi}_{tahun}.xlsx`; Aceh 2011 and Aceh 2023 are one sheet titled Jumlah Kejadian with no BANJIR column. The only BANJIR-by-kabupaten column is 2024, resources `a4daec53-1119-43ef-b05e-00ec3a4c42a4` and `5ff9f41f-8312-4b7c-aa18-fdbedac6ee7e` (451 rows each). The 2025 compilation is province-level. `dibi.bnpb.go.id` timed out. `satudata.bnpb.go.id` has no DNS address. Do not sum those all-hazard columns into banjir counts. When the 2024 cuplikan is absent, Historis stays `Cuplikan DIBI belum tersedia`.
- Klasifikasi DAS KLHK MapServer: `https://gis.bnpb.go.id/server/rest/services/inarisk/Klasifikasi_DAS_KLHK/MapServer`. Fail-safe and only for a future Banjir tab. A timeout must not fail the Karhutla job.

Link only (no scrape, no crop, no invented series):

- SPARTAN / FDRS images, observation plus forecast H+0 through H+7, not 10 or 14 days. Example pattern `https://dataweb.bmkg.go.id/cuaca/spartan/36_indonesia_fwi_00.png` through `07`. Portal `https://spartan.bmkg.go.id/` and `https://www.bmkg.go.id/cuaca/karhutla`. Status **Tautan saja**. Horizon text: **hingga H+7 sesuai produk BMKG**. Linking is preferred over embedding.
- Dasarian rain images (3 dasarian): `https://www.bmkg.go.id/iklim/prediksi-hujan-dasarian`.
- High-rainfall early warning (image and HTML): `https://www.bmkg.go.id/iklim/peringatan-dini-hujan-tinggi`.
- Smoke image `https://inderaja.bmkg.go.id/Trajektori/Asap.png`. Archive code may exist but stays off unless `bmkg.arsipCitra` is explicitly true. Default status: **Tautan saja – menunggu izin BMKG**.
- Extreme-weather HTML: `https://www.bmkg.go.id/cuaca/potensi-cuaca-ekstrem`. Weekly rain narrative: `https://www.bmkg.go.id/cuaca/potensi-hujan-sepekan`.
- MAGMA activity: `https://magma.esdm.go.id/`. No documented public API. Do not call a third-party Magma scraper.

Open comparison layers stay separate, with badge **Pembanding (data terbuka, bukan resmi)**, provider, license, method, fetch time, and data time. They never enter the prototype warning score. Open-Meteo is not a substitute for BMKG or ISPU. The Banjir rainfall comparison uses Open-Meteo `models=ecmwf_ifs025`, daily `precipitation_sum`, label `prakiraan model ECMWF (via Open-Meteo), bukan BMKG`, license CC BY 4.0. It appears only on Hari ini, Besok, and Lusa. The 0–3 jam tab stays BMKG CAP and does not show this model. It must not set Awas, Siaga, or Waspada. A successful CAP snapshot whose meta has `status: ok` and no `cakupan` field is national coverage: kabupaten without a warning stay grey, not hatched. CAMS may appear inside Kualitas Udara only with the label `Model kualitas udara CAMS — pembanding, bukan pengukuran stasiun dan bukan ISPU KemenLH`, in µg/m³, as a model rather than a station. Do not add an ISPU forecast or a Prediksi tab.

## BMKG terms (updated 8 Jul 2026)

- Machine retrieval uses the official API (Pasal 4e). Scraping the web UI is forbidden (8a).
- Putting BMKG data into a third-party app needs written permission (9c). The public forecast API may be called as documented; say that written permission for broader integration is still absent. Ask via PTSP / Biro Hukum, Humas, dan Kerja Sama: `https://ptsp.bmkg.go.id/`.
- Images stay whole, uncropped, logo intact (8c–d, 9b). Always show **Sumber: BMKG**.

## Status vocabulary

Use only: **Aktif**, **Data statis**, **Snapshot/arsip**, **Tautan saja**, **Belum terhubung**, **Gagal/stale**. Smoke that is waiting on permission uses **Tautan saja – menunggu izin BMKG**. The 14-day kabupaten ranking is not computed. Its status is **menunggu data resmi BMKG (FDRS/potensi karhutla per kab/kota)**.

## Verification

- `npm run check` passes, including the sample counts when `data/live` is not injected into that test.
- Manifest and `dist/` contain no API key, no `eyJ` token, and no raw `FIRMS_MAP_KEY` value.
- A failed source keeps the previous file and surfaces the error without filling gaps.
- Every stored dataset has fetch time and the source's own observation or publication time.
