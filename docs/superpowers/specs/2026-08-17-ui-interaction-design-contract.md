# UI Interaction Design Contract

## Goal

Make material game UI implementation consume a frozen interaction-to-visual design instead of inventing focus, feedback, timing, failure, or recovery behavior during production.

## Existing authority

The core workflow already owns execution lanes, gameplay semantics, task state, the `Interaction/render contract`, design freeze, acceptance, and passage. This change adds no role, approval, lifecycle state, TASK field, document type, or tool requirement.

## Scope

- Fast work that reuses an accepted interaction/render and visual baseline remains outside the art Design route.
- Standard and Full work that creates or materially changes a player-operated UI surface uses the existing second Design pass after direction selection.
- The UI designer consumes authoritative gameplay semantics and must not invent domain state changes.

## Design contract

Before a Production-design candidate can be recommended for core freeze, the selected direction must express the representative interaction loop as:

`player input -> intent/action -> authoritative pre/post state -> presentation state/component -> visible/audio/haptic feedback -> completion, interruption, failure, or recovery`

Cover only scoped inputs, critical paths, and dominant-risk extremes. The candidate must make inspectable:

- pointer, touch, keyboard, and controller behavior that applies;
- focus order, directional navigation, default/restored focus, hit regions, and unavailable controls;
- component states and transitions, including applicable pressed, selected, disabled, loading, success, error, cancel, and recovery states;
- feedback and motion purpose, timing, interruption, reduced-motion behavior, and platform differences;
- representative content and viewport extremes;
- editable component/source boundaries and the runtime proof required after implementation.

Use one consolidated board, behavior matrix, annotated flow, or bounded interactive prototype as appropriate. Do not require a specific authoring tool or one file per concern. A static keyframe or state sheet alone cannot establish an interaction-ready Production design. A scratch prototype may simulate states only when disclosed and never counts as target-project runtime proof.

## Stage responsibilities

- **Design:** define expected interaction behavior and visual response inside supplied semantics; return `Proposed` until core records the freeze.
- **Produce:** consume the frozen mapping, report a missing or contradictory design boundary, implement it against real input and authoritative state, and record expected-versus-observed conformance. Produce may solve implementation detail but may not silently make product-level interaction decisions.
- **Review:** inspect focus/navigation, state continuity, timing/interruption, failure/recovery, and real input-to-state-to-feedback causality separately from static visual quality.

## Exit criteria

A material UI Production-design candidate may be recommended for freeze only when the representative loop, applicable input modes, critical states, navigation, feedback/motion, exceptions, source boundaries, and required runtime proof are inspectable. Human selection, core freeze, design acceptance, producer acceptance, and gate passage remain outside the art Skill.

## Compatibility and burden controls

- Reuse the existing Fast/Standard/Full lanes and `Interactive visual scope` predicate.
- Keep the existing compact core contract as the durable source of truth; art artifacts elaborate it without creating a parallel authority.
- Permit references to adopted component and motion rules; document only the delta.
- Require one dominant-risk prototype or feasibility precheck, not exhaustive high-fidelity prototyping.
- Preserve existing Direction, Production design, Runtime golden, and Integrated acceptance maturity meanings.
