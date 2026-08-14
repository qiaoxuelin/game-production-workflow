import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(scriptDirectory, "..");
const skillRoot = path.join(pluginRoot, "skills/game-production-system");
const bootstrapPath = path.join(skillRoot, "scripts/bootstrap.ps1");
const checkerSourcePath = path.join(skillRoot, "scripts/check.ps1");
const executionPath = path.join(skillRoot, "references/execution.md");
const workflowPath = path.join(skillRoot, "references/workflow.md");
const experienceReviewPath = path.join(
  skillRoot,
  "references/experience-review.md",
);

const read = (filePath) => fs.readFileSync(filePath, "utf8");
const execution = read(executionPath);
const workflow = read(workflowPath);
const experienceReview = read(experienceReviewPath);
const checker = read(checkerSourcePath);

assert.match(execution, /Candidate returned/i);
assert.match(execution, /retained:\s*<passing parts>/i);
assert.match(execution, /verify:\s*<command\/artifact>/i);
assert.match(execution, /fallback:\s*<next route>/i);
assert.match(
  workflow,
  /returned candidate[\s\S]*existing task handoff/i,
  "returned-candidate recovery must reuse the existing handoff",
);
assert.match(
  experienceReview,
  /reviewer[\s\S]*does not\s+choose the implementation repair/i,
  "independent review must remain read-only and not become implementation planning",
);
assert.match(checker, /systemVersionAtLeast171/);
assert.match(checker, /returned_candidate_status_conflict/);
assert.match(checker, /returned_candidate_result_prefix_invalid/);
assert.match(checker, /returned_candidate_result_missing/);
assert.match(checker, /returned_candidate_risk_contract_missing/);
assert.match(checker, /returned_candidate_next_action_missing/);
assert.match(checker, /returned_candidate_fallback_missing/);
const run = (command, args, cwd) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: process.env,
  });
  return {
    ...result,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
};

const fixtureRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "game-production-convergence-"),
);

try {
  const bootstrap = run(
    "pwsh",
    [
      "-NoProfile",
      "-File",
      bootstrapPath,
      "-ProjectPath",
      fixtureRoot,
      "-ProjectId",
      "convergence-test",
      "-ProjectTrack",
      "indie_game",
      "-BusinessModel",
      "premium",
      "-QualityFocus",
      "visual",
      "-ValidationMode",
      "product_first",
      "-DevelopmentMode",
      "original_design",
      "-Platform",
      "desktop",
      "-Engine",
      "fixture-engine",
      "-CanonicalClient",
      "fixture-client",
      "-InitializeGit",
    ],
    fixtureRoot,
  );
  assert.equal(
    bootstrap.status,
    0,
    `fixture bootstrap failed:\n${bootstrap.stdout}\n${bootstrap.stderr}`,
  );

  const taskPath = path.join(fixtureRoot, "production/TASK.md");
  const projectPath = path.join(fixtureRoot, "production/project.json");
  const baseTask = read(taskPath)
    .replaceAll("`TBD`", "`Concrete fixture value`")
    .replaceAll("- `TBD`", "- Concrete fixture value")
    .replace("- Task ID: `Concrete fixture value`", "- Task ID: `task-returned`")
    .replace("- Gate: `G0`", "- Gate: `G1`")
    .replace("- High-risk open decisions: `1`", "- High-risk open decisions: `0`")
    .replace("- Status: `Clarifying`", "- Status: `Implementing`")
    .replace("- Execution lane: `Standard`", "- Execution lane: `Standard`")
    .replace("- Result: `Not started`", "- Result: `Candidate returned — runtime contact criterion failed; evidence: anchors are visibly misaligned at 1280x720`")
    .replace("- Unresolved risks: `Concrete fixture value`", "- Unresolved risks: `Spatial mismatch`")
    .replace("- Next action: `Complete G0 clarification`", "- Next action: `Continue optimizing`")
    .replace("- Stop/replan triggers: `Concrete fixture value`", "- Stop/replan triggers: `Try again`");

  const baseProject = JSON.parse(read(projectPath));
  baseProject.systemVersion = "1.7.1";
  baseProject.gate = "G1";
  baseProject.currentTask = "task-returned";
  baseProject.status = "Implementing";
  baseProject.blockers = [];
  baseProject.nextAction = "Continue optimizing";
  fs.writeFileSync(projectPath, `${JSON.stringify(baseProject, null, 2)}\n`);

  const check = (taskText, mode = "Task") => {
    fs.writeFileSync(taskPath, taskText);
    const result = run(
      "pwsh",
      [
        "-NoProfile",
        "-File",
        path.join(fixtureRoot, "tools/production/check.ps1"),
        "-ProjectPath",
        fixtureRoot,
        "-Mode",
        mode,
      ],
      fixtureRoot,
    );
    assert.notEqual(
      result.stdout.trim(),
      "",
      `checker returned no JSON:\n${result.stderr}`,
    );
    return JSON.parse(result.stdout);
  };

  const issueCodes = (result) => new Set(result.issues.map((issue) => issue.code));

  const incompleteCodes = issueCodes(check(baseTask));
  assert(incompleteCodes.has("returned_candidate_risk_contract_missing"));
  assert(incompleteCodes.has("returned_candidate_next_action_missing"));
  assert(incompleteCodes.has("returned_candidate_fallback_missing"));

  const completeTask = baseTask
    .replace(
      "- Unresolved risks: `Spatial mismatch`",
      "- Unresolved risks: `Shared spatial master uses inconsistent anchors; retained: input behavior and functional tests`",
    )
    .replace(
      "- Next action: `Continue optimizing`",
      "- Next action: `Rebuild shared anchors for the representative slice; verify: capture the engine result at 1280x720`",
    )
    .replace(
      "- Stop/replan triggers: `Try again`",
      "- Stop/replan triggers: `One repair cycle without improved spatial contact; fallback: replan the shared spatial master`",
    );
  const completeCodes = issueCodes(check(completeTask));
  for (const code of [
    "returned_candidate_risk_contract_missing",
    "returned_candidate_next_action_missing",
    "returned_candidate_fallback_missing",
  ]) {
    assert(!completeCodes.has(code), `${code} rejected a complete recovery route`);
  }

  for (const [label, taskText, expectedCode] of [
    [
      "result placeholder",
      completeTask.replace(
        "- Result: `Candidate returned — runtime contact criterion failed; evidence: anchors are visibly misaligned at 1280x720`",
        "- Result: `Candidate returned — TBD; evidence: Pending`",
      ),
      "returned_candidate_result_missing",
    ],
    [
      "risk placeholders",
      completeTask.replace(
        "- Unresolved risks: `Shared spatial master uses inconsistent anchors; retained: input behavior and functional tests`",
        "- Unresolved risks: `TBD; retained: None`",
      ),
      "returned_candidate_risk_contract_missing",
    ],
    [
      "repair placeholders",
      completeTask.replace(
        "- Next action: `Rebuild shared anchors for the representative slice; verify: capture the engine result at 1280x720`",
        "- Next action: `TBD; verify: TBD`",
      ),
      "returned_candidate_next_action_missing",
    ],
    [
      "fallback placeholders",
      completeTask.replace(
        "- Stop/replan triggers: `One repair cycle without improved spatial contact; fallback: replan the shared spatial master`",
        "- Stop/replan triggers: `TBD; fallback: Pending`",
      ),
      "returned_candidate_fallback_missing",
    ],
  ]) {
    assert(
      issueCodes(check(taskText)).has(expectedCode),
      `${label} passed the convergence contract`,
    );
  }

  const legitimatePendingPhrase = completeTask.replace(
    "- Next action: `Rebuild shared anchors for the representative slice; verify: capture the engine result at 1280x720`",
    "- Next action: `Resolve pending animation callbacks in the representative slice; verify: capture the engine result at 1280x720`",
  );
  assert(
    !issueCodes(check(legitimatePendingPhrase)).has(
      "returned_candidate_next_action_missing",
    ),
    "placeholder validation must not reject a concrete clause that uses pending in a sentence",
  );

  const healthyTask = baseTask.replace(
    "- Result: `Candidate returned — runtime contact criterion failed; evidence: anchors are visibly misaligned at 1280x720`",
    "- Result: `In progress`",
  );
  const healthyCodes = issueCodes(check(healthyTask));
  for (const code of [
    "returned_candidate_status_conflict",
    "returned_candidate_result_prefix_invalid",
    "returned_candidate_result_missing",
    "returned_candidate_risk_contract_missing",
    "returned_candidate_next_action_missing",
    "returned_candidate_fallback_missing",
  ]) {
    assert(!healthyCodes.has(code), `${code} burdened a healthy active task`);
  }

  const acceptedTask = baseTask.replace(
    "- Status: `Implementing`",
    "- Status: `Accepted`",
  );
  assert(
    issueCodes(check(acceptedTask)).has("returned_candidate_status_conflict"),
    "a returned candidate must remain Implementing",
  );

  const unexplainedTask = completeTask.replace(
    "- Result: `Candidate returned — runtime contact criterion failed; evidence: anchors are visibly misaligned at 1280x720`",
    "- Result: `Candidate returned`",
  );
  assert(
    issueCodes(check(unexplainedTask)).has("returned_candidate_result_missing"),
    "a returned candidate must preserve the failed criterion and evidence",
  );

  const ambiguousResultTask = completeTask.replace(
    "- Result: `Candidate returned — runtime contact criterion failed; evidence: anchors are visibly misaligned at 1280x720`",
    "- Result: `Returned — runtime contact is visibly misaligned`",
  );
  assert(
    issueCodes(check(ambiguousResultTask)).has(
      "returned_candidate_result_prefix_invalid",
    ),
    "task Result must distinguish a returned candidate from a gate verdict",
  );

  const fastTask = baseTask.replace(
    "- Execution lane: `Standard`",
    "- Execution lane: `Fast`",
  );
  const fastCodes = issueCodes(check(fastTask));
  assert(
    !fastCodes.has("gui_restoration_fast_lane_conflict"),
    "a Fast task that reuses its accepted GUI baseline must remain lightweight",
  );
  for (const code of [
    "returned_candidate_risk_contract_missing",
    "returned_candidate_next_action_missing",
    "returned_candidate_fallback_missing",
  ]) {
    assert(!fastCodes.has(code), `${code} added Full/Standard ceremony to Fast work`);
  }

  const fastAmbiguousTask = fastTask.replace(
    "- Result: `Candidate returned — runtime contact criterion failed; evidence: anchors are visibly misaligned at 1280x720`",
    "- Result: `Returned — runtime contact is visibly misaligned`",
  );
  assert(
    issueCodes(check(fastAmbiguousTask)).has(
      "returned_candidate_result_prefix_invalid",
    ),
      "Fast work must use unambiguous task Result vocabulary without gaining the detailed handoff",
  );

  const fastGuiRestorationTask = fastTask.replace(
    "- GUI restoration: `Not applicable`",
    "- GUI restoration: `Required`",
  );
  assert(
    issueCodes(check(fastGuiRestorationTask)).has(
      "gui_restoration_fast_lane_conflict",
    ),
    "Fast work must not opt into the design-baseline and reviewer ceremony of GUI restoration",
  );

  const acceptedHealthyTask = healthyTask.replace(
    "- Status: `Implementing`",
    "- Status: `Accepted`",
  );
  const acceptedProject = {
    ...baseProject,
    status: "Accepted",
    nextAction: "Advance gate review",
  };
  fs.writeFileSync(taskPath, acceptedHealthyTask);
  fs.writeFileSync(projectPath, `${JSON.stringify(acceptedProject, null, 2)}\n`);

  for (const args of [
    ["config", "user.name", "Convergence Test"],
    ["config", "user.email", "convergence@example.invalid"],
    ["add", "."],
    ["commit", "-m", "fixture baseline"],
  ]) {
    const git = run("git", args, fixtureRoot);
    assert.equal(
      git.status,
      0,
      `git ${args.join(" ")} failed:\n${git.stdout}\n${git.stderr}`,
    );
  }

  const evidence = run(
    "pwsh",
    [
      "-NoProfile",
      "-File",
      path.join(fixtureRoot, "tools/production/evidence.ps1"),
      "-ProjectPath",
      fixtureRoot,
      "-TaskId",
      "task-returned",
      "-Gate",
      "G1",
      "-Type",
      "test",
      "-Location",
      "https://example.invalid/convergence-test",
      "-Verdict",
      "Pass",
    ],
    fixtureRoot,
  );
  assert.equal(
    evidence.status,
    0,
    `evidence registration failed:\n${evidence.stdout}\n${evidence.stderr}`,
  );

  const mutableHandoffTask = acceptedHealthyTask
    .replace("- Result: `In progress`", "- Result: `Passing parts retained for repair`")
    .replace(
      "- Unresolved risks: `Spatial mismatch`",
      "- Unresolved risks: `Anchor mismatch; retained: input behavior`",
    )
    .replace(
      "- Next action: `Continue optimizing`",
      "- Next action: `Repair anchors; verify: rerun representative slice`",
    )
    .replace(
      "- Stop/replan triggers: `Try again`",
      "- Stop/replan triggers: `No spatial improvement; fallback: replace layout route`",
    );
  assert(
    !issueCodes(check(mutableHandoffTask, "Gate")).has("task_contract_stale"),
    "mutable recovery handoff changes must preserve retained passing evidence",
  );

  const changedFrozenContract = `${mutableHandoffTask.trimEnd()}\n\n- Frozen fingerprint probe: changed\n`;
  assert(
    issueCodes(check(changedFrozenContract, "Gate")).has("task_contract_stale"),
    "a frozen task-contract change must stale earlier evidence",
  );

  const legacyProject = { ...acceptedProject, systemVersion: "1.7.0" };
  fs.writeFileSync(taskPath, acceptedHealthyTask);
  fs.writeFileSync(projectPath, `${JSON.stringify(legacyProject, null, 2)}\n`);
  const legacyContractText = acceptedHealthyTask
    .replace(
      /^- (Status|Result|Evidence IDs|Module harvest|Next action):.*(?:\r?\n)?/gm,
      "",
    )
    .replaceAll("\r\n", "\n");
  const legacyFingerprint = crypto
    .createHash("sha256")
    .update(legacyContractText, "utf8")
    .digest("hex");
  const revision = run("git", ["rev-parse", "HEAD"], fixtureRoot).stdout.trim();
  const manifestPath = path.join(fixtureRoot, "production/evidence/manifest.json");
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        schemaVersion: 3,
        entries: [
          {
            id: "EV-20260814060000-legacy",
            taskId: "task-returned",
            gate: "G1",
            type: "test",
            location: "https://example.invalid/legacy-evidence",
            sourceRevision: revision,
            sourceDirty: false,
            taskFingerprint: legacyFingerprint,
            verdict: "Pass",
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
  assert(
    !issueCodes(check(acceptedHealthyTask, "Gate")).has("task_contract_stale"),
    "v1.7.0 evidence using the legacy fingerprint must remain fresh",
  );

  fs.writeFileSync(projectPath, `${JSON.stringify(legacyProject, null, 2)}\n`);
  const legacyCodes = issueCodes(check(baseTask));
  for (const code of [
    "returned_candidate_status_conflict",
    "returned_candidate_result_prefix_invalid",
    "returned_candidate_result_missing",
    "returned_candidate_risk_contract_missing",
    "returned_candidate_next_action_missing",
    "returned_candidate_fallback_missing",
  ]) {
    assert(!legacyCodes.has(code), `${code} forced migration of a v1.7.0 task`);
  }
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log(
  "PASS returned-candidate convergence, Fast-lane scope, and v1.7.0 compatibility",
);
