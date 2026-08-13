# Workflow

## Contents

1. Source-of-truth order
2. Clarification
3. Planning, design ownership, and execution health
4. Design modules
5. GUI restoration and change control
6. Lean completion
7. Offline stewardship
8. Task states
9. Evidence
10. Review and handoff
11. Parallel work

## 1. Source-of-truth order

Resolve conflicts in this order:

1. Explicit human producer decision
2. `production/PROJECT.md`
3. Current gate in `production/ACCEPTANCE.md`
4. Adopted design module or frozen technical/art/content contract
5. `production/PLAN.md` when referenced by the active task
6. `production/TASK.md`
7. Conversation-local instruction

Record material decisions in the repository. Do not rely on conversation memory.

`production/project.json` is the machine-readable current state. Keep history
out of it. `PROJECT.md` is the stable product contract. `TASK.md` is the current
work contract and handoff.

Keep `project.json` and `TASK.md` aligned on current task, gate, and status.
Update `project.json` last so a partial handoff cannot advertise a newer state
than the task contract.

## 2. Clarification

### Intent before artifacts

Classify the request before writing:

- Explore/discuss: inspect and answer; do not change the repository.
- Diagnose/review: inspect read-only and report findings.
- Implement/change: choose the lightest safe execution lane.

A proposed scope addition, tentative idea, or request for options does not
authorize implementation. Keep exploratory options in the conversation unless
the user asks to adopt or persist one.

### Execution lanes

- **Fast:** routine, reversible, no new player-facing rule or high-risk
  decision. No plan, role ceremony, independent review, or human approval.
  Implement, run relevant checks, record recovery.
- **Standard:** one bounded feature. Use one task card, only affected design
  owners, and technical implementation. Add no separate plan or role document
  unless needed for executable clarity.
- **Full:** core loop, high-fidelity replication, monetization, save/platform
  or architecture migration, bulk content/art, gate, or release. Use planning,
  affected domain owners, technical architecture ownership, and representative
  proof before bulk execution.

Record the lane on new v1.5 tasks. For legacy active tasks, infer it from scope
and continue without schema migration unless the checker reports incompatibility.
Do not interrupt an executing recoverable package solely to add lane or role
fields. Apply the policy now and record missing Full-lane ownership at the next
natural checkpoint before the next package; ineffective-iteration stop-loss is
immediate.

Apply the lane to the current work package. A parent task that is Full remains
Full for integration and milestone acceptance, while bounded implementation,
test, tooling, and evidence packages inside it use Fast or Standard controls
unless they change frozen product, design, or architecture boundaries.

### Development modes

Both modes perform requirement clarification. Select the mode from the source
of truth for the requirements, not from project genre:

- `original_design`: the input is a product goal, constraints, and possibly
  sparse references. Planning and affected domain owners must design the missing
  gameplay, level, balance, content, visual, UX, audio, and feedback rules.
  References are inspiration or constraints unless a specific behavior is
  explicitly adopted as a baseline.
- `reference_replication`: the input is a named original product/version plus a
  requested replication scope. Before implementation planning, inspect the
  original and turn observable behavior into explicit requirements. Do not
  treat “replicate” as permission to guess missing rules.

The replication deconstruction must cover the requested scope across:

- core loop, win/fail/retry, controls, physics/feel, camera, timing, and pacing;
- level/content structure, progression, difficulty, economy, and data;
- UI hierarchy and states, art direction, animation, VFX, audio, and feedback;
- loading, interruption, recovery, save/platform behavior, and relevant edge
  cases;
- the exact source/version, captured state matrix, critical replication points,
  comparison method, tolerances, exclusions, and allowed deviations.

Freeze this as the reference baseline in `TASK.md` or one necessary referenced
baseline. Unknown, contradictory, inaccessible, or unobservable behavior remains
a clarification item. Planning starts only after the critical replication points
and requested scope are explicit. Use a representative runtime precheck before
replicating the complete level/content set.

### Project clarification

Resolve before G0:

- target player and platform;
- engine and canonical client;
- development mode, project track, business model, validation mode, and quality
  focus;
- one-sentence product promise;
- primary success metric and stop condition;
- first proof and vertical-slice boundary;
- reference usage and explicit exclusions;
- time/resource boundary;
- ownership after success.

### Feature clarification

Resolve for substantial features:

- player problem and why now;
- entry, success, failure, cancel, and exceptional states;
- preserved behavior;
- affected gameplay, save, API, UI, art, audio, and telemetry;
- required assets and runtime states;
- applicable design modules and intentional deviations;
- test, screenshot/video, performance, and player evidence;
- planning owner, single-task or multi-package plan, and integration order;
- domain-design owners, frozen outputs, and implementation handoff;
- the applicable design-completeness representation and cheapest validator when
  entities, states, routes, branches, dependencies, or budgets can be omitted;
- producer acceptance owner and planned design/producer acceptance evidence;
- implementer, integrator, and reviewer.

For `reference_replication`, feature clarification also requires the exact
reference baseline, replication scope, critical replication points, state
matrix, comparison method/tolerances, exclusions, and allowed deviations.

### Question policy

Inspect first. Ask only unresolved high-impact choices that block the next
representative proof. Keep one decision per approval card and consolidate no
more than 3 questions per clarification round. Include a recommendation.
Record reversible low-risk details and details implied by an approved direction
as professional decisions without asking again.

Block on engine/platform changes, destructive migration, incompatible saves,
core-loop changes, monetization, golden art direction, bulk asset production,
paid acquisition, metric-threshold changes, and external release authority.

Before presenting an implementable contract for human approval, run the
cheapest isolated feasibility precheck that can expose the dominant technical
risks without selecting the product direction. Examples include support and
collision checks, data-schema validation, asset-pipeline compatibility, and a
disposable runtime fixture. Keep its output in scratch. A failed precheck sends
the candidate back to design/technical reconciliation before approval; a pass
does not authorize implementation or replace final runtime verification.

## 3. Planning, design ownership, and execution health

Run production planning before Full-lane domain design or implementation.

- Fast work uses `Plan reference: Single-task` without a planning pass.
- Standard work uses `Single-task` unless executable cross-module sequencing
  genuinely requires a plan.
- For complex work, write `production/PLAN.md` and reference it from `TASK.md`.
  Keep one active task while the plan preserves later work packages.
- Assign domain owners and let them make the design decisions. Technical
  feasibility review may constrain a design but does not replace it.
- Treat roles as accountable perspectives, not an automatic agent roster. Run
  role passes internally unless a bounded independent delegation saves time and
  can be integrated once.
- Use `Design status: Draft` during role work, `Frozen` after the design output
  and implementation handoff are complete, or `Not applicable` only when the
  task changes no player-facing or content/visual/audio rules.
- Treat existing implementation without frozen design ownership as a candidate.
  Preserve it, return to `Clarifying`, freeze the design, then implement deltas.

For Full work, assign a technical architecture owner before implementation.
The owner may also implement, but must first freeze architecture boundaries,
interfaces, data/asset flow, representative feasibility, verification, and
rollback together with the domain-design handoff. This is an engineering
decision, not a new human approval, unless it changes a human-owned product,
scope, cost, platform, or release boundary.

Freeze Full-lane architecture once at the parent boundary. Do not repeat the
same planning or architecture pass for a child package unless new evidence
changes that boundary.

Do not ask the human to approve every role output. Consolidate domain work and
surface only material authority decisions.

### Design completeness gate

Before marking Standard or Full player-facing/content design `Frozen`, apply
the smallest completeness contract that fits the actual risk. When the design
has enumerable entities, states, paths, branches, dependencies, or budgets:

- identify the affected population and its relevant classifications;
- map required entry, success, failure, cancellation, exceptional, or route
  coverage as applicable;
- state invariants such as symmetry, exclusivity, ordering, protection,
  conservation, caps, or source/sink balance;
- run the cheapest static validator or bounded manual coverage check before an
  engine/runtime feasibility precheck.

Use the representation natural to the domain; do not mandate a spreadsheet or
new document. A level may use target-route coverage, an economy may use
source/sink coverage, UI may use a state-transition table, and audio may use an
event-cue map. Keep project-specific IDs, thresholds, schemas, and validators in
an adopted project module or the existing task/design baseline.

Mark this check not applicable for Fast work and for designs without material
enumeration/omission risk. If a runtime precheck exposes an omission or
asymmetry that could have been detected statically, classify it as domain design
or planning/validation-order failure, add or tighten the project-local check,
and do not continue engine tuning around the incomplete contract.

### Compact execution contract

For Standard and Full work, keep the minimum executable route in `TASK.md` or
its referenced `PLAN.md`:

- the next player-visible or decision-relevant outcome;
- the smallest representative runtime proof;
- the condition that unlocks bulk or parallel work;
- dependencies, protected/shared paths, and one integration owner;
- objective stop/replan triggers;
- an evidence budget scaled to the changed states and risks.

Do not duplicate facts that are already explicit in the acceptance contract or
plan. Fast work needs none of these additions. A Full parent freezes the route
once; child implementation, tooling, and test packages inherit it unless new
evidence invalidates it.

### Execution health and replanning

Production coordination checks health at natural work-package boundaries and
when a stop-loss trigger fires. It is not a continuous report or approval pass.
While the route produces new evidence toward the promised result, continue it
without process commentary.

Trigger one compact root-cause review when any of these occurs:

- two consecutive cycles add no new evidence toward the same failed criterion;
- a cross-state regression repeats without new evidence;
- candidate names or versions change while the causal conflict remains;
- content, harness/tooling, and evidence are repeatedly co-edited to keep the
  same candidate alive;
- a content package actually requires a new mechanic, schema, tool, or other
  enabling capability;
- artifacts churn without a new observable result, or a bounded process reaches
  its declared no-progress threshold.

Classify the primary cause as baseline/scope, planning/dependency, domain
design, architecture/implementation, tool/environment, or acceptance/evidence.
Retain passing sub-results and choose exactly one next route: one bounded repair
batch, production replan, separate enabling-capability task, materially new
candidate, or abandonment. Route design failures to the domain owner and
feasibility failures to the technical owner; invoke production planning when
the order, package boundary, dependency, parallel split, or validation ladder
was wrong.

Do not create a `Recovery` task state, a retrospective file, a new approval, or
a permanent PM agent. Keep the task `Implementing` when repair criteria remain
frozen. Return to `Clarifying` only when design, authority, scope, baseline, or
architecture is genuinely unresolved. Record only the selected cause, retained
proof, next route, and rollback point in the existing task handoff.

## 4. Design modules

Read [design-modules.md](design-modules.md) when a task repeats or establishes
level, system, balance, economy, progression, content, UX, feedback, or visual
design rules.

Do not require a module for exploration. Reuse an adopted version when one
applies. At task close record one module-harvest result and keep unproven
learning as a case.

## 5. GUI restoration and change control

For UI/GUI work, set `GUI restoration` to `Required` in `TASK.md`. Before
implementation, freeze in `ART_BIBLE.md`:

- the approved design file/URL plus version or hash;
- screens, target viewports, safe areas, and required interaction states;
- layout, typography, icon/component rules, and allowed tolerances;
- the runtime comparison method and independent reviewer.

Register passing `gui` comparison evidence plus runtime screenshot/video
evidence. Source designs or mockups alone cannot prove restoration.

If scope, the approved baseline, or protected behavior changes materially,
return to `Clarifying`, create a new task ID, and re-register affected evidence.
Keep prior evidence as history; it cannot satisfy the new task.

## 6. Lean completion

Use three review depths:

- routine change: automate relevant tests, evidence, state sync, and recovery;
- feature close: verify promised scope, declared quality, and recoverability;
- gate: run the configured cross-domain acceptance review.

Choose evidence facets by actual scope and risk. Record each as required or not
applicable without turning the list into user questions. Surface only failures,
undeclared deferrals, conflicting evidence, waivers, and decisions requiring
human authority. Consolidate expert feedback into one verdict.

Before editing, finish the planned portion of the acceptance matrix that is
currently observable. Consolidate findings by shared root cause, then make one
bounded repair batch for one subsystem or root cause and run one combined
regression. Define the batch by the observable state matrix and causal boundary,
not by a fixed defect count, timer, or iteration quota.

For high-fidelity visual or player-facing work, split proof into two stages.
First create the smallest representative runtime precheck that exposes dominant
composition, readability, feel, and baseline-conformance risks. The affected
design owner inspects that actual runtime result; obtain human golden approval
when the frozen authority requires it. Include what to inspect and explicit
return conditions. Only after this precheck passes should the task produce the
exhaustive state matrix, long captures, or bulk content. Passing tests or a large
evidence count never substitutes for the precheck judgment.

Stop the inspection immediately only when continuing would be unsafe or
misleading because the baseline/reference is invalid, the program crashes or
risks data, the environment blocks further observation, or a material
scope/baseline conflict appears. Physics, feel, visual, or tuning experiments
may iterate rapidly in an isolated fixture or scratch candidate; promote only
the selected candidate and its acceptance-relevant evidence into production.

Use a documentation budget:

- default durable record: `TASK.md` plus one necessary design/technical baseline;
- add `PLAN.md` only for real multi-package dependency or integration order;
- never create a file only to prove a role participated;
- keep exploration in conversation until adopted;
- create separate research only when reusable or when embedding it would make
  the task unreadable.
- update the canonical decision source immediately, then synchronize derivative
  summaries, translations, and plans at a milestone or handoff unless they are
  needed by the next package;
- keep raw frames, state matrices, stems, logs, and experiments in task-owned
  scratch outside `production/evidence`; promote only acceptance,
  material-decision, or root-cause artifacts into durable evidence.

Use a validation and artifact budget:

- For structured artifacts such as workbooks, configuration, localization, or
  content tables, always validate changed values, formulas, schema, references,
  and hashes that form the executable contract.
- Reuse the last passing visual baseline when no style, layout, presentation,
  or visible state changed. If changed content may clip, overlap, or alter
  interaction, render only the affected region or representative state.
- Run a full-artifact render or exhaustive state matrix only when layout/style,
  structure, baseline, target viewport, milestone, or gate scope changed, or no
  trustworthy baseline exists.
- Keep one canonical editable artifact, one rollback snapshot when materially
  useful, and one accepted/export artifact by default. Represent Draft,
  Pending, Approved, Deferred, and Returned in the decision log instead of
  cloning the complete artifact for every state transition.
- Parameterize repeated runners, generators, workbook updaters, and evidence
  collectors. Do not create a version-specific script for each candidate when
  one tool plus explicit parameters preserves the same recovery boundary.

Before uncertain tuning or experimentation, define the objective acceptance
measure. After two consecutive cycles add no new evidence toward the same failed
criterion, or a cross-state regression repeats without new evidence, stop
iteration. New evidence may justify another bounded cycle. The design and
technical owners inspect the root cause and choose redesign, architecture
change, a new candidate, or abandonment. Ask the human only if that choice
changes a frozen human-owned boundary.

A changed symptom can justify another bounded cycle only when it creates a new
testable cause or preserves a newly passing sub-result. Renaming a candidate,
changing its version, or moving the same conflict between content, harness, and
evidence does not reset stop-loss.

## 7. Offline stewardship

Activate only on an explicit user request. Record its boundary, allowed work,
forbidden decisions, queued approvals, and at least two useful independent
fallback packages in the current task handoff when the scope permits.

While active:

- continue reversible work inside the authorized task and frozen decisions;
- automate tests, builds, evidence, documentation, review, and checkpoints;
- package a blocking decision, then switch to useful non-dependent work;
- create at most one bounded, reversible recommended candidate when it reduces
  delay without prejudicing the decision;
- do not expand product scope, change frozen decisions, bulk-produce
  speculative content, pass a gate, or exercise human-only authority;
- stop cleanly when only approval-dependent work remains.

An approval request is a checkpoint, not a running process. If an interactive
request remains unanswered or times out, persist the pending decision and exact
recovery point, then end the active turn or switch to an already authorized
independent fallback. Do not hold a development turn open while waiting for the
user.

Request or queue the same decision once. After an unanswered request or timeout,
do not immediately poll, list, or re-request it without a new user/tool signal.

On the next project activation, use that new signal to read the exact stored
approval before asking again. If a late card response already recorded a
decision, consume it and continue from the checkpoint. If it remains pending,
open one fresh card with `review_approval`. A late click may be persisted while
the approval server remains connected, but it does not automatically restart a
finished development turn; continuation occurs on this recovery activation.

Classify process execution before launching it:

- **Bounded foreground:** the command is expected to exit. Give it an observable
  progress source, a command-specific no-progress threshold, an absolute
  deadline, and a recovery action. Normal engine tests and builds belong here.
- **Detached helper:** use only when a service must outlive the start command.
  Start it in a short call that returns its PID immediately, redirects standard
  output and error to named logs, and records the exact executable, arguments,
  owner, and cleanup condition. Poll it through separate bounded calls.
- **Forbidden unattended:** an interactive program, a persistent or
  auto-shutdown-disabled process inside a synchronous tool call, an unbounded
  wait, or a command whose only safeguard is the caller's timeout.

Do not wait indefinitely for licensing, editor, device, network, or service
readiness. If startup fails or the progress source stops advancing, save the
diagnostic evidence, stop only processes started and owned by the current task,
and continue the next authorized fallback package. Never manipulate unrelated
system or user processes to recover an unattended task.

When the user returns, provide one compact report: completed work, verification,
assumptions, exact checkpoint, and at most 3 queued selectable decisions. End
the mode unless the user explicitly keeps it active.

## 8. Task states

Use:

```text
Clarifying
Ready
Implementing
Accepted
Blocked
```

`Blocked` means work cannot progress without a material external decision or
state change. It is not a label for difficult or incomplete work.

Use `Clarifying` only while design, authority, scope, baseline, or technical
architecture remains genuinely unresolved. If a candidate is returned but the
repair criteria are already frozen, keep it `Implementing`; do not reopen
clarification merely because implementation needs another bounded repair.

### Ready

Require:

- zero unresolved high-risk decisions;
- explicit goal and player value;
- allowed and protected paths;
- dependencies and preserved behavior;
- a lane-appropriate single-task or multi-package plan reference;
- frozen design owners, outputs, handoff, modules, and deviations when
  applicable;
- passing design-completeness check, or a concrete not-applicable reason, when
  enumerable player-facing/content coverage creates material omission risk;
- frozen technical architecture handoff for Full work;
- executable acceptance criteria;
- named implementer and reviewer roles.

### Accepted

Fast work requires objective task evidence and recoverability; design and
producer acceptance may be not applicable. Standard work requires design-owner
conformance when design applies, producer acceptance when the integrated or
player-facing outcome makes it applicable, risk-selected independent review,
module harvest, and any required human decision. Full work retains design-owner
conformance, producer acceptance, independent review, module harvest, and any
required human decision. Functional, visual, performance, and player validation
are evidence facets, not separate task states.

Task acceptance is not automatically gate passage. Gate passage additionally
requires the configured track, business-model, validation-mode, quality-focus,
and human-decision evidence.

## 9. Evidence

Register evidence in `production/evidence/manifest.json`.

Evidence types:

- `test`
- `build`
- `screenshot`
- `video`
- `performance`
- `playtest`
- `review`
- `provenance`
- `gui`

Each entry should include task, gate, file/location, SHA-256 where local,
date, source revision, task-contract fingerprint, environment/device,
resolution when relevant, notes, and verdict.

Passing review evidence must name the reviewing role. The reviewer must differ
from the implementation and integration roles. Passing provenance evidence
must record tool/model, source inputs, edits, license, and reviewer.

For Standard and Full work, design acceptance must name or resolve to the
frozen `Design owners` and check the actual implementation against the frozen
outputs. Producer acceptance must resolve to `Producer acceptance owner` and
check the integrated experience. Both records cite an evidence ID or
repository-relative review record. They are accountability sign-offs, not
substitutes for independent gate review. Fast work may mark both not applicable.

Store small screenshots and text reports in Git when useful. Keep APK/EXE,
long video, profiler captures, and large source assets outside Git or in LFS.
Keep raw frames, state matrices, stems, logs, and experiments in a task-owned
scratch location outside `production/evidence`. The durable evidence directory
contains only promoted artifacts registered for acceptance, a material decision,
or a root-cause finding.
When reproducibility or compliance requires raw material, preserve one indexed
bundle with a location and hash instead of registering every intermediate file.

Default to one promoted summary per applicable evidence facet for a natural work
package. Exceed that budget only when distinct environments, states, material
decisions, or root causes need independent proof; record the reason instead of
promoting every trial, seed, screenshot, or raw log.

Reject zero-byte, unreadable, wrong-resolution, or visually empty evidence.
Default checks revalidate current-task and explicitly referenced evidence.
Use `-AuditHistory` only for a deliberate full-history integrity audit.

## 10. Review and handoff

An independent review is read-only. Return:

- verdict;
- evidence checked;
- findings ordered by severity;
- conditions for passage;
- missing evidence;
- next owner.

The implementer may self-test, but an implementation/internal review cannot
satisfy a gate-critical independent-review requirement.

At task close, update `TASK.md` with:

- actual result;
- validation commands and evidence IDs, not pasted raw output;
- design acceptance and producer acceptance records;
- evidence IDs;
- module-harvest result;
- unresolved risks;
- files/areas intentionally untouched;
- next action.

Keep `TASK.md` as the active contract and current handoff, not a chronological
work log. Archive completed natural checkpoints. Before Standard or Full
acceptance, connect passing evidence to a recoverable source checkpoint: a
scoped commit when safe and authorized, otherwise a named patch or source
archive with restoration instructions.

Update `project.json` last.

Before replacing an accepted current task, copy it to
`production/tasks/archive/<task-id>.md`. Keep `TASK.md` limited to the active
contract and handoff; do not append a chronological project diary.

## 11. Parallel work

Default to one active main task. For explicit parallel work:

1. Create `production/tasks/<task-id>.md`.
2. Assign non-overlapping allowed paths.
3. Declare protected/shared files.
4. Assign one integrator for shared files.
5. Integrate serially.
6. Run full checks after integration.

Do not allow multiple tasks to rewrite a scene root, global theme, engine
settings, save schema, public contract, current gate file, shared art master,
atlas, or component library concurrently.
