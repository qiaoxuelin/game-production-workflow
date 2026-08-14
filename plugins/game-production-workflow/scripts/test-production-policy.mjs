import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../../..");
const pluginRoot = path.resolve(scriptDirectory, "..");
const skillRoot = path.join(pluginRoot, "skills/game-production-system");
const artSkillRoot = path.join(pluginRoot, "skills/game-art-production");

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
const artSkill = read(
  "plugins/game-production-workflow/skills/game-art-production/SKILL.md",
);
const artOpenaiYaml = read(
  "plugins/game-production-workflow/skills/game-art-production/agents/openai.yaml",
);
const readme = read("README.md");

const baseVersion = manifest.version.split("+", 1)[0];
const policyVersion = checker.match(/policyVersion\s*=\s*'([^']+)'/)?.[1];
const bootstrapVersion = bootstrap.match(/systemVersion\s*=\s*'([^']+)'/)?.[1];

assert.equal(baseVersion, "1.8.0", "plugin base version must be 1.8.0");
assert.equal(policyVersion, baseVersion, "policy and plugin versions must match");
assert.equal(
  bootstrapVersion,
  baseVersion,
  "new projects must bootstrap the current policy contract",
);
assert.match(readme, /game-production-system` `1\.8\.0/);

for (const skillName of [
  "game-production-system",
  "game-art-production",
  "game-approval-ui",
]) {
  const bundledSkillRoot = path.join(pluginRoot, "skills", skillName);
  assert(
    fs.existsSync(bundledSkillRoot) && fs.statSync(bundledSkillRoot).isDirectory(),
    `atomic plugin is missing bundled Skill directory: ${skillName}`,
  );
}

for (const [agentPath, label] of [
  [path.join(skillRoot, "agents/openai.yaml"), "production"],
  [path.join(artSkillRoot, "agents/openai.yaml"), "art"],
]) {
  assert(fs.existsSync(agentPath), `atomic plugin is missing ${label} agents/openai.yaml`);
}
assert.match(openaiYaml, /execute the next player-visible game slice/i);
assert.match(artOpenaiYaml, /produce or review the next interactive UI\/2D visual slice/i);

const artDescription = artSkill.match(/^description:\s*(.+)$/mu)?.[1] ?? "";
assert(artDescription.length > 0 && artDescription.length <= 500, "art Skill route description must be present and at most 500 characters");
assert.match(
  artDescription,
  /interactive UI\/2D[\s\S]*flattened-composite decomposition[\s\S]*project-native integration[\s\S]*runtime visual proof[\s\S]*professional visual review/i,
  "art Skill route description must remain bound to its interactive UI/2D scope",
);

assert.match(readme, /原子安装三个独立 Skill 和审批 MCP/);
for (const skillName of [
  "game-production-system",
  "game-art-production",
  "game-approval-ui",
]) {
  assert(readme.includes(`\`${skillName}\``), `README must list bundled Skill: ${skillName}`);
}

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
const immediatelyRepeatedCoreLines = coreSkill
  .split(/\r?\n/)
  .filter((line, index, lines) => line.trim() && line === lines[index - 1]);
assert.deepEqual(
  immediatelyRepeatedCoreLines,
  [],
  "core SKILL.md contains an immediately repeated instruction",
);
const substantialFeatureRoute = coreSkill.match(
  /### Start a substantial feature([\s\S]*?)### Execute a ready task/,
)?.[1];
assert(substantialFeatureRoute, "core is missing the substantial-feature route");
assert.match(
  substantialFeatureRoute,
  /game-art-production[\s\S]*must\s+not[\s\S]*routine accepted-baseline Fast repairs[\s\S]*non-art\/non-visual work/i,
  "accepted-baseline Fast repairs and non-visual work must not load the art Skill",
);
assert.match(
  substantialFeatureRoute,
  /character[\s\S]*environment[\s\S]*3D[\s\S]*animation[\s\S]*VFX[\s\S]*technical-art[\s\S]*broad visual[\s\S]*visual-production\.md/i,
  "broader visual crafts must remain on visual-production.md",
);
const ownerAssignmentPosition = substantialFeatureRoute.search(
  /assign only (?:the )?needed (?:Standard\/Full )?domain-design\s+owners/i,
);
const ownerInspectionPosition = substantialFeatureRoute.search(
  /each design owner[\s\S]*inspect(?:s)? applicable references/i,
);
const ownerDecisionPosition = substantialFeatureRoute.search(
  /domain-design\s+owners\.\s+They decide/i,
);
assert(ownerAssignmentPosition >= 0, "Standard/Full must assign only needed domain-design owners");
assert(
  ownerDecisionPosition > ownerAssignmentPosition,
  "needed domain-design owners must be assigned before their decisions",
);
assert(
  ownerInspectionPosition > ownerAssignmentPosition,
  "needed domain-design owners must be assigned before their decisions and inspections",
);
for (const [obligation, pattern] of [
  ["identify applicable design domains", /identify applicable design domains/i],
  ["inspect applicable references", /each design owner[\s\S]*inspect(?:s)? applicable references/i],
  ["define the applicable completeness representation", /define the applicable completeness representation/i],
  ["pass the cheapest static validator before Frozen", /(?:run and pass|pass)[\s\S]*cheapest\s+static (?:check|validator)[\s\S]*before `Frozen`/i],
]) {
  assert.match(
    substantialFeatureRoute,
    pattern,
    `substantial-feature design must ${obligation}`,
  );
}
assert.match(
  substantialFeatureRoute,
  /minimum executable decisions[\s\S]*`TASK\.md` or one referenced baseline/i,
  "the alternate executable-decision baseline must be referenced from the task route",
);
for (const [operation, load, result] of [
  ["Explore/discuss", "Project truth and relevant source", "Conversation only; no writes"],
  ["Diagnose/review", "Affected source and craft reference", "Report only; no repair"],
  ["Initialize, adopt, or plan", "`workflow.md` plus selected references", "Executable repository contract"],
  ["Execute or continue", "`execution.md` plus affected craft", "Player-visible or capability delta"],
  ["Close", "`workflow.md` completion/evidence sections", "Verified recoverable handoff"],
  ["Review a gate", "`roles-and-gates.md`", "Read-only gate verdict"],
]) {
  const row = coreSkill
    .split(/\r?\n/)
    .find((line) => line.startsWith("|") && line.includes(`**${operation}**`));
  assert(row, `operation router is missing ${operation}`);
  assert(
    row.includes(load) && row.includes(result),
    `${operation} must preserve its load and permitted-result mapping`,
  );
}
assert(fs.existsSync(skillRoot), "game-production-system skill root is missing");

assert(
  fs.existsSync(executionPath),
  "standalone production execution reference is missing",
);
const execution = fs.readFileSync(executionPath, "utf8");
for (const [rationalization, routeFragments] of [
  ["A renamed candidate is progress.", ["Compare evidence against the same failed criterion", "invoke stop-loss"]],
  ["A composed image is the runtime UI or asset inventory.", ["Execute the player-action-to-runtime chain", "prove assembly before bulk work"]],
  ["An external Skill is missing, so return to planning.", ["Use an available or replaceable capability", "do not reopen a healthy Ready contract"]],
  ["Tests pass, so experience quality passed.", ["Keep objective validity separate", "integrated acceptance"]],
]) {
  const row = execution
    .split(/\r?\n/)
    .find((line) => line.startsWith("|") && line.includes(`**${rationalization}**`));
  assert(row, `execution guidance is missing red flag ${rationalization}`);
  for (const fragment of routeFragments) {
    assert(
      row.includes(fragment),
      `${rationalization} is missing recovery route fragment: ${fragment}`,
    );
  }
}
assert.match(coreSkill, /### Execute a ready task/);
assert.match(coreSkill, /references\/execution\.md/);
assert.match(
  coreSkill,
  /### Continue a project[\s\S]*run `Execute a ready task`/,
  "continue must route authorized Ready work into production instead of stopping at status review",
);
assert.match(execution, /standalone lifecycle authority/i);
assert.match(
  coreSkill,
  /load only the references selected by the Operation\s+router/i,
  "startup must preserve progressive disclosure instead of preloading workflow.md",
);
assert.match(
  execution,
  /reuse a passing capability handshake[\s\S]*environment[\s\S]*unchanged/i,
  "execution should reuse a current capability result for an unchanged environment",
);
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
assert.match(
  projectInstructions,
  /intact installed 1\.8 plugin[\s\S]*game-art-production[\s\S]*required/i,
  "project instructions must honor the intact installed art route",
);
const normalizedProjectInstructions = projectInstructions.replace(/\s+/g, " ");
const damagedProjectStart = normalizedProjectInstructions.indexOf(
  "An installed 1.8 plugin missing `game-art-production`",
);
const repositoryOnlyStart = normalizedProjectInstructions.indexOf(
  "Repository-only with no plugin",
);
assert(damagedProjectStart >= 0, "project instructions are missing the damaged installed branch");
const damagedProjectCompletion = "no art-path completion.";
const damagedProjectEnd =
  normalizedProjectInstructions.indexOf(damagedProjectCompletion, damagedProjectStart) +
  damagedProjectCompletion.length;
assert(
  damagedProjectEnd > damagedProjectStart,
  "project damaged installed branch must be a bounded clause",
);
assert(
  repositoryOnlyStart > damagedProjectEnd,
  "repository-only fallback must be a distinct branch after the damaged installed branch",
);
const damagedProjectClause = normalizedProjectInstructions.slice(
  damagedProjectStart,
  damagedProjectEnd,
);
assert.match(damagedProjectClause, /integrity failure/i);
assert.match(damagedProjectClause, /(?:repair|reinstall)/i);
assert.match(damagedProjectClause, /no art-path completion/i);
assert.doesNotMatch(
  damagedProjectClause,
  /repository-only|interaction-to-visual/i,
  "a damaged installed bundle must not fall through to repository-only fallback",
);

const repositoryOnlyEnd = normalizedProjectInstructions.indexOf(
  "## Design and player-facing quality",
  repositoryOnlyStart,
);
assert(
  repositoryOnlyEnd > repositoryOnlyStart,
  "repository-only fallback must end before the design policy section",
);
const repositoryOnlyClause = normalizedProjectInstructions.slice(
  repositoryOnlyStart,
  repositoryOnlyEnd,
);
assert.match(
  repositoryOnlyClause,
  /declared greybox boundaries/i,
  "repository-only greybox boundaries must be declared explicitly",
);
assert.match(
  repositoryOnlyClause,
  /must not claim use of the dedicated protocol or unavailable subjective authority/i,
);
assert.match(
  repositoryOnlyClause,
  /must not claim proof(?: or proof results?)? the environment did not observe/i,
);
assert.doesNotMatch(
  repositoryOnlyClause,
  /(?:proof|proof results?)[^.]*\bran\b/i,
  "proof truthfulness must limit unsupported evidence claims, not whether proof 'ran'",
);
assert.match(
  execution,
  /external generation, design, and browser tools[\s\S]*optional capability techniques[\s\S]*never lifecycle prerequisites/i,
  "external art capabilities must remain optional techniques",
);
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
