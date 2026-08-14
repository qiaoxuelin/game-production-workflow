import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(scriptDirectory, "../skills/game-art-production");
const coreRoot = path.resolve(scriptDirectory, "../skills/game-production-system");
const requiredFiles = [
  "SKILL.md",
  "agents/openai.yaml",
  "references/visual-design.md",
  "references/interactive-ui-2d.md",
  "references/visual-review.md",
];

for (const relativePath of requiredFiles) {
  assert(fs.existsSync(path.join(skillRoot, relativePath)), `missing game art production file: ${relativePath}`);
}

const skill = fs.readFileSync(path.join(skillRoot, "SKILL.md"), "utf8");
const coreSkill = fs.readFileSync(path.join(coreRoot, "SKILL.md"), "utf8");
const execution = fs.readFileSync(path.join(coreRoot, "references/execution.md"), "utf8");
const projectInstructions = fs.readFileSync(
  path.join(coreRoot, "assets/project-template/AGENTS.md"),
  "utf8",
);
const expectedDescription = "Use when interactive UI/2D game work needs a new or materially changed visual direction, screen, HUD, component/state system, flattened-composite decomposition, editable source production, project-native integration, runtime visual proof, or professional visual review.";
const expectedFrontmatter = `---
name: game-art-production
description: ${expectedDescription}
---
`;
const frontmatterMatch = skill.match(/^---\n([\s\S]*?)\n---\n/);
assert(frontmatterMatch, "SKILL.md must start with YAML frontmatter");
assert.equal(frontmatterMatch[0], expectedFrontmatter, "frontmatter must be the exact required two-key block");
assert(expectedDescription.length <= 500, "required description must remain at most 500 characters");

assert.match(skill, /\| `Design` \| `references\/visual-design\.md` \|/);
assert.match(skill, /\| `Produce` \| `references\/interactive-ui-2d\.md` \|/);
assert.match(skill, /\| `Review` \| `references\/visual-review\.md` \|/);

const startRoute = coreSkill.match(
  /### Start a substantial feature([\s\S]*?)### Execute a ready task/,
)?.[1];
assert(startRoute, "core is missing the substantial-feature route");
assert.match(
  startRoute,
  /unresolved\s+interactive UI\/2D direction[\s\S]*game-art-production[\s\S]*`Design`/i,
  "unresolved interactive UI/2D direction must route to Design",
);

const executeRoute = coreSkill.match(
  /### Execute a ready task([\s\S]*?)### Continue a project/,
)?.[1];
assert(executeRoute, "core is missing the ready-task route");
assert.match(
  executeRoute,
  /`Ready`\s+or\s+`Implementing`[\s\S]*interactive UI\/2D[\s\S]*game-art-production[\s\S]*`Produce`/i,
  "matching Ready/Implementing interactive UI/2D work must route to Produce",
);

const diagnoseRoute = coreSkill
  .split(/\r?\n/)
  .find((line) => line.startsWith("|") && line.includes("**Diagnose/review**"));
assert.match(
  diagnoseRoute ?? "",
  /game-art-production[\s\S]*`Review`[\s\S]*professional UI\/2D diagnosis[\s\S]*requested/i,
  "requested professional UI/2D diagnosis must route to Review",
);

const gateRoute = coreSkill.match(/### Review a gate([\s\S]*?)## Non-negotiable rules/)?.[1];
assert(gateRoute, "core is missing the gate-review route");
assert.match(
  gateRoute,
  /game-art-production[\s\S]*`Review`[\s\S]*professional UI\/2D gate\s+evidence[\s\S]*required/i,
  "required professional UI/2D gate evidence must route to Review",
);

const interactiveExecution = execution.match(
  /## Interactive visual execution\n\n([\s\S]*?)\n\nDo not treat/,
)?.[1];
assert.match(
  interactiveExecution ?? "",
  /^For matching interactive UI\/2D work, use `game-art-production` `Produce`/i,
  "interactive visual execution must begin with the additive Produce route",
);

assert.match(
  coreSkill,
  /intact 1\.8 plugin\s+requires bundled `game-art-production` for (?:the )?positive UI\/2D\s+predicate/i,
  "an intact 1.8 plugin must require its bundled art Skill",
);
const normalizedCore = coreSkill.replace(/\s+/g, " ");
const damagedCoreStart = normalizedCore.indexOf(
  "An installed 1.8 plugin missing `game-art-production`",
);
const repositoryCoreStart = normalizedCore.indexOf("Repository-only with no plugin");
assert(damagedCoreStart >= 0, "core is missing the damaged installed branch");
const damagedCoreCompletion = "no art-path completion.";
const damagedCoreEnd =
  normalizedCore.indexOf(damagedCoreCompletion, damagedCoreStart) +
  damagedCoreCompletion.length;
assert(damagedCoreEnd > damagedCoreStart, "core damaged installed branch must be a bounded clause");
assert(
  repositoryCoreStart > damagedCoreEnd,
  "core repository-only fallback must be distinct from damaged installed handling",
);
const damagedCoreClause = normalizedCore.slice(damagedCoreStart, damagedCoreEnd);
assert.match(damagedCoreClause, /bundle-integrity failure/i);
assert.match(damagedCoreClause, /report it/i);
assert.match(damagedCoreClause, /(?:repair|reinstall)/i);
assert.match(damagedCoreClause, /no art-path completion/i);
assert.doesNotMatch(
  damagedCoreClause,
  /repository-only|interaction-to-visual/i,
  "a damaged installed 1.8 bundle must not fall through to repository-only fallback",
);

const normalizedProjectInstructions = projectInstructions.replace(/\s+/g, " ");
const repositoryProjectStart = normalizedProjectInstructions.indexOf(
  "Repository-only with no plugin",
);
const repositoryProjectEnd = normalizedProjectInstructions.indexOf(
  "## Design and player-facing quality",
  repositoryProjectStart,
);
assert(repositoryProjectStart >= 0, "project instructions are missing repository-only fallback");
assert(
  repositoryProjectEnd > repositoryProjectStart,
  "repository-only fallback must end before the design policy section",
);
const repositoryProjectClause = normalizedProjectInstructions.slice(
  repositoryProjectStart,
  repositoryProjectEnd,
);
assert.match(repositoryProjectClause, /interaction-to-visual loop/i);
assert.match(
  repositoryProjectClause,
  /must not claim use of the dedicated protocol or unavailable subjective authority/i,
);
assert.match(
  repositoryProjectClause,
  /must not claim proof(?: or proof results?)? the environment did not observe/i,
);
assert.doesNotMatch(
  repositoryProjectClause,
  /(?:proof|proof results?)[^.]*\bran\b/i,
  "proof truthfulness must limit unsupported evidence claims, not whether proof 'ran'",
);

for (const field of [
  "Operation",
  "Professional result",
  "Maturity assessment",
  "Fidelity disclosure",
  "Outcome or claim",
  "Changed paths",
  "Coverage",
  "Runtime proof",
  "Source and recovery",
  "Bulk unlock",
  "Unresolved risks",
  "Recommended next delta",
]) {
  assert.match(skill, new RegExp(`\\b${field}\\b`), `missing transient handoff field: ${field}`);
}

assert.match(skill, /Direction[\s\S]*Production design[\s\S]*Runtime golden[\s\S]*Integrated acceptance/);
assert.match(skill, /Not established[\s\S]*absence/i);
assert.match(skill, /Not applicable[\s\S]*absence/i);
assert.match(skill, /must not[\s\S]{0,200}(?:create|own)[\s\S]{0,200}(?:TASK|PLAN)[\s\S]{0,200}(?:status|gate|approval)/i);
assert.match(skill, /must not[\s\S]{0,200}self[- ]approve[\s\S]{0,200}(?:golden|final)/i);

const visualDesign = fs.readFileSync(path.join(skillRoot, "references/visual-design.md"), "utf8");
assert.match(visualDesign, /Professional result:[^\n]*Production-design candidate/i);
assert.match(visualDesign, /Maturity assessment:[^\n]*core-supplied current maturity[^\n]*normally `Direction`[^\n]*until[^\n]*core[^\n]*freeze/i);
assert.match(visualDesign, /never report `Production design`[^\n]*before[^\n]*freeze/i);
assert.match(visualDesign, /do not replace[^\n]*established maturity[^\n]*`Not established`/i);

const interactiveUi2d = fs.readFileSync(path.join(skillRoot, "references/interactive-ui-2d.md"), "utf8");
assert.match(interactiveUi2d, /select one dominant root cause or subsystem/i);
assert.match(interactiveUi2d, /one bounded repair batch total for the operation/i);
assert.doesNotMatch(interactiveUi2d, /one bounded repair batch per root cause\/subsystem/i);

const agentMetadata = fs.readFileSync(path.join(skillRoot, "agents/openai.yaml"), "utf8");
assert.equal(agentMetadata, `interface:
  display_name: "游戏美术制作"
  short_description: "设计、制作、集成并评审交互式 UI 与 2D 游戏美术"
  default_prompt: "Use $game-art-production within the core-owned game task to produce or review the next interactive UI/2D visual slice."
`);

console.log("game art production skill structure and authority contracts passed");
