# Experience and commercial-quality review

Use this reference for independent player, UX, visual, audio, game-feel, or
integrated quality review where objective tests or internal conformance cannot
establish the claimed experience quality.

## Review the right claim

Separate four questions:

- **Objective validity:** does it run and satisfy measurable contracts?
- **Design conformance:** does it match the frozen design for this slice?
- **Product quality:** does the actual result meet the declared audience,
  platform, comparison basis, and quality bar?
- **Integrated acceptance:** does it work coherently with the surrounding game?

Passing one question never implies the next. A self-authored baseline can be
internally consistent and still be below a commercial product standard.

## Prepare an independent pass

Give the reviewer the target player/platform, comparison basis—a named external
reference, or a frozen internal baseline plus category quality bar—scoped
maturity claim, actual runtime artifact, applicable states, and hard
return conditions. Keep test counts, implementation rationale, prior praise,
and author persuasion out of the first subjective pass when practical. The
reviewer may inspect them after recording an initial experience verdict.

The reviewer records the failed criterion, observable evidence, retained
passing parts, conditions for passage, and next owner. The reviewer does not
choose the implementation repair; production coordination and the affected
design or technical owner convert a `Returned` verdict into the executable
handoff defined by the production loop.

Use an independent reviewer for gate-critical or repeatedly returned work. If
the reviewer contributed materially to the design or implementation, disclose
it and add one genuinely independent pass rather than relabeling self-review.

## Inspect the actual experience

Turn the claim into a short playable sequence using only applicable actions
and states: enter, identify the goal, act, interpret feedback, encounter failure,
and recover. For each selected step, use the frozen expected behavior, observe
the actual result and state the failure condition. Reuse the existing task or
review record; do not create a second test plan or require every step for a
single-state repair. Read-only review does not authorize creating or editing
project artifacts.

At greybox maturity, inspect comprehension, meaningful choices, causal feedback
and recovery against the scoped promise; final art is not a prerequisite for
those observations. Retain the declared fidelity and any higher quality duties.
An expert playthrough supports an expert assessment, not external-player
validation or a claim that the target audience has demonstrated comprehension.

Play, view, or listen at the target size/device and normal player pace. Check:

- first-impression clarity and product identity;
- attention hierarchy, decision readability, control confidence, and recovery;
- interaction-to-visual causality, operable spatial contact, attachment, and
  whether independently changing state remains coherently rendered;
- causal feedback, timing, pacing, payoff, repetition, fatigue, and emotional
  fit;
- consistency across representative default, success/failure, interruption,
  unavailable, and edge states;
- comparison with the declared basis: external reference, or frozen internal
  baseline for conformance and category quality bar for product quality;
- integration with gameplay, economy, content, performance, and accessibility
  boundaries in scope.

Do not use source art, a generated mockup, waveform, schema, screenshot count,
or automated success as a substitute for normal-scale runtime judgment.

## Return decisively

Use one verdict: `Pass`, `Pass with bounded non-blocking findings`, or
`Returned`. Return foundational hierarchy, interaction, spatial assembly,
source separation, material, motion, audio, gameplay, level-topology, or
product-identity failures instead of converting them into coordinate, opacity,
gain, or numeric polish tasks.

Record one consolidated verdict with the failed criterion, observable evidence,
retained passing parts, and next allowed route. Later Human Producer feedback
supersedes a prior AI recommendation for future work; preserve history, reopen
the affected baseline at the next recoverable checkpoint, and never defend a
weak result solely because an earlier internal review passed it.
