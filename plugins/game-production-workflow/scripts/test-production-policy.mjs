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
const taskTemplate = read(
  "plugins/game-production-workflow/skills/game-production-system/assets/project-template/production/TASK.md",
);
const readme = read("README.md");

const baseVersion = manifest.version.split("+", 1)[0];
const policyVersion = checker.match(/policyVersion\s*=\s*'([^']+)'/)?.[1];
const bootstrapVersion = bootstrap.match(/systemVersion\s*=\s*'([^']+)'/)?.[1];

assert.equal(baseVersion, "1.6.0", "plugin base version must be 1.6.0");
assert.equal(policyVersion, baseVersion, "policy and plugin versions must match");
assert.equal(
  bootstrapVersion,
  baseVersion,
  "new projects must bootstrap the current policy contract",
);
assert.match(readme, /game-production-system` `1\.6\.0/);

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

const coreLineCount = coreSkill.trimEnd().split(/\r?\n/).length;
assert(
  coreLineCount <= 500,
  `core SKILL.md grew to ${coreLineCount} lines; keep details in references`,
);
assert(fs.existsSync(skillRoot), "game-production-system skill root is missing");

console.log(
  "PASS production policy v1.6 interactive visual contract and compatibility structure",
);
