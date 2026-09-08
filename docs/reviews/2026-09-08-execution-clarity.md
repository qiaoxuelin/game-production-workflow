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
