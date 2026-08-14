# Product contract

## Product

- Project ID: `inventory-runtime-eval`
- Development mode: `original_design`
- Project track: `desktop_game`
- Business model: `premium`
- Validation mode: `product_first`
- Quality focus: `gui, art`
- One-sentence promise: Let players inspect, understand, and equip a compact expedition inventory without losing context.
- Target player: Keyboard, controller, and pointer users managing eight inventory slots during an expedition.
- Platform: Desktop browser at 1280×720.
- Engine: Browser-native HTML, CSS, and JavaScript.
- Canonical client: `web`

## Components and repository boundaries

- Governance root: `.`
- Canonical client: `web`
- Authoritative state source: `web/state.mjs`
- Initial flattened concept: `web/assets/inventory-concept.svg`
- Production components and separated assets: `web/components` and `web/assets`
- Source and evidence handoff: `artifacts`

## Core experience

The player opens an inventory, moves focus among slots, sees empty, full, or error feedback, and equips an available item through actual input. State remains authoritative and consistent across all renderers.

## Success and stop criteria

- Continue when a representative project-native slice preserves the frozen state and input contract while replacing the flattened concept with editable separated assets.
- Stop or reconsider when state is duplicated, the concept is shipped as runtime UI, input is simulated only in captures, or a new direction rule is required.

## First proof

One native inventory panel exercises empty, full, error, equip, and controller-focus states from `web/state.mjs` using keyboard and pointer input.

## Golden vertical slice

The complete eight-slot panel uses separated source assets and native components, documents source/export/import handling, and has independent runtime quality review.

## Non-goals

- Reinterpreting the frozen visual direction.
- Adding inventory categories, sorting, drag-and-drop, or new item rules.
- Treating the flattened concept or captures as production runtime UI.

## Frozen decisions

- The visual thesis, palette, shape language, spatial master, and interaction/render contract in the art bible and task are fixed.
- The inventory contains eight slots and supports the five named states.

## Maintenance ownership

Game state owns `web/state.mjs`; UI implementation owns renderers and input; art production owns separated sources and exports; independent review owns subjective findings.
