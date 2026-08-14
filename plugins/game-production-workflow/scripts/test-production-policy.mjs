import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../../..");
const pluginRoot = path.resolve(scriptDirectory, "..");
const skillRoot = path.join(pluginRoot, "skills/game-production-system");

const read = (relativePath) =>
  fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");

const manifest = JSON.parse(
  read("plugins/game-production-workflow/.codex-plugin/plugin.json"),
);
const checker = read(
  "plugins/game-production-workflow/skills/game-production-system/scripts/check.ps1",
);
const bootstrap = read(
  "plugins/game-production-workflow/skills/game-production-system/scripts/bootstrap.ps1",
);
const coreSkill = read(
  "plugins/game-production-workflow/skills/game-production-system/SKILL.md",
);
const visualProduction = read(
  "plugins/game-production-workflow/skills/game-production-system/references/visual-production.md",
);
const experienceReview = read(
  "plugins/game-production-workflow/skills/game-production-system/references/experience-review.md",
);
const executionPath = path.join(
  skillRoot,
  "references/execution.md",
);
const taskTemplate = read(
  "plugins/game-production-workflow/skills/game-production-system/assets/project-template/production/TASK.md",
);
const projectInstructions = read(
  "plugins/game-production-workflow/skills/game-production-system/assets/project-template/AGENTS.md",
);
const openaiYaml = read(
  "plugins/game-production-workflow/skills/game-production-system/agents/openai.yaml",
);
const readme = read("README.md");

const baseVersion = manifest.version.split("+", 1)[0];
const policyVersion = checker.match(/policyVersion\s*=\s*'([^']+)'/)?.[1];
const bootstrapVersion = bootstrap.match(/systemVersion\s*=\s*'([^']+)'/)?.[1];

assert.equal(baseVersion, "1.7.1", "plugin base version must be 1.7.1");
assert.equal(policyVersion, baseVersion, "policy and plugin versions must match");
assert.equal(
  bootstrapVersion,
  baseVersion,
  "new projects must bootstrap the current policy contract",
);
assert.match(readme, /game-production-system` `1\.7\.1/);

for (const field of [
  "Interactive visual scope:",
  "Interaction/render contract:",
  "Assembly precheck:",
]) {
  assert.match(taskTemplate, new RegExp(field.replace("/", "\\/")));
}

assert.match(visualProduction, /authoritative state source/);
assert.match(visualProduction, /cheapest assembly precheck/);
assert.match(visualProduction, /Ready` requires the frozen contract/);
assert.match(visualProduction, /assembly precheck may remain `Pending`/);
assert.match(experienceReview, /interaction-to-visual causality/);

const v160Guard = checker.indexOf("if ($systemVersionAtLeast160) {");
assert.notEqual(v160Guard, -1, "v1.6 checks must have a compatibility guard");
for (const code of [
  "interactive_visual_scope_missing",
  "interactive_visual_fast_lane_conflict",
  "interaction_render_contract_missing",
  "visual_bulk_unlock_without_prechecks",
  "interactive_visual_acceptance_incomplete",
]) {
  const position = checker.indexOf(code);
  assert(position > v160Guard, `${code} must remain inside the v1.6 guard`);
}
assert.match(checker, /\$assemblyPrecheck -ne 'Pending'/);
assert.match(
  checker,
  /\$bulkOrParallelUnlock -notin @\('Locked', 'Not applicable'\)/,
);

const v171VocabularyGuard = checker.indexOf("if ($systemVersionAtLeast171) {");
const v171HandoffGuard = checker.indexOf(
  "if ($systemVersionAtLeast171 -and $executionLane -in @('Standard', 'Full')) {",
);
assert.notEqual(
  v171VocabularyGuard,
  -1,
  "v1.7.1 result vocabulary needs a compatibility guard",
);
assert.notEqual(
  v171HandoffGuard,
  -1,
  "v1.7.1 detailed handoff needs a compatibility and lane guard",
);
const prefixPosition = checker.indexOf("returned_candidate_result_prefix_invalid");
assert(
  prefixPosition > v171VocabularyGuard && prefixPosition < v171HandoffGuard,
  "ambiguous Result vocabulary must be guarded by version but apply to Fast",
);
for (const code of [
  "returned_candidate_status_conflict",
  "returned_candidate_result_missing",
  "returned_candidate_risk_contract_missing",
  "returned_candidate_next_action_missing",
  "returned_candidate_fallback_missing",
]) {
  const position = checker.indexOf(code);
  assert(position > v171HandoffGuard, `${code} must remain inside the Standard/Full v1.7.1 guard`);
}

const coreLineCount = coreSkill.trimEnd().split(/\r?\n/).length;
assert(
  coreLineCount <= 500,
  `core SKILL.md grew to ${coreLineCount} lines; keep details in references`,
);
const coreWordCount = coreSkill.trim().split(/\s+/).length;
assert(
  coreWordCount <= 4159,
  `core SKILL.md grew to ${coreWordCount} words; route details progressively instead of adding policy`,
);
assert.match(coreSkill, /## Operation router/);
for (const operation of [
  "Explore/discuss",
  "Diagnose/review",
  "Initialize, adopt, or plan",
  "Execute or continue",
  "Close",
  "Review a gate",
]) {
  assert.match(
    coreSkill,
    new RegExp(operation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    `operation router is missing ${operation}`,
  );
}
assert(fs.existsSync(skillRoot), "game-production-system skill root is missing");

assert(
  fs.existsSync(executionPath),
  "standalone production execution reference is missing",
);
const execution = fs.readFileSync(executionPath, "utf8");
for (const demonstratedRedFlag of [
  /renamed candidate.*progress/is,
  /composed image.*runtime UI/is,
  /external Skill.*missing.*planning/is,
  /tests pass.*experience quality/is,
]) {
  assert.match(
    execution,
    demonstratedRedFlag,
    `execution guidance is missing demonstrated red flag ${demonstratedRedFlag}`,
  );
}
assert.match(coreSkill, /### Execute a ready task/);
assert.match(coreSkill, /references\/execution\.md/);
assert.match(
  coreSkill,
  /### Continue a project[\s\S]*run `Execute a ready task`/,
  "continue must route authorized Ready work into production instead of stopping at status review",
);
assert.match(execution, /standalone lifecycle authority/i);
assert.match(execution, /player-visible product delta/i);
assert.match(execution, /external Skills are optional/i);
assert.match(
  execution,
  /do not invoke external discovery or planning Skills/i,
  "legacy Ready tasks must not be captured by mandatory external planning workflows",
);
assert.match(execution, /player action.*interface state.*asset family.*assembly.*runtime/is);
assert.match(projectInstructions, /External Skills are\s+optional accelerators/i);
assert.match(projectInstructions, /must reuse `production\/TASK\.md`/i);
assert.match(projectInstructions, /Select[\s\S]*Produce[\s\S]*Integrate[\s\S]*Observe[\s\S]*Repair[\s\S]*Checkpoint/i);
assert.match(projectInstructions, /Fast[\s\S]*no independent review or human approval/i);
assert.match(projectInstructions, /routine Fast UI repair[\s\S]*restoration Not applicable/i);
const projectInstructionLines = projectInstructions.trimEnd().split(/\r?\n/).length;
const projectInstructionWords = projectInstructions.trim().split(/\s+/).length;
assert(
  projectInstructionLines <= 120,
  `project AGENTS.md grew to ${projectInstructionLines} lines; keep stable project routing instead of copying policy`,
);
assert(
  projectInstructionWords <= 1100,
  `project AGENTS.md grew to ${projectInstructionWords} words; keep detailed policy in the installed Skill`,
);
assert.match(openaiYaml, /execute the next player-visible game slice/i);

const pluginPrompts = manifest.interface?.defaultPrompt ?? [];
assert(
  pluginPrompts.some((prompt) => /build the next player-visible slice/i.test(prompt)),
  "plugin prompts must expose direct game production, not only planning and approvals",
);

console.log(
  "PASS production policy interactive visual and standalone execution contracts",
);
