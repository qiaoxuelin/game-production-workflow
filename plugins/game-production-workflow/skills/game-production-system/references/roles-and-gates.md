# Roles and gates

## Contents

1. Minimal roles
2. Planning and design ownership
3. Role expansion
4. Ownership and handoff
5. Gates
6. Human approvals

## 1. Minimal roles

### Human producer/product authority

Own product direction, scope, priority, business and quality tradeoffs, and
human-only approvals. Own integrated-outcome acceptance only when the project
explicitly assigns it to the human producer. Do not babysit routine execution
or infer passage from tests, screenshots, task readiness, or AI recommendation.

### Production coordination/delivery health

Own task routing, state accuracy, gate recommendation, and execution health.
Stay silent while the current route produces useful evidence. Detect ineffective
iteration, preserve passing sub-results, classify the root cause, and invoke
production planning or the affected design/technical owners. May record a
delegated producer-conformance recommendation, but never a human approval or a
change to a frozen human-owned boundary.

### Production planning/task architecture

Turn a project outcome or substantial feature into a coherent execution plan.
Choose single-task or multi-package execution; define dependencies, order,
shared contracts, integration points, role routing, task boundaries, the next
visible outcome, representative proof, bulk/parallel unlock, and replan
triggers. Return when delivery health shows that sequencing, dependencies,
package boundaries, validation order, or an enabling capability is wrong. Do
not replace domain design owners or implementation owners.

### Design/experience

Own player problem, rules, flow, content, UX hierarchy, edge states, and
behavioral acceptance before implementation. Establish the applicable external
reference or explicit product quality bar, artifact maturity, production-ready
source requirements, and hard return conditions. Produce a frozen design output
and handoff; do not silently implement around unresolved design or call a
concept, mockup, placeholder, or technically valid candidate production-ready.

### Technical/implementation

Own architecture, code, integration, deterministic behavior, tooling, import,
performance, build, and rollback. Do not change product rules without review.

### Independent review

Own evidence integrity and acceptance from the relevant QA, player, art, data,
or release perspective. Check both frozen-design conformance and the claimed
product-quality level. For subjective high-risk work, compare the actual result
with the declared external reference or product quality bar before reading
implementation rationale when practical. For visual work, do not approve source
art without in-engine evidence.

These are accountable perspectives, not required permanent agents. One Codex
task may execute several role passes internally. Do not create separate role
documents, agents, or approvals merely to prove participation. Delegate only a
bounded independent package that saves time, has a clear return artifact, and
can be integrated once.

Route roles by execution lane:

- **Fast:** no named role passes beyond the implementer and objective checks.
- **Standard:** affected design owners plus technical implementation only.
- **Full:** production planning, affected design owners, an explicit technical
  architecture owner, implementation, and risk-selected review.

Production coordination is a lightweight responsibility of the active task,
not an extra role pass, document, agent, or approval. Invoke its recovery work
only when execution-health evidence requires it.

## 2. Planning and design ownership

Use `Single-task` only when the requested outcome is bounded, has no meaningful
cross-module sequencing, has one implementation owner, and can close against
one acceptance contract.

Use `production/PLAN.md` when work spans multiple player outcomes, modules,
design domains, owners, dependencies, shared files, integration stages, or
acceptance milestones. Record:

- work packages and player-facing outcomes;
- dependency and integration order;
- shared contracts/files and one integrator;
- design, implementation, and review owners per package;
- representative proof and the condition that unlocks bulk or parallel work;
- completion boundary, evidence budget, and replan triggers.

For material art production, let `visual-production.md` decide whether an
asset-family split is useful. Plan by shared master, runtime purpose,
production method, dependency, and acceptance boundary rather than file count.
Keep bounded asset work inline in the current task; use plan packages only for
real sequencing or parallelism. This split adds no per-asset role or approval.

After planning, invoke the affected domain owners:

- game/level/balance/economy/content design owns rules, progression, values,
  state flow, and behavioral acceptance;
- art/GUI/animation/VFX/audio design owns visual and feedback specifications,
  assets, states, baselines, and tolerances;
- technical design owns architecture and feasibility, but cannot substitute
  for missing product or experience decisions.

Apply the relevant craft reference from the Skill. Naming an owner satisfies
routing only; it does not prove that the design method, maturity, or quality bar
is adequate. Keep one accountable owner when one person can competently cover
several adjacent domains; do not add role passes merely because the references
separate professional concerns.

Keep design `Draft` until domain owners have made the decisions. Freeze the
outputs and implementation handoff before entering `Ready`. For Full work, the
technical architecture owner must also freeze structure, interfaces, data/asset
flow, representative feasibility, verification, and rollback before
implementation. This can be the implementer, but it is an explicit design
responsibility, not architecture discovered through repeated tuning. Technical
implementation may challenge feasibility; the coordinator routes a redesign
instead of allowing silent product changes.

Freeze Full-lane planning and architecture at the parent boundary. Child
implementation, test, tooling, or evidence packages do not repeat those passes
unless new evidence changes the frozen boundary.

## 3. Role expansion

Split roles only when recurring workload or risk warrants it:

- game design, economy, narrative;
- art direction, GUI, animation/VFX, technical art, audio;
- client, gameplay, backend, tools, release;
- automation QA, player QA, data/UA.

Use the three-occurrence rule: split a specialist after the same distinct work
need recurs three times or becomes a gate-critical bottleneck.

Design/experience owns module content. Technical/implementation reviews
feasibility and downstream impact. The human producer alone adopts a module as
a project default; do not add a permanent module-maintainer role.

## 4. Ownership and handoff

Standard and Full task cards name only the applicable items:

- planning owner and plan reference;
- production-coordination owner when delivery-health recovery is applicable;
- design status, design owners, and frozen outputs;
- implementation handoff;
- producer acceptance owner;
- implementation owner;
- integration owner;
- review owner;
- allowed paths;
- protected/shared paths.

Use up to three compact acceptance responsibilities:

1. Automation or technical QA verifies that the implementation runs and meets
   its objective technical contract.
2. The original domain-design owners inspect the actual result and jointly
   accept or return its conformance when design applies.
3. The producer accepts or returns the integrated module/task outcome for Full
   work and for Standard work where player-facing integration makes it
   applicable.

Record design and producer acceptance in `TASK.md` with an evidence ID or
repository-relative review record. A design owner may not delegate conformance
acceptance to implementation. Producer acceptance is not a human gate approval
unless the human explicitly made that decision.

Fast work closes on objective verification and a recoverable result; design,
producer, and independent acceptance are not added unless actual risk escalates
the task to Standard or Full.

The implementer may self-test. Full, explicitly risk-selected Standard, and
gate-critical final review must still be independent. If a reviewer contributed
to implementation, disclose it and add another pass. Independent review
verifies evidence and risk; it does not take ownership away from the designer
or producer.

## 5. Gates

### G0 — Direction locked

Require project track, business model, validation mode, quality focus, audience,
platform, engine, canonical client, success/stop criteria, first proof,
non-goals, and ownership.

### G1 — Core proof

- `indie_game`: prove the primary player promise in a playable build. Apply
  mechanics, visual, content, and liveops focus requirements as selected.
- `mobile_game`: prove the first-session loop on a declared target-device class,
  including touch, interruption, and initial performance evidence.
- `f2p`, `iaa`, and `hybrid`: also prove the smallest relevant economy,
  monetization, analytics, and compliance contracts.
- `creative_first`: replace the ordinary G1 order with at least three original
  creative hypotheses, provenance, independent review, and an explicit
  continue/revise/stop decision. See `hypercasual.md`.

Record the explicit G1 decision in `humanApprovals.G1`. A task may be
functionally or visually complete before that decision, but the gate is not
ready.

### G2 — Golden vertical slice

Require one end-to-end experience at near-final gameplay, art, UX, animation,
audio, technical, and evidence quality. It must be reproducible from a clean
environment and reviewed on target hardware/size.

### G3 — Release candidate

Require external player/market evidence, performance, compatibility, saves,
localization/accessibility as scoped, provenance, compliance, packaging,
rollback, and release-owner approval.

For `creative_first`, also require a structured small-budget UA test and an
explicit stop, revise, or scale decision.

## 6. Human approvals

Require explicit human producer approval for:

- G0;
- the G1 continue/revise/stop decision;
- golden visual master;
- G2;
- G3;
- platform/engine/canonical-client changes;
- destructive or incompatible migration;
- public release, store submission, or paid acquisition.

AI can write `review_recommended`; it cannot infer `human_approved`.

Record each human decision as an object:

```json
{
  "decision": "approved",
  "decidedBy": "human producer",
  "decidedAt": "2026-07-28T10:00:00+08:00",
  "source": "Codex task or review",
  "scope": "exact gate or artifact approved"
}
```

Use `continue`, `revise`, or `stop` for G1. Only `continue` grants passage.
Legacy approval strings remain readable but should produce a migration warning.
