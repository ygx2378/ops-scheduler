# ops-scheduler safety rules

- This is a public workflow-only repository. Never commit private application source, generated catalog data, credentials, repository names, or production resource identifiers.
- Active schedules live here. Corresponding workflows in the private source repository must remain disabled to avoid duplicate production jobs.
- Workflows must check out the private source through `SOURCE_REPOSITORY` and `SOURCE_REPOSITORY_TOKEN`; do not hardcode the private repository.
- D1, R2, and Cloudflare resources are production. Reference their names through repository secrets only.
- Preserve low-rate Apple collection, event debounce, retry/requeue behavior, and successful no-op exits.
- Publish workflows must hydrate the complete category source before static generation and must not force-add ignored R2 snapshot files.
- The monthly static region-page workflow may read only the existing R2 region snapshot objects; it must deploy and commit only when the dedicated artifact changes.
- Do not manually dispatch production workflows unless the user explicitly requests it.
