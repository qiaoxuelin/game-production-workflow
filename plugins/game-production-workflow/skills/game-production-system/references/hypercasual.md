# Hypercasual creative-first incubation

Use this reference only when `validationMode` is `creative_first`.

## Contents

1. Classification
2. G0 clarification
3. Roles
4. Validation order
5. Structured UA evidence
6. Integrity rules

## Classification

Require:

```yaml
projectTrack: mobile_game
businessModel: iaa | hybrid
validationMode: creative_first
```

Use `product_first` for ordinary mobile development and for hybrid-casual games
whose economy, progression, or content depth is the primary early risk.

## G0 clarification

Resolve:

- market and player hypothesis;
- target regions and test channels;
- playable promise and ad-to-game truth boundary;
- three to five original creative angles;
- first-session length and monetization placement;
- test budget and data owner;
- CPI/IPM/retention stop, revise, and scale lines;
- asset provenance and explicit no-copy constraints;
- ownership if the concept passes.

Do not infer benchmark thresholds. Record the producer-approved values and the
date/source used.

## Roles

Keep the four core perspectives. Bring these specialisms into G0/G1 when the
risk exists:

- creative producer or UA;
- data review;
- rapid-prototype implementation;
- creative art/video.

UA/data review must be independent from the person claiming the creative passed.

## Validation order

### G1 - Creative signal

Require:

- at least three original `creative` evidence entries;
- one independent passing review;
- one passing provenance record;
- clear comprehension in the first two to five seconds;
- a continue, revise, or stop recommendation.

The gate becomes ready only after the human producer records the explicit G1
continue/revise/stop decision.

Animatics may be low-cost. They must not misrepresent unavailable gameplay as a
shipping feature.

### G2 - Ad-to-game slice

Require:

- one passing build;
- a recordable first-session loop;
- passing runtime video;
- one passing creative contract linking the advertisement to actual gameplay;
- internal player evidence;
- target-device performance and independent review.

Do not scale content merely because one advertisement looks attractive.

### G3 - Small-budget market test

Require:

- structured passing `ua_test` evidence;
- external player/market evidence;
- provenance, compliance, packaging, rollback, and release ownership;
- explicit stop, revise, or scale decision.

Treat unchanged or weak market signal as expected evidence, not as a reason to
silently change thresholds after the test.

## Structured UA evidence

Register `ua_test` with `-MetricsJson`. Require:

- `region`
- `spend`
- `currency`
- `impressions`
- `installs`
- `cpi`
- `ipm`
- `d1Retention`

CTR, D3/D7 retention, playtime, ad ARPDAU, LTV, and creative-fatigue data are
optional additions when the test can support them.

Use non-negative numeric values, whole-number impressions/installs, and a
`d1Retention` ratio from `0` to `1`.

## Integrity rules

- Copy psychological structure, not third-party assets or distinctive
  expression.
- Record AI model/tool, source inputs, edits, license, and reviewer.
- Keep the playable product consistent with acquisition claims.
- Record invalid traffic, attribution gaps, sample size, and confidence limits.
- Never approve paid acquisition or threshold changes without human authority.
