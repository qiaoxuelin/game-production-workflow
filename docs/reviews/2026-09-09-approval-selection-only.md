# Selection-only approval card repair

Baseline: 07cf60e, plugin 1.8.0+codex.20260908065033.
User report: the approval card requires a remark as well as an option.

The emitted form listed decision and note, despite required containing only
decision. Backend note validation already accepted missing and empty values.
The host UI failure is user-reported; it was not reproduced by operating the
actual host UI in this maintenance run.

Hypothesis: removing the separate free-text form property makes the card
submittable by choice alone even for clients that demand every visible answer.
The schema regression failed on the original server: actual properties were
[decision, note], expected [decision].

Only the elicitation form changes. Optional note payloads, fallback recording,
stored decisions, and late responses retain their existing behavior.
Omitting a note never changes the selected option or grants extra passage.
The card no longer offers an inline note editor.

Validation covers approval, revision and deferral without note, persisted empty
notes, explicit empty notes, non-empty note preservation, and missing choice
remaining pending. Existing timeout, late response and reopen tests also run.
