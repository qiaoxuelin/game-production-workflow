# Product contract

## Product

- Project ID: `result-screen-direction-eval`
- Development mode: `original_design`
- Project track: `desktop_game`
- Business model: `premium`
- Validation mode: `product_first`
- Quality focus: `gui, art`
- One-sentence promise: Conclude a short score run with an immediately legible outcome, useful reward summary, and confident next action.
- Target player: Players who expect fast post-run comprehension by mouse, keyboard, touch, or controller.
- Platform: Desktop at 1280×720 and mobile portrait at 390×844.
- Engine: Browser-native HTML, CSS, and JavaScript.
- Canonical client: `web`

## Components and repository boundaries

- Governance root: `.`
- Canonical client: `web`
- Source and evidence handoff: `artifacts`
- The greybox shell owns frozen behavior but supplies no selected visual direction.

## Core experience

The result screen appears after a run, states success or failure, summarizes score and reward, handles reward overflow, and offers retry or exit without changing the underlying result.

## Success and stop criteria

- Continue when each candidate preserves every named state, viewport, content extreme, and focus path while improving the stated quality bar.
- Stop or reconsider when a candidate changes player flow, obscures outcome or primary action, or requires an unowned art-direction choice.

## First proof

One original direction integrated into the greybox shell across success, failure, reward-overflow, retry, and controller-focus cases at both target viewports.

## Golden vertical slice

A human-selected result-screen direction with editable separated sources, runtime captures, input-visible focus, and independent product-quality review.

## Non-goals

- Changing scoring, reward values, retry behavior, or navigation.
- Selecting an art direction without a human producer decision.
- Treating a static mockup as runtime integration.

## Frozen decisions

- The player flow, platform, content extremes, and interaction semantics in `production/TASK.md` are fixed.
- The product-quality bar is polished premium indie UI: clear at a glance, cohesive, original, deliberate, and free of placeholder presentation.

## Maintenance ownership

Technical implementation owns shell integrity; human art direction owns direction selection; an independent reviewer owns subjective product-quality findings.
