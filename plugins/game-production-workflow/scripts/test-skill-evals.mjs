import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(scriptDirectory, "..");
const corpusPath = path.resolve(
  scriptDirectory,
  "../evals/game-production-system.json",
);

const policySources = {
  core: fs.readFileSync(
    path.join(pluginRoot, "skills/game-production-system/SKILL.md"),
    "utf8",
  ),
  execution: fs.readFileSync(
    path.join(
      pluginRoot,
      "skills/game-production-system/references/execution.md",
    ),
    "utf8",
  ),
  checker: fs.readFileSync(
    path.join(pluginRoot, "skills/game-production-system/scripts/check.ps1"),
    "utf8",
  ),
  project: fs.readFileSync(
    path.join(
      pluginRoot,
      "skills/game-production-system/assets/project-template/AGENTS.md",
    ),
    "utf8",
  ),
};

const contractMatchers = {
  "fast-direct-close": [
    ["core", /Fast work closes on objective verification/i],
    ["project", /Fast[\s\S]*no independent review or human approval/i],
  ],
  "fast-gui-restoration-not-applicable": [
    ["core", /Mark GUI restoration[\s\S]*routine Fast UI\s+repair[\s\S]*Not applicable/i],
    ["checker", /gui_restoration_fast_lane_conflict/i],
  ],
  "optional-capability-fallback": [
    ["execution", /External Skills are optional/i],
    ["execution", /absence never sends a healthy task back to planning/i],
  ],
  "representative-runtime-proof": [
    ["execution", /smallest next player-visible slice/i],
    ["execution", /inspect the real output/i],
  ],
  "same-root-stop-loss": [
    ["core", /two\s+consecutive cycles add no new evidence[\s\S]*stop tuning/i],
    ["execution", /renamed candidate[\s\S]*stop-loss/i],
  ],
  "approval-timeout-no-passage": [
    ["core", /expiry as a transport event, not an approval result/i],
    ["core", /silence[\s\S]*never grant[\s\S]*passage/i],
  ],
  "bounded-offline-continuation": [
    ["core", /continue only already-authorized work/i],
    ["core", /bounded foreground commands[\s\S]*absolute deadline/i],
  ],
  "composite-not-runtime-ui": [
    ["execution", /Do not treat a composed design image as an asset inventory or runtime UI/i],
    ["execution", /player action.*interface state.*asset family.*assembly.*runtime/is],
  ],
  "assembly-before-bulk": [
    ["execution", /Bulk\s+production unlocks only when the assembly precheck and runtime proof pass/i],
    ["checker", /visual_bulk_unlock_without_prechecks/i],
  ],
};

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
const seenContractIds = new Set();

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
  if (scenario.repositoryState.interactiveVisualScope !== undefined) {
    assert(
      ["Required", "Not applicable"].includes(
        scenario.repositoryState.interactiveVisualScope,
      ),
      `${scenario.id}: interactiveVisualScope must use the task contract vocabulary`,
    );
  }
  assert(
    Array.isArray(scenario.contractIds) && scenario.contractIds.length > 0,
    `${scenario.id}: contractIds must name stable policy contracts`,
  );
  assert.equal(
    new Set(scenario.contractIds).size,
    scenario.contractIds.length,
    `${scenario.id}: contractIds must not contain duplicates`,
  );
  for (const contractId of scenario.contractIds) {
    assert(
      Object.hasOwn(contractMatchers, contractId),
      `${scenario.id}: unsupported contract id ${contractId}`,
    );
    seenContractIds.add(contractId);
  }
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

assert.deepEqual(
  seenContractIds,
  new Set(Object.keys(contractMatchers)),
  "behavior corpus must exercise every stable policy contract",
);

for (const [contractId, matchers] of Object.entries(contractMatchers)) {
  for (const [source, pattern] of matchers) {
    assert.match(
      policySources[source],
      pattern,
      `${contractId}: ${source} no longer exposes ${pattern}`,
    );
  }
}

console.log("PASS game-production-system behavior evaluation corpus");
