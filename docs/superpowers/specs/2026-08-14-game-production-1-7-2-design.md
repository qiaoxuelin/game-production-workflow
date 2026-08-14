# Game Production System 1.7.2 Design

## Goal

Make the existing production policy easier to trigger and harder to
misapply without adding a new project schema, approval layer, engine
encyclopedia, or external-Skill dependency.

## Evidence and problem statement

The 1.7.1 baseline already passes the repository verification suite and has
correct standalone production, interactive-visual, asset-family, and returned-
candidate contracts. Three prior pressure cases also show that missing external
capability and repeated same-root failure already route correctly.

One pressure case exposes a remaining contradiction:

- Fast work forbids independent review and approval ceremony.
- The workflow currently marks every UI/GUI task as GUI restoration and asks
  for an independent reviewer.
- The checker accepts a Fast task whose `GUI restoration` field is `Required`.

This can turn a routine icon-offset or clipping repair that reuses an accepted
baseline into a Standard-style restoration process.

The skill also has a context-efficiency problem: its 498-line core, mandatory
603-line workflow reference, and 180-line copied project instructions repeat
several lane, evidence, approval, and production rules. This release reduces
the highest-risk duplication in place and preserves existing paths and anchors.

## Design

### 1. Condition GUI restoration on observable scope

`GUI restoration: Required` applies only when work reconstructs an approved
GUI baseline, materially changes layout or the component system, or establishes
a new visual rule requiring frozen comparison tolerances.

A routine Fast UI repair that reuses an accepted interaction/render and visual
baseline sets `GUI restoration: Not applicable`, compares only the affected
region and states, and closes on objective evidence and recovery. A Fast task
that declares GUI restoration `Required` is invalid because the restoration
contract includes design-baseline and reviewer responsibilities that exceed the
Fast lane.

This changes policy, not schema: the existing field and both existing values
remain unchanged.

### 2. Add a positive operation router

Place a compact intent-to-operation table near the beginning of the core Skill.
Each row states the reference to load and the permitted result:

- explore/discuss -> conversational conclusion, no repository mutation;
- diagnose/review -> evidence-backed report, no repair;
- start/adopt/plan -> the narrowest repository-resident executable contract;
- execute/continue -> the next player-visible product or capability delta;
- close -> verified result and recoverable handoff;
- gate -> one read-only gate verdict.

The router does not replace detailed operation instructions. It makes the
default production destination visible before approval and governance detail.

### 3. Add compact, evidence-derived execution red flags

Add only the recurring rationalizations demonstrated by prior failures:

- a renamed candidate is progress;
- a composed image is a runtime UI or asset inventory;
- missing external Skills requires replanning a healthy Ready task;
- passing automation proves subjective visual/audio/player quality.

Each red flag maps to one positive route already defined by the production
loop. Do not add speculative domain guidance or a general anti-pattern catalog.

### 4. Add a development-only behavior-evaluation corpus

Store machine-readable pressure scenarios under the plugin's `evals/`
directory. The corpus is not a runtime dependency and is not loaded by the
production Skill. Each scenario records:

- request and repository state;
- combined pressures;
- required actions and prohibited actions;
- required terminal state and evidence shape.

Add a deterministic test that validates the corpus schema and that the policy
and checker expose the required contracts. Use fresh-context agents for
release-time forward tests when available; runtime game tasks do not depend on
multi-agent support.

### 5. Reduce duplication without breaking compatibility

Keep `workflow.md` and its existing section anchors. Remove only exact or near-
exact repetitions whose authoritative positive contract already exists in the
core or `execution.md`. Keep project `AGENTS.md` self-contained enough to route
an agent when no other external Skill is installed, while replacing repeated
policy detail with a compact read order, lane table, production loop, and
non-negotiable project invariants.

Do not introduce nested references or multiple task templates. Keep the
existing `TASK.md` schema and compatibility guards.

### 6. Version and deployment

Release as 1.7.2 because the task schema remains compatible. Update the plugin
version/cachebuster, checker policy version, bootstrap system version, README,
and version assertions together. Existing 1.7.1 projects use the current policy
without a migration; newly bootstrapped projects record 1.7.2.

After merge and remote verification, update the local plugin cache and start a
new Codex task so the discovered Skill metadata reflects 1.7.2.

## Non-goals

- Do not add engine/framework version tables.
- Do not add fixed art, animation, audio, performance, or platform numbers.
- Do not split the system into many independently triggered Skills.
- Do not add a capability-to-maturity matrix unless a future behavior test
  demonstrates that the existing handshake permits a false maturity claim.
- Do not change task fields, states, gate authority, or approval semantics.

## Acceptance

- A Fast task with `GUI restoration: Required` fails Task-mode validation.
- A Fast UI repair with `GUI restoration: Not applicable` can remain Fast and
  does not require a reviewer or approval.
- Standard/Full restoration behavior and evidence requirements remain intact.
- The core presents production execution before detailed approval transport.
- Development eval scenarios are schema-validated and excluded from runtime
  requirements.
- All existing verification commands pass, Markdown links remain valid, and
  the skill core stays under 500 lines with lower duplicated policy volume.

