# Execution clarity maintenance review

Baseline: commit 5b6b408; installed 1.8.0+codex.20260821102607.
Scope: local compatible patches; no project schema, gate authority, operation
routing, or always-loaded entrypoint changes. Each hypothesis is isolated in a
separate source/eval commit. No structural rewrite or new approval is needed.

## Art operation handoff (Patch)

Raw baseline: Produce says "Run one combined regression, then return; never
start a second batch." Core says "Otherwise execute the selected route without
reopening planning or lowering the quality bar."
Independent baseline simulation continued correctly, but explicitly identified
the missing re-entry explanation. This is a documented ambiguity, not a
reproduced premature-termination claim.

Hypothesis: explicitly scope the one-batch limit to the art operation and let
the existing core convergence rule govern continuation. Preserve one batch per
operation, cross-call stop-loss history, pending authority and observation
limits. Measure: zero unjustified end/approval/replan in the intended scenario;
no repeated tuning or dependent repair in boundary/prohibited scenarios.

Regression cases: execution-handoff.json. The evaluation corpus is a durable
decision rubric; structural validation alone is not a model behavior run.

## Planning proportionality (Patch)

Raw baseline: roles-and-gates says use PLAN when work spans "modules" or
"shared files"; workflow already limits it to "real multi-package dependency
or integration order". Independent baseline simulation chose Single-task but
identified the contradictory wording.

Hypothesis: align the roles reference with the existing canonical lane rule.
Measure: one task and no extra plan for a bounded multi-file feature; preserve
Full planning and authority for sequenced migration; preserve Fast closure.
Regression cases: planning-scope.json. No lane, ownership or schema changed.

## Review independence (Patch)

Raw baseline: several internal role passes are allowed; section 4 and
experience-review already reject contributor self-review as independent.
Baseline simulation correctly refused gate passage. There is no demonstrated
authority defect; the clarification is placed beside the internal-role
sentence so its exception cannot be missed.

Hypothesis: make the existing contribution boundary explicit at its apparent
exception. Measure: role renaming grants no independence; actual independent
evidence is retained; Fast work gains no review duty.
Regression cases: review-independence.json. Human and reviewer authority unchanged.

## Capability observation (Patch)

Raw baseline: execution describes the existence probe as "configured from
runnable", although doctor explicitly never executes adapter probe arguments.
Independent simulation recognized this optimistic terminology.

Hypothesis: distinguish entry-point availability from observed operation in
the existing execution handshake, using its normal bounded verification path.
No doctor schema, command-execution capability or new universal smoke is added.
Measure: actual capture failure overrides existence for planning; passing
observation is reused; irrelevant tools never block Fast work.
Regression: capability-observation.json and an executable test-doctor case
where an existing capture entry point exits 7 with "No browser available".

## Playable experience review (Patch)

Raw baseline: experience review names clarity, feedback and recovery, but does
not express a short expected/observed action sequence. Baseline simulation
also distinguished expert judgment from external-player comprehension.

Hypothesis: make the existing observation duty executable with scoped player
steps, reusing current records and preserving read-only review. Measure: an
actual scoped observation route for greybox claims; no full matrix for a
single-state edit; no invented findings when observation is blocked.
Regression cases: experience-observation.json. No final-quality bar is lowered.

## Rule duplication and regression scope

Deduplication is limited to the edited art return referencing core convergence;
planning wording is aligned with the existing workflow rule. Broader movement
of approvals, states or entrypoint policy is a Restructure, unnecessary for
these reproduced textual ambiguities, and is not part of this patch series.
Each patch adds intended, boundary and prohibited decision scenarios. These
are independent policy simulations, not real production packages or player
acceptance; no production performance improvement is claimed.
