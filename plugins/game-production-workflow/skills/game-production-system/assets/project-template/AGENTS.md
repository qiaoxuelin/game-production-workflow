# Project operating rules

This repository uses the Game Production System. Repository files hold project facts and overrides; the installed Skill supplies compatible policy. Work only on the current task unless the user explicitly changes scope.

## Read before acting

1. Read `production/project.json`, then `production/PROJECT.md`.
2. Read `production/TASK.md` and its `Plan reference` unless `Single-task`.
3. Read `production/ACCEPTANCE.md`.
4. Read `design/modules/index.json`, then only task-referenced modules.
5. Read `docs/ART_BIBLE.md` only for visual, UX, animation, asset, or release work.

Preserve protected paths and unrelated dirty changes. Keep one active main task unless parallel work is explicit, with one integrator for shared files.

## Route intent and lane

- Exploration stays in conversation; tentative ideas do not authorize writes.
- Diagnosis and review are read-only and return evidence-backed findings.
- Implementation uses the lightest safe lane for the current work package.
- **Fast:** routine and reversible, with no new player-facing rule or high-risk decision.
  Implement/verify directly; no independent review or human approval; omit plan, role ceremony, and separate report.
- **Standard:** one bounded feature, one task card, affected design ownership,
  technical implementation, and risk-selected acceptance.
- **Full:** core loop, high-fidelity replication, monetization, migration, bulk
  production, gate, or release. Freeze affected domain design and technical
  architecture; add a plan only for real multi-package sequencing.

A Full parent retains Full milestone acceptance. Bounded child fixes, tests, tools,
or evidence use Fast/Standard controls unless a frozen boundary changes. Do not enter
`Ready` or `Implementing` with required design or the lane-applicable handoff unresolved.

## Execute Ready or Implementing work

The Game Production System remains lifecycle authority. With an intact installed 1.8 plugin,
`game-art-production` is required for its matching art route. External Skills are
optional accelerators; they must reuse `production/TASK.md` and its referenced
`production/PLAN.md`, and must not create duplicate plans, approvals, states, or
acceptance sources.

Run one bounded production loop:

1. **Select** the smallest next player-visible slice or enabling capability.
2. **Produce** actual product code, scenes, data, content, source assets, audio,
   or project-native UI; governance-only edits are not production.
3. **Integrate** immediately through the project adapter.
4. **Observe** the cheapest relevant real test, build, capture, listening pass,
   or target-device check.
5. **Repair** one shared root cause without polishing unrelated findings.
6. **Checkpoint** the delta, result, recovery point, risk, and next action.

An installed 1.8 plugin missing `game-art-production` is an integrity failure:
preserve work, repair/reinstall, and grant no art-path completion.
Repository-only with no plugin uses this interaction-to-visual loop, available or
replaceable capabilities, base editing, engine primitives, code-native UI, or
greybox boundaries. It must not claim that the dedicated protocol ran,
unavailable subjective authority ran, or unobserved proof ran.

## Design and player-facing quality

- `original_design` freezes missing rules from goals and constraints;
  `reference_replication` first freezes the named version, observed behavior,
  state matrix, tolerances, scope, unknowns, and allowed deviations.
- Technical implementation reviews feasibility but does not invent gameplay,
  content, visual, UX, animation, VFX, audio, economy, or balance rules.
- Before freezing enumerable Standard/Full design, run the cheapest applicable
  completeness check for required entities, states, paths, and dependencies.
- For high-fidelity work, prove the smallest representative slice in the engine
  before exhaustive capture or bulk production. Automated success alone does
  not establish visual, audio, player, or commercial quality.
- A routine Fast UI repair reusing accepted interaction/render and visual baselines
  marks GUI restoration Not applicable and verifies only affected regions/states.
  Reconstruction, material layout/component-system change, or a new visual rule is Required and Standard/Full.
- Material interactive visual work freezes the player action, authoritative
  state source, renderers, spatial master, source separation, asset families,
  assembly precheck, and representative runtime proof before bulk unlock.
- Derive asset inventory from frozen screens, states, flows, extremes, and
  feedback. Group by shared master and acceptance boundary only when that split
  reduces production, dependency, provenance, import, or integration risk.
- Use the installed `hypercasual.md` only for `creative_first`; do not scale a
  pipeline or advertisement before its configured stop/revise/scale decision.

## Evidence, convergence, and completion

- Keep `contractValid`, `taskReady`, `gateReady`, objective validity, design
  conformance, product quality, and integrated acceptance as separate claims.
- Fast closes on objective checks and recovery. Standard/Full add applicable
  design, producer, independent, and gate acceptance; never self-approve
  gate-critical work or record human approval without an explicit decision.
- Define an objective measure before uncertain iteration. After two same-root cycles
  add no evidence, retain passing parts and select one bounded repair, replan,
  enabling-capability route, materially new candidate, or abandonment; renaming does not reset stop-loss.
- Keep frozen repairs `Implementing`. Use `Clarifying` only when design,
  authority, scope, baseline, or architecture is genuinely unresolved; do not
  invent Recovery or Returned task states.
- Register only acceptance, material-decision, or root-cause evidence. Keep raw
  frames, matrices, stems, logs, and experiments in task-owned scratch.
- Before Standard/Full acceptance, tie passing evidence to a recoverable commit,
  patch, or source archive. Archive accepted tasks before replacing them.

## Human decisions and unattended work

Ask only human-owned product, gate, golden, business, release, migration, or
waiver decisions that block the next representative proof. Use selectable UI
when supported and a short numbered choice otherwise. Timeout, silence, defer,
or cancellation never grants passage; queue an unanswered decision once and
continue only already authorized independent work.

During explicit offline stewardship, use bounded commands with visible progress,
no-progress and absolute deadlines, recovery actions, and task-owned process
cleanup. Never leave a synchronous call blocked on a persistent helper.

Update the canonical decision source at the natural checkpoint, keep durable
process records to the current task plus one necessary baseline by default, and
run module harvest at task close.

Project-local instructions below this line override template defaults.

## Project overrides

None yet.
