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

## Loaded-context regression correction (Patch)

The first candidate failed the existing non-art Produce loading budget:
5715 words > 5586. Compressed only the new execution clarification and its
overlapping probe introduction; kept the existing budget unchanged. The normal
verification reuse boundary remains in capability-observation.json. This is
a correction to the preceding handoff/capability wording, not a new policy.

Independent candidate simulation read only raw request/state fields for all
15 cases. It found no material ambiguity in handoff, plan sizing or capability
observation after the patches, preserved Fast closure and pending authority,
and withheld player-quality claims from build-only evidence. Existing
gate/experience verdict vocabulary differences remain a recorded limitation;
no state vocabulary or gate policy change is included here.

## Final validation and local installation

- Baseline 5b6b408 and candidate source a19aac9 both passed full
  verify.ps1 -CompareRef 5b6b408 in clean owned clones. The original checkout
  belongs to a sandbox account; owned clones avoided Git's clone ownership
  rejection. Global trust settings were not changed.
- Existing loading-budget assertions passed without raising limits.
- Official plugin validator, all three skill validators and git diff --check
  passed. The final manifest was also revalidated.
- Fifteen raw-state decision scenarios received independent simulation.
  Six handoff/capability cases were rechecked after compression: no action
  or permitted-claim changes. These are simulations, not real game acceptance.
- Executable doctor regression passed: an existing entry point remained
  available to doctor while actual capture exited 7.
- Installed through the existing local marketplace using codex plugin add.
- Version: 1.8.0+codex.20260908065033; source/cache inventories: 80 files each,
  zero SHA-256 differences.
- Full verification log SHA-256: 68f6622ec59712a688afb87f4da2cc139e62a1d59566584ac7a6ffa1bf1545f5.
- Local branch: agent/production-execution-clarity; no push or main merge.
  Start a new Codex thread to load the installed skills.
- Real game-package outcomes and player acceptance remain unmeasured.
