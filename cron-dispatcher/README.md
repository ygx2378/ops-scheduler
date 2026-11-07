# Cron dispatcher Worker

GitHub Actions drops many `schedule` events for frequent crons: the AI monitor's
`*/15` cron ran about four times a day in November 2026. This Cloudflare Worker
fires every 15 minutes and starts the workflows through `workflow_dispatch`:

| UTC tick | Workflow |
| --- | --- |
| every 15 minutes | `refresh-ai-app-store-prices.yml` |
| `:00` | `refresh-popularity-snapshots.yml` |
| `:15`, `:45` | `publish-price-updates.yml` (`immediate`; Sunday `04:15` runs `cycle`) |

The workflow files stay the only definition of each job. Their own GitHub crons
remain as a fallback; every workflow uses a concurrency group, so an extra
trigger queues instead of overlapping.

## Deploy

No identifiers are committed here. Supply them when deploying:

```bash
cd cron-dispatcher
npx wrangler secret put GITHUB_TOKEN --name <worker-name>
npx wrangler deploy --name <worker-name> --var GITHUB_REPOSITORY:<owner/repo>
```

`GITHUB_TOKEN` is a fine-grained token limited to this repository with
**Actions: Read and write** and nothing else.

## Test

```bash
node --test cron-dispatcher/src/schedule.test.mjs
```
