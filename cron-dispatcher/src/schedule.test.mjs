import assert from "node:assert/strict";
import test from "node:test";

import { plannedDispatches } from "./schedule.mjs";

const workflows = (iso) => plannedDispatches(new Date(iso)).map((item) => item.workflow);

test("AI monitor runs on every 15-minute tick", () => {
  for (const minute of ["00", "15", "30", "45"]) {
    assert.ok(workflows(`2026-11-09T10:${minute}:00Z`).includes("refresh-ai-app-store-prices.yml"));
  }
});

test("regional monitor runs hourly at :00", () => {
  assert.ok(workflows("2026-11-09T10:00:00Z").includes("refresh-popularity-snapshots.yml"));
  assert.ok(!workflows("2026-11-09T10:30:00Z").includes("refresh-popularity-snapshots.yml"));
});

test("price publishing runs at :15 and :45, with the weekly cycle on Sunday 04:15", () => {
  const publish = (iso) => plannedDispatches(new Date(iso)).find((item) => item.workflow === "publish-price-updates.yml");
  assert.equal(publish("2026-11-09T10:00:00Z"), undefined);
  assert.deepEqual(publish("2026-11-09T10:15:00Z").inputs, { publish_mode: "immediate" });
  assert.deepEqual(publish("2026-11-09T10:45:00Z").inputs, { publish_mode: "immediate" });
  // 2026-11-08 is a Sunday.
  assert.deepEqual(publish("2026-11-08T04:15:00Z").inputs, { publish_mode: "cycle" });
  assert.deepEqual(publish("2026-11-08T04:45:00Z").inputs, { publish_mode: "immediate" });
});

test("a day dispatches 96 AI, 24 regional and 48 publish runs", () => {
  const counts = {};
  for (let tick = 0; tick < 96; tick += 1) {
    for (const item of plannedDispatches(new Date(Date.UTC(2026, 10, 9, 0, tick * 15)))) {
      counts[item.workflow] = (counts[item.workflow] ?? 0) + 1;
    }
  }
  assert.deepEqual(counts, {
    "refresh-ai-app-store-prices.yml": 96,
    "refresh-popularity-snapshots.yml": 24,
    "publish-price-updates.yml": 48,
  });
});
