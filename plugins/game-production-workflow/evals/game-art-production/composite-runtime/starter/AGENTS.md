# Project operating rules

This governed repository uses the Game Production System 1.7.2. Read `production/project.json`, `production/PROJECT.md`, `production/TASK.md`, `production/ACCEPTANCE.md`, and `docs/ART_BIBLE.md` before acting.

Work only on the current Full-lane inventory task. The visual direction and interaction/render contract are frozen. `web/state.mjs` is the single authoritative inventory state source. Renderers may consume it but must not duplicate or contradict it.

`web/assets/inventory-concept.svg` is an original repository-owned flattened concept, not runtime UI, editable separated production source, or a complete asset inventory. Preserve actual input, state coverage, source separation, export/import notes, and runtime evidence. Do not claim subjective or human passage from deterministic checks.
