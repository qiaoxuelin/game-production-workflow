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
