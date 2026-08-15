import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflowPath = path.join(
  repositoryRoot,
  ".github/workflows/game-production-1.8.0-platform.yml",
);
const powershellInspectorPath = path.join(
  repositoryRoot,
  "scripts/inspect-platform-powershell.ps1",
);
const shaExpression = "${{ github.sha }}";

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function validatePowerShell(script) {
  assert(fs.existsSync(powershellInspectorPath), "missing workflow PowerShell AST inspector");
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "game-production-platform-workflow-"));
  const scriptPath = path.join(temporaryRoot, "workflow.ps1");
  try {
    fs.writeFileSync(scriptPath, script, "utf8");
    const result = spawnSync(
      "pwsh",
      ["-NoProfile", "-File", powershellInspectorPath, "-ScriptPath", scriptPath],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
    assert.equal(
      result.status,
      0,
      `workflow PowerShell AST contract failed:\n${result.stdout}${result.stderr}`,
    );
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
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
  validatePowerShell(verify.run);

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
  ["commented verifier", (candidate) => {
    candidate.jobs.verify.steps[3].run = candidate.jobs.verify.steps[3].run
      .replace(
        "$verifyOutput = @(& pwsh -NoProfile -File ./verify.ps1 -CompareRef origin/main 2>&1)",
        "# $verifyOutput = @(& pwsh -NoProfile -File ./verify.ps1 -CompareRef origin/main 2>&1)",
      );
  }],
  ["installer safety flags", (candidate) => {
    candidate.jobs.verify.steps[3].run = candidate.jobs.verify.steps[3].run
      .replace("--dry-run --json `", "");
  }],
  ["SHA mismatch warning", (candidate) => {
    candidate.jobs.verify.steps[3].run = candidate.jobs.verify.steps[3].run
      .replace(
        'throw "Checked-out HEAD does not match GITHUB_SHA: actual=$actualHead expected=$expectedHead"',
        'Write-Warning "Checked-out HEAD does not match GITHUB_SHA: actual=$actualHead expected=$expectedHead"',
      );
  }],
  ["dead-code verifier", (candidate) => {
    candidate.jobs.verify.steps[3].run = candidate.jobs.verify.steps[3].run
      .replace(
        "$verifyOutput = @(& pwsh -NoProfile -File ./verify.ps1 -CompareRef origin/main 2>&1)",
        "if ($false) {\n  $verifyOutput = @(& pwsh -NoProfile -File ./verify.ps1 -CompareRef origin/main 2>&1)\n}",
      );
  }],
  ["actual SHA overwrite", (candidate) => {
    candidate.jobs.verify.steps[3].run = candidate.jobs.verify.steps[3].run
      .replace(
        "$actualHead = (& git rev-parse HEAD).Trim()",
        "$actualHead = (& git rev-parse HEAD).Trim()\n$actualHead = $expectedHead",
      );
  }],
  ["verifier exit overwrite", (candidate) => {
    candidate.jobs.verify.steps[3].run = candidate.jobs.verify.steps[3].run
      .replace("$verifyExit = $LASTEXITCODE", "$verifyExit = $LASTEXITCODE\n$verifyExit = 0");
  }],
  ["LASTEXITCODE reset before capture", (candidate) => {
    candidate.jobs.verify.steps[3].run = candidate.jobs.verify.steps[3].run
      .replace(
        "$verifyExit = $LASTEXITCODE",
        "& git --version | Out-Null\n$verifyExit = $LASTEXITCODE",
      );
  }],
  ["verifier stderr redirection", (candidate) => {
    candidate.jobs.verify.steps[3].run = candidate.jobs.verify.steps[3].run
      .replace("origin/main 2>&1)", "origin/main)");
  }],
  ["late SHA guard", (candidate) => {
    const guard = "if ($actualHead -ne $expectedHead) {\n  throw \"Checked-out HEAD does not match GITHUB_SHA: actual=$actualHead expected=$expectedHead\"\n}\n\n";
    candidate.jobs.verify.steps[3].run = candidate.jobs.verify.steps[3].run
      .replace(guard, "")
      .replace(
        "$verifyOutput = @(& pwsh -NoProfile -File ./verify.ps1 -CompareRef origin/main 2>&1)",
        `$verifyOutput = @(& pwsh -NoProfile -File ./verify.ps1 -CompareRef origin/main 2>&1)\n\n${guard.trimEnd()}`,
      );
  }],
  ["missing environment evidence write", (candidate) => {
    candidate.jobs.verify.steps[3].run = candidate.jobs.verify.steps[3].run
      .replace(
        ') | Set-Content -Encoding utf8 "$evidenceRoot/environment.log"',
        ") | Out-Null",
      );
  }],
  ["dead exit evidence", (candidate) => {
    const exitEvidence = `@(\n  "verifyExit=$verifyExit"\n  "installDryRunExit=$installExit"\n) | Set-Content -Encoding utf8 "$evidenceRoot/exit-status.log"`;
    candidate.jobs.verify.steps[3].run = candidate.jobs.verify.steps[3].run
      .replace(exitEvidence, `& { if ($false) {\n${exitEvidence}\n} }`);
  }],
  ["dead hash evidence", (candidate) => {
    const hashEvidence = `Get-ChildItem -LiteralPath $evidenceRoot -File |
  Sort-Object Name |
  ForEach-Object {
    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash.ToLowerInvariant()
    "$hash  $($_.Name)"
  } | Set-Content -Encoding utf8 "$evidenceRoot/SHA256SUMS"`;
    candidate.jobs.verify.steps[3].run = candidate.jobs.verify.steps[3].run
      .replace(hashEvidence, `& { if ($false) {\n${hashEvidence}\n} }`);
  }],
  ["scoped actual SHA overwrite", (candidate) => {
    candidate.jobs.verify.steps[3].run = candidate.jobs.verify.steps[3].run
      .replace(
        '@(\n  "runnerOS=$env:RUNNER_OS"',
        '@(\n  $(& Set-Variable -Name actualHead -Value $expectedHead -Scope 1)\n  "runnerOS=$env:RUNNER_OS"',
      );
  }],
  ["scoped verifier exit overwrite", (candidate) => {
    candidate.jobs.verify.steps[3].run = candidate.jobs.verify.steps[3].run
      .replace(
        '@(\n  "verifyExit=$verifyExit"',
        '@(\n  $(& Set-Variable -Name verifyExit -Value 0 -Scope 1)\n  "verifyExit=$verifyExit"',
      );
  }],
  ["pwsh command hijack", (candidate) => {
    candidate.jobs.verify.steps[3].run = candidate.jobs.verify.steps[3].run
      .replace(
        "New-Item -ItemType Directory -Force -Path $evidenceRoot | Out-Null",
        "& { Set-Item -Path Function:global:pwsh -Value { exit 0 }; New-Item -ItemType Directory -Force -Path $evidenceRoot | Out-Null }",
      );
  }],
  ["SHA guard exits successfully", (candidate) => {
    candidate.jobs.verify.steps[3].run = candidate.jobs.verify.steps[3].run
      .replace(
        'throw "Checked-out HEAD does not match GITHUB_SHA: actual=$actualHead expected=$expectedHead"',
        "throw $(exit 0)",
      );
  }],
  ["terminal guard exits successfully", (candidate) => {
    candidate.jobs.verify.steps[3].run = candidate.jobs.verify.steps[3].run
      .replace(
        'throw "Platform verification failed: verify=$verifyExit installDryRun=$installExit"',
        "throw $(exit 0)",
      );
  }],
  ["backtick in environment evidence path", (candidate) => {
    candidate.jobs.verify.steps[3].run = candidate.jobs.verify.steps[3].run
      .replace("environment.log", "e`nvironment.log");
  }],
  ["backtick in verifier evidence path", (candidate) => {
    candidate.jobs.verify.steps[3].run = candidate.jobs.verify.steps[3].run
      .replace("verify.log", "ve`rify.log");
  }],
  ["dead expected SHA assignment", (candidate) => {
    candidate.jobs.verify.steps[3].run = candidate.jobs.verify.steps[3].run
      .replace(
        "$expectedHead = $env:GITHUB_SHA",
        "$null = & { if ($false) { $expectedHead = $env:GITHUB_SHA }; Set-Variable -Name expectedHead -Value (& git rev-parse HEAD).Trim() -Scope 1 }",
      );
  }],
  ["dead actual SHA assignment", (candidate) => {
    candidate.jobs.verify.steps[3].run = candidate.jobs.verify.steps[3].run
      .replace(
        "$actualHead = (& git rev-parse HEAD).Trim()",
        "$null = & { if ($false) { $actualHead = (& git rev-parse HEAD).Trim() }; Set-Variable -Name actualHead -Value $expectedHead -Scope 1 }",
      );
  }],
  ["parameter default command hijack", (candidate) => {
    candidate.jobs.verify.steps[3].run =
      `param($ignored = $(Set-Alias pwsh Write-Output))\n${candidate.jobs.verify.steps[3].run}`;
  }],
  ["backtick newline in evidence root literal", (candidate) => {
    candidate.jobs.verify.steps[3].run = candidate.jobs.verify.steps[3].run
      .replace(
        "$evidenceRoot = '.tmp/task8-platform'",
        "$evidenceRoot = '.tmp/task8-plat`\nform'",
      );
  }],
  ["root trap continues after guard failure", (candidate) => {
    candidate.jobs.verify.steps[3].run =
      `trap { continue }\n${candidate.jobs.verify.steps[3].run}`;
  }],
  ["root trap exits successfully on guard failure", (candidate) => {
    candidate.jobs.verify.steps[3].run =
      `trap { exit 0 }\n${candidate.jobs.verify.steps[3].run}`;
  }],
];

for (const [name, mutate] of mutations) {
  const candidate = copy(workflow);
  const before = JSON.stringify(candidate);
  mutate(candidate);
  assert.notEqual(JSON.stringify(candidate), before, `${name} mutation must alter the workflow`);
  assert.throws(
    () => validateWorkflow(candidate),
    { name: "AssertionError" },
    `${name} mutation must be rejected`,
  );
}

console.log("PASS Task 8 Linux/Windows release-candidate workflow contract");
