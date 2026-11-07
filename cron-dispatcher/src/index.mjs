import { plannedDispatches } from "./schedule.mjs";

async function dispatch(env, { workflow, inputs }) {
  const response = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPOSITORY}/actions/workflows/${workflow}/dispatches`,
    {
      method: "POST",
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${env.GITHUB_TOKEN}`,
        "content-type": "application/json",
        "user-agent": "ops-cron-dispatcher",
        "x-github-api-version": "2022-11-28",
      },
      body: JSON.stringify({ ref: "main", ...(inputs ? { inputs } : {}) }),
    },
  );
  if (response.status !== 204) {
    throw new Error(`${workflow}: GitHub returned ${response.status} ${await response.text()}`);
  }
}

export default {
  async scheduled(controller, env) {
    if (!env.GITHUB_REPOSITORY || !env.GITHUB_TOKEN) {
      throw new Error("GITHUB_REPOSITORY and GITHUB_TOKEN must be configured.");
    }
    const due = plannedDispatches(new Date(controller.scheduledTime));
    // Dispatch every due workflow even if one fails, then surface the failure
    // so the Cron Trigger shows up as an error in Workers logs.
    const results = await Promise.allSettled(due.map((item) => dispatch(env, item)));
    const failures = results.filter((result) => result.status === "rejected");
    for (const [index, result] of results.entries()) {
      console.log(JSON.stringify({ workflow: due[index].workflow, status: result.status }));
    }
    if (failures.length > 0) {
      throw new AggregateError(failures.map((failure) => failure.reason), "Workflow dispatch failed");
    }
  },

  async fetch() {
    return new Response("Not found", { status: 404 });
  },
};
