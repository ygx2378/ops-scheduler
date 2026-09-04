# Scheduled Automation Jobs

This public repository contains production GitHub Actions workflow definitions.
Each workflow checks out a private source repository at runtime; application
source code, generated data, resource identifiers, and credentials do not belong
in this repository.

## Repository boundary

- This repository owns active schedules and manual workflow entry points.
- The private source repository owns application code, migrations, scripts,
  configuration, and generated build inputs.
- Source checkout always uses `SOURCE_REPOSITORY` and
  `SOURCE_REPOSITORY_TOKEN`.
- Production D1, R2, and Cloudflare identifiers are repository secrets and must
  not be hardcoded in workflow files or logs.
- Private-source copies of these workflows stay disabled to prevent duplicate
  jobs and double writes.

## Active jobs

| Workflow | UTC schedule | Purpose |
| --- | --- | --- |
| Apple App Store price monitor | hourly at `:15` and `:45` | Low-rate sentinel checks and one regional fanout slice |
| Publish static per-App price assets | hourly at `:35`, weekly cycle Sunday `04:15` UTC | Publish the immutable local release, then apply due official D1 events without a cold-price D1 import |
| Discover new Apple apps | daily `03:17` | Discover new apps from selected Apple charts |
| Drain crawl jobs backlog | daily `08:17` | Process a bounded Apple Lookup backlog |
| Refresh purchase channel offers | daily `01:20` | Refresh enabled purchase-channel offers |
| Refresh static region pages | monthly at `03:27` UTC | Download region snapshots from R2; update pages and sitemap only when region data changes |
| Verify private source checkout | manual only | Validate private source access without deploying |

## Local catalog refreshes

Complete appstoreprice collection and full R2 refreshes run on the independent
local collector, not on GitHub-hosted runners:

- Local SQLite keeps the complete cold catalog and regional prices.
- Production D1 keeps hot-500 and Apple-official current prices plus lightweight
  identity, queue, and ranking data.
- R2 v1 stores the complete app index, paged catalog, categories, regions, and
  rankings generated from local SQLite.
- R2 v2 stores complete per-App product and regional price details generated
  from local SQLite; runtime D1 values override hot/official prices.

The repository keeps disabled manual copies of the old appstoreprice and monthly
full-snapshot workflows only as guardrails and historical reference. They must
not be scheduled or enabled without a complete local SQLite source.

## Required repository secrets

- `SOURCE_REPOSITORY`: `owner/repository` of the private source repository
- `SOURCE_REPOSITORY_TOKEN`: fine-grained token with Contents read/write access
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CATALOG_D1_DATABASE`
- `CATALOG_R2_BUCKET`
- `PRICE_ASSETS_ARCHIVE_BUCKET`
- `PRICE_ASSETS_WORKER_NAME`
- `PRICE_ASSETS_PUBLIC_URL`

Optional discovery-email secrets:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `MAIL_TO`

Only scheduled and manual triggers are enabled. Pull requests must never receive
production secrets.

## Failure behavior

- A monitor run with no confirmed price change is a successful no-op.
- A publisher run whose immutable release is already live skips the full download/deploy, then checks for due official event batches.
- A changed release is downloaded from the private R2 archive, verified by per-chunk and archive SHA-256, then published and read back through the public Worker.
- A claimed official event batch is exported from the compact hot/official D1 rows, applied only to the affected App files, archived under a new immutable release, published and read back. Successful readback completes the batch; any later failure requeues it.
- A failed static-price publish does not confirm D1 event state; the same immutable release or event batch remains available for the next retry.
- A failed regional fanout slice is requeued with its cursor preserved.
- The local collector owns complete SQLite-to-R2 archive creation and the main
  site `cf:release` page-sync gate; this public workflow owns only static price
  Worker activation.
- Workflow commits may include controlled generated build inputs only. R2
  snapshot directories ignored by the private source repository must not be
  force-added.
