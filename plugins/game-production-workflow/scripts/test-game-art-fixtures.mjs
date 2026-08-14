import assert from "node:assert/strict";
import crypto from "node:crypto";
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
const expectedStarterFiles = {
  "design-direction": [
    "AGENTS.md",
    "docs/ART_BIBLE.md",
    "production/ACCEPTANCE.md",
    "production/PROJECT.md",
    "production/TASK.md",
    "production/project.json",
    "web/app.mjs",
    "web/index.html",
    "web/styles.css",
  ],
  "composite-runtime": [
    "AGENTS.md",
    "docs/ART_BIBLE.md",
    "production/ACCEPTANCE.md",
    "production/PROJECT.md",
    "production/TASK.md",
    "production/project.json",
    "web/app.mjs",
    "web/assets/inventory-concept.svg",
    "web/index.html",
    "web/state.mjs",
    "web/styles.css",
    "web/verify.mjs",
  ],
};
const hasContent = (value) => Array.isArray(value)
  ? value.length > 0
  : value && typeof value === "object"
    ? Object.keys(value).length > 0
    : typeof value === "string" && value.trim().length > 0;
const operationalFiles = ["fixture-lock.json", "observation.json", "result.json"];
const outputHash = (runRoot) => fixtureApi.hashTree(runRoot, operationalFiles);

for (const id of ids) {
  const fixturePath = path.join(evalRoot, id, "fixture.json");
  assert(fs.existsSync(fixturePath), `missing fixture: ${id}`);
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  assert.equal(fixture.id, id);
  for (const field of ["operation", "request", "capabilityProfile", "requiredArtifacts", "objectiveChecks", "subjectiveChecks", "prohibitedClaims", "stopConditions"]) {
    assert(hasContent(fixture[field]), `${id}: ${field} is empty`);
  }

  const starterRoot = path.join(evalRoot, id, "starter");
  const starterFiles = fs.readdirSync(starterRoot, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(starterRoot, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"))
    .sort();
  assert.deepEqual(starterFiles, expectedStarterFiles[id]);
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
assert.equal(
  fs.readdirSync(path.join(compositeRoot, "web"), { recursive: true }).filter((entry) => String(entry).endsWith(".svg")).length,
  1,
  "composite starter must contain exactly one flattened concept SVG",
);
const stateVerification = spawnSync(
  process.execPath,
  [path.join(compositeRoot, "web/verify.mjs")],
  { cwd: compositeRoot, encoding: "utf8" },
);
assert.equal(stateVerification.status, 0, stateVerification.stderr || stateVerification.stdout);

const designShell = await import(pathToFileURL(path.join(evalRoot, "design-direction/starter/web/app.mjs")));
assert.deepEqual(Object.keys(designShell.resultCases), [
  "success",
  "failure",
  "reward-overflow",
  "retry",
  "controller-focus",
]);
assert.deepEqual(designShell.targetViewports, {
  desktop: "1280x720",
  mobile: "390x844",
});

assert(fs.existsSync(cliPath), "missing game art fixture CLI");
const fixtureApi = await import(pathToFileURL(cliPath));
for (const name of ["parseFixtureArguments", "loadFixture", "hashTree", "prepareFixture", "verifyFixture"]) {
  assert.equal(typeof fixtureApi[name], "function", `missing exported CLI function: ${name}`);
}

assert.throws(
  () => fixtureApi.parseFixtureArguments(["prepare", "--fixture", "design-direction", "--label", "test", "--output", ".tmp/relative"]),
  /absolute/,
);
assert.throws(
  () => fixtureApi.parseFixtureArguments(["verify", "--run", ".tmp/relative"]),
  /absolute/,
);

const tempParent = path.join(repositoryRoot, ".tmp/game-art-evals");
const tempRoot = path.join(tempParent, `fixture-test-${process.pid}`);
const outsideEvalRoot = path.join(repositoryRoot, ".tmp", `fixture-outside-${process.pid}`);
const symlinkTarget = path.join(repositoryRoot, ".tmp", `fixture-symlink-target-${process.pid}`);
const symlinkRoot = path.join(tempParent, `fixture-symlink-${process.pid}`);
const runAlias = path.join(tempParent, `fixture-run-alias-${process.pid}`);
const sourceTestRepository = path.join(repositoryRoot, ".tmp", `fixture-source-repository-${process.pid}`);
const bindingRoot = path.join(tempParent, ".fixture-bindings");
const bindingsBefore = new Set(fs.existsSync(bindingRoot) ? fs.readdirSync(bindingRoot) : []);
fs.rmSync(tempRoot, { recursive: true, force: true });
fs.rmSync(outsideEvalRoot, { recursive: true, force: true });
fs.rmSync(symlinkRoot, { recursive: true, force: true });
fs.rmSync(runAlias, { recursive: true, force: true });
fs.rmSync(symlinkTarget, { recursive: true, force: true });
fs.rmSync(sourceTestRepository, { recursive: true, force: true });
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

  fs.mkdirSync(symlinkTarget, { recursive: true });
  let symlinksSupported = true;
  try {
    fs.symlinkSync(symlinkTarget, symlinkRoot, "dir");
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP"].includes(error.code)) symlinksSupported = false;
    else throw error;
  }
  if (symlinksSupported) {
    assert.throws(
      () => fixtureApi.prepareFixture({
        pluginRoot,
        fixtureId: "design-direction",
        label: "symlink-contract",
        outputRoot: path.join(symlinkRoot, "escaped-run"),
      }),
      /symbolic link/,
    );
  }

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
    assert.equal(fixtureApi.hashTree(runRoot, operationalFiles), fixtureApi.hashTree(runRoot, operationalFiles));
    assert.throws(
      () => fixtureApi.prepareFixture({ pluginRoot, fixtureId: id, label: "again", outputRoot: runRoot }),
      /non-empty/,
    );

    const fixture = fixtureApi.loadFixture(pluginRoot, id);
    for (const relative of fixture.requiredArtifacts) {
      const artifact = path.join(runRoot, relative);
      fs.mkdirSync(path.dirname(artifact), { recursive: true });
      fs.writeFileSync(artifact, `fixture test artifact: ${relative}\n`);
    }

    const observation = {
      schemaVersion: 1,
      sourceTreeHash: lock.sourceTreeHash,
      outputTreeHash: outputHash(runRoot),
      taskStateBefore: lock.taskStateBefore,
      taskStateAfter: lock.taskStateBefore,
      loadedContext: {
        metadataWords: 12,
        bodyWords: 34,
        referenceWords: 56,
        files: ["production/TASK.md"],
      },
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
    assert(result.objectiveChecks.every((check) => check.status === "Pass"), JSON.stringify(result.objectiveChecks, null, 2));
    assert(result.objectiveChecks.some((check) => check.id === "task-state-claims" && check.status === "Pass"));
    assert(result.objectiveChecks.some((check) => check.id === "required-artifacts" && check.status === "Pass"));

    if (id === "design-direction") {
      if (symlinksSupported) {
        fs.symlinkSync(runRoot, runAlias, "dir");
        assert.throws(
          () => fixtureApi.verifyFixture({ pluginRoot, runRoot: runAlias }),
          /symbolic link/,
        );
        fs.rmSync(runAlias, { recursive: true, force: true });
      }

      const mutableFile = path.join(runRoot, "web/index.html");
      const mutableContent = fs.readFileSync(mutableFile, "utf8");
      fs.appendFileSync(mutableFile, "\n<!-- changed after observation -->\n");
      const outputTamperResult = fixtureApi.verifyFixture({ pluginRoot, runRoot });
      assert(outputTamperResult.objectiveChecks.some((check) => check.id === "output-tree-claim" && check.status === "Fail"));
      fs.writeFileSync(mutableFile, mutableContent);

      const lockPath = path.join(runRoot, "fixture-lock.json");
      fs.chmodSync(lockPath, 0o644);
      fs.writeFileSync(lockPath, `${JSON.stringify({ ...lock, label: "forged-label" }, null, 2)}\n`);
      assert.throws(
        () => fixtureApi.verifyFixture({ pluginRoot, runRoot }),
        /trusted binding/,
      );
      fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
      fs.chmodSync(lockPath, 0o444);
      if (symlinksSupported) {
        const externalLock = path.join(symlinkTarget, "external-lock.json");
        fs.writeFileSync(externalLock, `${JSON.stringify(lock, null, 2)}\n`);
        fs.rmSync(lockPath);
        fs.symlinkSync(externalLock, lockPath);
        assert.throws(
          () => fixtureApi.verifyFixture({ pluginRoot, runRoot }),
          /fixture lock.*symbolic link/,
        );
        fs.rmSync(lockPath);
        fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
        fs.chmodSync(lockPath, 0o444);
      }

      const bindingIdentity = process.platform === "win32" ? runRoot.toLocaleLowerCase("en-US") : runRoot;
      const bindingKey = crypto.createHash("sha256").update(bindingIdentity).digest("hex");
      const trustedBindingPath = path.join(bindingRoot, `${bindingKey}.json`);
      const trustedBinding = JSON.parse(fs.readFileSync(trustedBindingPath, "utf8"));
      fs.chmodSync(trustedBindingPath, 0o644);
      fs.writeFileSync(trustedBindingPath, `${JSON.stringify({ ...trustedBinding, lockHash: `sha256:${"0".repeat(64)}` }, null, 2)}\n`);
      assert.throws(
        () => fixtureApi.verifyFixture({ pluginRoot, runRoot }),
        /trusted binding/,
      );
      fs.writeFileSync(trustedBindingPath, `${JSON.stringify(trustedBinding, null, 2)}\n`);
      fs.chmodSync(trustedBindingPath, 0o444);
      if (symlinksSupported) {
        const externalBinding = path.join(symlinkTarget, "forged-binding.json");
        fs.writeFileSync(externalBinding, `${JSON.stringify(trustedBinding, null, 2)}\n`);
        fs.rmSync(trustedBindingPath);
        fs.symlinkSync(externalBinding, trustedBindingPath);
        assert.throws(
          () => fixtureApi.verifyFixture({ pluginRoot, runRoot }),
          /trusted binding.*symbolic link/,
        );
        fs.rmSync(trustedBindingPath);
        fs.writeFileSync(trustedBindingPath, `${JSON.stringify(trustedBinding, null, 2)}\n`);
        fs.chmodSync(trustedBindingPath, 0o444);
      }

      const reorderedState = Object.fromEntries(Object.entries(lock.taskStateBefore).reverse());
      const reorderedObservation = {
        ...observation,
        taskStateBefore: reorderedState,
        taskStateAfter: reorderedState,
      };
      fs.writeFileSync(path.join(runRoot, "observation.json"), `${JSON.stringify(reorderedObservation, null, 2)}\n`);
      const reorderedResult = fixtureApi.verifyFixture({ pluginRoot, runRoot });
      assert(reorderedResult.objectiveChecks.some((check) => check.id === "task-state-claims" && check.status === "Pass"));

      const falseTaskClaim = {
        ...observation,
        taskStateAfter: { ...lock.taskStateBefore, status: "Implementing" },
      };
      fs.writeFileSync(path.join(runRoot, "observation.json"), `${JSON.stringify(falseTaskClaim, null, 2)}\n`);
      const falseTaskResult = fixtureApi.verifyFixture({ pluginRoot, runRoot });
      assert(falseTaskResult.objectiveChecks.some((check) => check.id === "task-state-claims" && check.status === "Fail"));

      const invalidState = {
        ...observation,
        taskStateAfter: { ...lock.taskStateBefore, extra: "untrusted" },
      };
      fs.writeFileSync(path.join(runRoot, "observation.json"), `${JSON.stringify(invalidState, null, 2)}\n`);
      assert.throws(
        () => fixtureApi.verifyFixture({ pluginRoot, runRoot }),
        /taskStateAfter/,
      );

      const invalidContext = {
        ...observation,
        loadedContext: {
          metadataWords: "not-a-number",
          bodyWords: -1,
          referenceWords: 0,
          files: [{}],
        },
      };
      fs.writeFileSync(path.join(runRoot, "observation.json"), `${JSON.stringify(invalidContext, null, 2)}\n`);
      assert.throws(
        () => fixtureApi.verifyFixture({ pluginRoot, runRoot }),
        /loadedContext/,
      );

      const prohibitedObservation = {
        ...observation,
        terminalClaim: "Final art approved by deterministic checks.",
      };
      fs.writeFileSync(path.join(runRoot, "observation.json"), `${JSON.stringify(prohibitedObservation, null, 2)}\n`);
      const prohibitedResult = fixtureApi.verifyFixture({ pluginRoot, runRoot });
      assert(prohibitedResult.objectiveChecks.some((check) => check.id === "prohibited-claims" && check.status === "Fail"));
      fs.writeFileSync(path.join(runRoot, "observation.json"), `${JSON.stringify(observation, null, 2)}\n`);
    }

    if (id === "composite-runtime") {
      const runVerifier = path.join(runRoot, "web/verify.mjs");
      const verifierContent = fs.readFileSync(runVerifier, "utf8");
      fs.writeFileSync(runVerifier, "process.exit(0);\n");
      const substitutedObservation = {
        ...observation,
        outputTreeHash: outputHash(runRoot),
      };
      fs.writeFileSync(path.join(runRoot, "observation.json"), `${JSON.stringify(substitutedObservation, null, 2)}\n`);
      const substitutedResult = fixtureApi.verifyFixture({ pluginRoot, runRoot });
      assert(substitutedResult.objectiveChecks.some((check) => check.id === "local-state-verifier" && check.status === "Fail"));
      fs.writeFileSync(runVerifier, verifierContent);
      fs.writeFileSync(path.join(runRoot, "observation.json"), `${JSON.stringify(observation, null, 2)}\n`);

      const statePath = path.join(runRoot, "web/state.mjs");
      const stateContent = fs.readFileSync(statePath, "utf8");
      fs.writeFileSync(statePath, "export const SLOT_COUNT = 8; export const createInventoryState = () => ({ slots: [] }); export const reduceInventory = (state) => state;\n");
      const brokenStateObservation = { ...observation, outputTreeHash: outputHash(runRoot) };
      fs.writeFileSync(path.join(runRoot, "observation.json"), `${JSON.stringify(brokenStateObservation, null, 2)}\n`);
      const brokenStateResult = fixtureApi.verifyFixture({ pluginRoot, runRoot });
      assert(brokenStateResult.objectiveChecks.some((check) => check.id === "local-state-verifier" && check.status === "Fail"));
      fs.writeFileSync(statePath, stateContent);

      const missingArtifact = path.join(runRoot, fixture.requiredArtifacts[0]);
      const missingArtifactContent = fs.readFileSync(missingArtifact, "utf8");
      fs.rmSync(missingArtifact);
      const missingArtifactObservation = { ...observation, outputTreeHash: outputHash(runRoot) };
      fs.writeFileSync(path.join(runRoot, "observation.json"), `${JSON.stringify(missingArtifactObservation, null, 2)}\n`);
      const missingArtifactResult = fixtureApi.verifyFixture({ pluginRoot, runRoot });
      assert(missingArtifactResult.objectiveChecks.some((check) => check.id === "required-artifacts" && check.status === "Fail"));
      fs.writeFileSync(missingArtifact, missingArtifactContent);

      if (symlinksSupported) {
        const externalArtifact = path.join(symlinkTarget, "external-artifact.txt");
        fs.writeFileSync(externalArtifact, "outside run\n");
        fs.rmSync(missingArtifact);
        fs.symlinkSync(externalArtifact, missingArtifact);
        assert.throws(
          () => fixtureApi.verifyFixture({ pluginRoot, runRoot }),
          /symbolic links/,
        );
        fs.rmSync(missingArtifact);
        fs.writeFileSync(missingArtifact, missingArtifactContent);

        fs.rmSync(runVerifier);
        fs.symlinkSync(externalArtifact, runVerifier);
        assert.throws(
          () => fixtureApi.verifyFixture({ pluginRoot, runRoot }),
          /symbolic links/,
        );
        fs.rmSync(runVerifier);
        fs.writeFileSync(runVerifier, verifierContent);
      }
      fs.writeFileSync(path.join(runRoot, "observation.json"), `${JSON.stringify(observation, null, 2)}\n`);
    }
  }

  const sourceTestPlugin = path.join(sourceTestRepository, "plugins/game-production-workflow");
  fs.mkdirSync(path.join(sourceTestPlugin, "scripts"), { recursive: true });
  fs.cpSync(path.join(pluginRoot, "evals/game-art-production"), path.join(sourceTestPlugin, "evals/game-art-production"), { recursive: true });
  fs.copyFileSync(
    path.join(scriptDirectory, "game-art-composite-verifier.mjs"),
    path.join(sourceTestPlugin, "scripts/game-art-composite-verifier.mjs"),
  );
  if (symlinksSupported) {
    const fakeEvaluationRoot = path.join(sourceTestRepository, ".tmp/game-art-evals");
    const externalBindingRoot = path.join(sourceTestRepository, "external-bindings");
    fs.mkdirSync(fakeEvaluationRoot, { recursive: true });
    fs.mkdirSync(externalBindingRoot, { recursive: true });
    fs.symlinkSync(externalBindingRoot, path.join(fakeEvaluationRoot, ".fixture-bindings"), "dir");
    assert.throws(
      () => fixtureApi.prepareFixture({
        pluginRoot: sourceTestPlugin,
        fixtureId: "design-direction",
        label: "binding-symlink",
        outputRoot: path.join(fakeEvaluationRoot, "binding-symlink-run"),
      }),
      /trusted binding root.*symbolic link/,
    );
    fs.rmSync(path.join(fakeEvaluationRoot, "binding-symlink-run"), { recursive: true, force: true });
    fs.rmSync(path.join(fakeEvaluationRoot, ".fixture-bindings"), { recursive: true, force: true });
  }
  const sourceTestRun = path.join(sourceTestRepository, ".tmp/game-art-evals/source-tamper");
  const sourceTestLock = fixtureApi.prepareFixture({
    pluginRoot: sourceTestPlugin,
    fixtureId: "design-direction",
    label: "source-tamper",
    outputRoot: sourceTestRun,
  });
  const sourceTestFixture = fixtureApi.loadFixture(sourceTestPlugin, "design-direction");
  for (const relative of sourceTestFixture.requiredArtifacts) {
    const artifact = path.join(sourceTestRun, relative);
    fs.mkdirSync(path.dirname(artifact), { recursive: true });
    fs.writeFileSync(artifact, `source test artifact: ${relative}\n`);
  }
  const sourceTestObservation = {
    schemaVersion: 1,
    sourceTreeHash: sourceTestLock.sourceTreeHash,
    outputTreeHash: outputHash(sourceTestRun),
    taskStateBefore: sourceTestLock.taskStateBefore,
    taskStateAfter: sourceTestLock.taskStateBefore,
    loadedContext: { metadataWords: 0, bodyWords: 0, referenceWords: 0, files: [] },
    cycles: 0,
    elapsedMinutes: 0,
    terminalClaim: "Objective source tamper test; subjective review pending.",
  };
  fs.writeFileSync(path.join(sourceTestRun, "observation.json"), `${JSON.stringify(sourceTestObservation, null, 2)}\n`);
  fs.appendFileSync(
    path.join(sourceTestPlugin, "evals/game-art-production/design-direction/starter/AGENTS.md"),
    "\nUnexpected committed-source mutation.\n",
  );
  assert.throws(
    () => fixtureApi.verifyFixture({ pluginRoot: sourceTestPlugin, runRoot: sourceTestRun }),
    /committed fixture and starter/,
  );

  const cliOutput = path.join(tempRoot, "cli-prepare");
  const cliRun = spawnSync(
    process.execPath,
    [cliPath, "prepare", "--fixture", "design-direction", "--label", "cli-test", "--output", cliOutput],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  assert.equal(cliRun.status, 0, cliRun.stderr || cliRun.stdout);
  assert(fs.existsSync(path.join(cliOutput, "fixture-lock.json")));

  const cliFixture = fixtureApi.loadFixture(pluginRoot, "design-direction");
  for (const relative of cliFixture.requiredArtifacts) {
    const artifact = path.join(cliOutput, relative);
    fs.mkdirSync(path.dirname(artifact), { recursive: true });
    fs.writeFileSync(artifact, `CLI fixture artifact: ${relative}\n`);
  }
  const cliLock = JSON.parse(fs.readFileSync(path.join(cliOutput, "fixture-lock.json"), "utf8"));
  const cliObservation = {
    schemaVersion: 1,
    sourceTreeHash: cliLock.sourceTreeHash,
    outputTreeHash: outputHash(cliOutput),
    taskStateBefore: cliLock.taskStateBefore,
    taskStateAfter: cliLock.taskStateBefore,
    loadedContext: { metadataWords: 1, bodyWords: 2, referenceWords: 3, files: ["production/TASK.md"] },
    cycles: 1,
    elapsedMinutes: 1,
    terminalClaim: "Objective checks complete; subjective review pending.",
  };
  fs.writeFileSync(path.join(cliOutput, "observation.json"), `${JSON.stringify(cliObservation, null, 2)}\n`);
  const cliVerify = spawnSync(
    process.execPath,
    [cliPath, "verify", "--run", cliOutput],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  assert.equal(cliVerify.status, 0, cliVerify.stderr || cliVerify.stdout);
  assert.equal(JSON.parse(cliVerify.stdout).fixtureId, "design-direction");
  assert(fs.existsSync(path.join(cliOutput, "result.json")));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
  fs.rmSync(outsideEvalRoot, { recursive: true, force: true });
  fs.rmSync(symlinkRoot, { recursive: true, force: true });
  fs.rmSync(runAlias, { recursive: true, force: true });
  fs.rmSync(symlinkTarget, { recursive: true, force: true });
  fs.rmSync(sourceTestRepository, { recursive: true, force: true });
  if (fs.existsSync(bindingRoot)) {
    for (const entry of fs.readdirSync(bindingRoot)) {
      if (bindingsBefore.has(entry)) continue;
      const file = path.join(bindingRoot, entry);
      if (!fs.lstatSync(file).isSymbolicLink()) fs.chmodSync(file, 0o644);
      fs.rmSync(file, { force: true });
    }
  }
}

console.log("PASS game art fixture contracts and CLI behavior");
