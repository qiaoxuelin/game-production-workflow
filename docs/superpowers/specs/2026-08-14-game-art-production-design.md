# Game Art Production Skill Design

## Decision

Add one dedicated `game-art-production` Skill to the existing
`game-production-workflow` plugin. Keep `game-production-system` as the sole
production lifecycle authority and `game-approval-ui` as the human-decision
surface. Ship all three Skills as one atomically versioned plugin.

Develop this change as a 1.8.0 candidate. Do not replace the stable 1.7.2
installation or remove current visual safeguards until behavior tests and a
real project-native UI/2D fixture demonstrate equal governance behavior and
better production outcomes.

This specification covers subproject A only: reducing core production burden
and closing the practical art-production loop. Project learning, redaction,
upload, clustering, central promotion, and cross-project release are a separate
subproject and must not be implemented or made a dependency here.

## Problem and evidence

Version 1.7.2 has strong repository truth, lane selection, approval, convergence,
interactive-visual, asset-family, runtime-proof, cross-platform, and recovery
contracts. Its verification suite binds the recurring failures that previously
caused policy regressions.

The remaining structural problem is not missing review policy. Art guidance is
spread across the 500-line core, `execution.md`, `visual-production.md`,
`experience-review.md`, the task template, and project instructions. The
combined material explains what valid visual work looks like, but the main
production Skill still carries too much professional detail and the art path is
stronger at approval and rejection than at producing editable, integrated,
runtime-ready assets.

The representative failure is a flattened interface composition that looks
plausible as an image but is not a playable interface. The failed path omits or
weakens four linked requirements:

- player actions, authoritative states, renderers, and visible feedback are not
  mapped as one runtime chain;
- elements that must align or touch are not validated in one shared space at
  actual size;
- component, layer, state-variant, source, export, and import boundaries are
  not derived from runtime needs;
- a source image or screenshot is allowed to imply a maturity it has not earned
  in the actual project.

The solution must add production capability without creating a second task
system, discipline silos, an external-service dependency, or more approval
ceremony.

## Goals

- Turn an accepted visual direction into editable sources, runtime-native
  components, imported assets, representative playable proof, and a bounded
  repair result.
- Derive interface and asset decomposition from player actions and states, not
  from the visual seams of a composite image.
- Load detailed art guidance only when observable task scope requires it.
- Preserve one task, one lifecycle authority, one integration owner, and one
  consolidated result.
- Remain useful without ImageGen, Figma, another art Skill, or a particular
  game engine.
- Distinguish honest greybox, production candidate, and accepted maturity.
- Improve time to the first valid runtime visual slice while reducing
  same-root rework and post-bulk-production waste.
- Preserve every 1.7.2 behavior, installation, approval, and compatibility
  contract unless this specification explicitly replaces it.

## Non-goals

- Do not split gameplay, level, economy, audio, UX, animation, VFX, and every
  other discipline into separate Skills in this release.
- Do not create a second `TASK`, `PLAN`, status vocabulary, gate, approval
  index, evidence registry, or project schema.
- Do not add a mandatory external generator, design application, account,
  service, or credential.
- Do not encode one engine's complete art pipeline in the core Skill.
- Do not guarantee subjective artistic excellence through automated checks.
- Do not implement experience upload or central Skill evolution.
- Do not slim the current core before the new art path proves parity.

## Architecture

The plugin remains the deployment and compatibility unit:

```text
game-production-workflow
├── game-production-system
├── game-art-production
└── game-approval-ui
```

`game-production-system` routes and governs work. When the current task matches
the art predicate, the same executing agent loads and follows
`game-art-production`. The relationship is instruction and context routing,
not an RPC boundary or a second process. The art Skill returns a structured
result to the core, which alone records lifecycle state and decides continuation
or closure.

`game-approval-ui` remains the only structured human-decision surface. The art
Skill may identify that a golden or product direction decision is required,
but the core owns whether and when to request it.

All Skills are discovered from the plugin's existing `skills` directory and
share one plugin version. No project is allowed to require a separately
installed copy of the art Skill.

## Production unit and ownership

The production unit is a player-visible outcome slice or an explicitly named
enabling capability, not a discipline deliverable. A valid task is, for
example, "make the combat-result screen operable across success, failure, and
retry states," not "finish the art department's result-screen assets."

The core assigns one outcome owner and one integrator. The art Skill contributes
craft work inside that task. A technical enabling package is valid only when it
names the player-visible consumer, the capability it unlocks, and the objective
proof that the capability is ready.

Dominant risk determines which professional protocol is loaded first. It does
not transfer lifecycle ownership to that discipline.

## Responsibility boundaries

### Core production authority

`game-production-system` owns:

- task scope, priority, lane, status, plan, gate, and approval authority;
- development mode, player-visible outcome, dependencies, budgets, and stop
  conditions;
- allowed and protected paths, shared-file integration ownership, and recovery;
- selection of affected professional protocols;
- consolidation of art, gameplay, technical, QA, and producer findings;
- `Ready`, `Implementing`, `Accepted`, returned, replan, and close decisions;
- durable updates to project governance and evidence indexes.

### Art production authority

`game-art-production` owns the professional execution needed to:

- interpret the frozen art/UX baseline and applicable references;
- map player action to authoritative state, renderer, visible response, and
  required asset family;
- define shared spatial masters, components, layers, state variants, editable
  sources, export/import boundaries, and runtime destinations;
- build the smallest actual-size representative assembly;
- create, adapt, or replace art sources using available capabilities;
- import and integrate sources into the actual project;
- inspect the running result and perform one bounded root-cause repair batch;
- report artifact maturity, coverage, evidence, recovery, and remaining risk.

The art Skill must not:

- create or own `TASK`, `PLAN`, gate, approval, or lifecycle state;
- change frozen gameplay rules or the authoritative gameplay state model;
- self-approve a golden, gate, or final subjective-quality decision;
- claim that a generated image, mockup, screenshot, contact sheet, or passing
  automated test is a completed runtime interface;
- return a healthy Ready task to planning only because an optional art tool or
  external Skill is absent;
- write outside the current task's allowed paths or silently modify protected
  behavior.

### Human decision authority

The human producer retains product direction, golden visual, business, waiver,
release, and other human-only authority. Routine craft conformance and
implementation choices do not create new approval cards.

## Routing predicate

The core must require `game-art-production` when any of these observable
conditions applies:

- `Interactive visual scope: Required` for interactive UI/2D work;
- a new or materially changed UI/2D art direction, screen, HUD, visual state,
  component system, 2D interface asset family, or shared visual master is in
  scope;
- reference-interface reconstruction, flattened-composite decomposition,
  source separation, visual integration, or bulk art production is required;
- a returned interactive UI/2D candidate needs design, source, assembly,
  import, or runtime root-cause analysis;
- a gate or release review needs interactive UI/2D production evidence not
  already available from an accepted unchanged baseline.

For 1.8.0, other character, environment, 3D, animation, VFX, and broad art
pipelines continue using the existing core visual-production path. They are not
silently claimed as supported by the new mandatory route. Expanding the route
requires later behavior evidence and an approved design change.

The core should not load the art Skill for:

- a routine Fast text, offset, clipping, or configuration repair that reuses an
  accepted visual and interaction baseline and creates no new visual rule;
- pure logic, data, build, infrastructure, or non-visual technical work;
- discussion or project-status reporting with no requested visual diagnosis or
  mutation.

The Skill description must contain these trigger symptoms without summarizing
the workflow. The core must also contain an explicit required-sub-skill rule for
the positive predicate. Description discovery alone is not reliable enough for
a mandatory professional handoff.

## Input contract

The art path consumes repository truth already owned by the core. Its minimum
input is:

- task ID, lane, status, planned visible outcome, and development mode;
- frozen baseline, applicable art bible, references, and allowed deviations;
- allowed paths, protected paths/behavior, integrator, and recovery boundary;
- `Interactive visual scope` and `Interaction/render contract`;
- `Assembly precheck`, `Required asset inventory`, `Asset-family packages`,
  `Representative proof`, and `Bulk or parallel unlock`;
- applicable visual acceptance criteria, target platforms/viewports,
  performance/provenance constraints, stop/replan triggers, and evidence budget;
- detected local capabilities and the project adapter commands.

The first release reuses these existing task fields. It does not require a
project schema migration or a new mandatory visual-status field.

If the input lacks a human-owned visual direction, scope, or protected
boundary, the art Skill returns a single blocking clarification to the core. If
the missing item is reversible implementation knowledge, it performs an
isolated precheck instead of reopening product planning.

## Art production loop

### 1. Capability handshake

Classify each needed capability as:

- `available`: use the project-native or installed path;
- `replaceable`: use an engine-native, code-native, SVG/vector, procedural, or
  editable greybox route that preserves later replacement boundaries;
- `installable`: report the optional installation and let the core obtain any
  required approval;
- `final-fidelity-blocked`: complete the highest honest structural/runtime
  maturity, identify the exact missing capability, and return a bounded
  capability-enabling next step.

Missing optional tooling never authorizes false finality or unbounded retries.

### 2. Interaction-to-visual map

For every scoped action or state transition, define:

```text
player action
-> authoritative state change
-> responsible renderer/component
-> visible feedback
-> required component, layer, variant, and asset family
```

One authoritative state source may feed multiple world, HUD, overlay, audio,
or feedback renderers. The map must expose contradictory duplicate state,
missing renderers, unreachable variants, and feedback with no player cause.

### 3. Runtime-derived decomposition

Derive the required asset inventory from the scoped screens, states, flows, and
feedback beats. For each family, define:

- shared master and dependent variants;
- runtime component and state ownership;
- independent layers required for interaction, animation, occlusion, tint,
  localization, scaling, or replacement;
- reuse, adapt, create, placeholder, or debt disposition;
- editable source, export format, import settings, and runtime destination;
- exclusive production/integration owner and protected shared paths;
- coverage and rejection checks.

Do not derive component boundaries by cutting along the convenient visual seams
of a flattened composition.

### 4. Shared-space assembly precheck

Elements that must align, attach, touch, overlap, occlude, or share scale must
use one explicit spatial master: viewport/canvas/world space, actual target
dimensions, safe area, anchors, scale rules, and z-order/contact expectations.

Build the cheapest representative actual-size assembly before final-detail or
bulk work. For UI/2D this is a layered project-native component or editable
assembly; for an engine scene it may be an engine-native greybox. It must test
real component boundaries, critical states, source separation, and spatial
relationships. A composite screenshot does not pass this precheck.

### 5. Representative production slice

Produce the smallest slice that exposes the dominant art and integration risks.
It must:

- run inside the actual target project or its project-native fixture;
- accept the applicable real input path;
- render from the authoritative state;
- cover the critical normal, transition, failure, disabled, selected, or
  recovery states in scope;
- use editable sources and replaceable component/layer boundaries;
- demonstrate actual-size hierarchy, legibility, contact, occlusion, and
  feedback;
- record provenance and the source/export/import recovery path.

Only after the assembly precheck and representative runtime proof pass may the
core unlock bulk or parallel art production.

### 6. Source production and import

Choose the lightest route capable of the promised maturity. External
generation may supply a source candidate, but it never supplies runtime
completion by itself. Validate naming, dimensions, slicing, alpha, compression,
color handling, localization/replacement boundaries, import configuration,
performance budgets, and provenance before integration.

Keep one canonical editable source, one materially useful rollback snapshot,
and one current candidate or accepted export artifact by default. Do not clone
complete source trees for every review state.

### 7. Runtime integration and inspection

Use the project adapter to build, run, exercise, and capture the actual result.
Inspect changed states and affected viewports first. Repeat a full visual/state
matrix only for structural, baseline, milestone, gate, or broad presentation
changes.

Separate evidence facets:

- static completeness and import checks;
- functional input/state/render checks;
- runtime visual inspection;
- professional art/UX conformance;
- human golden or gate decision when applicable.

No automated result substitutes for subjective quality acceptance.

### 8. Bounded repair and return

Finish the currently observable representative slice before repairing
non-blocking polish findings. Group failures by shared root cause and perform
one bounded repair batch per subsystem or root cause, followed by one combined
regression.

If two consecutive cycles add no evidence toward the same failed criterion, or
the same cross-state regression repeats, stop tuning. Classify the cause as
baseline/scope, visual design, shared-space assembly, state/render architecture,
source quality, import/pipeline, tool/environment, or acceptance/evidence, then
return a bounded repair, replan, capability-enabling, alternative-candidate, or
abandon recommendation to the core.

## Output contract

The art Skill returns one consolidated result with these fields:

- `Art result`: `Implemented`, `Reviewed`, `Returned`, or `Blocked`; `Reviewed`
  is read-only and grants no gate or lifecycle passage;
- `Artifact maturity`: `Greybox` or `Production candidate`; `Accepted` may be
  echoed only when the input already names the core-recorded acceptance or
  approval evidence and is never self-promoted by the art Skill;
- `Player-visible outcome`: what now works in the actual project;
- `Changed paths`: product, editable source, export, import, and configuration
  paths changed within the allowed boundary;
- `Coverage`: scoped actions, states, renderers, components, and asset families
  covered or missing;
- `Runtime proof`: project-native artifact and the input/state/viewports it
  demonstrates;
- `Source and recovery`: canonical editable source, export/import route, and
  recoverable checkpoint;
- `Bulk unlock`: passed, locked, or not applicable, with the evidence basis;
- `Unresolved risks`: specific remaining quality, capability, integration,
  performance, provenance, or acceptance risks;
- `Recommended next delta`: one bounded continuation, correction, approval, or
  stop action.

The core consumes this return and performs all durable lifecycle/state updates.
The art Skill does not maintain a parallel status file.

## Maturity and completion

`Greybox` proves structure, state, interaction, assembly, and replacement
boundaries. It is not final art.

`Production candidate` has complete editable sources, asset coverage,
export/import, project-native integration, runtime behavior, and professional
conformance for the promised scope. It still lacks an applicable independent,
golden, producer, or gate decision.

`Accepted` is a core-owned lifecycle result. It means all applicable objective
checks, runtime inspection, professional conformance, source/recovery
requirements, and independent or human decisions have passed and are recorded
by the core. The art Skill may report that a production candidate is ready for
this promotion, but cannot grant it.

An art-related task can close only when:

1. promised actions, states, components, renderers, and asset families are
   covered without undeclared deferral;
2. editable source, export, import, provenance, and recovery are valid;
3. real project input produces the promised visible result at the target
   runtime/viewports;
4. the result reaches the maturity promised by the task and passes all
   applicable acceptance facets;
5. unresolved final-fidelity work is either completed or explicitly outside the
   accepted scope, never hidden under a lower-maturity artifact.

The system can guarantee an honest bounded workflow and completion against a
frozen quality bar. It cannot guarantee artistic excellence without adequate
capability, reference quality, runtime evidence, and subjective authority.

## Skill structure

The first implementation should use progressive disclosure:

```text
skills/game-art-production/
├── SKILL.md
├── agents/openai.yaml
└── references/
    ├── visual-brief.md
    ├── interactive-ui-2d.md
    ├── asset-production.md
    ├── runtime-assembly.md
    └── visual-review.md
```

`SKILL.md` contains only routing assumptions, the mandatory production loop,
input/output contract, maturity rules, stop conditions, and reference-selection
guide. Keep it below 500 lines and substantially smaller than the current core.
Each detailed reference is one level from `SKILL.md` and is loaded only for the
applicable craft path.

Do not create `README`, installation, changelog, or duplicate quick-reference
files inside the Skill. Add scripts only after a repeated deterministic need is
demonstrated. Prefer Node for new cross-platform validators; retain PowerShell
only where it extends the existing governance scripts and test Windows argument
and UTF-8 behavior.

The initial implementation scope is interactive UI/2D because it directly
exercises the observed composite, state, spatial, source-separation, and asset-
family failures. Other art forms may reuse the general contract later, but must
not inflate the first release.

## Core migration strategy

### Phase 1: additive parity

Add the art Skill and routing tests while retaining the current core,
`execution.md`, and `visual-production.md` safeguards. Duplication is accepted
temporarily so a missing route cannot weaken stable behavior.

### Phase 2: evidence-based extraction

After routing, no-tool fallback, real-fixture production, authority, maturity,
and regression tests pass, move detailed art design, decomposition, source,
assembly, import, and visual-review procedures to the art Skill.

The core keeps only these visual sentinels:

- route applicable work to `game-art-production`;
- never accept a flattened composite as runtime UI;
- never unlock bulk art before representative assembly/runtime proof;
- never call greybox or an unaccepted candidate final art;
- keep task, gate, approval, and lifecycle authority in the core;
- require actual project runtime evidence for player-visible completion.

Do not remove a rule until a behavior test proves the art path owns its positive
replacement and the core still rejects the historical failure.

## Path, state, and failure safety

Skill instructions cannot provide operating-system access control. Enforce the
boundary through the existing task contract and deterministic checks where
practical:

- compare changed paths with allowed/protected paths;
- assign shared files to one integrator;
- keep trials in task-owned scratch and promote only acceptance evidence;
- preserve unrelated dirty-worktree changes;
- record a recoverable source checkpoint before risky import or replacement;
- reject state changes created outside the core return/close path;
- keep 1.7.2 installable as the rollback version until 1.8.0 is accepted.

If the art Skill is undiscoverable in an installed candidate, the explicit
core route must fail visibly rather than silently falling back to incomplete
art behavior. Because all three Skills ship in one plugin, this is an
installation-integrity failure, not a project planning problem.

## Test strategy

Skill changes follow RED-GREEN-REFACTOR. No art Skill instructions or core
behavior changes are written before a failing baseline scenario demonstrates
the behavior gap.

### Baseline RED scenarios

At minimum, capture these failures or pressures against the 1.7.2 control:

1. A polished flattened UI composition is offered under time pressure as a
   finished interface; the agent must instead derive components/states, build a
   project-native actual-size representative slice, and withhold completion.
2. An image generator or external art Skill is unavailable; the agent must use
   an honest replaceable route, preserve final-fidelity boundaries, and avoid
   reopening frozen planning or claiming accepted art.
3. A visual task is returned twice for the same spatial/state root cause under
   sunk-cost pressure; the agent must stop tuning and select one bounded root-
   cause response.
4. A routine Fast UI repair reuses accepted baselines; the art path must not add
   a plan, separate reviewer, approval, exhaustive state matrix, or bulk
   workflow.

Use the existing deterministic eval corpus as the durable contract surface.
Use isolated fresh-context forward tests for release evidence when the runtime
supports them and their creation is explicitly authorized; runtime projects
must not depend on multi-agent support.

### Verification layers

1. **Structure and deployment:** manifest discovery, Skill validation,
   `agents/openai.yaml`, version/cachebuster, installation, links, secrets, and
   atomic bundle integrity.
2. **Routing:** positive art predicates load the Skill; negative Fast and
   non-visual cases do not; absence fails visibly.
3. **Authority and behavior:** no second task/status/gate, no unauthorized path
   writes, no false maturity, no premature bulk unlock, preserved convergence,
   approval, timeout, and return semantics.
4. **Real artifact:** a project-native interactive UI/2D fixture demonstrates
   actual input, authoritative state, multiple states, component/layer
   separation, shared-space assembly, editable sources, export/import, runtime
   captures, and recovery. Run the same fixture without optional generation
   capability to verify the honest fallback.
5. **Regression and platform:** all current policy, convergence, eval, doctor,
   installer, MCP, Windows argument/UTF-8, macOS, and Linux checks remain green.

Generative output is never a deterministic test dependency. Tests validate the
workflow, contracts, integration, and maturity truth, not a generator's
subjective image quality.

## Success measures

Compare the candidate with the 1.7.2 control on the same fixtures and at least
one new real production task. Publish only when all hard contracts pass and the
candidate shows no material regression in workflow burden.

Track:

- elapsed work and production cycles to first valid runtime visual slice;
- number of same-root return/repair cycles;
- rework discovered after bulk unlock;
- scoped action/state/renderer/asset-family coverage;
- false completion or false maturity claims;
- recoverable editable-source and export/import coverage;
- human approval count for routine production;
- references loaded and core/context volume after extraction;
- representative-slice acceptance and integrated-outcome acceptance;
- behavior/install/platform regression count.

No fixed artistic score is required. The quality bar is the frozen external
reference or explicit product baseline plus runtime inspection and applicable
subjective authority.

## Risks and mitigations

### Routing misses or double loading

Mitigate with observable predicates, explicit required-sub-skill routing, and
positive/negative evals. Do not depend only on description discovery.

### Temporary context growth

Accept duplication only during additive parity. Make extraction a release task,
measure loaded context, and keep sentinel rules in the core.

### Professional silo behavior

Keep the player-visible outcome as the production unit, one integrator, and one
core-owned result. Art cannot close its own discipline task independently.

### Tool absence or service lock-in

Make all external tools optional, provide project-native/code/vector/greybox
routes, and report final-fidelity blockers honestly.

### False quality confidence

Separate static, functional, runtime, professional, and human evidence. Never
convert automation into subjective acceptance.

### New process burden on small work

Exclude accepted-baseline Fast repairs, reuse passing evidence, inspect only
changed states/regions, and forbid new plans or approvals solely because the
art Skill exists.

### State or path conflicts

Keep core authority, one integrator, structured return, allowed/protected path
checks, Git diff inspection, and recoverable checkpoints.

### Cross-environment inconsistency

Ship the Skills atomically, validate platform-specific installation and
runtime commands, preserve a self-contained project fallback, and require a
new Codex task after local plugin update so discovered Skill metadata is fresh.

## Rollout

1. Branch from the stable 1.7.2 main line and freeze all existing contracts.
2. Add failing baseline scenarios and record the observed behavior.
3. Add the minimal `game-art-production` structure and route without removing
   visual rules from the core.
4. Pass routing, authority, maturity, fallback, convergence, and Fast-lane
   behavior tests.
5. Build and inspect the real interactive UI/2D fixture.
6. Apply the candidate to one new real production task and compare quality,
   iteration, approvals, and time-to-runtime with 1.7.2 evidence.
7. Extract only proven duplicate art detail from the core and rerun the full
   suite after each extraction group.
8. Validate macOS, Linux, and Windows installation/doctor behavior and atomic
   plugin discovery.
9. Install the 1.8.0 candidate locally without deleting the 1.7.2 rollback
   path; start a new task for live observation.
10. Push and open a PR only after fresh verification; merge and release only
    after the candidate meets the success measures and review gates.

## Acceptance criteria

- The plugin discovers `game-production-system`, `game-art-production`, and
  `game-approval-ui` from one versioned installation.
- Positive art predicates reliably load the art Skill; routine Fast and
  non-visual work remains light.
- Art execution creates no additional project task, status, gate, approval, or
  mandatory schema migration.
- A flattened visual composition cannot pass as runtime UI or as sufficient
  component/state/asset coverage.
- The real fixture proves actual input, authoritative state, shared-space
  assembly, project-native components, editable sources, export/import,
  multiple required states, runtime captures, and recovery.
- Bulk production remains locked until representative assembly and runtime
  proof pass.
- Missing optional art capability produces an honest replaceable result or a
  bounded final-fidelity blocker, not false completion or unnecessary
  replanning.
- Greybox, production candidate, and accepted maturity cannot be conflated.
- Two ineffective same-root cycles invoke bounded root-cause handling.
- Existing 1.7.2 approval, timeout, return, convergence, evidence, installer,
  platform, compatibility, and standalone-execution contracts remain green.
- After proven extraction, the core contains only routing and sentinel visual
  invariants, and the normal non-art execution context does not grow.
- Learning/upload behavior remains absent and cannot block production.
