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

## Verified delivery

- Source 2f9a798 passed full verify.ps1 -CompareRef 07cf60e in the clean
  owned clone under .tmp/approval-note/verified-source.
- Official plugin validation and git diff --check passed.
- Local installation version: 1.8.0+codex.20260909075455.
- Source and installed cache: 80 files each, zero SHA-256 differences.
- Full verification log SHA-256: 57eb5b86e9c0095a557fb002c38f38635ffe3a7d963f9fb23af3736655a62aec.
- The protocol form now contains only decision; no UI free-text property.
  Actual host UI interaction remains to be confirmed after opening a new
  thread and reopening the card. Already-open cards retain their old schema.
