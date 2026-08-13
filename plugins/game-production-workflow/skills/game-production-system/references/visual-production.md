# Visual production

Use this reference for player-facing UX/UI, art direction, animation, VFX, or
technical-art work. One accountable owner may cover adjacent disciplines; do
not create extra agents, documents, or approvals merely to name every concern.

## Freeze the professional brief

Before implementation, define:

- player, platform, viewing distance, viewport, safe area, and performance tier;
- the player-facing problem and intended attention order;
- an external reference or explicit product quality bar, including what must
  match and what may differ;
- screen/state inventory, content extremes, interaction semantics, and edge
  states relevant to the package;
- component, shape, color, typography, icon, material, lighting, depth, motion,
  and feedback language required by the scope;
- editable source, layer/rig separation, import, atlas, shader, resolution,
  localization, accessibility, and runtime constraints;
- hard return conditions and the claimed artifact maturity.

Do not substitute a style prompt, generated image, mood board, or prior internal
candidate for a professional brief.

## Keep maturity claims explicit

Use the narrowest truthful claim:

1. **Direction:** mood, reference, composition idea, or exploratory concept;
   not implementation-ready.
2. **Production design:** frozen hierarchy, components, states, source/layer
   requirements, tolerances, and representative golden; implementation-ready
   only for the declared slice.
3. **Runtime golden:** actual engine result passes at target size and relevant
   states; not yet integrated-module or gate acceptance.
4. **Integrated acceptance:** the complete scoped experience passes design,
   runtime, performance, and producer review.

Never promote an artifact by renaming it or because its implementation tests
pass. Record placeholders and unfinished production assets as explicit debt.

## Decompose material asset production only when useful

Before opening production packages, derive the required asset inventory from
the frozen screen/state inventory, content extremes, interaction flows, and
animation/VFX beats. Map each visible or runtime need to an asset family and
its required states/variants, then classify it as reuse, adapt, create, or
explicit placeholder debt and name its runtime destination. Run the cheapest
static coverage check: every required screen/state need maps to an asset or
intentional non-asset treatment, and every planned asset maps back to a scoped
use. Keep this inventory in the current task or plan; use a separate structured
artifact only when it is the actual production source of truth or the inline
record would be unreadable.

Use an asset-family split when material production has shared masters, state or
content variants, multiple production methods or owners, import/provenance/
performance risk, or a dependency boundary that affects sequencing. Do not
trigger it from a fixed file or asset count. Group assets that share a visual
master, production method, runtime purpose, and acceptance boundary; the
production unit is normally an asset family, not one exported file.

Keep a bounded package inline in `TASK.md`. Use the existing `PLAN.md` only
when several families have real dependency, parallel, or integration order.
For each active family record only:

- the player-facing outcome, inventory-derived assets, and required
  state/variant coverage;
- the shared master and dependencies, plus which downstream families become
  stale if that master changes;
- applicable editable-source, export, import, runtime, and provenance
  constraints;
- exclusive paths, production owner, unique integrator, and rollback point;
- technical completion checks and the representative runtime acceptance that
  proves design conformance.

Do not create a separate asset-contract document, permanent asset role, or
human approval per asset. Select generation, stock, procedural, or manual
production by the family need; record rights and provenance when applicable
instead of making the tool choice a gate.

A passing golden unlocks only families governed by its frozen visual system,
shared masters, component/state rules, and integration contract. Materially
different visual systems need representative proof, but related decisions may
be consolidated into one understandable golden review. Run deterministic
technical checks across the produced set; have the design owner review each
family and its risk extremes in runtime; reserve producer and independent
review for the integrated outcome and selected gate risk.

Parallelize family production only after shared masters and interfaces freeze,
with non-overlapping editable/import paths and one integrator. Integrate shared
atlases, themes, component libraries, and scene roots serially. When a master
changes, invalidate and recheck only its declared dependents unless the change
alters the wider visual baseline.

## Apply the craft checks

For UX/UI, verify grouping, attachment, hierarchy, affordance, semantic
distinction, focus order, hit regions, state continuity, safe areas,
localization extremes, accessibility, and recovery paths. Every visible control
must belong to a coherent component or surface rather than float as an
independent text/icon island.

For art direction, verify silhouette, scale, proportion, focal contrast,
palette, material identity, lighting, depth, texture/detail density, cohesion,
and separation from gameplay-critical information. Compare at actual display
size; a zoomed source image can hide weak hierarchy and inconsistent finish.

For animation and VFX, define purpose, anticipation, impact, settle/recovery,
duration, interruption, layering/rig needs, occlusion, repetition, and
performance. Do not accept whole-frame crossfades or unrelated particles as
final animation when characters, props, shadows, or state transitions require
independent motion and continuity.

For technical art, verify editable source ownership, alpha and color space,
filtering, nine-slice/deformation behavior, sprite/texture density, atlas and
material strategy, shader variants, draw/overdraw budget, scaling, compression,
and deterministic engine import. Technical-art validity cannot rescue an
inadequate visual design.

## Prove one representative slice

Produce the smallest golden that exposes the dominant visual risks. Review it
at actual size in the engine, with representative content and at least the
critical default, success/failure, unavailable/loading, and short/long viewport
states that apply. For replication, compare side by side with the frozen source
and declared tolerances. For original design, compare with the explicit product
quality bar and selected category benchmarks.

Return the slice before bulk work when it has broken hierarchy, floating
controls, mixed component or material languages, debug-like copy, unresolved
placeholders, illegible scale, unsafe hit regions, missing source separation,
incoherent motion, or reliance on tests/source art instead of runtime quality.

Keep evidence lean: one brief or existing task baseline, one representative
golden, one runtime comparison, and one consolidated owner/reviewer verdict are
normally enough before bulk unlock.
