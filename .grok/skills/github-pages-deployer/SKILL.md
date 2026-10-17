---
name: github-pages-deployer
description: Deploy or debug the static Karhutla site on GitHub Pages. Use when editing workflows, Vite base path, dist contents, Actions secrets, or a failed Pages job.
---

# GitHub Pages deployer

The site is public and static. Pages source is GitHub Actions. Live URL after merge to `main`: `https://rixaga.github.io/karhutla-dashboard/`. Do not enable Pages, change visibility, or force-push as part of a normal change.

## When to use

- `.github/workflows/pages.yml` or `refresh-data.yml` changes.
- Assets 404 under `/karhutla-dashboard/`.
- A secret, base path, or artifact upload is in question.
- The scheduled job should commit data or deploy.

## Workflows

`pages.yml` builds on pull requests and deploys on push to `main` (and `workflow_dispatch`). It uses `actions/configure-pages`, Node 20, `npm ci`, `npm run check`, `npm run build` with `VITE_BASE_PATH`, `scripts/verify-pages-build.mjs`, `upload-pages-artifact`, and `deploy-pages`.

`refresh-data.yml` runs on cron `0 */3 * * *` UTC and `workflow_dispatch`. It fetches in Actions, commits `data/live` and `data/static` only when data changed, and deploys only when that commit is on `main`. Concurrency group `pages` with `cancel-in-progress: false`, shared with the Pages workflow. `GITHUB_TOKEN` pushes do not trigger other workflows, so the refresh workflow itself deploys when data changed. Git user for the bot commit: `github-actions[bot]`. Branch protection may block that token; say so in the README instead of weakening protection.

`VITE_BASE_PATH` comes from `configure-pages` (`/karhutla-dashboard/` with a trailing slash). Local builds without the variable use relative `./`. CSV and JSON paths must not start with `/`.

## Secrets

- Name: `FIRMS_MAP_KEY`. Place: repository **Settings → Secrets and variables → Actions → New repository secret**.
- The user registers it at `https://firms.modaps.eosdis.nasa.gov/api/map_key/`. Never ask them to paste the key into chat, a file, or a log.
- The workflow passes it only to the fetch script. The script redacts it from errors. The published JSON has no key.
- Build and the site must succeed when the secret is absent.

## Diagnostics

1. Confirm the job that failed (PR build, main deploy, or refresh) before changing a workflow.
2. A 404 on `/assets/...` usually means the base path was absolute `/` instead of `/karhutla-dashboard/`. `verify-pages-build.mjs` checks the prefix and that `config.json` has an empty `mapKey`.
3. A 404 on data means `data/` was not copied to `dist/data`. Vite's closeBundle copies it.
4. Hash routes (`#/`, `#/peta`, `#/logika`, `#/sumber`, `#/glosarium`, `#/banjir`, `#/gunung-api`) are required. Do not add a `404.html` rewrite that the project does not already use unless Pages actually needs it, and do not switch to history routing.
5. Do not print the secret in a step `run:` script. Do not `echo` the env var.

## Workflow

1. Edit the workflow in the same PR as the code it deploys.
2. Run `npm run check` and `npm run build` locally.
3. Search `dist/` for `MAP_KEY`, `eyJ`, and any key that appeared in the task. There should be no match except the empty `mapKey` field and documentation that tells the reader not to commit one.
4. Open the PR against `main`. Do not deploy from a feature branch except through the existing `workflow_dispatch` behavior.

## Verification

- Pull-request workflow builds.
- `dist/config.json` has `"mapKey": ""`.
- Cron string in the workflow matches `src/lib/schedule.js`.
