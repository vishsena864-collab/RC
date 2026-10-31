import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));

test("Only the main branch can automatically create Vercel Git deployments", () => {
  assert.equal(config.git?.deploymentEnabled?.main, true);
  assert.equal(config.git?.deploymentEnabled?.["*"], false);
  assert.deepEqual(Object.keys(config.git.deploymentEnabled).sort(), ["*", "main"].sort());
});

test("Do not rely on Ignored Build Step to reduce deployment quotas", () => {
  assert.equal(config.ignoreCommand, undefined);
  assert.equal(config.commandForIgnoringBuildStep, undefined);
});
