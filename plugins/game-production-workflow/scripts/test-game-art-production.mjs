import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(scriptDirectory, "../skills/game-art-production");
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
