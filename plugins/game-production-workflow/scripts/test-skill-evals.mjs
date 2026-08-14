import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const corpusPath = path.resolve(
  scriptDirectory,
  "../evals/game-production-system.json",
);

assert(
  fs.existsSync(corpusPath),
  "game-production-system behavior evaluation corpus is missing",
);

const corpus = JSON.parse(fs.readFileSync(corpusPath, "utf8"));
assert.equal(corpus.schemaVersion, 1);
assert.equal(corpus.skill, "game-production-system");
assert(Array.isArray(corpus.scenarios) && corpus.scenarios.length > 0);

const requiredIds = new Set([
  "fast-gui-repair",
  "missing-visual-capability",
  "same-root-return",
  "approval-timeout",
  "composite-is-not-runtime-ui",
]);
const seenIds = new Set();

const hasContent = (value) =>
  typeof value === "string"
    ? value.trim().length > 0
    : value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length > 0;

for (const scenario of corpus.scenarios) {
  assert.match(scenario.id ?? "", /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert(!seenIds.has(scenario.id), `duplicate scenario id: ${scenario.id}`);
  seenIds.add(scenario.id);
  assert(hasContent(scenario.request), `${scenario.id}: request is empty`);
  assert(
    hasContent(scenario.repositoryState),
    `${scenario.id}: repositoryState is empty`,
  );
  for (const field of [
    "pressures",
    "requiredActions",
    "prohibitedActions",
    "terminalClaims",
  ]) {
    assert(
      Array.isArray(scenario[field]) &&
        scenario[field].length > 0 &&
        scenario[field].every(
          (item) => typeof item === "string" && item.trim().length > 0,
        ),
      `${scenario.id}: ${field} must be a non-empty string array`,
    );
  }
}

assert.deepEqual(
  new Set([...seenIds].filter((id) => requiredIds.has(id))),
  requiredIds,
  "behavior corpus is missing a required regression scenario",
);

console.log("PASS game-production-system behavior evaluation corpus");
