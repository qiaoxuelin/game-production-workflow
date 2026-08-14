import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(scriptDirectory, "..");
const repositoryRoot = path.resolve(pluginRoot, "../..");
const evalRoot = path.join(pluginRoot, "evals/game-art-production");
const cliPath = path.join(scriptDirectory, "game-art-fixture.mjs");
const ids = ["design-direction", "composite-runtime"];
const hasContent = (value) => Array.isArray(value)
  ? value.length > 0
  : value && typeof value === "object"
    ? Object.keys(value).length > 0
    : typeof value === "string" && value.trim().length > 0;

for (const id of ids) {
  const fixturePath = path.join(evalRoot, id, "fixture.json");
  assert(fs.existsSync(fixturePath), `missing fixture: ${id}`);
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  assert.equal(fixture.id, id);
  for (const field of ["operation", "request", "capabilityProfile", "requiredArtifacts", "objectiveChecks", "subjectiveChecks", "prohibitedClaims", "stopConditions"]) {
    assert(hasContent(fixture[field]), `${id}: ${field} is empty`);
  }

  const starterRoot = path.join(evalRoot, id, "starter");
  const agents = fs.readFileSync(path.join(starterRoot, "AGENTS.md"), "utf8");
  assert.match(agents, /Game Production System/);
  for (const entry of fs.readdirSync(starterRoot, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const file = path.join(entry.parentPath, entry.name);
    const text = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(text, /__[A-Z][A-Z0-9_]*__|\bTBD\b|\{\{[^}]+\}\}/, `${id}: unfilled template token in ${path.relative(starterRoot, file)}`);
  }
}

const compositeRoot = path.join(evalRoot, "composite-runtime", "starter");
const conceptPath = path.join(compositeRoot, "web/assets/inventory-concept.svg");
assert(fs.existsSync(conceptPath), "composite fixture lacks its flattened concept");
const stateVerification = spawnSync(
  process.execPath,
  [path.join(compositeRoot, "web/verify.mjs")],
  { cwd: compositeRoot, encoding: "utf8" },
);
assert.equal(stateVerification.status, 0, stateVerification.stderr || stateVerification.stdout);

assert(fs.existsSync(cliPath), "missing game art fixture CLI");
const fixtureApi = await import(pathToFileURL(cliPath));
for (const name of ["parseFixtureArguments", "loadFixture", "hashTree", "prepareFixture", "verifyFixture"]) {
  assert.equal(typeof fixtureApi[name], "function", `missing exported CLI function: ${name}`);
}

assert.throws(
  () => fixtureApi.parseFixtureArguments(["prepare", "--fixture", "design-direction", "--label", "test", "--output", ".tmp/relative"]),
  /absolute/,
);

const tempParent = path.join(repositoryRoot, ".tmp/game-art-evals");
const tempRoot = path.join(tempParent, `fixture-test-${process.pid}`);
const outsideEvalRoot = path.join(repositoryRoot, ".tmp", `fixture-outside-${process.pid}`);
fs.rmSync(tempRoot, { recursive: true, force: true });
fs.rmSync(outsideEvalRoot, { recursive: true, force: true });
fs.mkdirSync(tempRoot, { recursive: true });

try {
  assert.throws(
    () => fixtureApi.prepareFixture({
      pluginRoot,
      fixtureId: "design-direction",
      label: "outside-contract",
      outputRoot: outsideEvalRoot,
    }),
    /\.tmp\/game-art-evals/,
  );

  for (const id of ids) {
    const runRoot = path.join(tempRoot, id);
    const prepared = fixtureApi.prepareFixture({
      pluginRoot,
      fixtureId: id,
      label: "contract-test",
      outputRoot: runRoot,
    });
    assert.equal(prepared.fixtureId, id);
    assert.match(prepared.sourceTreeHash, /^sha256:[a-f0-9]{64}$/);
    assert(fs.existsSync(path.join(runRoot, "fixture-lock.json")));

    const lock = JSON.parse(fs.readFileSync(path.join(runRoot, "fixture-lock.json"), "utf8"));
    assert.equal(lock.sourceTreeHash, prepared.sourceTreeHash);
    assert.deepEqual(lock.taskStateBefore, prepared.taskStateBefore);
    assert.throws(
      () => fixtureApi.prepareFixture({ pluginRoot, fixtureId: id, label: "again", outputRoot: runRoot }),
      /non-empty/,
    );

    const observation = {
      schemaVersion: 1,
      sourceTreeHash: lock.sourceTreeHash,
      taskStateBefore: lock.taskStateBefore,
      taskStateAfter: lock.taskStateBefore,
      cycles: 1,
      elapsedMinutes: 5,
      terminalClaim: "Objective fixture verification completed; subjective review remains pending.",
    };
    fs.writeFileSync(path.join(runRoot, "observation.json"), `${JSON.stringify(observation, null, 2)}\n`);
    const result = fixtureApi.verifyFixture({ pluginRoot, runRoot });
    assert.equal(result.schemaVersion, 1);
    assert.equal(result.fixtureId, id);
    assert.equal(result.subjectiveReview.status, "Pending");
    assert.equal(result.subjectiveReview.reviewerIndependence, "Unassessed");
    assert.match(result.outputTreeHash, /^sha256:[a-f0-9]{64}$/);
    assert(fs.existsSync(path.join(runRoot, "result.json")));
    assert(result.objectiveChecks.some((check) => check.id === "task-state-claims" && check.status === "Pass"));
  }

  const cliOutput = path.join(tempRoot, "cli-prepare");
  const cliRun = spawnSync(
    process.execPath,
    [cliPath, "prepare", "--fixture", "design-direction", "--label", "cli-test", "--output", cliOutput],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  assert.equal(cliRun.status, 0, cliRun.stderr || cliRun.stdout);
  assert(fs.existsSync(path.join(cliOutput, "fixture-lock.json")));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
  fs.rmSync(outsideEvalRoot, { recursive: true, force: true });
}

console.log("PASS game art fixture contracts and CLI behavior");
