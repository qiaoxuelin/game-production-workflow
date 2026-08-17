# Current task

## Control

- Task ID: `ART-DIRECTION-001`
- Status: `Clarifying`
- Gate: `G0`
- Execution lane: `Full`
- Planning owner: `Production planning/task architecture`
- Delivery health owner: `Production coordinator`
- Plan reference: `Single-task`
- Design status: `Human selection required`
- Design owners: `Human art direction for UI/2D selection; game design for frozen result flow`
- Frozen design outputs: `Player flow, state matrix, viewports, content extremes, interaction semantics, and product-quality bar below`
- Technical architecture owner: `UI technical implementation`
- Implementation handoff: `Preserve shell events and state identifiers; replace only presentation through editable assets and project-native HTML/CSS components`
- Producer acceptance owner: `Human producer`
- Design acceptance: `Pending`
- Producer acceptance: `Pending`
- Owner role: `Art/UI production`
- Integrator role: `UI technical implementation`
- Reviewer role: `Independent visual and experience reviewer`
- Design domains: `UI/UX, 2D art, accessibility`
- Design modules: `None`
- GUI restoration: `Not applicable`
- High-risk open decisions: `1`

## Goal and player value

Create an original result-screen visual direction that makes outcome, reward, and the next action clear within one glance without changing player behavior.

## Known facts

- Success and failure share the same navigation and information hierarchy.
- Reward rows range from zero to eight; the overflow case must remain usable.
- Retry is the primary action and exit is secondary.
- Keyboard and controller focus must remain visible and follow DOM order.
- Required viewports are 1280×720 and 390×844.

## Assumptions

- Browser-native assets and components are sufficient for the representative proof.
- Original repository-owned typography, geometry, and generated or hand-authored assets may be used when provenance is documented.

## Decisions required

1. Human art direction selects, returns, or bounds a proposed UI/2D direction after reviewing runtime evidence.

## Reference replication contract

- Reference baseline: `Not applicable; this is original_design work`
- Replication scope: `Not applicable`
- Critical replication points: `Not applicable`
- Comparison method and tolerances: `Not applicable`
- Allowed deviations: `Not applicable`

## Allowed paths

- `web/**`
- `docs/ART_BIBLE.md`
- `artifacts/**`
- `production/TASK.md`
- `production/project.json`

## Protected paths and behavior

- Do not change the result-state names, retry and exit actions, reward data, viewport targets, or focus semantics.
- Do not mark subjective review or human direction selection complete.

## Dependencies and risks

- Direction selection is human-owned and blocks artistic passage, not bounded candidate production.
- A visually polished still can conceal broken overflow, focus, or responsive behavior; runtime cases are mandatory.

## Execution contract

- Planned visible outcome: One integrated original direction covering all frozen result states and target viewports.
- Representative proof: `Pending`
- Bulk or parallel unlock: `Locked`
- Interactive visual scope: `Required`
- Interaction/render contract: `Actions retry and exit; states success, failure, reward-overflow, retry, keyboard-focus, and controller-focus; app.mjs owns shell state and DOM is the renderer; responsive layout owns spatial fit; source layers stay separable; existing CSS is greybox only`
- Assembly precheck: `Pending`
- Required asset inventory: `Result frame and outcome treatment; score and reward components; primary and secondary actions; focus treatment; success/failure variants; zero through eight reward-row coverage; desktop and portrait responsive composition`
- Asset-family packages: `Result-screen family: all named states and controls share one spatial master; editable source and exports under artifacts and web; UI/2D production owns assets and UI technical implementation owns runtime integration`
- Stop/replan triggers: A frozen rule must change, two same-root cycles add no evidence, or direction selection is required to choose between materially different candidates.
- Evidence budget: One direction summary, one source/export/import note, and the four required representative runtime captures.

## Acceptance

### Functional

- Retry and exit react to pointer activation and keyboard activation.
- Every named state can be selected in the runtime shell.
- Focus remains visible and ordered at both target viewports.

### Visual and UX

- Outcome, score, reward, and primary action are legible in that order at a glance.
- Reward overflow remains scannable without covering actions.
- Originality, cohesion, craft, and commercial readiness require independent subjective review.

### Evidence

- Provide editable-source and export/import notes plus the declared runtime captures.
- Deterministic fixture passage does not imply artistic passage.

## Result and handoff

- Result: `Not started`
- Acceptance records: `None`
- Evidence IDs: `None`
- Module harvest: `Pending`
- Unresolved risks: Human UI/2D direction selection and independent quality review.
- Next action: Produce the first bounded original direction candidate.
