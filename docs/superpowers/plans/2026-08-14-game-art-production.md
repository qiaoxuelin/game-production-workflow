# Game Art Production 1.8.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Release a behavior-proven `game-art-production` Skill that improves interactive UI/2D design, source production, project-native assembly, runtime verification, and professional review without creating a second lifecycle or increasing routine non-art work.

**Architecture:** Keep `game-production-system` as the only task, lifecycle, gate, approval, and close authority. Add one progressively disclosed art Skill with `Design`, `Produce`, and `Review` operations, then route only the observable interactive UI/2D predicate into it; retain character, environment, 3D, animation, VFX, technical-art, and broad visual work on the existing path. Establish the need with 1.7.2 artifact-level controls before authoring the Skill, keep the first candidate additive, and extract only behavior-proven duplicate UI/2D instructions after the candidate fixtures pass.

**Tech Stack:** Markdown Skills and references, YAML agent metadata, JSON fixture/run records, dependency-free Node.js ESM fixture and policy tests, existing PowerShell governance/verifier scripts, and a minimal dependency-free browser fixture for real input/runtime inspection.

## Global Constraints

- Baseline commit is `1d77557` (`1.7.2+codex.20260814064925`); compare the control and candidate on identical fixture requests, starter repositories, capability profiles, and scoring contracts.
- Do not author `game-art-production` unless at least one primary 1.7.2 artifact control fails the required quality or incurs greater workflow/context burden. If both controls pass at equal or lower burden, commit the control evidence and stop this plan after Task 2.
- Keep `game-production-system` as the sole owner of `TASK`, `PLAN`, status, gate, approval, return, and close decisions. Do not add an art-specific task file, lifecycle state, approval layer, or required project schema field.
- Keep `game-approval-ui` as the only structured human-decision surface. Routine craft decisions and conformance checks do not create approval cards.
- The 1.8.0 mandatory art route covers interactive UI/2D only. Preserve every existing character, environment, 3D, animation, VFX, technical-art, and broad visual-production route.
- External image generation, Figma/design applications, browser/computer-control Skills, and third-party art Skills remain optional techniques. Base tools, project-native UI, vector/code-native sources, and honest greybox boundaries must remain valid routes.
- Use only `Direction`, `Production design`, `Runtime golden`, and `Integrated acceptance` as maturity levels. `Not established` and `Not applicable` are absence indicators, never maturity, fidelity, status, or passage.
- A direction image may express intent but cannot prove editable source, component/state separation, import, runtime behavior, or integrated acceptance. Translate a selected non-editable direction into editable production-design primitives before `Ready`.
- Keep bulk UI/2D production locked until a representative actual-size assembly precheck and target-project runtime proof pass.
- Preserve raw fixture work under ignored `.tmp/game-art-evals/`; commit only small fixture sources, machine-readable run summaries, hashes, and evidence references. Do not commit large captures, generated trials, private project content, credentials, or third-party assets.
- Use Node.js built-ins for new cross-platform scripts. Add no package manager, runtime dependency, or generative output dependency.
- Skill discovery metadata may add exactly one bundled Skill entry. Keep the `game-art-production` description at or below 500 characters and limited to observable trigger predicates.
- Measure context in separate buckets: discovery metadata, loaded Skill bodies, and loaded references. The 1.7.2 body/reference baselines are `nonArtProduce=5586`, `design=9462`, and `produce=6877` words.
- The final non-art route loads no art body/reference and does not exceed 5,586 body/reference words. The final common Design route does not exceed 9,462 words. The final common Produce route is strictly below 6,877 words.
- Existing 1.6/1.7 governed projects remain compatible without forced migration. New projects bootstrap the 1.8.0 semantic contract using the existing task fields.
- Do not add learning, upload, telemetry, shared-memory publication, or cross-project evolution behavior; those remain a separately designed concern and cannot block production.
- Preserve macOS, Linux, Windows argument/UTF-8, installer, doctor, approval, convergence, return, timeout, Fast-lane, evidence, link, and secret-scan contracts.
- Use `apply_patch` for tracked-file edits. Run the focused RED command before each behavior change, the focused GREEN command afterward, and the complete verifier before release readiness.
- Do not push, open a PR, merge, release, install into the user's active Codex environment, create a fresh Codex conversation, or mutate a live pilot project without the separate authorization required for that action.

---

### Task 1: Reproducible artifact fixture harness

**Files:**
- Create: `plugins/game-production-workflow/evals/game-art-production/design-direction/fixture.json`
- Create: `plugins/game-production-workflow/evals/game-art-production/design-direction/starter/AGENTS.md`
- Create: `plugins/game-production-workflow/evals/game-art-production/design-direction/starter/production/project.json`
- Create: `plugins/game-production-workflow/evals/game-art-production/design-direction/starter/production/PROJECT.md`
- Create: `plugins/game-production-workflow/evals/game-art-production/design-direction/starter/production/TASK.md`
- Create: `plugins/game-production-workflow/evals/game-art-production/design-direction/starter/production/ACCEPTANCE.md`
- Create: `plugins/game-production-workflow/evals/game-art-production/design-direction/starter/docs/ART_BIBLE.md`
- Create: `plugins/game-production-workflow/evals/game-art-production/design-direction/starter/web/index.html`
- Create: `plugins/game-production-workflow/evals/game-art-production/design-direction/starter/web/app.mjs`
- Create: `plugins/game-production-workflow/evals/game-art-production/design-direction/starter/web/styles.css`
- Create: `plugins/game-production-workflow/evals/game-art-production/composite-runtime/fixture.json`
- Create: `plugins/game-production-workflow/evals/game-art-production/composite-runtime/starter/AGENTS.md`
- Create: `plugins/game-production-workflow/evals/game-art-production/composite-runtime/starter/production/project.json`
- Create: `plugins/game-production-workflow/evals/game-art-production/composite-runtime/starter/production/PROJECT.md`
- Create: `plugins/game-production-workflow/evals/game-art-production/composite-runtime/starter/production/TASK.md`
- Create: `plugins/game-production-workflow/evals/game-art-production/composite-runtime/starter/production/ACCEPTANCE.md`
- Create: `plugins/game-production-workflow/evals/game-art-production/composite-runtime/starter/docs/ART_BIBLE.md`
- Create: `plugins/game-production-workflow/evals/game-art-production/composite-runtime/starter/web/index.html`
- Create: `plugins/game-production-workflow/evals/game-art-production/composite-runtime/starter/web/app.mjs`
- Create: `plugins/game-production-workflow/evals/game-art-production/composite-runtime/starter/web/state.mjs`
- Create: `plugins/game-production-workflow/evals/game-art-production/composite-runtime/starter/web/styles.css`
- Create: `plugins/game-production-workflow/evals/game-art-production/composite-runtime/starter/web/assets/inventory-concept.svg`
- Create: `plugins/game-production-workflow/evals/game-art-production/composite-runtime/starter/web/verify.mjs`
- Create: `plugins/game-production-workflow/scripts/game-art-fixture.mjs`
- Create: `plugins/game-production-workflow/scripts/test-game-art-fixtures.mjs`
- Modify: `verify.ps1`

**Interfaces:**
- Consumes: fixture ID `design-direction` or `composite-runtime`, run label `control-1.7.2` or `candidate-1.8.0`, and an output root under `.tmp/game-art-evals/`.
- Produces: a copied governed starter repository, immutable `fixture-lock.json`, operator-filled `observation.json`, deterministic `result.json`, and a non-subjective objective verdict.
- CLI: `prepare` requires `--fixture`, `--label`, and absolute `--output` flags;
  `verify` requires one absolute `--run` flag. Steps below provide the exact run
  commands for every fixture/label combination.
- Result shape:

```ts
type Sha256 = `sha256:${string}`;
type FixtureId = "design-direction" | "composite-runtime";

interface GameArtFixtureResult {
  schemaVersion: 1;
  fixtureId: FixtureId;
  label: string;
  policyVersion: string;
  capabilities: Record<string, string | boolean>;
  sourceTreeHash: Sha256;
  outputTreeHash: Sha256;
  taskStateBefore: Record<string, string>;
  taskStateAfter: Record<string, string>;
  loadedContext: {
    metadataWords: number;
    bodyWords: number;
    referenceWords: number;
    files: string[];
  };
  cycles: number;
  elapsedMinutes: number;
  objectiveChecks: Array<{ id: string; status: "Pass" | "Fail" | "Blocked"; evidence: string[] }>;
  subjectiveReview: {
    status: "Pending" | "Pass" | "Pass with bounded non-blocking findings" | "Returned";
    reviewerIndependence: "Unassessed" | "Independent" | "Contributor-disclosed";
    findings: string[];
  };
  terminalClaim: string;
}
```

- [ ] **Step 1: Write the failing fixture-contract test**

Create `test-game-art-fixtures.mjs` first. It must assert both fixture IDs exist; every fixture names `operation`, `request`, `capabilityProfile`, `requiredArtifacts`, `objectiveChecks`, `subjectiveChecks`, `prohibitedClaims`, and `stopConditions`; every starter is governed and contains no unfilled template token; and the composite fixture contains one initial flattened concept plus an executable state verifier.

Use this assertion skeleton:

```js
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(scriptDirectory, "..");
const evalRoot = path.join(pluginRoot, "evals/game-art-production");
const ids = ["design-direction", "composite-runtime"];
const hasContent = (value) => Array.isArray(value)
  ? value.length > 0
  : value && typeof value === "object"
    ? Object.keys(value).length > 0
    : typeof value === "string" && value.trim().length > 0;

for (const id of ids) {
  const fixturePath = path.join(evalRoot, id, "fixture.json");
  assert(fs.existsSync(fixturePath), `missing fixture: ${id}`);
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  assert.equal(fixture.id, id);
  for (const field of ["operation", "request", "capabilityProfile", "requiredArtifacts", "objectiveChecks", "subjectiveChecks", "prohibitedClaims", "stopConditions"]) {
    assert(hasContent(fixture[field]), `${id}: ${field} is empty`);
  }
}
```

- [ ] **Step 2: Run the fixture test and verify RED**

Run:

```bash
node plugins/game-production-workflow/scripts/test-game-art-fixtures.mjs
```

Expected: FAIL with `missing fixture: design-direction`.

- [ ] **Step 3: Implement the minimal fixture CLI**

Implement only `prepare` and `verify`. `prepare` validates arguments, rejects an existing non-empty output directory, copies the selected starter, computes SHA-256 hashes in stable repository-relative path order, and writes `fixture-lock.json`. `verify` requires `observation.json`, runs the fixture-local deterministic verifier when declared, verifies the output/source tree and task-state claims, then writes `result.json`. It must leave subjective checks `Pending`; it cannot convert deterministic checks into artistic passage.

Use this exported surface so the test can call the same implementation as the CLI:

```js
export function parseFixtureArguments(argv) {}
export function loadFixture(pluginRoot, fixtureId) {}
export function hashTree(root, excludedRelativePaths = []) {}
export function prepareFixture({ pluginRoot, fixtureId, label, outputRoot }) {}
export function verifyFixture({ pluginRoot, runRoot }) {}
```

- [ ] **Step 4: Create the two governed starter repositories**

The `design-direction` fixture is an `original_design`, Full-lane result-screen task with frozen player flow, platform, content extremes, explicit quality bar, interaction semantics, human-owned direction boundary, and no selected UI/2D direction. Its greybox web shell exposes success, failure, reward-overflow, retry, keyboard/controller-focus, 1280×720, and 390×844 cases without supplying an art answer.

The `composite-runtime` fixture is a Full-lane inventory task with a frozen direction and interaction/render contract. Its initial renderer displays only `inventory-concept.svg`; `state.mjs` is the one authoritative source for empty, full, error, equip, and controller-focus states. The request requires editable separated sources, project-native components, actual input, multiple states, source/export/import notes, and runtime captures. The concept SVG must be original repository-owned geometry/text with no third-party marks.

- [ ] **Step 5: Verify fixture determinism and ignored raw-output behavior**

Run:

```bash
node plugins/game-production-workflow/scripts/test-game-art-fixtures.mjs
node plugins/game-production-workflow/scripts/game-art-fixture.mjs prepare --fixture design-direction --label harness-check --output .tmp/game-art-evals/harness-design
node plugins/game-production-workflow/scripts/game-art-fixture.mjs prepare --fixture composite-runtime --label harness-check --output .tmp/game-art-evals/harness-composite
git status --short
```

Expected: fixture tests pass; both prepared workspaces contain `fixture-lock.json`; `.tmp/game-art-evals/` does not appear in Git status.

- [ ] **Step 6: Register the fixture test in the verifier and commit**

Add `$gameArtFixtureTestPath`, require it as a file, and execute it after `test-skill-evals.mjs` in `verify.ps1`.

Run:

```bash
node plugins/game-production-workflow/scripts/test-game-art-fixtures.mjs
pwsh -NoProfile -File ./verify.ps1
git add plugins/game-production-workflow/evals/game-art-production plugins/game-production-workflow/scripts/game-art-fixture.mjs plugins/game-production-workflow/scripts/test-game-art-fixtures.mjs verify.ps1
git commit -m "test: add game art artifact fixtures"
```

---

### Task 2: 1.7.2 artifact-level RED controls and split decision

**Files:**
- Create after the runs: `plugins/game-production-workflow/evals/game-art-production/control-1.7.2.json`
- Preserve outside Git: `.tmp/game-art-evals/control-design-direction/`
- Preserve outside Git: `.tmp/game-art-evals/control-composite-runtime/`

**Interfaces:**
- Consumes: the exact Task 1 fixtures and an intact `game-production-workflow` installation reporting `1.7.2+codex.20260814064925` from commit `1d77557`.
- Produces: one small control summary containing the two immutable result records, raw-bundle locations and hashes, artifact-level failures, workflow/context burden, and the exact `splitDecision` value `Stop` or `Proceed`.
- Passage rule: `Proceed` requires at least one observed primary-fixture failure or greater workflow/context burden. Policy text, regex matches, or a preferred architecture are not failures.

- [ ] **Step 1: Prepare the two control workspaces**

Run:

```bash
node plugins/game-production-workflow/scripts/game-art-fixture.mjs prepare --fixture design-direction --label control-1.7.2 --output .tmp/game-art-evals/control-design-direction
node plugins/game-production-workflow/scripts/game-art-fixture.mjs prepare --fixture composite-runtime --label control-1.7.2 --output .tmp/game-art-evals/control-composite-runtime
```

Expected: both locks record the 1.7.2 policy label and identical committed fixture hashes.

- [ ] **Step 2: Obtain authorization for isolated fresh-context control runs**

Pause execution and request explicit authorization to create or use two fresh Codex conversations. Give each conversation only the installed 1.7.2 Skill, one prepared workspace, and the raw fixture request. Do not include this design, suspected failures, candidate contracts, or expected answer. If fresh conversations are not authorized, stop with the fixtures ready; do not substitute a same-context role-play and call it control evidence.

- [ ] **Step 3: Run the Design control without optional art services**

The control receives the `design-direction` request and filesystem only. Record every loaded Skill/reference available from runtime trace; if trace is unavailable, record `traceAvailable: false` and the declared route files instead. Record cycles, elapsed minutes, changed paths, task-state diff, produced direction/production-design artifacts, provenance, feasibility precheck, claimed maturity, and any approval/task additions.

- [ ] **Step 4: Run the composite-to-runtime control without optional generation**

The control receives the `composite-runtime` request and filesystem only. Exercise click/keyboard/controller-focus-equivalent input in the local browser fixture when a browser is available. If target runtime observation is unavailable, record `runtimeObservation: Blocked` and fail the runtime criterion rather than substituting source inspection. Preserve actual captures, output tree, state verifier output, and source/recovery evidence in the ignored raw bundle.

- [ ] **Step 5: Verify both run records and obtain the required subjective review**

Create each `observation.json`, then run:

```bash
node plugins/game-production-workflow/scripts/game-art-fixture.mjs verify --run .tmp/game-art-evals/control-design-direction
node plugins/game-production-workflow/scripts/game-art-fixture.mjs verify --run .tmp/game-art-evals/control-composite-runtime
```

Have a reviewer who did not produce the artifacts inspect intended-size outputs against the fixture quality bar. Record `Pass`, `Pass with bounded non-blocking findings`, or `Returned`, contribution disclosure, failed criteria, retained passing parts, and evidence paths. Do not repair during this review.

- [ ] **Step 6: Write the control summary and enforce the stop/go gate**

Write `control-1.7.2.json` with this top-level interface and reject blank
`decisionBasis` values:

```ts
type FixtureId = "design-direction" | "composite-runtime";

interface GameArtFixtureResult {
  fixtureId: FixtureId;
  loadedContext: {
    metadataWords: number;
    bodyWords: number;
    referenceWords: number;
    files: string[];
  };
}

interface GameArtControlSummary {
  schemaVersion: 1;
  policyCommit: "1d77557";
  policyVersion: "1.7.2+codex.20260814064925";
  fixtureResults: GameArtFixtureResult[];
  observedFailures: Array<{ fixtureId: FixtureId; criterion: string; evidence: string[] }>;
  burden: {
    cycles: number;
    elapsedMinutes: number;
    approvals: number;
    loadedContext: GameArtFixtureResult["loadedContext"];
  };
  splitDecision: "Stop" | "Proceed";
  decisionBasis: string;
}
```

Set `splitDecision` to `Stop` when both fixtures reach the required artifact quality with equal or lower burden. Set it to `Proceed` only when `observedFailures` names concrete artifact/evidence failures or quantified excess burden. An empty `decisionBasis` is invalid.

- [ ] **Step 7: Validate and commit the control evidence**

Extend `test-game-art-fixtures.mjs` to validate the summary schema, the exact 1.7.2 commit/version, non-empty decision basis, and a non-empty failure list when the decision is `Proceed`.

Run:

```bash
node plugins/game-production-workflow/scripts/test-game-art-fixtures.mjs
git add plugins/game-production-workflow/evals/game-art-production/control-1.7.2.json plugins/game-production-workflow/scripts/test-game-art-fixtures.mjs
git commit -m "test: record game art 1.7.2 controls"
```

If the committed decision is `Stop`, end the implementation here and report that the new Skill was not justified. Tasks 3-9 remain unexecuted.

---

### Task 3: Minimal three-operation art Skill

**Files:**
- Create: `plugins/game-production-workflow/skills/game-art-production/SKILL.md`
- Create: `plugins/game-production-workflow/skills/game-art-production/agents/openai.yaml`
- Create: `plugins/game-production-workflow/skills/game-art-production/references/visual-design.md`
- Create: `plugins/game-production-workflow/skills/game-art-production/references/interactive-ui-2d.md`
- Create: `plugins/game-production-workflow/skills/game-art-production/references/visual-review.md`
- Create: `plugins/game-production-workflow/scripts/test-game-art-production.mjs`

**Interfaces:**
- Consumes: the core-owned task intent/status, frozen boundaries, selected operation, capability profile, allowed/protected paths, existing maturity vocabulary, quality bar, and evidence/reviewer requirements.
- Produces: one transient handoff with `Operation`, `Professional result`, `Maturity assessment`, `Fidelity disclosure`, `Outcome or claim`, `Changed paths`, `Coverage`, `Runtime proof`, `Source and recovery`, `Bulk unlock`, `Unresolved risks`, and `Recommended next delta`.
- Static route manifest: `Design -> references/visual-design.md`, `Produce -> references/interactive-ui-2d.md`, `Review -> references/visual-review.md`. One operation loads one art reference by default.

- [ ] **Step 1: Write the failing structural/authority test**

Create `test-game-art-production.mjs` before the Skill. It must assert the five files exist; frontmatter contains only `name` and `description`; the name is `game-art-production`; the description is at most 500 characters and contains observable UI/2D trigger symptoms; the three exact route rows exist; every handoff field exists; and the Skill explicitly forbids task/status/gate/approval ownership and self-approved golden/final passage.

Add assertions that:

```js
assert.match(skill, /\| `Design` \| `references\/visual-design\.md` \|/);
assert.match(skill, /\| `Produce` \| `references\/interactive-ui-2d\.md` \|/);
assert.match(skill, /\| `Review` \| `references\/visual-review\.md` \|/);
assert.match(skill, /Not established[\s\S]*absence/i);
assert.match(skill, /Not applicable[\s\S]*absence/i);
assert.match(skill, /must not[\s\S]{0,200}(?:create|own)[\s\S]{0,200}(?:TASK|PLAN)[\s\S]{0,200}(?:status|gate|approval)/i);
```

- [ ] **Step 2: Run the Skill test and verify RED**

Run:

```bash
node plugins/game-production-workflow/scripts/test-game-art-production.mjs
```

Expected: FAIL because `skills/game-art-production/SKILL.md` does not exist.

- [ ] **Step 3: Generate the standard Skill scaffold**

Use the installed `skill-creator` `scripts/init_skill.py` with skill name `game-art-production`, destination `plugins/game-production-workflow/skills`, and `references` resources. Generate `agents/openai.yaml` with these values, then remove every generated example or unused directory before GREEN:

```yaml
interface:
  display_name: "游戏美术制作"
  short_description: "设计、制作、集成并评审交互式 UI 与 2D 游戏美术"
  default_prompt: "Use $game-art-production within the core-owned game task to produce or review the next interactive UI/2D visual slice."
```

Do not add icons, brand color, MCP dependencies, scripts, assets, installation files, or auxiliary documentation inside the Skill.

- [ ] **Step 4: Write the compact Skill router and shared contracts**

Use this frontmatter and keep all trigger language there:

```yaml
---
name: game-art-production
description: Use when interactive UI/2D game work needs a new or materially changed visual direction, screen, HUD, component/state system, flattened-composite decomposition, editable source production, project-native integration, runtime visual proof, or professional visual review.
---
```

The body contains only: relationship to core authority; operation selection;
input readiness; allowed/protected path safety; capability fallback; transient
output mapping; maturity/fidelity truth; bounded return/stop-loss; and the
three-row reference manifest. It must not restate detailed craft procedures.

Encode the core-owned result mapping exactly: Design `Proposed` remains
non-Ready until the applicable choice is recorded and design is frozen;
`Implemented` remains/moves to `Implementing` and cannot close; Review Pass is
evidence only; `Returned` uses the existing candidate-return recipe and normally
stays `Implementing`; `Blocked` moves to `Clarifying` only for a genuinely
missing human/domain boundary and otherwise preserves executable status,
completed work, blocker, fallback, and recovery.

- [ ] **Step 5: Write `visual-design.md`**

Implement the Design sequence from the specification: freeze the professional brief; choose the lightest honest medium; create 2-3 materially distinct candidates only when a human-owned choice exists; record origin/rights/reproducibility; inspect at intended size/content density; run one non-authoritative feasibility precheck; translate the selected direction into editable visual-system primitives; and return a Direction or Production-design candidate without freezing or approving it.

- [ ] **Step 6: Write `interactive-ui-2d.md`**

Implement the Produce sequence: capability handshake; action → authoritative state → renderer → feedback/layer → asset-family map; runtime-derived decomposition; shared-space assembly; representative production slice; editable source/export/import; actual project integration; runtime observation; one bounded repair batch; and returned-candidate handoff. Make generated output optional and never deterministic test input.

- [ ] **Step 7: Write `visual-review.md`**

Keep this reference UI/2D-specific and read-only. Separate objective validity,
design conformance, product quality, and integrated acceptance; require
intended-size actual runtime inspection when the claim needs it; disclose
reviewer contribution; use only `Pass`, `Pass with bounded non-blocking
findings`, `Returned`, or `Blocked`; and reuse the core independent-review/human-
authority rules rather than copying them. It may echo `Integrated acceptance`
only when the input already names the core-recorded acceptance; otherwise it
reports readiness or a recommendation, never grants that maturity.

- [ ] **Step 8: Validate the Skill and verify GREEN**

Run:

```bash
node plugins/game-production-workflow/scripts/test-game-art-production.mjs
python3 "${CODEX_HOME:-$HOME/.codex}/skills/.system/skill-creator/scripts/quick_validate.py" plugins/game-production-workflow/skills/game-art-production
git diff --check
```

Expected: the structural test and Skill validator pass; no generated placeholder or unused directory remains.

- [ ] **Step 9: Commit the isolated Skill**

Run:

```bash
git add plugins/game-production-workflow/skills/game-art-production plugins/game-production-workflow/scripts/test-game-art-production.mjs
git commit -m "feat: add game art production skill"
```

---

### Task 4: Additive core routing and truthful environment fallback

**Files:**
- Modify: `plugins/game-production-workflow/skills/game-production-system/SKILL.md`
- Modify: `plugins/game-production-workflow/skills/game-production-system/references/execution.md`
- Modify: `plugins/game-production-workflow/skills/game-production-system/assets/project-template/AGENTS.md`
- Modify: `plugins/game-production-workflow/scripts/test-game-art-production.mjs`
- Modify: `plugins/game-production-workflow/scripts/test-production-policy.mjs`

**Interfaces:**
- Consumes: the observable UI/2D predicate and existing core operation/status.
- Produces: required `Design`, `Produce`, or `Review` art routing for an intact 1.8 bundle; no art load for accepted-baseline Fast repairs and non-art work; visible integrity failure for a damaged installed bundle; compact repository-only fallback when no plugin exists.

- [ ] **Step 1: Extend tests with failing route assertions**

Assert the core routes unresolved UI/2D direction to Design, Ready/Implementing UI/2D work to Produce, and requested UI/2D diagnosis/gate evidence to Review. Assert the core excludes routine accepted-baseline Fast repairs and non-visual work. Assert it distinguishes `intact plugin`, `damaged installed plugin`, and `repository-only` environments and never treats optional external tools as lifecycle prerequisites.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
node plugins/game-production-workflow/scripts/test-game-art-production.mjs
node plugins/game-production-workflow/scripts/test-production-policy.mjs
```

Expected: the new route assertions fail because the core does not yet name `game-art-production`.

- [ ] **Step 3: Add the smallest positive/negative route in the core**

In `Start a substantial feature`, route only the specification's interactive UI/2D Design predicate into the new Skill and leave character/environment/3D/animation/VFX/technical-art work on `visual-production.md`. In `Execute a ready task`, require Produce only for matching UI/2D work. In Diagnose/review and gate-review paths, load Review only when a UI/2D professional finding is requested or required.

Do not add task fields, a second plan, or an approval. Keep the core at or below its existing 500-line test by rewriting the affected route sentences rather than appending a parallel section.

- [ ] **Step 4: Add the three-environment safety rule**

State in the core:

1. Intact 1.8 plugin: the bundled art Skill is required for the positive UI/2D predicate.
2. Installed 1.8 plugin missing that Skill: preserve work, report bundle-integrity failure, repair/reinstall, and grant no art-path completion.
3. Repository-only with no plugin: use the compact project `AGENTS.md` interaction-to-visual loop honestly, without claiming the dedicated protocol or unavailable subjective authority ran.

Keep the existing project-template loop compact; add only the environment distinction and retain the 120-line/1,100-word project-instruction budgets.

- [ ] **Step 5: Keep execution additive**

Add a one-sentence UI/2D route at the start of `Interactive visual execution`, but retain its existing detailed safeguards during this phase. Do not remove any rule before candidate artifact behavior passes.

- [ ] **Step 6: Run focused and existing regressions**

Run:

```bash
node plugins/game-production-workflow/scripts/test-game-art-production.mjs
node plugins/game-production-workflow/scripts/test-production-policy.mjs
node plugins/game-production-workflow/scripts/test-skill-evals.mjs
node plugins/game-production-workflow/scripts/test-convergence-policy.mjs
```

Expected: all pass; existing composite, optional-capability, Fast, same-root, return, and approval semantics remain green.

- [ ] **Step 7: Commit additive routing**

Run:

```bash
git add plugins/game-production-workflow/skills/game-production-system plugins/game-production-workflow/scripts/test-game-art-production.mjs plugins/game-production-workflow/scripts/test-production-policy.mjs
git commit -m "feat: route interactive UI art production"
```

---

### Task 5: Candidate artifact GREEN and bounded refinement

**Files:**
- Create after the runs: `plugins/game-production-workflow/evals/game-art-production/candidate-additive-1.8.0.json`
- Modify only when evidence requires: `plugins/game-production-workflow/skills/game-art-production/SKILL.md`
- Modify only when evidence requires: `plugins/game-production-workflow/skills/game-art-production/references/visual-design.md`
- Modify only when evidence requires: `plugins/game-production-workflow/skills/game-art-production/references/interactive-ui-2d.md`
- Modify only when evidence requires: `plugins/game-production-workflow/skills/game-art-production/references/visual-review.md`
- Preserve outside Git: `.tmp/game-art-evals/candidate-design-direction/`
- Preserve outside Git: `.tmp/game-art-evals/candidate-composite-runtime/`

**Interfaces:**
- Consumes: identical Task 1 fixtures and capability profiles, the Task 2 control summary, and the additive Skill/core candidate.
- Produces: candidate run records, independent findings, a control/candidate comparison, and either `CandidatePass` or a bounded returned result naming one shared root cause.

- [ ] **Step 1: Prepare candidate workspaces from the same fixture hashes**

Run:

```bash
node plugins/game-production-workflow/scripts/game-art-fixture.mjs prepare --fixture design-direction --label candidate-additive-1.8.0 --output .tmp/game-art-evals/candidate-design-direction
node plugins/game-production-workflow/scripts/game-art-fixture.mjs prepare --fixture composite-runtime --label candidate-additive-1.8.0 --output .tmp/game-art-evals/candidate-composite-runtime
```

Assert their source hashes match the control locks before proceeding.

- [ ] **Step 2: Obtain authorization for isolated candidate runs**

Request fresh Codex conversations and give each one the exact candidate commit,
the repository paths to `game-production-system` and `game-art-production`, and
the same raw fixture input. Instruct it to read those candidate Skill files from
the checkout rather than use the separately installed 1.7.2 control copy, and
record the commit plus file hashes in the run. This source-path forward test does
not claim installed-plugin discovery; Task 8 proves that after final packaging.
Do not leak control findings, intended fixes, or this plan into the worker
prompt. Runtime fixture projects must remain solvable without multi-agent
support.

- [ ] **Step 3: Run Design and Produce through the positive predicates**

For Design, verify the route can form professional candidates without assuming a pre-frozen direction and can stop for the human-owned choice before forming Production design. For Produce, verify it does not ship the flattened concept; instead it creates editable separated sources, project-native components, real input/state handling, shared-space assembly, multiple states, import/recovery notes, and actual runtime proof.

- [ ] **Step 4: Run the unavailable-generation pressure variant**

Repeat the production fixture with no optional image-generation capability. Require an available/replaceable code/vector/project-native route or an exact final-fidelity blocker. Returning the healthy Ready task to product planning is a failure.

- [ ] **Step 5: Verify outputs and run independent Review**

Run the deterministic verifiers, then give a non-contributing reviewer the actual intended-size artifacts, frozen quality bar, relevant states, and hard return conditions. Keep author rationale and test counts out of the first subjective pass. The reviewer reports evidence and criteria, not repairs.

- [ ] **Step 6: Perform at most one evidence-driven wording repair batch per root cause**

If a fixture is Returned, group findings by shared root cause, edit only the responsible Skill reference/router, and rerun the affected fixture. If two consecutive cycles add no evidence against the same failed criterion, stop and record the same-root failure; do not add more prose, rename the candidate, or reset the count.

- [ ] **Step 7: Commit the additive candidate comparison**

Write `candidate-additive-1.8.0.json` with fixture hashes, objective/subjective results, route files, metadata/body/reference words, cycles, approvals, elapsed minutes, failures, and comparison to `control-1.7.2.json`.

Run:

```bash
node plugins/game-production-workflow/scripts/test-game-art-fixtures.mjs
node plugins/game-production-workflow/scripts/test-game-art-production.mjs
git add plugins/game-production-workflow/evals/game-art-production/candidate-additive-1.8.0.json plugins/game-production-workflow/skills/game-art-production plugins/game-production-workflow/scripts/test-game-art-fixtures.mjs
git commit -m "test: prove additive game art behavior"
```

Do not enter Task 6 unless both primary candidate fixtures pass their declared artifact/maturity contracts and correct the Task 2 failure without new lifecycle or approval burden.

---

### Task 6: Evidence-based UI/2D extraction and context gates

**Files:**
- Modify: `plugins/game-production-workflow/scripts/test-game-art-production.mjs`
- Modify: `plugins/game-production-workflow/skills/game-production-system/SKILL.md`
- Modify: `plugins/game-production-workflow/skills/game-production-system/references/execution.md`
- Preserve: `plugins/game-production-workflow/skills/game-production-system/references/visual-production.md`
- Preserve: `plugins/game-production-workflow/skills/game-production-system/references/experience-review.md`

**Interfaces:**
- Consumes: passed additive fixtures and static route manifests.
- Produces: a compact core/execution UI/2D sentinel route, unchanged non-UI/2D visual-production path, and enforced route-context budgets.

- [ ] **Step 1: Add failing context-budget tests before extraction**

Use one shared `wordCount(text)` helper and hard-code the origin/main 1.7.2 route baselines:

```js
const routeBaselines = Object.freeze({
  nonArtProduce: 5586,
  design: 9462,
  produce: 6877,
});
```

Measure candidate routes as:

```js
const candidateRoutes = {
  nonArtProduce: wordCount(core) + wordCount(execution),
  design: wordCount(core) + wordCount(workflow) + wordCount(artSkill) + wordCount(visualDesign),
  produce: wordCount(core) + wordCount(execution) + wordCount(artSkill) + wordCount(interactiveUi2d),
};
```

Assert `nonArtProduce <= 5586`, `design <= 9462`, and `produce < 6877`. Separately parse the new Skill frontmatter and assert exactly one discovery entry and description length at most 500 characters. Assert the Design/Produce/Review static manifest permits only its named art reference.

- [ ] **Step 2: Run the context test and verify RED**

Run:

```bash
node plugins/game-production-workflow/scripts/test-game-art-production.mjs
```

Expected: at least the additive common Produce route exceeds 6,877 words.

- [ ] **Step 3: Extract only proven duplicate UI/2D execution detail**

Replace the detailed UI/2D sequence in `execution.md` with compact sentinels that require the art Produce route, prohibit flattened composite finality, keep bulk locked before assembly/runtime proof, preserve truthful maturity, and require actual target-project evidence. Do not remove general capability, execution-loop, stop-loss, return, recovery, or optional-tool rules.

In the core, keep only positive/negative art routing, lifecycle/human authority, flattened-composite rejection, representative proof before bulk, maturity/fidelity truth, and actual project evidence. Rewrite duplicated UI/2D procedure instead of deleting broad art rules.

- [ ] **Step 4: Prove non-UI/2D guidance remains intact**

Add assertions that `visual-production.md` still covers character/environment-compatible shared masters, 3D/editor assembly, animation/VFX craft checks, technical-art import/performance, broad asset families, and runtime golden review. Assert the core still routes those domains to `visual-production.md` rather than the new mandatory art route.

- [ ] **Step 5: Verify GREEN and rerun artifact fixtures**

Run:

```bash
node plugins/game-production-workflow/scripts/test-game-art-production.mjs
node plugins/game-production-workflow/scripts/test-production-policy.mjs
node plugins/game-production-workflow/scripts/test-skill-evals.mjs
node plugins/game-production-workflow/scripts/test-convergence-policy.mjs
```

Then rerun both candidate artifact fixtures from clean prepared workspaces. Expected: route budgets pass, prior artifact behavior remains at least equal, and no non-UI/2D contract regresses.

- [ ] **Step 6: Commit extraction as one reversible group**

Run:

```bash
git add plugins/game-production-workflow/skills/game-production-system plugins/game-production-workflow/scripts/test-game-art-production.mjs
git commit -m "refactor: extract interactive UI art protocol"
```

---

### Task 7: Atomic 1.8.0 packaging, compatibility, and installation contracts

**Files:**
- Modify: `plugins/game-production-workflow/.codex-plugin/plugin.json`
- Modify: `plugins/game-production-workflow/skills/game-production-system/scripts/check.ps1`
- Modify: `plugins/game-production-workflow/skills/game-production-system/scripts/bootstrap.ps1`
- Modify: `plugins/game-production-workflow/scripts/test-production-policy.mjs`
- Modify: `plugins/game-production-workflow/scripts/test-install.mjs`
- Modify: `install.mjs`
- Modify: `verify.ps1`
- Modify: `README.md`

**Interfaces:**
- Produces: one atomic plugin containing `game-production-system`, `game-art-production`, `game-approval-ui`, and the approval MCP; public/policy/bootstrap version `1.8.0`; a fresh cachebuster using the existing `+codex.YYYYMMDDhhmmss` UTC format; and no separately installed art Skill.
- Preserves: compatible 1.6/1.7 project validation and all existing task fields.

- [ ] **Step 1: Update version and bundle assertions first**

Change expected base/policy/bootstrap version in `test-production-policy.mjs` to `1.8.0`. Add assertions for the three bundled Skill directories, both `agents/openai.yaml` files, the art route description bound, README's three-Skill structure, and installer text that no external Skill is required.

- [ ] **Step 2: Run packaging tests and verify RED**

Run:

```bash
node plugins/game-production-workflow/scripts/test-production-policy.mjs
node plugins/game-production-workflow/scripts/test-install.mjs
```

Expected: RED on 1.7.2 metadata and missing three-Skill installation wording.

- [ ] **Step 3: Update all 1.8.0 version surfaces**

Set manifest base version, `check.ps1` policy version, `bootstrap.ps1` system version, README public version, and tests to `1.8.0`. Generate one fresh UTC cachebuster in the existing `1.8.0+codex.YYYYMMDDhhmmss` format. Do not add new fields to `TASK.md`, `PLAN.md`, or `project.json`.

- [ ] **Step 4: Extend atomic verification**

In `verify.ps1`, require the art Skill, its three references, `agents/openai.yaml`, `test-game-art-production.mjs`, and fixture harness. Add the art Skill to frontmatter-name validation and execute its test after the existing production-policy test. Keep Markdown-link, secret, PowerShell parse, approval MCP, doctor, installer, eval, and convergence checks unchanged.

- [ ] **Step 5: Update installer/reporting without changing install topology**

Keep one marketplace plugin add/upgrade command. Update successful output and README to say the atomic plugin includes all three Skills plus the approval MCP. Add no art-specific install command. Preserve `externalSkillsRequired: false`, legacy cleanup safety, explicit repository/ref mismatch rejection, and Windows argument validation.

- [ ] **Step 6: Prove compatibility and packaging GREEN**

Run:

```bash
node plugins/game-production-workflow/scripts/test-production-policy.mjs
node plugins/game-production-workflow/scripts/test-install.mjs
node plugins/game-production-workflow/scripts/test-game-art-production.mjs
pwsh -NoProfile -File ./verify.ps1 -CompareRef origin/main
```

Expected: all pass; old 1.6/1.7 guards remain; plugin content and cachebuster change together.

- [ ] **Step 7: Commit packaging**

Run:

```bash
git add plugins/game-production-workflow/.codex-plugin/plugin.json plugins/game-production-workflow/skills/game-production-system/scripts/check.ps1 plugins/game-production-workflow/skills/game-production-system/scripts/bootstrap.ps1 plugins/game-production-workflow/scripts/test-production-policy.mjs plugins/game-production-workflow/scripts/test-install.mjs install.mjs verify.ps1 README.md
git commit -m "release: prepare game production workflow 1.8.0"
```

---

### Task 8: Platform checks and installed release-candidate pilot

**Files:**
- Create after a real pilot: `plugins/game-production-workflow/evals/game-art-production/pilot-1.8.0.json`
- Preserve outside Git: platform logs and private/raw pilot artifacts named by hash in the pilot record.

**Interfaces:**
- Consumes: the exact committed 1.8.0 release-candidate commit, an intact local atomic installation, and one newly selected real target-project interactive UI/2D work package.
- Produces: macOS/Linux/Windows verifier results, installed-plugin discovery evidence, one real target-project result, quality/efficiency comparison, and the human producer's release judgment.

- [ ] **Step 1: Run the complete verifier on macOS**

Run from a clean checkout:

```bash
pwsh -NoProfile -File ./verify.ps1 -CompareRef origin/main
node install.mjs --dry-run --json
```

Record OS, Node, PowerShell, Git commit, full exit status, and log hash. A simulated Windows argument test is not a substitute for the later Windows run.

- [ ] **Step 2: Run the same verifier on Linux and Windows**

Use the same committed candidate. On Linux run the macOS commands. On Windows run:

```powershell
pwsh -NoProfile -File .\verify.ps1 -CompareRef origin/main
node .\install.mjs --dry-run --json
```

Do not mark this step complete from source inspection or a different commit. Preserve failures as release blockers and repair them with a failing platform-specific regression before rerunning all three systems.

- [ ] **Step 3: Obtain authorization and install the candidate locally**

Before mutating the user's Codex installation, report the candidate commit/version and preserved 1.7.2 rollback source/cache path, then request explicit installation approval. After approval, install the exact candidate without deleting the rollback copy and verify one enabled `game-production-workflow` plugin exposes all three Skills.

- [ ] **Step 4: Start a fresh Codex conversation**

Request explicit authorization to create or use a fresh conversation so Skill discovery metadata refreshes. Verify the conversation exposes `game-production-system`, `game-art-production`, and `game-approval-ui` from the same 1.8.0 plugin version before using it for pilot evidence.

- [ ] **Step 5: Select one real target-project pilot without fabricating a path**

Pause and ask the user for the exact governed project root or permission to identify the next eligible project. The selected work must be a new interactive UI/2D production work package with a frozen or intentionally unresolved art boundary appropriate to Design/Produce; fixture repositories and this plugin repository are ineligible. Read-only discovery may identify candidates, but no live project is modified before the user places it in scope.

- [ ] **Step 6: Execute the pilot under the existing core task**

Use one player-visible outcome, one outcome owner, one integrator, and only affected professional responsibility. Exercise the applicable Design/Produce/Review path, preserve actual editable sources and recovery, use real input/authoritative state/runtime evidence, and require independent/human evidence only where current policy says it applies. Do not create an art task or duplicate approval flow.

- [ ] **Step 7: Record the sanitized pilot result**

Write `pilot-1.8.0.json` without private content or absolute user paths. The
validator must reject empty commit, version, repository alias, evidence, and
producer-decision fields:

```ts
type Sha256 = `sha256:${string}`;

interface LoadedContext {
  metadataWords: number;
  bodyWords: number;
  referenceWords: number;
  files: string[];
}

interface GameArtPilotSummary {
  schemaVersion: 1;
  candidateCommit: string;
  candidateVersion: string;
  projectEvidenceReference: {
    repositoryAlias: string;
    commit: string;
    artifactHashes: Sha256[];
  };
  route: {
    operation: "Design" | "Produce" | "Review";
    loadedContext: LoadedContext;
  };
  quality: {
    maturityAssessment: "Direction" | "Production design" | "Runtime golden" | "Integrated acceptance" | "Not established";
    fidelity: Array<{ region: string; value: "Placeholder" | "Greybox" | "Working" | "Final" }>;
    reviewVerdict: "Pass" | "Pass with bounded non-blocking findings" | "Returned" | "Blocked";
    findings: string[];
  };
  efficiency: {
    cycles: number;
    elapsedMinutes: number;
    approvals: number;
    sameRootReturns: number;
  };
  regressions: string[];
  producerDecision: "Promote" | "Return";
}
```

Populate every required field from actual evidence before committing. `Promote`
requires all hard success gates and the user's explicit release judgment.

- [ ] **Step 8: Rerun final regression after the pilot and commit evidence**

Run:

```bash
pwsh -NoProfile -File ./verify.ps1 -CompareRef origin/main
git add plugins/game-production-workflow/evals/game-art-production/pilot-1.8.0.json
git commit -m "test: record game art release pilot"
```

Do not enter Task 9 if any platform check is missing, the pilot is Returned, evidence is not recoverable, or the human producer has not granted the applicable release judgment.

---

### Task 9: Final specification coverage and integration readiness

**Files:**
- Review: all files changed from `origin/main`.
- Review: `docs/superpowers/specs/2026-08-14-game-art-production-design.md`.
- Review: `docs/superpowers/plans/2026-08-14-game-art-production.md`.

**Interfaces:**
- Produces: a clean, fully verified, review-ready branch. Remote push, PR, merge, and release remain separate user-authorized actions.

- [ ] **Step 1: Inspect final scope and formatting**

Run:

```bash
git diff --check origin/main...HEAD
git diff --stat origin/main...HEAD
git status --short --branch
```

Expected: no whitespace errors, no unrelated files, and a clean worktree.

- [ ] **Step 2: Run every deterministic check fresh**

Run:

```bash
pwsh -NoProfile -File ./verify.ps1 -CompareRef origin/main
```

Expected: zero failures across structure, versions, Skills, policy, convergence, fixtures, context budgets, installer, doctor, links, secrets, PowerShell parsing, and approval MCP.

- [ ] **Step 3: Perform the specification coverage review**

Map every acceptance criterion to a test, fixture result, pilot field, or explicit human authority. Confirm especially: one lifecycle; three operations; Design without pre-frozen direction; editable production sources; flattened-composite rejection; representative assembly/runtime proof; maturity/fidelity separation; no optional-tool prerequisite; returned-candidate convergence; UI/2D-only extraction; non-art/context budgets; repository-only fallback; 1.6/1.7 compatibility; atomic installation; and absence of learning/upload behavior.

- [ ] **Step 4: Request independent final diff review**

Give the reviewer the final diff, specification, control/candidate/pilot summaries, and verification outputs. Ask for one consolidated `Pass`, `Pass with bounded non-blocking findings`, or `Returned` verdict. Repair only evidence-backed findings, grouping them by root cause and rerunning the complete verifier.

- [ ] **Step 5: Prepare the integration handoff**

Report the exact candidate commit/version, verification commands and results, platform matrix, pilot verdict, rollback path, unresolved risks, and recommended next action. Do not push or open a PR until the user explicitly authorizes remote publication; do not merge or release until the remote checks and required review gates pass.
