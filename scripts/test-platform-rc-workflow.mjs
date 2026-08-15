import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflowPath = path.join(
  repositoryRoot,
  ".github/workflows/game-production-1.8.0-platform.yml",
);
const shaExpression = "${{ github.sha }}";

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function validateWorkflow(workflow) {
  assert.deepEqual(
    Object.keys(workflow).sort(),
    ["concurrency", "jobs", "name", "on", "permissions"].sort(),
  );
  assert.equal(workflow.name, "Game Production 1.8.0 platform RC");
  assert.deepEqual(Object.keys(workflow.on).sort(), ["push", "workflow_dispatch"]);
  assert.deepEqual(
    workflow.on.push,
    { branches: ["agent/game-art-production-implementation"] },
  );
  assert.deepEqual(workflow.on.workflow_dispatch, {});
  assert.deepEqual(workflow.permissions, { contents: "read" });
  assert.deepEqual(workflow.concurrency, {
    group: "game-production-1.8.0-platform-${{ github.ref }}",
    "cancel-in-progress": true,
  });

  assert.deepEqual(Object.keys(workflow.jobs), ["verify"]);
  const job = workflow.jobs.verify;
  assert.equal(job.name, "Verify ${{ matrix.os }}");
  assert.equal(job["runs-on"], "${{ matrix.os }}");
  assert.deepEqual(job.strategy, {
    "fail-fast": false,
    matrix: { os: ["ubuntu-latest", "windows-latest"] },
  });
  assert.deepEqual(
    job.steps.map((step) => step.name),
    [
      "Check out exact candidate",
      "Fetch comparison ref",
      "Set up Node.js",
      "Verify candidate and installer dry-run",
      "Upload platform evidence",
    ],
  );

  const [checkout, fetchComparison, setupNode, verify, upload] = job.steps;
  assert.equal(checkout.uses, "actions/checkout@v4");
  assert.deepEqual(checkout.with, { "fetch-depth": 0, ref: shaExpression });
  assert.equal(fetchComparison.shell, "pwsh");
  assert.equal(
    fetchComparison.run,
    "git fetch --no-tags origin main:refs/remotes/origin/main",
  );
  assert.equal(setupNode.uses, "actions/setup-node@v4");
  assert.deepEqual(setupNode.with, { "node-version": "24" });
  assert.equal(verify.shell, "pwsh");

  const requiredScriptFragments = [
    "$expectedHead = $env:GITHUB_SHA",
    "$actualHead = (& git rev-parse HEAD).Trim()",
    "if ($actualHead -ne $expectedHead)",
    '"expectedCandidateCommit=$expectedHead"',
    '"actualCandidateCommit=$actualHead"',
    "verify.ps1 -CompareRef origin/main",
    '"$evidenceRoot/verify.log"',
    "--ref $actualHead",
    '"$evidenceRoot/install-dry-run.json"',
    '"verifyExit=$verifyExit"',
    '"installDryRunExit=$installExit"',
    '"$evidenceRoot/exit-status.log"',
    "Get-FileHash -Algorithm SHA256",
    '"$evidenceRoot/SHA256SUMS"',
  ];
  for (const fragment of requiredScriptFragments) {
    assert.ok(verify.run.includes(fragment), `missing workflow script fragment: ${fragment}`);
  }

  assert.equal(upload.if, "${{ always() }}");
  assert.equal(upload.uses, "actions/upload-artifact@v4");
  assert.deepEqual(upload.with, {
    name: "task8-platform-${{ runner.os }}-${{ github.sha }}",
    path: ".tmp/task8-platform/",
    "if-no-files-found": "error",
    "retention-days": 14,
  });
}

assert(fs.existsSync(workflowPath), "missing Task 8 platform workflow");
const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));
validateWorkflow(workflow);

const mutations = [
  ["trigger", (candidate) => { candidate["not-on"] = candidate.on; delete candidate.on; }],
  ["permissions", (candidate) => { candidate.permissions.contents = "write"; }],
  ["checkout SHA", (candidate) => { delete candidate.jobs.verify.steps[0].with.ref; }],
  ["measured SHA", (candidate) => {
    candidate.jobs.verify.steps[3].run = candidate.jobs.verify.steps[3].run
      .replace("$actualHead = (& git rev-parse HEAD).Trim()", "");
  }],
  ["exit evidence", (candidate) => {
    candidate.jobs.verify.steps[3].run = candidate.jobs.verify.steps[3].run
      .replace('"verifyExit=$verifyExit"', "");
  }],
  ["log evidence", (candidate) => {
    candidate.jobs.verify.steps[3].run = candidate.jobs.verify.steps[3].run
      .replace('"$evidenceRoot/install-dry-run.json"', "");
  }],
  ["hash evidence", (candidate) => {
    candidate.jobs.verify.steps[3].run = candidate.jobs.verify.steps[3].run
      .replace("Get-FileHash -Algorithm SHA256", "Get-FileHash");
  }],
  ["always upload", (candidate) => { candidate.jobs.verify.steps[4].if = "${{ success() }}"; }],
];

for (const [name, mutate] of mutations) {
  const candidate = copy(workflow);
  mutate(candidate);
  assert.throws(
    () => validateWorkflow(candidate),
    { name: "AssertionError" },
    `${name} mutation must be rejected`,
  );
}

console.log("PASS Task 8 Linux/Windows release-candidate workflow contract");
