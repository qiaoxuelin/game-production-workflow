# Current task

## Control

- Task ID: `ART-RUNTIME-001`
- Status: `Ready`
- Gate: `G1`
- Execution lane: `Full`
- Planning owner: `Production planning/task architecture`
- Delivery health owner: `Production coordinator`
- Plan reference: `Single-task`
- Design status: `Frozen`
- Design owners: `UI/UX design and 2D art direction`
- Frozen design outputs: `Inventory state matrix, input rules, spatial master, palette, shape language, asset inventory, and source-separation boundary`
- Technical architecture owner: `UI technical implementation`
- Implementation handoff: `Consume web/state.mjs directly; implement native DOM components and separated assets; preserve eight-slot geometry and every named input/state transition`
- Producer acceptance owner: `Human producer`
- Design acceptance: `Pending`
- Producer acceptance: `Pending`
- Owner role: `Art/UI production`
- Integrator role: `UI technical implementation`
- Reviewer role: `Independent visual and experience reviewer`
- Design domains: `UI/UX, 2D art, accessibility`
- Design modules: `None`
- GUI restoration: `Not applicable`
- High-risk open decisions: `0`

## Goal and player value

Replace the flattened inventory concept with editable separated sources and project-native runtime components that respond to actual input across every frozen state.

## Known facts

- `web/state.mjs` is the sole authoritative source for empty, full, error, equip, and controller-focus states.
- The inventory has eight slots; full means all eight are occupied and empty means none are occupied.
- Equip succeeds only for an occupied focused slot; otherwise the error state identifies the focused empty slot.
- Arrow keys move focus, Enter equips, and pointer activation focuses and equips an occupied slot.
- The supplied SVG is original repository-owned concept geometry and text but remains a flattened placeholder.

## Assumptions

- Native DOM components and repository-owned SVG assets can reproduce the frozen direction at runtime.
- A static local server is sufficient for representative browser proof.

## Decisions required

No design decision blocks the first representative slice. Return to the owners if implementation exposes a conflict in the frozen contract.

## Reference replication contract

- Reference baseline: `Not applicable; the repository concept is an internal original-design baseline`
- Replication scope: `Not applicable`
- Critical replication points: `Not applicable`
- Comparison method and tolerances: `Not applicable`
- Allowed deviations: `Not applicable`

## Allowed paths

- `web/**`
- `artifacts/**`
- `production/TASK.md`
- `production/project.json`

## Protected paths and behavior

- Preserve `web/state.mjs` as the single authoritative state source and retain its exported contract.
- Preserve eight slots, the five named states, and the keyboard/pointer actions.
- Do not replace the frozen visual direction or use the concept SVG as final runtime UI.

## Dependencies and risks

- A composite can appear complete while hiding duplicated state, inaccessible input, or uneditable sources.
- Subjective quality still requires independent review after objective integration checks pass.

## Execution contract

- Planned visible outcome: One project-native inventory panel with separated assets, real input, and five-state runtime proof.
- Representative proof: `Pending`
- Bulk or parallel unlock: `Locked`
- Interactive visual scope: `Required`
- Interaction/render contract: `Actions open, focus previous/next, equip, and close; state.mjs exclusively owns empty, full, error, equip, and controller-focus state; native DOM components render state; one 760×500 panel spatial master owns slots, details, and footer; frame, slots, icons, focus, and feedback remain separate; inventory-concept.svg is placeholder only`
- Assembly precheck: `Pending`
- Required asset inventory: `Panel frame; eight native slot components; separate item icons; empty and occupied variants; focus ring; error feedback; equipped marker; controller hints; empty, full, error, equip, and controller-focus coverage`
- Asset-family packages: `Inventory shell: frame, dividers, and spatial master; item family: separate editable icons and occupied/empty variants; feedback family: focus, error, equip, and input hints; art production owns sources/exports and UI implementation owns native assembly`
- Stop/replan triggers: State authority must move, a frozen direction rule conflicts with runtime behavior, the concept is required as final UI, or two same-root cycles add no evidence.
- Evidence budget: One source/export/import note and one capture for each of the five required states.

## Acceptance

### Functional

- The local verifier passes the authoritative state and transition contract.
- Keyboard and pointer input produce state changes visible through the native renderer.
- No renderer owns a competing inventory-state model.

### Visual and UX

- The integrated panel conforms to the frozen shape, palette, spacing, and hierarchy direction at 1280×720.
- Focus, error, and equipped feedback remain distinct and readable.
- Commercial-quality judgment remains pending independent runtime review.

### Evidence

- Provide editable separated sources, source/export/import notes, and one runtime capture per required state.
- Deterministic fixture passage does not imply artistic passage.

## Result and handoff

- Result: `Not started`
- Acceptance records: `None`
- Evidence IDs: `None`
- Module harvest: `Pending`
- Unresolved risks: Native assembly and independent product-quality review remain incomplete.
- Next action: Build and inspect the first native empty-state slice before producing the remaining asset family.
