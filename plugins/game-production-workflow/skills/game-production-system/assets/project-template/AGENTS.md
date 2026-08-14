# Project operating rules

This repository uses the Game Production System.

Before acting:

1. Read `production/project.json`.
2. Read `production/PROJECT.md`.
3. Read `production/TASK.md`.
4. Read the production plan named by `Plan reference` unless it is `Single-task`.
5. Read `production/ACCEPTANCE.md`.
6. Read `design/modules/index.json`, then only task-referenced modules.
7. Read `docs/ART_BIBLE.md` for visual, UX, animation, asset, or release work.

Rules:

- Work only on the current task unless the user explicitly changes scope.
- This Game Production System is the lifecycle authority. External Skills are
  optional accelerators; when used they must reuse `production/TASK.md` and the
  referenced `production/PLAN.md`, and must not add a duplicate design, plan,
  approval, task state, or acceptance source.
- Classify intent before writing: exploration stays in conversation, review is
  read-only, and implementation uses the lightest safe Fast/Standard/Full lane.
- A tentative idea or proposed scope addition does not authorize implementation.
- Read `developmentMode` before clarification. `original_design` derives and
  freezes missing requirements from goals and constraints; references remain
  inspiration unless adopted. `reference_replication` first deconstructs the
  named original into an explicit reference baseline, critical replication
  points, state matrix, tolerances, scope, and allowed deviations.
- Both modes clarify requirements. Never start a replication implementation
  from the word “replicate” alone, and never silently redesign an unobservable
  reference behavior.
- Resolve high-risk clarification before implementation.
- Fast work needs no plan, role ceremony, independent review, or approval.
- Standard work uses one task card and only affected design plus technical roles.
- Full work covers core loop, replica, monetization, migration, bulk production,
  gates, and release. Plan it when multi-package; freeze affected domain design
  and technical architecture before implementation.
- For Standard and Full work, keep the next visible outcome, representative
  proof, bulk/parallel unlock, integration owner, stop/replan triggers, and
  evidence budget in the existing task or plan. Do not create a separate report
  when those facts are already clear.
- Apply the lane to the current work package. A Full parent keeps Full milestone
  acceptance, while bounded child implementation, test, tooling, or evidence
  work uses Fast/Standard controls unless a frozen boundary changes.
- Do not enter `Ready` or `Implementing` until design outputs and the
  lane-applicable implementation handoff are frozen, or design is not applicable.
- When an authorized task is `Ready` or `Implementing`, default to the installed
  Skill's standalone production loop: edit actual product sources, integrate,
  observe real output, repair one root cause, and checkpoint. Governance-only
  edits do not count as a production cycle.
- Before freezing Standard/Full design with enumerable entities, states, paths,
  branches, dependencies, or budgets, run the smallest applicable completeness
  check. Keep project-specific coverage rules and validators in a task baseline
  or design module; do not impose this on Fast work when omission risk is absent.
- Technical implementation may review feasibility but must not invent missing
  product, content, visual, UX, or audio rules.
- For Full work, the technical handoff freezes boundaries, interfaces,
  data/asset flow, representative feasibility, verification, and rollback.
- Keep durable process records to `TASK.md` plus one necessary design/technical
  baseline by default. Do not create files only to prove role participation.
- Treat roles as accountable perspectives, not an agent roster. Delegate only
  bounded independent work that saves time and integrates once.
- Finish the currently observable acceptance slice before repairing
  non-blocking findings. Group findings by root cause, make one bounded repair
  batch per subsystem/root cause, then run one combined regression.
- For high-fidelity visual/player-facing work, pass the smallest representative
  in-engine precheck before exhaustive state capture, long recordings, or bulk
  production. Provide what to inspect and explicit return conditions.
- For Standard/Full work, apply only the affected installed craft reference:
  `game-content-design.md`, `visual-production.md`, `audio-production.md`, or
  `experience-review.md`. A named expert or self-authored frozen baseline does
  not prove professional quality; keep the maturity claim, external reference
  or explicit quality bar, and hard return conditions visible in the existing
  task/design baseline.
- Fix immediately only when an invalid baseline/reference, crash or data risk,
  environment blocker, or material scope conflict makes further inspection
  unsafe or misleading. Keep rapid experiments isolated and promote only the
  selected result.
- Fast work closes on objective checks and recovery. Standard/Full work adds
  design acceptance where applicable. Full retains producer and independent
  acceptance; Standard uses them only when selected by integration risk or gate.
- When `validationMode` is `creative_first`, follow
  `references/hypercasual.md` from the installed Skill before G0/G1 work.
- Preserve protected behavior and paths.
- Keep one active main task unless parallel work is explicit.
- Do not self-approve gate-critical work.
- For subjective high-risk review, inspect the actual experience against the
  declared product-quality bar before allowing test counts or implementation
  rationale to influence the first verdict.
- Reuse adopted design modules before inventing new rules; do not promote a
  one-off case into a default module.
- Do not bulk-produce art before an in-engine golden sample is approved.
- Before opening material asset packages, derive the required asset inventory
  from frozen screens, states, flows, content extremes, and feedback beats.
  Map every scoped need to a family and required states/variants, classify
  reuse/adapt/create/debt, name its runtime destination, and statically check
  coverage in the existing task or plan.
- Split material asset production at the asset-family level only when shared
  masters, variants, multiple production paths or owners, or import,
  provenance, performance, dependency, or parallel risk makes it useful. Keep
  bounded asset work in `TASK.md`, use `PLAN.md` only for real multi-package
  order, and never add per-file work packages or per-asset approvals.
- Define an objective measure before uncertain tuning. After two consecutive
  cycles add no new evidence toward the same failed criterion, or a cross-state
  regression repeats without new evidence, stop tuning and run a
  design/technical root-cause review.
- Production coordination stays silent while the route produces useful
  evidence. When stop-loss fires, classify baseline/scope, planning/dependency,
  domain design, architecture/implementation, tool/environment, or
  acceptance/evidence; retain passing sub-results and select one bounded repair,
  replan, enabling-capability task, new candidate, or abandonment.
- A renamed or versioned candidate does not reset stop-loss when the causal
  conflict is unchanged. Invoke production planning when sequencing,
  dependencies, package boundaries, validation order, or an enabling capability
  caused the failure.
- Do not add a Recovery state, retrospective file, permanent PM agent, or new
  approval. Keep frozen repairs `Implementing`; use `Clarifying` only for a
  genuinely unresolved design, authority, scope, baseline, or architecture.
- For GUI reconstruction, a material layout/component-system change, or a new
  visual rule, mark GUI restoration Required, freeze the baseline and state
  matrix before coding, and require runtime comparison evidence. A routine Fast
  UI repair that reuses accepted interaction/render and visual baselines marks
  restoration Not applicable and verifies only the affected region/states.
- For Standard/Full material interactive visual work, freeze one compact
  interaction/render contract before asset-family production. Use one
  authoritative state source with declared renderers, run the cheapest
  technology-appropriate assembly precheck, and keep bulk work locked until it
  and the representative runtime proof pass. Do not add another approval layer.
- Update the canonical decision source immediately; synchronize derivative
  summaries and plans at a milestone unless the next package needs them.
- Before asking for approval of an implementable player-facing contract, run
  the cheapest isolated technical feasibility precheck. It may reject an
  infeasible candidate but never selects product direction or grants approval.
- Scale visual and runtime verification to the change: reuse an unchanged
  passing baseline, inspect changed regions or representative states when
  needed, and reserve full renders/state matrices for structural, presentation,
  baseline, milestone, or gate changes.
- Register only acceptance, material-decision, or root-cause evidence. Keep
  raw frames, state matrices, stems, logs, and experiments in task-owned scratch
  space outside `production/evidence`; promote only registered final artifacts.
- Keep one canonical editable structured artifact, a rollback snapshot only
  when materially useful, and one accepted/export artifact by default. Record
  intermediate approval states in the decision log instead of full copies.
- Replace repeated version-specific runners, generators, workbook updaters, and
  evidence collectors with parameterized tools unless separate copies are
  required for recovery or auditability.
- Do not mark human approval without an explicit user decision.
- Present human approvals as selectable options when available, accept a short
  numbered choice otherwise, and persist a structured decision automatically.
- Queue an unanswered or timed-out decision once; do not keep the active turn
  waiting or immediately re-poll it without a new signal.
- Keep approval cards plain-language and decision-sized: no internal IDs in
  visible copy, no duplicated question, and every option must explain its main
  tradeoff without requiring project-document context.
- Only an explicitly approving or continuing option grants gate passage.
- If an approval is unanswered or times out, checkpoint, persist it as pending,
  and end the active turn or switch to authorized independent work.
- During explicit offline stewardship, keep at least two independent fallback
  packages when scope permits. If one path blocks, record evidence and switch.
- Run tests and builds with visible progress, a no-progress threshold, an
  absolute deadline, and a recovery action.
- Never launch a persistent helper inside a synchronous call. If one is truly
  required, detach it, return and record its PID, redirect logs, define cleanup,
  and monitor it only with separate bounded calls.
- Treat `contractValid`, `taskReady`, and `gateReady` as different claims.
- Keep governance files tracked in Git after G0.
- Material scope or baseline changes return the task to `Clarifying` with a new
  task ID; prior evidence remains historical.
- A returned candidate with frozen repair criteria stays `Implementing`;
  `Clarifying` is only for genuinely unresolved design, authority, or boundaries.
- Preserve legacy implementation without design ownership as a candidate,
  complete the missing design contract, then implement only the resulting deltas.
- Before Standard/Full acceptance, tie passing evidence to a recoverable scoped
  commit, patch, or source archive. Keep `TASK.md` compact and archive history.
- Run module harvest at task close and archive accepted tasks before replacement.
- Update the task handoff and project state at the end of work.

Project-local instructions below this line override template defaults.

## Project overrides

None yet.
