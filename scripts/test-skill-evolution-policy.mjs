import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const policyPath = path.join(repositoryRoot, "AGENTS.md");
const gatePath = path.join(repositoryRoot, "scripts/skill-evolution-policy.mjs");

assert(fs.existsSync(policyPath), "missing repository Skill evolution policy");
assert(fs.existsSync(gatePath), "missing executable Skill evolution gate");

const policyText = fs.readFileSync(policyPath, "utf8");
for (const required of [
  "one change hypothesis",
  "two real production packages",
  "mechanical repository rules",
  "do not merge it",
]) {
  assert(policyText.includes(required), `repository policy omits: ${required}`);
}

const {
  normalizeChangedPath,
  validateSkillEvolutionChanges,
} = await import("./skill-evolution-policy.mjs");

const coreSkill =
  "plugins/game-production-workflow/skills/game-production-system/SKILL.md";
const executionReference =
  "plugins/game-production-workflow/skills/game-production-system/references/execution.md";
const addedReference =
  "plugins/game-production-workflow/skills/game-production-system/references/new-loop.md";
const behaviorTest =
  "plugins/game-production-workflow/scripts/test-skill-evals.mjs";
const behaviorEval =
  "plugins/game-production-workflow/evals/game-production-system.json";
const fakeEvalAsset =
  "plugins/game-production-workflow/evals/game-art-production/example/style.css";
const unregisteredTest = "scripts/test-placeholder.mjs";
const design =
  "docs/superpowers/specs/2026-08-20-skill-loop-design.md";
const plan =
  "docs/superpowers/plans/2026-08-20-skill-loop.md";
const conventionalDesign =
  "docs/superpowers/specs/2026-08-20-game-art-production-design.md";
const conventionalPlan =
  "docs/superpowers/plans/2026-08-20-game-art-production.md";
const unrelatedSkillDesign = "docs/superpowers/specs/unrelated-skill.md";
const unrelatedSkillPlan = "docs/superpowers/plans/unrelated-skill.md";

function change(status, changedPath, oldPath) {
  return { status, path: changedPath, ...(oldPath ? { oldPath } : {}) };
}

function codes(
  changes,
  evidence = [behaviorTest, behaviorEval],
  structuralPairs = [
    { id: "skill-loop", designPath: design, planPath: plan },
    {
      id: "game-art-production",
      designPath: conventionalDesign,
      planPath: conventionalPlan,
    },
  ],
) {
  return validateSkillEvolutionChanges(changes, {
    verifiedBehaviorEvidencePaths: evidence,
    verifiedStructuralDesignPaths: structuralPairs.map((pair) => pair.designPath),
    verifiedStructuralPlanPaths: structuralPairs.map((pair) => pair.planPath),
    verifiedStructuralEvidencePairs: structuralPairs,
  }).map((item) => item.code);
}

assert.equal(
  normalizeChangedPath(String.raw`plugins\game-production-workflow\skills\x\SKILL.md`),
  "plugins/game-production-workflow/skills/x/SKILL.md",
);
assert.deepEqual(codes([]), []);
assert.deepEqual(codes([change("M", "README.md")]), []);
assert.deepEqual(codes([change("M", "install.mjs")]), []);
assert.deepEqual(
  codes([change("M", coreSkill)]),
  ["skill-change-without-behavior-evidence"],
);
assert.deepEqual(
  codes([change("M", coreSkill), change("M", fakeEvalAsset)]),
  ["skill-change-without-behavior-evidence"],
);
assert.deepEqual(
  codes([change("M", coreSkill), change("A", unregisteredTest)]),
  ["skill-change-without-behavior-evidence"],
);
assert.deepEqual(codes([change("M", coreSkill), change("M", behaviorTest)]), []);
assert.deepEqual(codes([change("M", executionReference), change("M", behaviorEval)]), []);

assert.deepEqual(
  codes([change("A", addedReference), change("M", behaviorTest)]),
  ["structural-skill-change-without-design", "structural-skill-change-without-plan"],
);
assert.deepEqual(
  codes([
    change("D", executionReference),
    change("M", behaviorTest),
    change("A", design),
  ]),
  ["structural-skill-change-without-plan"],
);
assert.deepEqual(
  codes([
    change("R100", addedReference, executionReference),
    change("M", behaviorTest),
    change("A", design),
    change("A", plan),
  ]),
  [],
);
assert.deepEqual(
  codes([
    change("A", addedReference),
    change("M", behaviorTest),
    change("A", conventionalDesign),
    change("A", conventionalPlan),
  ]),
  [],
);
assert.deepEqual(
  codes([
    change("A", addedReference),
    change("M", behaviorTest),
    change("A", unrelatedSkillDesign),
    change("A", unrelatedSkillPlan),
  ]),
  ["structural-skill-change-without-design", "structural-skill-change-without-plan"],
);
assert.deepEqual(
  codes([
    change("A", addedReference),
    change("M", behaviorTest),
    change("A", design),
    change("A", plan),
  ]),
  [],
);

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    ...options,
  });
}

function write(root, relative, contents) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents, "utf8");
}

const temporaryRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "skill evolution policy "),
);
try {
  assert.equal(run("git", ["init", "-q"], { cwd: temporaryRoot }).status, 0);
  assert.equal(
    run("git", ["config", "--local", "user.email", "fixture@example.invalid"], {
      cwd: temporaryRoot,
    }).status,
    0,
  );
  assert.equal(
    run("git", ["config", "--local", "user.name", "Skill Policy Fixture"], {
      cwd: temporaryRoot,
    }).status,
    0,
  );
  write(temporaryRoot, coreSkill, "---\nname: game-production-system\n---\nbase\n");
  write(temporaryRoot, executionReference, "# Execution\nbase\n");
  write(
    temporaryRoot,
    behaviorTest,
    'import assert from "node:assert/strict";\nassert.equal(1, 1);\n',
  );
  write(
    temporaryRoot,
    "verify.ps1",
    '$skillEvalTestPath = Join-Path $plugin "scripts/test-skill-evals.mjs"\n' +
      '& $node.Source $skillEvalTestPath\n',
  );
  assert.equal(run("git", ["add", "."], { cwd: temporaryRoot }).status, 0);
  assert.equal(
    run("git", ["commit", "-q", "-m", "base"], { cwd: temporaryRoot }).status,
    0,
  );

  fs.appendFileSync(path.join(temporaryRoot, coreSkill), "changed\n", "utf8");
  write(temporaryRoot, behaviorTest, "// assert.equal(1, 1)\n");
  let result = run(
    process.execPath,
    [gatePath, "--repo", temporaryRoot, "--compare-ref", "HEAD"],
    { cwd: path.parse(temporaryRoot).root },
  );
  assert.notEqual(result.status, 0, "CLI accepted a Skill edit without behavior evidence");
  assert.match(result.stderr, /skill-change-without-behavior-evidence/);

  write(
    temporaryRoot,
    behaviorEval,
    `${JSON.stringify({ schemaVersion: 1, skill: "x", scenarios: [null] })}\n`,
  );
  result = run(
    process.execPath,
    [gatePath, "--repo", temporaryRoot, "--compare-ref", "HEAD"],
    { cwd: path.parse(temporaryRoot).root },
  );
  assert.notEqual(result.status, 0, "CLI accepted a placeholder behavior-eval JSON");
  assert.match(result.stderr, /skill-change-without-behavior-evidence/);
  fs.rmSync(path.join(temporaryRoot, behaviorEval));

  write(temporaryRoot, "scripts/test-skill-change.mjs", "// evidence\n");
  result = run(
    process.execPath,
    [gatePath, "--repo", temporaryRoot, "--compare-ref", "HEAD"],
    { cwd: path.parse(temporaryRoot).root },
  );
  assert.notEqual(result.status, 0, "CLI accepted an unregistered placeholder test");
  assert.match(result.stderr, /skill-change-without-behavior-evidence/);

  write(
    temporaryRoot,
    behaviorTest,
    'import assert from "node:assert/strict";\nassert.equal(2, 2);\n',
  );
  result = run(
    process.execPath,
    [gatePath, "--repo", temporaryRoot, "--compare-ref", "HEAD"],
    { cwd: path.parse(temporaryRoot).root },
  );
  assert.equal(result.status, 0, `CLI rejected a verify-executed test:\n${result.stderr}`);

  write(temporaryRoot, addedReference, "# Added reference\n");
  result = run(
    process.execPath,
    [gatePath, "--repo", temporaryRoot, "--compare-ref", "HEAD"],
    { cwd: path.parse(temporaryRoot).root },
  );
  assert.notEqual(result.status, 0, "CLI accepted a structural Skill change without design/plan");
  assert.match(result.stderr, /structural-skill-change-without-design/);
  assert.match(result.stderr, /structural-skill-change-without-plan/);

  write(temporaryRoot, unrelatedSkillDesign, "# Unrelated design\n");
  write(temporaryRoot, unrelatedSkillPlan, "# Unrelated plan\n");
  result = run(
    process.execPath,
    [gatePath, "--repo", temporaryRoot, "--compare-ref", "HEAD"],
    { cwd: path.parse(temporaryRoot).root },
  );
  assert.notEqual(result.status, 0, "CLI accepted unmarked Skill-named documents");

  write(
    temporaryRoot,
    conventionalDesign,
    "# Game art production design\n\n" +
      "Skill evolution id: game-art-production\n" +
      "Skill evolution class: Restructure\n",
  );
  write(
    temporaryRoot,
    conventionalPlan,
    "# Game art production plan\n\n" +
      "Skill evolution id: mismatched-plan\n" +
      "Skill evolution class: Restructure\n",
  );
  result = run(
    process.execPath,
    [gatePath, "--repo", temporaryRoot, "--compare-ref", "HEAD"],
    { cwd: path.parse(temporaryRoot).root },
  );
  assert.notEqual(result.status, 0, "CLI accepted mismatched structural evidence ids");
  assert.match(result.stderr, /structural-skill-change-without-matching-design-plan/);

  write(
    temporaryRoot,
    conventionalDesign,
    "# Game art production design\n\n" +
      "Skill evolution id: Game-Art-Production\n" +
      "Skill evolution class: Restructure\n",
  );
  write(
    temporaryRoot,
    conventionalPlan,
    "# Game art production plan\n\n" +
      "Skill evolution id: game-art-production\n" +
      "Skill evolution class: Restructure\n",
  );
  result = run(
    process.execPath,
    [gatePath, "--repo", temporaryRoot, "--compare-ref", "HEAD"],
    { cwd: path.parse(temporaryRoot).root },
  );
  assert.notEqual(result.status, 0, "CLI accepted a non-lowercase evolution id");

  write(
    temporaryRoot,
    conventionalDesign,
    "# Game art production design\n\n" +
      "Skill evolution id: game-art-production\n" +
      "Skill evolution class: Restructure\n",
  );
  result = run(
    process.execPath,
    [gatePath, "--repo", temporaryRoot, "--compare-ref", "HEAD"],
    { cwd: path.parse(temporaryRoot).root },
  );
  assert.equal(result.status, 0, `CLI rejected complete structural evidence:\n${result.stderr}`);

  assert.equal(run("git", ["add", "."], { cwd: temporaryRoot }).status, 0);
  assert.equal(
    run("git", ["commit", "-q", "-m", "structural baseline"], {
      cwd: temporaryRoot,
    }).status,
    0,
  );
  const renamedReference =
    "plugins/game-production-workflow/skills/game-production-system/references/renamed-loop.md";
  assert.equal(
    run("git", ["mv", executionReference, renamedReference], {
      cwd: temporaryRoot,
    }).status,
    0,
  );
  for (const relative of [behaviorTest, conventionalDesign, conventionalPlan]) {
    fs.appendFileSync(path.join(temporaryRoot, relative), "\nrename evidence\n", "utf8");
  }
  result = run(
    process.execPath,
    [gatePath, "--repo", temporaryRoot, "--compare-ref", "HEAD"],
    { cwd: path.parse(temporaryRoot).root },
  );
  assert.equal(result.status, 0, `CLI rejected a covered Skill rename:\n${result.stderr}`);

  assert.equal(run("git", ["add", "."], { cwd: temporaryRoot }).status, 0);
  assert.equal(
    run("git", ["commit", "-q", "-m", "rename reference"], {
      cwd: temporaryRoot,
    }).status,
    0,
  );
  fs.rmSync(path.join(temporaryRoot, renamedReference));
  for (const relative of [behaviorTest, conventionalDesign, conventionalPlan]) {
    fs.appendFileSync(path.join(temporaryRoot, relative), "\ndelete evidence\n", "utf8");
  }
  result = run(
    process.execPath,
    [gatePath, "--repo", temporaryRoot, "--compare-ref", "HEAD"],
    { cwd: path.parse(temporaryRoot).root },
  );
  assert.equal(result.status, 0, `CLI rejected a covered Skill deletion:\n${result.stderr}`);
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}

const verifyText = fs.readFileSync(path.join(repositoryRoot, "verify.ps1"), "utf8");
assert.match(verifyText, /skill-evolution-policy\.mjs/);
assert.match(verifyText, /test-skill-evolution-policy\.mjs/);
assert.match(verifyText, /--compare-ref\s+\$CompareRef/);

console.log("PASS Skill evolution policy");
