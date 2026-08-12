# Audio production

Use this workflow when a task creates or materially changes player-facing
sound effects, ambience, voice, or music.

## Freeze intent before sourcing

Define only what implementation needs:

- cue/event and player-facing purpose;
- required material or emotional identity;
- trigger, state, duration/loop, priority, concurrency, ducking, and variation;
- reference traits and allowed deviation;
- candidate maturity: direction, production-ready source, runtime golden, or
  integrated acceptance;
- runtime scene and device used for listening acceptance.

For reference replication, reproduce functional and perceptual traits with
independently licensed or created audio. Do not extract or copy the reference
product's recordings unless the user supplies the necessary rights.

## Default sourcing route

- Use rights-cleared stock recordings as the default production source for SFX.
  Prefer project-owned recordings, CC0 assets, or commercial libraries with
  clear game-synchronization rights. Check each asset's license; a platform
  containing some free assets does not make every asset commercial-use safe.
- Use a commercial-use-authorized generation service, such as a SONA-style
  service, to create BGM candidates. Record the service, account/license tier,
  generation date, applicable terms, and output provenance. Keep unclear-rights
  outputs as experiments only.
- Use local generative audio or custom recording only when the stock route
  cannot satisfy a frozen cue, or when doing so is cheaper than continued
  search and editing.

Keep downloads, stems, and rejected generations in task-owned scratch space.
Promote only selected assets and the provenance record into the project.

## Integrate before judging

- Audition a small representative cue set in the actual gameplay scene before
  sourcing the complete audio list.
- For repeating SFX, use suitable alternate recordings or controlled
  pitch/gain variation. Layer transient, body, tail, and ambience only when the
  cue needs them; do not add layers as ceremony.
- For BGM, generate a small candidate set, select against the game scene, then
  trim, fade, loop, normalize, and configure ducking. Judge mood, repetition,
  fatigue, and competition with critical feedback.
- Preserve source files and license records outside runtime folders; export
  only engine-ready assets into the game.

## Accept by separate claims

Objective verification may confirm format, sample rate, channel layout, loop
seam, clipping/headroom, file size, trigger routing, concurrency, ducking, and
provenance.

The audio design owner listens in runtime and accepts or returns material
identity, hierarchy, variation, music fit, fatigue, and mix. The producer judges
the integrated player experience when applicable. Meters, logs, automated tests,
or the presence of an audio track cannot replace either listening judgment.

Return audio that is materially wrong, harsh, cheap or monotonously synthetic,
masks critical feedback, loops obviously, or depends on loudness to imply
impact. For gate-critical or repeatedly returned audio, use the independent
procedure in [experience-review.md](experience-review.md); first compare the
runtime result with the frozen reference traits, then inspect technical reports.

If two consecutive candidates fail the same audible criterion without new
evidence, stop tuning the same source or synthesis route. Change the source,
layering strategy, or production route, then submit one new representative
runtime sample.
