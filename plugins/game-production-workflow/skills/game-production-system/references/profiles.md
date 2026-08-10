# Project tracks and quality focus

Do not create separate production systems for each genre. Select one project
track, one business model, one validation mode, and one or more quality-focus
tags. The shared task, role, evidence, and handoff model remains unchanged.

## Contents

1. Project tracks
2. Business models
3. Validation modes
4. Quality-focus tags
5. Classification changes

## 1. Project tracks

### `indie_game`

Use for premium or self-published desktop/console games whose main risk is
whether a complete experience is distinctive enough to buy, recommend, or
wishlist.

Additional requirements:

- keyboard/mouse and controller behavior as scoped;
- save/load and upgrade compatibility;
- target-window composition and long-session comfort;
- localization and accessibility boundaries;
- a store-page-ready golden slice and honest trailer capture;
- clean build, demo packaging, crash recovery, and ownership after launch.

G1 must prove the primary player promise. G2 must feel like a small finished
piece of the actual product, not a dashboard around unfinished gameplay.

### `mobile_game`

Use for Android/iOS games regardless of monetization.

Additional requirements:

- touch targets, gestures, safe areas, orientation, and interruption recovery;
- a declared device matrix with resolution, memory, GPU, thermal, and OS limits;
- package size, cold start, frame pacing, memory, crash/ANR, and battery evidence;
- weak/offline behavior where applicable;
- analytics events and consent boundaries;
- SDK, privacy, age-rating, permission, and store-policy ownership.

G1 must prove the first-session loop on at least one target device class. G2
must include representative low/mid/high device evidence as scoped.

## 2. Business models

Select one:

- `premium`: purchase/demo value, store conversion, refund-risk, and content
  completeness matter most.
- `f2p`: economy, onboarding, retention, payment recovery, offers, and live
  configuration require explicit contracts.
- `iaa`: ad placement, frequency caps, rewarded value, first-session pacing,
  creative variants, attribution, and CPI/retention stop lines are required.
- `hybrid`: satisfy both purchase and advertising constraints; record priority
  when they conflict.
- `undecided`: allowed only in G0. The project cannot advance to G1 until the
  commercial model is explicitly chosen or waived by the human producer.

## 3. Validation modes

- `product_first`: default. Prove the player experience before market scale.
- `creative_first`: use only for `mobile_game` with `iaa` or `hybrid` when
  acquisition creative is the primary early risk. Read
  [hypercasual.md](hypercasual.md).

Changing validation mode is a G0 decision.

## 4. Quality-focus tags

Tags add evidence requirements; they do not replace the project track.

### `mechanics`

- deterministic or fixed scenarios where relevant;
- dead-state/no-solution checks;
- first-player comprehension evidence;
- explicit keep/change/kill decision before content scale-up.

### `visual`

- an approved style frame and in-engine golden scene;
- target-size crops, motion timing, and readability evidence;
- layered/animatable source plan and provenance;
- runtime consistency across actual gameplay states.

Do not approve source art or mockups without runtime evidence.

### `content`

- a representative content pipeline;
- pacing, repetition, dependency, localization, and save-version checks;
- cost-per-unit estimate and stop rule before bulk production.

### `liveops`

- remote configuration and rollback;
- calendar, segmentation, economy, customer-support, and incident ownership;
- observability and post-launch decision thresholds.

## 5. Classification changes

Changing project track, business model, or validation mode is a G0 decision.
Record:

- why the old classification no longer fits;
- what work is frozen or becomes reference-only;
- which contracts and evidence are invalidated;
- which gate must be repeated.

Adding a quality-focus tag may happen later, but its unmet evidence blocks the
next gate.
