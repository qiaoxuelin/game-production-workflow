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
