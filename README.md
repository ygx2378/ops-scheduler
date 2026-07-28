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
| Publish verified App Store price updates | hourly at `:05`; Saturday `19:30` cycle | Publish eligible price events, deploy, and prewarm |
| Discover new Apple apps | daily `03:17` | Discover new apps from selected Apple charts |
| Drain crawl jobs backlog | daily `08:17` | Process a bounded Apple Lookup backlog |
| Sync appstoreprice data | Monday `03:47`; daily `14:17` | Best-effort pool discovery and a small detail batch |
| Monthly full snapshots and sitemap | day 1 at `03:30` | Full R2/static refresh and deployment |
| Refresh purchase channel offers | daily `01:20` | Refresh enabled purchase-channel offers |
| Verify private source checkout | manual only | Validate private source access without deploying |

The appstoreprice job is a small best-effort supplement. Bulk refreshes remain a
local SQLite operation followed by an incremental D1 upsert.

## Required repository secrets

- `SOURCE_REPOSITORY`: `owner/repository` of the private source repository
- `SOURCE_REPOSITORY_TOKEN`: fine-grained token with Contents read/write access
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CATALOG_D1_DATABASE`
- `CATALOG_R2_BUCKET`

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
- A publisher run with no eligible event skips R2 refresh, build, and deploy.
- A failed publish batch is returned to `pending`; it is not discarded.
- A failed regional fanout slice is requeued with its cursor preserved.
- The publisher hydrates the complete category source before generating static
  inputs, uploads OpenNext cache objects, deploys, prewarms, and only then marks
  the batch complete.
- Workflow commits may include controlled generated build inputs only. R2
  snapshot directories ignored by the private source repository must not be
  force-added.
