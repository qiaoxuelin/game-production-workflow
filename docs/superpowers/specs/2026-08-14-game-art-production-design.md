# Game Art Production Skill Design

## Decision

Add one dedicated `game-art-production` Skill to the existing
`game-production-workflow` plugin. Keep `game-production-system` as the sole
production lifecycle authority and `game-approval-ui` as the human-decision
surface. Ship all three Skills as one atomically versioned plugin.

Develop this change as a 1.8.0 candidate. Do not replace the stable 1.7.2
installation or remove current visual safeguards until behavior tests, the
project-native UI/2D fixtures, and one actual target-project pilot demonstrate
equal governance behavior and better production outcomes.

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

- Turn player/product intent into a reviewable UI/2D visual direction, then
  turn the accepted direction into editable sources, runtime-native components,
  imported assets, representative playable proof, and a bounded repair result.
- Derive interface and asset decomposition from player actions and states, not
  from the visual seams of a composite image.
- Load detailed art guidance only when observable task scope requires it.
- Preserve one task, one lifecycle authority, one integration owner, and one
  consolidated result.
- Remain useful without ImageGen, Figma, another art Skill, or a particular
  game engine.
- Preserve the existing Direction, Production design, Runtime golden, and
  Integrated acceptance maturity model while disclosing placeholder, greybox,
  working, and final asset fidelity separately.
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

The art Skill exposes three operation protocols without creating three
lifecycles:

| Operation | Entry | Permitted result |
| --- | --- | --- |
| `Design` | The core has an unresolved UI/2D visual direction or needs an implementable visual system before `Ready` | Direction or production-design candidate for core-owned review and freeze |
| `Produce` | The task is `Ready` or `Implementing` and the applicable direction/design contract is frozen | Editable, imported, project-native player-visible delta plus evidence and recovery |
| `Review` | The user/core requests visual diagnosis, conformance, golden, or gate evidence | Read-only professional finding; no repair or passage |

The operation is selected from the core task status and intent. A mode switch
does not create another task, plan, approval, or status transition.

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

Keep accountability mode-specific without creating department tasks: `Design`
names the affected art/UX design owner for the candidate, `Produce` names the
production owner and the one shared-file integrator, and `Review` records the
reviewer's contribution disclosure and applicable independent/human authority.
These are responsibilities inside the core task, not additional approval stages.

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

- develop reviewable UI/2D direction candidates from an explicit player,
  product, platform, reference, and quality brief;
- turn the selected direction into a coherent visual system and implementable
  production-design candidate without granting its approval;
- interpret the frozen art/UX baseline and applicable references during
  production;
- map player action to authoritative state, renderer, visible response, and
  required asset family;
- define shared spatial masters, components, layers, state variants, editable
  sources, export/import boundaries, and runtime destinations;
- build the smallest actual-size representative assembly;
- create, adapt, or replace art sources using available capabilities;
- import and integrate sources into the actual project;
- inspect the running result and perform one bounded root-cause repair batch;
- report the existing maturity claim, fidelity disclosure, coverage, evidence,
  recovery, and remaining risk.

The art Skill must not:

- create or own `TASK`, `PLAN`, gate, approval, or lifecycle state;
- change frozen gameplay rules or the authoritative gameplay state model;
- self-approve a golden, gate, or final subjective-quality decision;
- invent missing gameplay rules, interaction semantics, authoritative state
  ownership, or protected UX behavior;
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

A creator's craft self-check may support design conformance but never counts as
an independent pass. `Review` must disclose whether the reviewer contributed
materially to the direction, source, or implementation; gate-critical or
repeatedly returned work still requires a genuinely independent or human pass
under the existing core policy.

## Routing predicate

The core must require `game-art-production` when any of these observable
conditions applies:

- `Interactive visual scope: Required` for interactive UI/2D work;
- a new or materially changed UI/2D art direction, screen, HUD, visual state,
  component system, 2D interface asset family, or shared visual master is in
  scope;
- reference-interface reconstruction, flattened-composite decomposition,
  UI/2D source separation, visual integration, or bulk UI/2D asset production
  is required;
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

Every operation consumes repository truth already owned by the core: task ID,
lane, status, planned player-visible outcome, development mode, allowed and
protected paths/behavior, integration owner, recovery boundary, applicable
acceptance, stop conditions, and evidence budget.

`Design` additionally requires:

- target player, platform, viewing distance, viewport, interaction pace, and
  accessibility constraints;
- product identity, intended emotion, attention order, UI/2D scope, and the
  player problem the surface must solve;
- external reference or explicit category/product quality bar, including what
  must match, what may differ, and prohibited copying;
- affected screens, player flows, authoritative interaction semantics, content
  extremes, and human-owned boundaries;
- the unresolved visual direction or visual-system decision to retire.

`Produce` additionally requires:

- the selected and core-recorded Direction or Production design baseline,
  applicable art bible/references, allowed deviations, and hard return
  conditions;
- `Interactive visual scope`, `Interaction/render contract`, `Assembly
  precheck`, `Required asset inventory`, `Asset-family packages`,
  `Representative proof`, and `Bulk or parallel unlock`;
- target platforms/viewports, performance/provenance constraints, detected
  capabilities, and project adapter commands.

`Review` additionally requires the exact maturity and product-quality claim,
the frozen comparison baseline, actual target-project artifact, applicable
states/viewports, hard return conditions, and disclosure of the reviewer's
contribution to design or implementation.

The first release reuses existing task fields and acceptance records. It does
not require a project schema migration or a new mandatory visual-status field.
Mode-specific output is transient until the core maps it into those sources.

If gameplay rules, interaction semantics, authoritative state ownership,
protected UX behavior, product scope, or another human/domain-owned boundary is
missing, the art Skill returns one blocking clarification to the core rather
than inventing it. If only reversible visual implementation knowledge is
missing, `Produce` runs an isolated precheck instead of reopening product
planning.

## Design protocol

`Design` creates the smallest decision-ready visual system that can guide
production. It does not produce bulk assets or grant direction approval.

1. **Freeze the professional brief.** State the player/platform context,
   product identity, emotion, attention order, screen/state scope, interaction
   semantics, content extremes, external reference or quality bar, allowed
   differences, accessibility/performance constraints, and hard return
   conditions. A style prompt or mood board is not this brief.
2. **Choose the lightest honest design medium and explore the real decision.**
   Reuse the capability handshake and use available or replaceable project-
   native, code, vector, procedural, generated, or manual sources; optional
   tools never become direction authority. When a human-owned direction choice
   remains, create 2-3 mutually exclusive UI/2D direction candidates for one
   dominant-risk representative surface. Put the recommendation first.
   Candidates must differ in hierarchy, composition, shape/component language,
   palette, typography/icon treatment, material/detail strategy, and feedback
   character, not merely color or decoration. If the direction is already
   owned by a frozen wider art system, produce one conforming candidate instead
   of manufacturing a new choice. Record each candidate's origin, provenance/
   rights boundary, and enough prompt, source, or manual construction detail to
   identify and reproduce the selected intent honestly.
3. **Inspect at intended size.** Compare the candidate at target dimensions and
   representative content density. A direction image may authorize visual
   intent only; it cannot prove component, state, source, import, runtime, or
   integrated quality.
4. **Run a non-authoritative feasibility precheck.** Test the dominant layout,
   source-separation, component, typography, scaling, performance, or import
   risk in task-owned scratch. Reject an infeasible direction but never let the
   precheck choose product direction or grant approval.
5. **Form the production-design candidate.** After a direction is selected,
   define the grid/shared space, attention hierarchy, components and states,
   palette, typography, icons, shape/material language, motion/feedback rules,
   extremes, editable-source/layer boundaries, export/import contract,
   provenance, tolerances, placeholder boundary, and representative runtime
   proof required before bulk work. Translate a selected generated, raster, or
   otherwise non-editable direction into these editable visual-system primitives
   before the task can become `Ready`; the direction image itself does not need
   to masquerade as production-editable source.

Return a `Direction` or `Production design` candidate plus its inspection entry,
rejection conditions, and next authorized proof. The core records any human
choice and freezes the design; the art Skill does neither automatically.

When a human direction choice is required, the first bounded Design pass ends
with the Direction candidates. After the core records the decision, a second
bounded Design pass forms the Production design. Do not wait/poll inside the
active turn or pre-produce all rejected directions.

## Produce protocol

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

One authoritative state source may feed multiple UI, HUD, overlay,
accessibility, or preview renderers. Audio/gameplay feedback may be named as an
integration dependency but is not produced by the UI/2D art protocol. The map
must expose contradictory duplicate state, missing renderers, unreachable
variants, and feedback with no player cause.

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
bulk work: a layered editable assembly, project-native UI component, or
engine-native UI/2D greybox. It must test real component boundaries, critical
states, source separation, and spatial relationships. A composite screenshot
does not pass this precheck.

### 5. Representative production slice

Produce the smallest slice that exposes the dominant art and integration risks.
It must:

- run inside the actual project named by the current task; during Skill release
  evaluation that project may itself be the fixture, but its evidence cannot be
  reused to accept another game project;
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

## Review protocol

`Review` is read-only. Reuse the capability handshake for the observation path
and inspect the actual target-project result at normal player pace, target
size/device, and applicable states. If the claimed result cannot be observed,
return the exact review blocker and grant no conformance or quality result.
Separate four claims:

- objective validity;
- conformance to the frozen Direction or Production design;
- product quality against the declared player/platform/reference bar;
- integration with surrounding gameplay and experience.

Passing one claim never implies the next. Review hierarchy, identity,
readability, affordance, interaction-to-visual causality, shared-space contact,
component/state continuity, source separation, feedback, content extremes,
accessibility, performance, and provenance that apply to the scope.

Return exactly `Pass`, `Pass with bounded non-blocking findings`, or `Returned`
when inspection is possible; return `Blocked` only when the claimed experience
cannot be observed. Include the claim reviewed, observable evidence, retained
passing parts, hard conditions for passage, reviewer-contribution disclosure,
and next owner. A creator's self-check can support conformance but cannot
satisfy an independent review requirement. The reviewer does not implement the
repair or grant gate, golden, producer, or lifecycle passage.

## Output contract

The art Skill returns one transient consolidated handoff with these fields:

- `Operation`: `Design`, `Produce`, or `Review`;
- `Professional result`: `Proposed` or `Blocked` for `Design`; `Implemented`,
  `Returned`, or `Blocked` for `Produce`; or `Pass`, `Pass with bounded
  non-blocking findings`, `Returned`, or `Blocked` for `Review`;
- `Maturity assessment`: `Not established` when the operation is blocked before
  supporting evidence exists; otherwise exactly `Direction`, `Production
  design`, `Runtime golden`, or `Integrated acceptance`, using the existing
  visual-production meanings;
- `Fidelity disclosure`: `Not applicable` when no artifact is assessed;
  otherwise the scoped regions/assets that are `Placeholder`, `Greybox`,
  `Working`, or `Final`; fidelity never grants maturity or passage;
- `Outcome or claim`: the intended player-visible result for `Design`, what now
  works in the actual project for `Produce`, or the exact claim inspected for
  `Review`;
- `Changed paths`: product, editable source, export, import, and configuration
  paths changed within the allowed boundary, or `None` for read-only review;
- `Coverage`: scoped actions, states, renderers, components, and asset families
  covered or missing;
- `Runtime proof`: the actual target-project artifact and input/state/viewports
  it demonstrates when the claim requires runtime; `Design` records only its
  scratch feasibility precheck and explicitly says runtime proof is pending;
- `Source and recovery`: for a Direction candidate, origin, provenance/rights,
  reproducibility information, and any scratch checkpoint; for Production
  design or Produce, canonical editable source, export/import route, and a
  recoverable checkpoint; for Review, the inspected claim or `None`;
- `Bulk unlock`: passed, locked, or not applicable, with the evidence basis;
- `Unresolved risks`: specific remaining quality, capability, integration,
  performance, provenance, or acceptance risks;
- `Recommended next delta`: one bounded continuation, correction, approval, or
  stop action.

The core consumes the return and maps it to existing repository vocabulary:

| Transient art result | Core-owned mapping |
| --- | --- |
| Design `Proposed` (Direction or Production design candidate) | Keep the task non-Ready until the applicable owner/human choice is recorded and the existing design contract is frozen; the candidate grants no passage |
| `Implemented` | Keep or move the task to `Implementing` under the existing first-product-mutation rule; run applicable acceptance before any close |
| Review `Pass` or bounded pass | Record only the applicable conformance/review evidence; grant no gate, golden, producer, or human passage that the reviewer does not own |
| `Returned` | For Standard/Full, use the existing `Result: Candidate returned — ...` recipe and normally keep `Implementing` while repair criteria remain frozen; Fast continues its direct repair loop |
| `Blocked` | Move to `Clarifying` only for a genuinely missing/changed human or domain-owned boundary; otherwise preserve the current executable status, completed work, exact blocker, fallback, and recovery point |

The art Skill does not write a parallel result/status file or introduce a
`Returned`, `Reviewed`, `Blocked`, or art-specific lifecycle state.

`Not established` and `Not applicable` report the absence of an assessment.
They are not maturity levels, fidelity levels, lifecycle states, or passage.

## Maturity, fidelity, and completion

Use the existing visual maturity model without aliases:

- `Direction`: mood, reference, hierarchy, and composition intent; not
  implementation-ready.
- `Production design`: frozen visual system, components/states, source/layer
  requirements, tolerances, and representative proof contract;
  implementation-ready only for the declared slice.
- `Runtime golden`: the actual target-project result passes at target size and
  relevant states; it does not imply integrated-module or gate acceptance.
- `Integrated acceptance`: the complete scoped experience passes applicable
  design, runtime, performance, independent, producer, and human authority.

The art Skill may assess Direction, Production design, and Runtime golden
against their evidence. It may echo Integrated acceptance only when the input
already identifies the core-recorded acceptance; otherwise it can only report
readiness or a review recommendation, never grant that maturity.

Fidelity is a separate disclosure within a maturity claim. `Placeholder` and
`Greybox` prove only their declared structure or interaction boundary;
`Working` means replacement/polish remains; `Final` means the scoped source is
intended for acceptance but does not itself prove Runtime golden, Integrated
acceptance, or task `Accepted` status.

An art-related task can close only when:

1. promised actions, states, components, renderers, and asset families are
   covered without undeclared deferral;
2. editable source, export, import, provenance, and recovery are valid;
3. real project input produces the promised visible result at the target
   runtime/viewports;
4. the result reaches the existing maturity promised by the task and passes all
   applicable acceptance facets;
5. unresolved final-fidelity work is either completed or explicitly outside the
   accepted scope, never hidden under a lower-maturity artifact.

The system can guarantee an honest bounded workflow and completion against a
frozen quality bar. It cannot guarantee artistic excellence without adequate
capability, reference quality, runtime evidence, and subjective authority.

## Skill structure

The first implementation starts with the smallest structure justified by the
observed baseline failures:

```text
skills/game-art-production/
├── SKILL.md
├── agents/openai.yaml
└── references/
    ├── visual-design.md
    ├── interactive-ui-2d.md
    └── visual-review.md
```

`SKILL.md` contains only the three-mode router, shared authority/safety rules,
input/output mapping, maturity/fidelity rules, stop conditions, and reference-
selection guide. `visual-design.md` owns Design, `interactive-ui-2d.md` owns
Produce, and `visual-review.md` owns Review. Each is one level from `SKILL.md`
and only the selected operation's reference loads by default.

`visual-review.md` contains only UI/2D craft-specific inspection and return
criteria. It must reuse, not duplicate or weaken, the core's general independent
review, experience-quality, authority, and gate semantics.

Keep source production, asset families, shared-space assembly, import, and
runtime integration together in `interactive-ui-2d.md` initially. Split a new
reference only when a failing retrieval/behavior test or repeated independent
use demonstrates a real boundary; do not create files merely to mirror an art
department org chart.

Context efficiency is a release gate:

- the normal non-art route must load no `game-art-production` body or reference,
  add no mandatory work, and must not grow in loaded body/reference words from
  its 1.7.2 route-specific baseline;
- measure the unavoidable discovery cost separately: permit exactly one new
  bundled Skill metadata entry, keep its description at or below 500 characters
  and limited to observable trigger predicates, and record its character/word
  delta instead of pretending metadata has zero cost;
- after extraction, the common Design route's total loaded words must not
  exceed the corresponding 1.7.2 planning-plus-visual path;
- after extraction, the common Produce route's total loaded words must be lower
  than the 1.7.2 core-plus-execution-plus-visual path;
- Review loads its reference only for an actual review request or applicable
  gate evidence;
- temporary additive duplication may exist on the development branch but
  cannot ship in 1.8.0.

For every route, record the expected Skill bodies and reference files plus word
counts for discovery metadata, bodies, and references as separate buckets. A
static route-manifest test proves that only the declared art reference is
reachable. When the runtime exposes actual load traces, compare them with that
manifest; otherwise use the manifest plus artifact-behavior fixtures and do not
claim unavailable runtime telemetry.

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

After routing, no-tool fallback, artifact-fixture production, authority, maturity,
and regression tests pass, move only proven duplicate interactive UI/2D design,
decomposition, source, assembly, import, and visual-review procedures to the art
Skill.

For interactive UI/2D routing, the core keeps only these visual sentinels:

- route applicable work to `game-art-production`;
- never accept a flattened composite as runtime UI;
- never unlock bulk art before representative assembly/runtime proof;
- never use a fidelity label, source candidate, or self-check as maturity or
  lifecycle acceptance;
- keep task, gate, approval, and lifecycle authority in the core;
- require actual project runtime evidence for player-visible completion.

Keep the existing character, environment, 3D, animation, VFX, technical-art,
and other broad visual-production guidance on its current core path in 1.8.0.
Do not interpret UI/2D extraction as permission to delete or weaken those
disciplines before a separately approved, behavior-proven expansion.

Do not remove a rule until a behavior test proves the art path owns its positive
replacement and the core still rejects the historical failure.

## Path, state, and failure safety

Skill instructions cannot provide operating-system access control. Enforce the
boundary through the existing task contract and deterministic checks where
practical:

- capture the pre-existing dirty-worktree baseline and compare only task-
  introduced changes with allowed/protected paths;
- assign shared files to one integrator;
- keep trials in task-owned scratch and promote only acceptance evidence;
- preserve unrelated dirty-worktree changes;
- record a recoverable source checkpoint before risky import or replacement;
- reject state changes created outside the core return/close path;
- keep 1.7.2 installable as the rollback version until 1.8.0 is accepted.

Treat three capability environments distinctly:

1. **Intact 1.8 plugin:** `game-art-production` is a required bundled
   professional protocol for its positive UI/2D predicate, not an optional
   external accelerator.
2. **Installed 1.8 plugin missing the bundled Skill:** fail the integrity check
   visibly before claiming art-path completion, preserve completed work, and
   repair/reinstall the plugin. Do not send the project back to product planning
   or silently substitute incomplete policy.
3. **Repository-only environment with no plugin/other Skills:** the compact
   interactive-visual loop retained in project `AGENTS.md` remains a
   self-contained fallback. It may produce and verify bounded UI/2D work with
   base tools, but must not pretend that the missing dedicated professional
   protocol or unavailable subjective authority ran.

Image generation, Figma/design applications, browser/computer control, and
third-party art Skills remain optional techniques in every environment. Their
absence selects an available/replaceable path or an exact recoverable fidelity
blocker; it does not invalidate frozen planning.

Release the plugin and policy as 1.8.0 and bootstrap new projects with the
1.8.0 semantic contract. Existing compatible 1.6/1.7 projects use the current
policy and existing task fields without forced migration; compatibility guards
and fixtures must prove this behavior.

## Test strategy

Skill changes follow RED-GREEN-REFACTOR. No art Skill instructions or core
behavior changes are written before a failing baseline scenario demonstrates
the behavior gap.

### Baseline RED evidence

The existing deterministic eval corpus proves that 1.7.2 contains policy text
for composites, optional capabilities, Fast work, and stop-loss. It is a
regression surface, not evidence that an executing agent produces the right art
artifact. Do not count a regex/policy match as RED.

Before authoring the new Skill, run the 1.7.2 control on the same isolated,
project-native UI/2D fixtures that will evaluate the candidate:

1. **Design fixture:** an `original_design` task with frozen player flow,
   platform, content extremes, quality bar, and human-owned boundaries but an
   unresolved UI/2D visual direction. Capture whether the control produces a
   decision-ready professional brief, materially distinct direction candidates
   only when a real choice exists, an implementable Production design, honest
   maturity, and no duplicate task/approval system.
2. **Composite-to-runtime fixture:** a frozen direction represented initially by
   a polished flattened composition. Require the control to derive interaction
   states/components/asset families, create editable separated sources, assemble
   them in one shared space, integrate them into the target fixture, respond to
   real input/authoritative state, capture required states, and withhold bulk or
   completion until the representative runtime proof passes.

Preserve the raw request, starting repository, loaded Skills/references,
tool/capability availability, source/output tree, runtime artifacts, task-state
diff, elapsed cycles, and reviewer findings. Score actual behavior and artifacts,
not the agent's explanation of what it intended to do.

Run pressure variants for unavailable optional generation, a returned same-root
candidate, and an accepted-baseline Fast repair. These preserve existing
behavior but do not justify the new Skill unless the real artifact/control
fails.

If 1.7.2 completes both primary fixtures at the required quality and equal or
lower workflow/context burden, stop: do not author `game-art-production` merely
to reorganize files. Otherwise record the exact observed failure before writing
the minimum Skill guidance that addresses it.

Use isolated fresh-context forward tests only when their creation is explicitly
authorized. Runtime projects must not depend on multi-agent support.

### Verification layers

1. **Structure and deployment:** manifest discovery, Skill validation,
   `agents/openai.yaml`, version/cachebuster, installation, links, secrets, and
   atomic bundle integrity.
2. **Routing:** static route manifests allow Design, Produce, and Review to load
   only their required art reference; negative Fast and non-visual cases load no
   art body/reference; runtime traces confirm the manifests when available, and
   artifact fixtures confirm behavior regardless. A damaged bundled installation
   fails visibly while repository-only fallback remains truthful.
3. **Authority and behavior:** transient art results map to existing task
   vocabulary; no second task/status/gate, unauthorized path writes, maturity/
   fidelity conflation, premature bulk unlock, self-approved independent pass,
   or regression in convergence, approval, timeout, and return semantics.
4. **Real artifact fixture:** the two primary control/candidate fixtures prove
   Design and Produce behavior, actual input, authoritative state, multiple
   states, component/layer separation, shared-space assembly, candidate
   provenance/reproducibility, editable production sources, export/import,
   runtime captures, and recovery. Run the production fixture without optional
   generation capability to verify the honest fallback. A release fixture
   proves Skill behavior but can never close a real game task.
5. **Regression and platform:** all current policy, convergence, eval, doctor,
   installer, MCP, Windows argument/UTF-8, macOS, and Linux checks remain green.

Generative output is never a deterministic test dependency. Tests validate the
workflow, contracts, integration, and maturity truth, not a generator's
subjective image quality.

## Success measures

Compare the candidate with the 1.7.2 control on the same fixtures and at least
one new real production task. That production task requires evidence from its
actual target project; fixture evidence cannot grant its Runtime golden or
close. Publish only when these hard gates pass:

- every existing 1.7.2 behavior, compatibility, installation, and platform
  contract remains green;
- the candidate corrects the recorded artifact-level RED failure without a new
  task, state, plan, or routine approval layer;
- Fast and non-art routes add no mandatory work or loaded art body/reference;
  their only permitted context delta is the separately measured and bounded
  discovery metadata entry;
- common Design does not exceed its 1.7.2 route context and common Produce is
  lower than its 1.7.2 route context after extraction;
- the target-project pilot reaches its promised maturity with editable sources,
  real input/state/runtime proof, recovery, and applicable independent/human
  evidence;
- no lower-fidelity artifact, fixture, source image, self-check, or automated
  result is reported as higher maturity or lifecycle acceptance.

The following measures support the human producer's release judgment rather
than acting as invented universal thresholds:

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
subjective authority. The human producer explicitly decides whether the
side-by-side quality/efficiency evidence justifies promotion after the hard
gates pass.

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
2. Run both artifact-level fixtures with the 1.7.2 control, preserve raw
   evidence, and stop the split if no relevant failure or burden is observed.
3. Only after RED, add the minimal `game-art-production` structure and route
   without removing visual rules from the core.
4. Pass three-operation routing, authority/result mapping, maturity/fidelity,
   fallback, convergence, independence, context, and Fast-lane behavior tests.
5. Run and inspect the same Design and composite-to-runtime fixtures with the
   candidate.
6. Extract only proven duplicate interactive UI/2D detail from the core while
   preserving every non-UI/2D visual path, and rerun the full
   suite after each extraction group.
7. Validate macOS, Linux, and Windows installation/doctor behavior and atomic
   plugin discovery.
8. Install the 1.8.0 release candidate locally without deleting the 1.7.2
   rollback path; start a fresh Codex conversation so Skill discovery metadata
   is refreshed.
9. From that fresh conversation, apply the installed release candidate to one
   new real target-project production work package under the core-owned task;
   compare quality, iteration, approvals, context, and time-to-runtime with
   1.7.2 evidence, then rerun final regression after the pilot.
10. Push and open a PR only after fresh verification; merge and release only
    after the candidate meets the success measures and review gates.

## Acceptance criteria

- The plugin discovers `game-production-system`, `game-art-production`, and
  `game-approval-ui` from one versioned installation.
- Static route manifests and, when available, runtime traces show that Design,
  Produce, and Review permit only the applicable art reference; artifact
  fixtures prove the corresponding behavior, and routine Fast/non-visual work
  loads no art body/reference.
- Art design, production, and review create no additional project task, status,
  gate, approval, or mandatory schema migration.
- Design can form a decision-ready direction and Production design without
  requiring a pre-existing frozen direction or granting its approval.
- Transient Proposed/Implemented/Pass/Returned/Blocked results map to existing
  task, review, and returned-candidate contracts without new lifecycle states.
- A result blocked before evidence uses only the absence indicators `Not
  established` and `Not applicable`; neither can be interpreted as maturity,
  fidelity, or passage.
- A flattened visual composition cannot pass as runtime UI or as sufficient
  component/state/asset coverage.
- The candidate fixtures prove professional direction formation plus actual
  input, authoritative state, shared-space assembly, project-native components,
  editable sources, export/import, multiple required states, runtime captures,
  and recovery; they grant no acceptance to another game project.
- One new real production task reaches its promised maturity from its own
  target-project runtime and applicable independent/human evidence.
- Bulk production remains locked until representative assembly and runtime
  proof pass.
- Missing optional art capability produces an honest replaceable result or a
  bounded final-fidelity blocker, not false completion or unnecessary
  replanning.
- Direction, Production design, Runtime golden, and Integrated acceptance keep
  their existing meanings; fidelity labels cannot promote them or task status.
- Two ineffective same-root cycles invoke bounded root-cause handling.
- Existing 1.7.2 approval, timeout, return, convergence, evidence, installer,
  platform, compatibility, and standalone-execution contracts remain green.
- An intact plugin requires the bundled art protocol, a damaged plugin fails
  integrity visibly, repository-only execution remains truthfully self-
  contained, and optional external techniques remain non-blocking.
- After proven UI/2D extraction, the core retains the UI/2D routing/sentinel
  invariants and every existing non-UI/2D visual-production path; non-art loaded
  body/reference context does not grow, discovery metadata stays within its
  declared bound, and the common Produce route is smaller than its 1.7.2 route-
  specific baseline.
- Learning/upload behavior remains absent and cannot block production.
