import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(scriptDirectory, "../skills/game-art-production");
const coreRoot = path.resolve(scriptDirectory, "../skills/game-production-system");
const wordCount = (text) => text.trim().split(/\s+/u).length;
const routeBaselines = Object.freeze({
  nonArtProduce: 5586,
  design: 9462,
  produce: 6877,
});
const requiredFiles = [
  "SKILL.md",
  "agents/openai.yaml",
  "references/visual-design.md",
  "references/interactive-ui-2d.md",
  "references/visual-review.md",
  "references/visual-production.md",
  "references/spatial-3d.md",
  "references/animation-vfx.md",
];

for (const relativePath of requiredFiles) {
  assert(fs.existsSync(path.join(skillRoot, relativePath)), `missing game art production file: ${relativePath}`);
}

const skill = fs.readFileSync(path.join(skillRoot, "SKILL.md"), "utf8");
const coreSkill = fs.readFileSync(path.join(coreRoot, "SKILL.md"), "utf8");
const execution = fs.readFileSync(path.join(coreRoot, "references/execution.md"), "utf8");
const workflow = fs.readFileSync(path.join(coreRoot, "references/workflow.md"), "utf8");
const visualProduction = fs.readFileSync(
  path.join(skillRoot, "references/visual-production.md"),
  "utf8",
);
const experienceReview = fs.readFileSync(
  path.join(coreRoot, "references/experience-review.md"),
  "utf8",
);
const projectInstructions = fs.readFileSync(
  path.join(coreRoot, "assets/project-template/AGENTS.md"),
  "utf8",
);
const expectedDescription = "Design, produce, integrate, or professionally review game art across UI, 2D, 3D characters and environments, animation, VFX, and technical art. Use for visual direction, editable assets, or runtime visual quality within a game task.";
const expectedFrontmatter = `---
name: game-art-production
description: ${expectedDescription}
---
`;
const frontmatterMatch = skill.match(/^---\n([\s\S]*?)\n---\n/);
assert(frontmatterMatch, "SKILL.md must start with YAML frontmatter");
assert.equal(frontmatterMatch[0], expectedFrontmatter, "frontmatter must be the exact required two-key block");
const discoveryEntries = frontmatterMatch[1]
  .split("\n")
  .filter((line) => /^description\s*:/u.test(line));
assert.equal(discoveryEntries.length, 1, "frontmatter must contain exactly one discovery entry");
assert(expectedDescription.length <= 500, "required description must remain at most 500 characters");

const operationManifest = skill.match(
  /\| Operation \| Load \|\n\| --- \| --- \|\n((?:\|.*\n){3})/u,
)?.[1];
assert(operationManifest, "art Skill must declare a three-operation static manifest");
const manifestRows = [...operationManifest.matchAll(/^\| `([^`]+)` \| (.+) \|$/gmu)]
  .map(([, operation, reference]) => [operation, reference]);
assert.deepEqual(manifestRows, [
  ["Design", "`references/visual-design.md`"],
  ["Produce", "UI/2D surfaces: `references/interactive-ui-2d.md`; other art: `references/visual-production.md`"],
  ["Review", "`references/visual-review.md`"],
], "art operations must retain conditional UI/2D versus other-art production loading");

const startRoute = coreSkill.match(
  /### Start a substantial feature([\s\S]*?)### Execute a ready task/,
)?.[1];
assert(startRoute, "core is missing the substantial-feature route");
assert.match(
  startRoute,
  /unresolved\s+or\s+selected-without-frozen-implementable-production-design\s+visual direction[\s\S]*game-art-production[\s\S]*`Design`/i,
  "unresolved interactive UI/2D direction must route to Design",
);
assert.match(
  startRoute,
  /selected-without-frozen-implementable-production-design[\s\S]{0,160}game-art-production[\s\S]{0,80}`Design`/i,
  "a selected Direction without frozen implementable Production design must route to the second Design pass",
);
assert.match(
  startRoute,
  /must\s+not load for accepted-baseline Fast repairs or non-art\/non-visual work/i,
  "accepted-baseline Fast repairs and non-art work must stay off the art route",
);

const executeRoute = coreSkill.match(
  /### Execute a ready task([\s\S]*?)### Continue a project/,
)?.[1];
assert(executeRoute, "core is missing the ready-task route");
assert.match(
  executeRoute,
  /`Ready`\s+or\s+`Implementing`[\s\S]*art work beyond accepted-baseline Fast repairs[\s\S]*game-art-production[\s\S]*`Produce`/i,
  "matching Ready/Implementing interactive UI/2D work must route to Produce",
);
assert.match(executeRoute, /flattened-composite finality/i);
assert.match(executeRoute, /maturity\/fidelity claims truthful/i);
assert.match(executeRoute, /actual target-project evidence/i);
assert.match(executeRoute, /representative assembly\/runtime proof[\s\S]*before bulk/i);

const diagnoseRoute = coreSkill
  .split(/\r?\n/)
  .find((line) => line.startsWith("|") && line.includes("**Diagnose/review**"));
assert.match(
  diagnoseRoute ?? "",
  /game-art-production[\s\S]*`Review`[\s\S]*professional visual diagnosis[\s\S]*requested/i,
  "requested professional UI/2D diagnosis must route to Review",
);

const gateRoute = coreSkill.match(/### Review a gate([\s\S]*?)## Non-negotiable rules/)?.[1];
assert(gateRoute, "core is missing the gate-review route");
assert.match(
  gateRoute,
  /game-art-production[\s\S]*`Review`[\s\S]*professional visual gate\s+evidence[\s\S]*required/i,
  "required professional UI/2D gate evidence must route to Review",
);

const interactiveExecution = execution.match(
  /## Interactive visual execution\n\n([\s\S]*?)\n\n## Optional external-Skill interoperability/,
)?.[1];
assert.match(
  interactiveExecution ?? "",
  /^For matching art work beyond accepted-baseline Fast repairs, use `game-art-production` `Produce`/i,
  "interactive visual execution must begin with the additive Produce route",
);
assert.match(interactiveExecution ?? "", /flattened composite[\s\S]*never[\s\S]*final/i);
assert.match(
  interactiveExecution ?? "",
  /Bulk\s+production unlocks\s+only[\s\S]*assembly precheck[\s\S]*runtime proof/i,
);
assert.match(interactiveExecution ?? "", /maturity[\s\S]*fidelity[\s\S]*truthful/i);
assert.match(
  interactiveExecution ?? "",
  /actual\s+target project[\s\S]*real\s+input[\s\S]*authoritative\s+state[\s\S]*evidence/i,
);

assert.match(
  coreSkill,
  /intact 1\.8 plugin\s+requires bundled `game-art-production` for matching art\s+work/i,
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
  /declared greybox boundaries/i,
  "repository-only greybox boundaries must be declared explicitly",
);
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
assert.match(
  visualDesign,
  /player input[^\n]*intent\/action[^\n]*authoritative pre\/post state[^\n]*presentation state\/component[^\n]*feedback[^\n]*(?:completion|interruption)[^\n]*failure\/recovery/i,
  "selected UI direction must become an explicit interaction-to-visual design chain",
);
const assertUiInteractionPolicy = ({ design, produce, review }) => {
  assert.match(
    design,
    /only when[^\n]*`Interactive visual scope`[^\n]*`Required`[^\n]*player-operated surface/i,
    "interaction behavior must be conditional on a player-operated surface",
  );
  assert.match(
    design,
    /required solely for non-interactive (?:composition|render)[^\n]*does not invoke[^\n]*interaction contract/i,
    "non-interactive composition must retain render/spatial design without interaction burden",
  );
  assert.match(
    design,
    /pointer\/touch\/keyboard\/controller[^\n]*focus order[^\n]*directional\/default\/restored focus[^\n]*hit regions[^\n]*unavailable controls/i,
    "Design must expose applicable input and focus mechanics",
  );
  assert.match(
    design,
    /pressed\/selected\/disabled\/loading\/success\/error\/cancel\/recovery[^\n]*reduced motion[^\n]*platform differences/i,
    "Design must expose critical states, reduced motion, and platform differences",
  );
  assert.match(
    produce,
    /If product behavior is missing or contradictory, return the design boundary instead of deciding it/i,
    "Produce must return missing product behavior rather than deciding it locally",
  );
  assert.match(
    review,
    /trace real input through authoritative state to visible feedback/i,
    "Review must trace real interaction causality",
  );
  assert.match(
    review,
    /focus\/navigation[^\n]*timing\/interruption[^\n]*failure\/recovery/i,
    "Review must inspect dynamic interaction conformance",
  );
  assert.doesNotMatch(
    review,
    /focus\/navigation[^\n]*timing\/interruption[^\n]*failure\/recovery[^\n]*not inspected/i,
    "Review must not negate dynamic interaction inspection",
  );
};
assert.match(
  visualDesign,
  /one consolidated[^\n]*(?:board|behavior matrix|annotated flow|bounded interactive prototype)/i,
  "interaction design evidence must stay consolidated and tool-agnostic",
);
assert.match(
  visualDesign,
  /static keyframe or state sheet alone[^\n]*cannot[^\n]*(?:interaction-ready|freeze)/i,
  "static UI art alone must not establish an interaction-ready design",
);
assert.match(
  visualDesign,
  /simulat(?:e|ed)[^\n]*disclos[^\n]*never[^\n]*target-project runtime proof/i,
  "a Design prototype must not impersonate target-project runtime evidence",
);
assert.match(
  visualDesign,
  /pre-freeze[^\n]*Design-owned[^\n]*(?:prototype|feasibility evidence)[^\n]*core[^\n]*freeze[^\n]*before `Produce`/i,
  "target-project production must not become a circular precondition for design freeze",
);

const interactiveUi2d = fs.readFileSync(path.join(skillRoot, "references/interactive-ui-2d.md"), "utf8");
assert.match(interactiveUi2d, /select one dominant root cause or subsystem/i);
assert.match(interactiveUi2d, /one bounded repair batch total for the operation/i);
assert.doesNotMatch(interactiveUi2d, /one bounded repair batch per root cause\/subsystem/i);
assert.match(interactiveUi2d, /canonical editable source[\s\S]*rollback checkpoint/i);
assert.match(
  interactiveUi2d,
  /Precheck shared space[\s\S]*spatial master[\s\S]*actual-size layered or project-native assembly/i,
);
assert.match(interactiveUi2d, /applicable real input and authoritative state/i);
assert.match(interactiveUi2d, /actual target project[\s\S]*actual runtime proof/i);
assert.match(
  interactiveUi2d,
  /consume[^\n]*frozen interaction-to-visual mapping/i,
  "Produce must consume the frozen interaction design instead of recreating it",
);
assert.match(
  interactiveUi2d,
  /missing or contradictory[^\n]*return[^\n]*(?:Design|design boundary)/i,
  "Produce must return missing product interaction decisions",
);
assert.match(
  interactiveUi2d,
  /expected-versus-observed[^\n]*conformance/i,
  "runtime observation must compare the implementation with frozen behavior",
);

const visualReview = fs.readFileSync(path.join(skillRoot, "references/visual-review.md"), "utf8");
assert.match(
  visualReview,
  /real input[^\n]*authoritative state[^\n]*visible feedback/i,
  "visual review must inspect real interaction-to-visual causality",
);

const assertComparisonBasisPolicy = ({ production, review, experience }) => {
  assert.match(
    review,
    /`reference_replication`[\s\S]*named external reference[\s\S]*`original_design`[\s\S]*frozen internal Production design/i,
    "Review must choose an external or frozen internal comparison basis by development mode",
  );
  assert.match(
    production,
    /original design[\s\S]*frozen internal Production design[\s\S]*category benchmarks[\s\S]*non-authoritative/i,
    "original visual production must use an internal baseline without promoting inspiration to authority",
  );
  assert.match(
    experience,
    /Product quality:[\s\S]*comparison basis[\s\S]*frozen internal baseline[\s\S]*category quality bar/i,
    "independent experience review must accept an internal comparison basis",
  );
  assert.match(
    review,
    /before a trustworthy internal baseline[\s\S]*Direction candidates[\s\S]*recommendation only[\s\S]*no design-conformance or product-quality passage/i,
    "pre-freeze original design may receive direction advice but no conformance or quality passage",
  );
  assert.doesNotMatch(
    review,
    /category benchmarks?[^.]*become (?:frozen )?(?:product )?requirements?/i,
    "category benchmarks must not silently become product requirements",
  );
};

assertComparisonBasisPolicy({
  production: visualProduction,
  review: visualReview,
  experience: experienceReview,
});

assertUiInteractionPolicy({
  design: visualDesign,
  produce: interactiveUi2d,
  review: visualReview,
});

const requiredMutation = (source, pattern, replacement, label) => {
  const mutated = source.replace(pattern, replacement);
  assert.notEqual(mutated, source, `${label}: mutation did not apply`);
  return mutated;
};

for (const mutation of [
  {
    label: "unconditional interaction burden",
    sources: {
      design: requiredMutation(
        visualDesign,
        /only when[^.]+player-operated surface[^.]*\./i,
        "regardless of whether `Interactive visual scope` is `Required`, define interaction behavior for every visual surface.",
        "unconditional interaction burden",
      ),
      produce: interactiveUi2d,
      review: visualReview,
    },
  },
  {
    label: "Produce invents missing product behavior",
    sources: {
      design: visualDesign,
      produce: requiredMutation(
        interactiveUi2d,
        /If product behavior is missing or contradictory, return the design boundary instead of deciding it/i,
        "If product behavior is missing or contradictory, do not return the design boundary; decide it locally",
        "Produce invents missing product behavior",
      ),
      review: visualReview,
    },
  },
  {
    label: "Review skips dynamic conformance",
    sources: {
      design: visualDesign,
      produce: interactiveUi2d,
      review: requiredMutation(
        visualReview,
        /focus\/navigation, timing\/interruption, failure\/recovery/i,
        "focus/navigation, timing/interruption, and failure/recovery are not inspected",
        "Review skips dynamic conformance",
      ),
    },
  },
]) {
  assert.throws(
    () => assertUiInteractionPolicy(mutation.sources),
    undefined,
    `${mutation.label}: semantic inversion must be rejected`,
  );
}

for (const mutation of [
  {
    label: "original design requires an external reference",
    sources: {
      production: visualProduction,
      review: visualReview.replace(
        /`original_design`[\s\S]*?frozen internal Production design/i,
        "`original_design` requires a named external reference",
      ),
      experience: experienceReview,
    },
  },
  {
    label: "category inspiration becomes product authority",
    sources: {
      production: visualProduction,
      review: `${visualReview}\nCategory benchmarks become frozen product requirements.\n`,
      experience: experienceReview,
    },
  },
  {
    label: "unbased original design receives quality passage",
    sources: {
      production: visualProduction,
      review: visualReview.replace(
        /no design-conformance or product-quality passage/i,
        "a design-conformance and product-quality Pass",
      ),
      experience: experienceReview,
    },
  },
]) {
  assert.throws(
    () => assertComparisonBasisPolicy(mutation.sources),
    undefined,
    `${mutation.label}: comparison-basis mutation must be rejected`,
  );
}

const candidateRoutes = {
  nonArtProduce: wordCount(coreSkill) + wordCount(execution),
  design: wordCount(coreSkill) + wordCount(workflow) + wordCount(skill) + wordCount(visualDesign),
  produce: wordCount(coreSkill) + wordCount(execution) + wordCount(skill) + wordCount(interactiveUi2d),
};
assert(
  candidateRoutes.nonArtProduce <= routeBaselines.nonArtProduce,
  `non-art Produce route exceeds baseline: ${candidateRoutes.nonArtProduce} > ${routeBaselines.nonArtProduce}`,
);
assert(
  candidateRoutes.design <= routeBaselines.design,
  `Design route exceeds baseline: ${candidateRoutes.design} > ${routeBaselines.design}`,
);
assert(
  candidateRoutes.produce < routeBaselines.produce,
  `Produce route must improve on baseline: ${candidateRoutes.produce} >= ${routeBaselines.produce}`,
);

assert.match(
  coreSkill,
  /Art owns UI\/2D, character\/environment, 3D, animation, VFX, and technical-art\s+craft[\s\S]*domain router/i,
  "all visual craft must route to the art owner",
);
assert.match(visualProduction, /asset-family split[\s\S]*shared masters/i);
assert.match(visualProduction, /editor scene for 3D/i);
assert.match(visualProduction, /For animation and VFX[\s\S]*anticipation[\s\S]*settle\/recovery/i);
assert.match(visualProduction, /For technical art[\s\S]*deterministic engine import/i);
assert.match(
  visualProduction,
  /shared masters[\s\S]*state or\s+content variants[\s\S]*runtime purpose/i,
);
assert.match(
  visualProduction,
  /Runtime golden:[\s\S]*actual engine result passes at target size and relevant\s+states/i,
);
assert.match(experienceReview, /actual runtime artifact[\s\S]*hard\s+return conditions/i);
assert.match(experienceReview, /target size\/device and normal player pace/i);
assert.match(
  experienceReview,
  /automated success as a substitute for normal-scale runtime judgment/i,
);

const agentMetadata = fs.readFileSync(path.join(skillRoot, "agents/openai.yaml"), "utf8");
assert.equal(agentMetadata, `interface:
  display_name: "游戏美术制作"
  short_description: "设计、制作、集成并评审游戏 UI、2D、3D 美术、动画与特效"
  default_prompt: "Use $game-art-production within the core-owned game task to produce or review the next game-art slice."
`);

console.log("game art production skill structure and authority contracts passed");
