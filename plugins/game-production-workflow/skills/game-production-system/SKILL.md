---
name: game-production-system
description: Use when starting, adopting, planning, executing, recovering, reviewing, or handing off a game project or substantial player-facing game work, especially when cross-domain design, representative runtime proof, quality gates, commercial-quality review, durable continuation, or creative-first validation is required.
---

# Game Production System

Use the repository as durable truth. Roles are accountable work perspectives,
not permanent agents: domain design and planning precede implementation;
independent review follows it. The human producer owns human-only product and
gate decisions. Planning defines the executable route; production coordination
keeps state truthful and invokes bounded root-cause review or replanning only
when evidence stops advancing.

Interpret validation precisely:

- `contractValid` means the repository-resident governance is structurally
  coherent.
- `taskReady` means the current task may be implemented without unresolved
  high-risk decisions.
- `gateReady` means the selected gate has all required evidence, independent
  review, and human decisions.
- Never describe `valid: true` from Task mode as gate passage.

## Operation router

| Intent | Load | Permitted result |
| --- | --- | --- |
| **Explore/discuss** | Project truth and relevant source | Conversation only; no writes |
| **Diagnose/review** | Affected source and craft reference; `game-art-production` `Review` only when professional UI/2D diagnosis is requested | Report only; no repair |
| **Initialize, adopt, or plan** | `workflow.md` plus selected references | Executable repository contract |
| **Execute or continue** | `execution.md` plus affected craft | Player-visible or capability delta |
| **Close** | `workflow.md` completion/evidence sections | Verified recoverable handoff |
| **Review a gate** | `roles-and-gates.md` | Read-only gate verdict |

## Lean execution

After routing the intent, choose the lightest safe lane for implementation:

- **Fast:** routine, reversible work with no new player-facing rule or
  high-risk decision. Implement, run relevant checks, and leave a recoverable
  checkpoint. Do not create a plan, role documents, or approval step.
- **Standard:** one bounded feature. Keep one task card; involve only affected
  design owners and technical implementation. Do not create a separate plan
  or role document unless it is needed to make the work executable.
- **Full:** core-loop, high-fidelity replication, monetization, save/platform
  or architecture migration, bulk content/art, gate, or release work. Use
  planning, affected domain owners, technical architecture ownership, a
  multi-package plan when needed, and representative proof before bulk work.

Choose the lane for the current work package. A Full parent remains Full at
milestone acceptance, but bounded implementation, test, tooling, or evidence
packages inside it use Fast or Standard controls unless they change frozen
product, design, or architecture boundaries.

Choose one project development mode before G0. Both modes clarify requirements;
they differ in how requirements are obtained:

- **`original_design`:** infer no missing game rules from sparse references.
  The planner and affected design owners turn player/business goals, constraints,
  and selected inspiration into a frozen design contract before implementation.
- **`reference_replication`:** treat the named original product/version as the
  requirement source. Before planning implementation, deconstruct its actual
  runtime behavior into the core loop, rules, state transitions, controls,
  camera, level/content progression, UI, art, animation, VFX, audio, feedback,
  pacing, failure/recovery, data, and platform behavior that matter to the
  requested scope. Freeze the reference baseline, critical replication points,
  target scope, comparison method, tolerances, and allowed deviations. Unknown
  or unobservable behavior remains a clarification item; do not silently replace
  it with a new design.

- At feature close, require only that promised scope is implemented and
  verified, undeclared deferral is absent, and the exact result is recoverable.
- Select functional, visual/UX, player, performance, platform, data, business,
  compliance, provenance, and release facets by actual scope and risk. Mark
  non-applicable facets internally; do not ask the user to confirm each one.
- Reserve the complete cross-domain review for configured gates.
- Surface only failed checks, conflicting evidence, material exceptions, and
  decisions that genuinely require human authority.
- Keep role work internal and consolidate durable decisions into `TASK.md` or
  one necessary design/technical baseline. Never create a file only to prove a
  role participated.
- Do not spawn one agent per role solely to prove participation. Delegate only
  bounded independent work that saves time and can be integrated once.
- Fast work closes on objective verification. Standard and Full work adds
  design-owner conformance and producer integrated-outcome acceptance where
  those responsibilities materially apply.
- Consolidate role feedback into one verdict or one blocking decision. Do not
  turn expert perspectives into separate approval stages.
- Before repairing non-blocking findings, finish the currently observable
  acceptance slice. Group findings by shared root cause, make one bounded
  repair batch per subsystem or root cause, then run one combined regression.
- For Standard and Full work, make the executable route visible in the existing
  task or plan: the next player-visible outcome, representative proof, bulk or
  parallel unlock, shared integration owner, stop/replan triggers, and evidence
  budget. Do not add a separate report when those facts are already clear.
- Before freezing enumerable player-facing or content design in Standard or
  Full work, apply the smallest useful completeness check. Cover the affected
  entities, states or paths and the invariants that can cause omission or
  asymmetric behavior. Prefer static validation before engine prechecks; keep
  project-specific fields, thresholds and validators in project modules or the
  existing task baseline. Do not require a matrix for Fast work or when this
  risk is genuinely not applicable.
- Keep production coordination silent while the route is healthy. At a natural
  work-package boundary, or immediately after an ineffective-iteration trigger,
  classify the blocker as baseline/scope, planning/dependency, domain design,
  architecture/implementation, tool/environment, or acceptance/evidence. A new
  candidate name or version does not reset a repeated root cause.
- For high-fidelity visual or player-facing work, first build the smallest
  representative proof sequence that exposes dominant interaction, assembly,
  source-separation, and runtime risks. The affected design owner must inspect
  it against the frozen baseline, and human golden authority decides it when
  required. Run exhaustive matrices, long captures, or bulk production only
  after the applicable assembly precheck and runtime golden pass.
- Before asking a human to approve an implementable player-facing contract,
  run the cheapest non-authoritative feasibility precheck that can expose its
  dominant technical failure modes. Keep disposable fixtures and output in
  scratch. A precheck may reject an infeasible candidate, but it never chooses
  the product direction or substitutes for approval and final runtime proof.
- Scale artifact verification to the change. Reuse a passing visual/runtime
  baseline when presentation and state coverage did not change; inspect only
  the changed region or representative state when it may affect layout or
  behavior; repeat a full render or state matrix only for structural,
  presentation, baseline, milestone, or gate changes.
- Interrupt inspection only when continuing would be unsafe or misleading
  because the baseline/reference is invalid, the program crashes or risks data,
  the environment blocks observation, or scope has materially changed. Keep
  rapid experiments isolated and promote only the selected result.

## Human decisions

For gate, golden-visual, business-model, release, paid-UA, migration, and waiver
decisions:

- Ask only decisions that block the next representative proof. Keep one
  decision per card; record details implied by an approved direction as
  professional decisions without asking again.
- Treat a card as the final choice surface, not as a substitute for requirement
  clarification. Do not open it until the user has enough context to choose.
- Before a visual or player-facing approval card, provide a compact inspection
  entry: the recommended representative runtime artifact, what to inspect,
  explicit return conditions, and what the choice authorizes. A large evidence
  count or passing automation is not a substitute for this entry.
- Prepare 2-3 mutually exclusive options, put the recommendation first, and
  state each option's impact.
- Follow the `game-approval-ui` card copy contract. Keep task IDs, gate IDs,
  evidence counts, paths, and role bookkeeping in metadata; make the visible
  question, boundary, options, and tradeoffs plain-language and independently
  understandable.
- Use `game-approval-ui` before rendering choices in prose. Its MCP tools may
  be deferred; absence from the initial tool list or a generic search miss does
  not mean they are unavailable. Resolve the exact
  `mcp__game_approval_ui__request_approval` tool (inspect `ALL_TOOLS` in Codex
  code mode when necessary) and call it with `interactive: true`.
- During offline stewardship, call it with `interactive: false` and review the
  queued decision when the user returns.
- If an interactive decision remains unanswered or the approval call times out,
  save a recoverable checkpoint, leave or queue the decision as pending, and
  end the turn or switch to already authorized independent work. Never keep an
  active development turn waiting on human input.
- Treat card-session expiry as a transport event, not an approval result. The
  durable decision remains pending and grants no passage. Record its approval
  id and exact recovery point; a late recorded click may be consumed later but
  does not by itself keep or restart the finished development turn.
- After the first unanswered request or timeout, do not immediately re-request
  or poll the same decision without a new user or tool signal. Queue it once and
  continue only already-authorized work.
- Present numbered lines only after the tool call explicitly returns
  `interaction: unsupported` or `interaction: failed`; accept a reply such as
  `1` and record it with `record_approval_decision`. Never require copied
  approval prose.
- Consume the complete returned decision. Treat a non-empty `decision.note` as
  a controlling refinement of the selected option, while never allowing it to
  turn a non-passage option into passage.
- Only an option explicitly labeled approve, accept, pass, or continue grants
  passage. Record the selected decision and provenance in repository state
  automatically before continuing.
- Record the combined option and note in the canonical decision source and the
  minimum execution state needed by the next package before continuing.
  Synchronize derivative plans, summaries, and translations at a natural
  checkpoint or handoff; do not rewrite several files solely to mirror one
  pending/approved transition. Never re-request guidance already supplied in
  the note.
- Decline, cancel, defer, silence, and automatic resolution never grant
  gate-critical passage.

## Offline stewardship

When the user explicitly asks for offline, unattended, or rest-period
continuation, activate the temporary execution policy in
[workflow.md](references/workflow.md#7-offline-stewardship). It extends working
time, not approval authority. Continue safe independent work, queue blocking
decisions, and stop at a recoverable checkpoint when no authorized work remains.

Before leaving work unattended, prepare useful independent fallback work. Run
tests and builds as bounded foreground commands with an observable progress
source, a command-specific no-progress threshold, and an absolute deadline.
Never start a process intended to outlive its initiating command inside a
synchronous tool call or rely only on the caller's timeout to end descendants.
When a persistent helper is truly required, start it detached in a short call
that returns its PID, redirect its output to named logs, record ownership and
cleanup conditions, then monitor it through separate bounded calls. On startup,
licensing, service, or progress failure, capture evidence, clean up only
task-owned processes, and switch to the next authorized fallback package.

## Start

1. Locate the intended project root.
2. Look for `production/project.json`.
3. If it exists, read in order:
   - `AGENTS.md`
   - `production/project.json`
   - `production/PROJECT.md`
   - `production/TASK.md`
   - the production plan referenced by `Plan reference`, unless `Single-task`
   - `production/ACCEPTANCE.md`
   - `design/modules/index.json`, then only modules referenced by the task
   - `docs/ART_BIBLE.md` only for visual, UX, animation, asset, or release work
4. When the current task/handoff or approval index names a pending blocking
   approval, use the new user/tool signal to check that approval once. Consume
   an already recorded decision; otherwise reopen only that relevant item with
   `review_approval`. Do not scan or reopen unrelated approvals.
5. Treat `systemVersion` as a repository contract/schema version, not the
   installed policy version. Use the current Skill policy with compatible
   projects; migrate only when the checker reports an incompatible contract or
   a required field change.
6. If the marker is absent:
   - initialize only when the user asks to start a new project;
   - adopt only when the user asks to apply the system to an existing project;
   - otherwise report that the current directory is not governed and ask for
     the project root only when it cannot be discovered safely.
7. Never initialize a formal game inside a dated/projectless conversation
   folder when an intended repository exists elsewhere.

After repository truth, load only the references selected by the Operation router.
An intact 1.8 plugin requires bundled `game-art-production` for positive UI/2D
predicate. An installed 1.8 plugin missing `game-art-production` is a
bundle-integrity failure: preserve work,
report it, repair/reinstall, and grant no art-path completion. Repository-only with no plugin
uses the project `AGENTS.md` interaction-to-visual loop without claiming the
dedicated protocol or unavailable subjective authority ran. `execution.md` remains
standalone for production.

## Select an operation

### Initialize a new project

1. Read [profiles.md](references/profiles.md).
2. Run project-level clarification before creating production code or bulk art.
3. Obtain explicit decisions for development mode, project track, business
   model, validation mode, quality focus, platform, engine, first proof,
   success/stop criteria, and maintenance ownership.
4. If validation mode is `creative_first`, read
   [hypercasual.md](references/hypercasual.md) before defining G0 or G1.
5. Run `scripts/bootstrap.ps1` against the confirmed project root.
6. Replace template placeholders and create the first `production/TASK.md`.
7. Validate with `scripts/check.ps1`.

### Adopt an existing project

1. Read [adoption.md](references/adoption.md).
2. Audit read-only before writing governance files.
3. Do not rewrite history. Record an adoption-day baseline, current product
   truth, frozen decisions, known debt, and the real gate.
4. Add governance files without changing business code or assets unless the
   user separately asks for implementation.
5. Preserve unrelated dirty-worktree changes.

### Start a substantial feature

1. Read current project truth and inspect relevant code/assets before asking.
2. Classify intent, apply the project's `developmentMode`, then choose Fast,
   Standard, or Full. Exploration and review do not enter implementation.
   Record the lane on new v1.5+ task cards; infer the lightest compatible lane
   for legacy active tasks without forcing migration. Apply the lane to the
   current work package; retain Full on a Full parent task for milestone
   integration and acceptance.
3. In `reference_replication`, deconstruct before planning and record the exact
   baseline, scope, critical points, state matrix, comparison/tolerances, and
   allowed deviations in `TASK.md` or one referenced baseline.
4. Needed Standard/Full domain-design owners decide
   gameplay, level, balance, economy, content, art, UX, animation, VFX, and audio
   rules; technical roles check feasibility without inventing them.
5. Full invokes production planning and technical architecture. Use
   `Single-task` only for a bounded outcome without cross-module sequencing;
   otherwise maintain `production/PLAN.md`.
6. Identify applicable design domains and reuse adopted modules before inventing
   rules; read
   [design-modules.md](references/design-modules.md).
7. Each design owner inspects applicable references and provides relevant rules,
   flows, specifications, baselines, quality bar, maturity, rejection conditions,
   and acceptance criteria. Names/consistency do not establish professional
   quality. For enumerable entities, states, routes, branches, or dependencies,
   define the applicable completeness representation and run and pass its cheapest
   static validator before `Frozen`.
8. Read [game-content-design.md](references/game-content-design.md) for gameplay,
   level, balance, economy, progression, content, or narrative. Unresolved
   interactive UI/2D direction requires `game-art-production` `Design`; it must
   not load for routine accepted-baseline Fast repairs or non-art/non-visual work.
   Character, environment, 3D, animation, VFX, technical-art, and broad visual
   work remain on [visual-production.md](references/visual-production.md). Apply
   its asset-family split for material shared-master, variant, ownership, import,
   provenance, or performance risk; never split by fixed count, per-file package,
   or per-asset approval. Derive inventory from frozen screens, states, flows, and feedback,
   and statically check every scoped need before opening packages.
   For player-facing audio work, read
   [audio-production.md](references/audio-production.md). Freeze cue intent
   before sourcing, prefer rights-cleared stock SFX, use rights-cleared
   generated BGM candidates where appropriate, and require runtime listening.
   For subjective player-experience or commercial-quality review, read
   [experience-review.md](references/experience-review.md).
9. Reconcile domain conflicts through coordinator; ask humans only about
   unresolved high-impact authority decisions.
10. Before Full implementation, technical handoff freezes architecture
   boundaries, interfaces, data/asset pipeline, feasibility, verification, and
   rollback; it needs no human approval unless a human boundary changes.
11. Freeze minimum executable decisions in `TASK.md` or one baseline; never create
   role reports solely as process evidence.
12. Mark GUI restoration `Required` only for reconstruction, a material
   layout/component-system change, or a new visual rule; freeze its baseline,
   target states, viewports, comparison method, and reviewer. A routine Fast UI
   repair that reuses accepted baselines marks it `Not applicable`.
13. Consolidate unresolved high-impact choices into at most 3 questions and give
   a recommended option for each.
14. Record reversible implementation assumptions, never missing design rules.
15. Keep the task `Clarifying` while required design or technical architecture
    is Draft, or high-risk decisions
    remain unresolved.
16. Move it to `Ready` only when lane-applicable planning, frozen design,
    technical handoff, goal, scope, protected behavior, dependencies, evidence,
    and reviewers are explicit.
17. A returned candidate with frozen repair criteria remains `Implementing`.
    Use `Clarifying` only when design, authority, scope, or architecture is
    genuinely unresolved.

### Execute a ready task

1. Read [execution.md](references/execution.md).
2. Enter when the user requests implementation and the task is `Ready` or
   `Implementing`. For matching interactive UI/2D work, require
   `game-art-production` `Produce` inside the core-owned task. Do not reopen
   frozen design or repeat planning merely because another workflow is installed.
3. Run the capability handshake, select the next player-visible slice, edit the
   actual product source, run the project adapter, inspect the result, repair one
   root cause, and leave a recoverable checkpoint.
4. For interactive visual work, execute the player-action-to-runtime chain and
   keep bulk production locked until assembly and representative runtime proof
   pass.
5. A governance-only edit is not a production cycle. Return to `Clarifying`
   only for a genuinely missing human-owned boundary; use an isolated product
   precheck for reversible implementation uncertainty.

### Continue a project

1. Summarize the current gate, task, blockers, frozen decisions, and next action.
2. Check execution health from existing evidence: confirm the next visible
   outcome, whether its representative proof or bulk unlock is satisfied, and
   whether the previous two cycles advanced a failed criterion. Do not create a
   health report when the route is healthy.
3. When the request authorizes implementation and the task is `Ready` or
   `Implementing`, run `Execute a ready task` after this health check; work only
   inside the current task scope.
4. Do not reopen already frozen decisions unless new evidence creates a real
   contradiction.
5. Do not interrupt an executing, recoverable work package solely to add a new
   policy field or role record. Apply compatible policy immediately, then add
   missing Full-lane design/architecture ownership at the next natural
   checkpoint before opening the next package. The stop-loss rule still applies
   immediately when iteration is already ineffective.
6. When stop-loss fires, retain useful passing sub-results, identify one root
   cause, and choose bounded repair, replan, capability-enabling task, new
   candidate, or abandonment before more implementation. Keep `Implementing`
   when repair criteria remain frozen; return to `Clarifying` only when design,
   authority, scope, baseline, or architecture is genuinely unresolved.
7. Use exact status language; functional verification is not visual approval,
   player validation, or release readiness.
8. For a legacy active task that contains domain-design choices but has no
   frozen design ownership, preserve the implementation as a candidate, return
   to `Clarifying` at a recoverable checkpoint, complete only the missing
   design/architecture contract, and implement the resulting deltas.

### Close a task

1. Determine applicable evidence facets from task scope and risk.
2. Run the applicable tests and builds from `production/ACCEPTANCE.md`.
3. Promote only acceptance-relevant artifacts from task-owned scratch space,
   then register them with `scripts/evidence.ps1`.
4. Run `scripts/check.ps1 -Mode Task`.
5. For Fast work, close after objective verification and recovery are recorded;
   design and producer acceptance may be `Not applicable`.
6. For Standard or Full work, have active design owners record one consolidated
   conformance result when design applies. Require producer acceptance for Full
   work and for Standard work whose integrated or player-facing outcome makes
   it applicable. Do not ask the human unless human authority is required.
7. Request the independent review named in the task when risk or the current
   gate requires it. Design-owner and producer acceptance do not replace
   objective QA or gate-critical independent review.
8. Run module harvest: reuse, update, propose a candidate, retain a case only,
   or deprecate. AI may draft candidates; only explicit human adoption makes a
   module a project default.
9. Before Standard or Full acceptance, map passing evidence to a recoverable
   source checkpoint: a scoped commit when safe and authorized, otherwise a
   named patch or source archive with restoration instructions.
10. Update the task result, unresolved risks, next action, and `project.json`.
11. Before replacing an accepted task, archive it under
   `production/tasks/archive/<task-id>.md`.
12. Do not mark a human approval unless the user explicitly approved it.

### Review a gate

1. Read [roles-and-gates.md](references/roles-and-gates.md).
2. Review read-only. Do not fix implementation in the same review.
3. Require `game-art-production` `Review` only when professional UI/2D gate
   evidence is required; check all applicable functional, technical, visual/UX,
   player, performance, provenance, and release evidence.
4. Run `scripts/check.ps1 -Mode Gate`; treat `gateReady`, not
   `contractValid`, as the machine gate result.
5. Return exactly one verdict: `Passed`, `Conditionally Passed`, or `Returned`.
6. AI may recommend a gate; required human approval remains pending until an
   explicit user message grants it.

## Non-negotiable rules

- Keep one active main task by default.
- Choose the lightest safe lane. A Skill invocation alone never requires Full.
- Do not turn tentative exploration or review into implementation artifacts.
- Create parallel task cards only when parallel work is explicitly intended.
- Assign shared files to one integrator.
- Plan complex, multi-module work before opening implementation tasks. Keep one
  active task while `production/PLAN.md` preserves the wider sequence.
- Do not let technical implementation silently decide gameplay, level,
  balance, economy, content, art, UX, animation, VFX, or audio rules.
- Do not enter `Ready` or `Implementing` with required design or Full-lane
  technical architecture unresolved.
- Do not mark enumerable player-facing or content design `Frozen` while its
  population, required states or paths, and applicable symmetry, dependency,
  exclusivity, protection or budget invariants remain unchecked.
- For Standard and Full work, do not mark a task `Accepted` until its design
  owners accept conformance when design applies. Require producer acceptance
  for Full work and applicable integrated or player-facing Standard work. Fast
  work closes on objective verification.
- Do not let an implementer give final approval to their own high-risk work.
- Do not treat a named expert, a frozen internal baseline, or compliance with
  self-authored rules as proof of professional quality. Record the artifact
  maturity and compare subjective high-risk work with an external reference or
  explicit product quality bar before implementation and again in runtime.
- Before uncertain iteration, define an objective acceptance measure. If two
  consecutive cycles add no new evidence toward the same failed criterion, or
  a cross-state regression repeats without new evidence, stop tuning and run a
  joint design/technical root-cause review before more implementation.
- Do not evade stop-loss by renaming a candidate, changing only its version, or
  alternating content, harness, and evidence edits around the same unresolved
  causal conflict. Production coordination must invoke production planning when
  dependencies, package boundaries, validation order, or enabling capability
  are the real failure.
- Keep the durable documentation budget to the task card plus one necessary
  design/technical baseline by default. Add a plan only for real multi-package
  sequencing and a separate research record only when it is reusable or the
  task would become unreadable.
- Update the canonical decision source when a decision is made. Synchronize
  derivative summaries, translations, and plans at a milestone or handoff
  unless they are needed to execute the next package.
- Do not bulk-produce art before applicable assembly and runtime golden
  prechecks pass.
- Do not treat downloaded or generated audio, a waveform, a loudness/peak
  check, or a passing trigger test as audible acceptance.
- For `creative_first`, do not build a full content pipeline before several
  original creative hypotheses and explicit stop lines are reviewed.
- Keep advertisements materially consistent with the implemented player
  experience; do not copy third-party assets, footage, branding, or expression.
- Do not use automated tests as evidence of commercial visual quality.
- Do not store large builds or videos in Git; register their location and hash.
- Keep raw frames, state matrices, stems, logs, and experiments in task-owned
  scratch space outside `production/evidence`. Promote only artifacts used for
  acceptance, a material decision, or a root-cause finding into durable
  evidence; preserve one indexed raw bundle elsewhere when reproducibility
  requires it.
- Keep one canonical editable structured artifact, one rollback snapshot when
  materially useful, and one accepted/export artifact by default. Store Draft,
  Pending, Approved, Deferred, and Returned as decision state instead of
  cloning a complete workbook or configuration for every transition.
- When the same runner, generator, workbook updater, or evidence collector is
  copied for a second version, replace the copies with one parameterized tool
  unless isolation is itself required for recovery or auditability.
- Track AI asset provenance before release-candidate status.
- Keep governance files version-controlled after G0; an uncommitted-only
  governance root is not durable cross-conversation state.
- Do not turn one successful case into a default module. Require a clear
  boundary, owner, evidence, and explicit adoption.
- Return to `Clarifying` and use a new task ID when a material scope, baseline,
  or protected-behavior change invalidates acceptance or prior evidence.
- Record waivers with reason, risk, owner, expiry, and compensating task.
- During unattended work, never block the active turn on a persistent helper,
  interactive program, unbounded wait, or command with no recovery path.
- Project-local rules override Skill defaults.

## Bundled resources

- Read `references/` only for the selected operation/craft; `assets/` holds templates.
- `scripts/doctor.mjs` detects capability; PowerShell scripts handle governance.
