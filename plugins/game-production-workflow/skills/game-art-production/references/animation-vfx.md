# Animation and VFX

Use for motion, rig/deformation, or effects in either 2D or 3D. Apply only the
selected art operation and relevant techniques; a static scene needs none of
these checks. Combine with spatial-3d.md only when 3D geometry/materials/rigs
are actually involved.

## Design

Define the player-visible purpose and authoritative trigger, anticipation,
impact, settle/recovery, duration, loop/exit behavior, interruption, blending,
attachments, occlusion, and feedback readability at normal player pace.
Specify source separation and editable clips/rig or procedural/effect graph,
relevant pose extremes, root-motion ownership, and event timing only where used.
For VFX, define particle/trail/shader layers, spawn/stop/reset, lifetime and
cleanup, repeated/concurrent use, camera readability, and target cost limits.
Use applicable reduced-motion/flash constraints from the project brief.
Return candidates and proof criteria for core freeze; do not invent gameplay
state transitions, damage timing, or new human approvals to complete an effect.

## Produce

Consume the frozen timing and state contract. Keep independent actors, effects,
shadows, and attachments separable; do not substitute a whole-frame crossfade
for required independent motion. For skeletal assets, inspect bind pose, joint
orientation, weights/deformation at extreme poses, attachments, and retargeting
when used. For sprites, inspect registration, pivot continuity, frame timing,
and layer separation. Static props need no rig or clip deliverable.

Integrate and play the actual clips/effects through authoritative state in the
target project. Exercise the applicable start, impact, loop, interruption,
blend/transition, stop, and replay states. Check contact/foot sliding, popping,
clipping, attachment continuity, event synchronization, pooling/reset/cleanup,
and readability as applicable. Profile representative simultaneous effects
for overdraw, particles, frame and memory cost on the declared target; disclose
missing target-device measurements. Keep bulk locked until representative
assembly and runtime proof pass, then return through the common bounded repair
and core convergence rule. A 2D-only effect stays off the spatial-3D route.

## Review

Inspect playback at normal speed and relevant camera distance, plus frames or
slow motion where useful to diagnose transitions. Still images cannot establish
motion quality, timing, deformation continuity, or interruption behavior.
Compare expected versus observed state/timing, source separation, craft, and
measured runtime cost separately. Missing playback blocks those claims, not
valid unrelated static findings. Return a read-only verdict with precise
coverage and the next owner; never implement repairs or grant acceptance.
