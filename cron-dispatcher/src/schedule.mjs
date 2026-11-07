// GitHub Actions drops many `schedule` events for frequent crons (the AI
// monitor's */15 cron ran about four times a day in November 2026). This
// Worker's Cron Trigger fires every 15 minutes and dispatches the workflows
// below through `workflow_dispatch`, keeping the workflow files as the single
// definition of each job. The workflows keep sparse GitHub crons as fallback.

// Returns the workflow dispatches due at `date` (a Cron Trigger tick, UTC).
export function plannedDispatches(date) {
  const minute = date.getUTCMinutes();
  const dispatches = [{ workflow: "refresh-ai-app-store-prices.yml" }];

  if (minute === 0) {
    dispatches.push({ workflow: "refresh-popularity-snapshots.yml" });
  }

  // Publish after the monitors that start at :00 and :30 have had time to
  // record events. Sunday 04:15 runs the weekly cycle batch instead.
  if (minute === 15 || minute === 45) {
    const weeklyCycle =
      date.getUTCDay() === 0 && date.getUTCHours() === 4 && minute === 15;
    dispatches.push({
      workflow: "publish-price-updates.yml",
      inputs: { publish_mode: weeklyCycle ? "cycle" : "immediate" },
    });
  }

  return dispatches;
}
