---
name: dashboard-qa
description: Test the Karhutla dashboard for data regressions, failed feeds, filters, maps, and copy that over-claims. Use before finishing a change to src, scripts, or workflows.
---

# Dashboard QA

The automated gate is `npm run check` (`scripts/self-check.mjs`). It loads sample CSV from disk and does not need a browser. UI changes also need a browser or `npm run preview` pass. No paid test service.

## When to use

- Before committing app code.
- A filter, route, map, chart, or manifest loader changed.
- A source starts failing and the fallback must be proved.

## Always-on assertions

Do not weaken these to make a new feature pass:

- Disclaimer string in the footer, README, and `public/config.json`.
- `firms.mapKey` is empty.
- Sample datasets stay `contoh: true` and include `DATA CONTOH`.
- Last seven sample days: 158 hotspots; Riau Awas; the other province statuses named in the self-check; ISPU 112 Tidak Sehat Pekanbaru on 2026-10-16; one-day count 19.
- FIRMS rows normalized without a province column are **Belum terpetakan**, not a box guess. High confidence still classifies numeric 80 as tinggi.
- `parseRoute` unknown hashes resolve to the executive page, not a blank app. Legacy `#/logika` still opens Logika.
- Logic page source contains `rencana pengembangan`, does not contain `mapKey`, and the header contains `Logika Pemantauan`.
- Indonesia frame contains the FIRMS area and the pan limit contains the frame.
- HTML bodies are rejected as CSV.

When `data/live` or `data/static` exist in the working tree, the self-check's fake fetch must 404 those paths so the sample assertions still measure the sample files. Add a separate assertion if the manifest itself must be checked.

## Failure drills

- FIRMS key absent: hotspot feed is sample, status **Belum terhubung**, not **Aktif**.
- FIRMS request throws: sample fallback, status cadangan, error mentions the failure, key not present in `urlTampil`.
- One dataset 404s: that feed is `gagal`, other feeds still load.
- Manifest source fails: previous snapshot remains, UI shows **Gagal/stale** and the age. Do not synthesize the missing interval.
- Comparison feed failure does not change prototype warning levels.

## UI pass

Use `npm run preview` on `127.0.0.1:4173` after `npm run build`. Exercise the changed flow:

- Hazard tabs: Karhutla renders the real pages; Banjir and Gunung Api render the placeholder only.
- Province filter and date filter, including a reversed range.
- Layer control does not enable every layer at once.
- Glossary search and `#/glosarium/ispu`.
- A sample banner does not read like an operational detection.
- WIB lines are present. Reloading the manifest does not clear the date filter.

If no browser is available, say what was checked with `npm run check` and what was not clicked.

## Workflow

1. Run `npm run check`. Fix the code or, when the behavior change is intentional, update the assertion and say why.
2. Run `npm run build` and `node scripts/verify-pages-build.mjs` if the script is the one the Pages job uses.
3. For a UI change, preview the affected routes at desktop width and, if layout changed, a narrow width.
4. Search the diff for secrets before committing.

## Verification

- `npm run check` exits 0.
- The new test fails if the honest status or the sample count regresses.
- Preview notes are specific (which route, which control), not "looks fine".
