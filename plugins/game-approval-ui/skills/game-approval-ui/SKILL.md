---
name: game-approval-ui
description: Present structured game-production approvals as selectable UI when supported, queue approvals during offline stewardship, list pending decisions, and persist explicit human choices in governed game repositories. Use for visual, design, gate, business, migration, waiver, release, or other game-project decisions that should not require copied approval prose.
---

# Game Approval UI

Use the bundled approval tools with repositories governed by
`game-production-system`.

## Request a decision

1. Prepare 2-3 mutually exclusive options with short impact statements.
2. Put the recommended option first.
3. Mark passage-granting options only when their raw label explicitly says
   approve, accept, adopt, pass, or continue. In Chinese prefer `采用：...`;
   never expose English control words such as `Accept:` to the user.
4. Before showing choices in prose, resolve and call `request_approval` with
   `interactive: true` when the user is present.
5. During offline stewardship, call it with `interactive: false` and continue
   useful non-dependent work.

### Card copy contract

The card is a decision surface, not a project document or a substitute for
clarification.

- Open it only when the user has enough context to choose. Explain unfamiliar
  context first; do not place a broad requirements interview inside one card.
- Keep the title short and omit `P1`, `G1`, task IDs, evidence counts, paths,
  role names, and other internal bookkeeping from visible copy.
- Write one plain-language question. Do not repeat it in the title or scope.
- Write scope as one short boundary sentence: what this choice decides and the
  most important thing it does not decide.
- Make every option label understandable on its own, because clients may render
  only the label. State the actual alternative, not an internal action verb.
- Keep each impact to one sentence describing the main consequence or tradeoff.
  Do not repeat the label.
- Prefer everyday Chinese and concrete outcomes. Avoid unexplained production
  terms such as `首季架构`, `验证段`, `门禁`, or `冻结`.

The tool may be deferred even when this Skill is visible. Do not treat absence
from the initial tool list or a generic search miss as UI unavailability. In
Codex code mode, inspect `ALL_TOOLS` for the exact name
`mcp__game_approval_ui__request_approval` and invoke it there when necessary.

Present the returned numbered fallback only after an actual tool call reports
`interaction: unsupported` or `interaction: failed`. Accept a reply such as
`1`, then call `record_approval_decision`. Never generate a numbered approval
list before trying the tool, and never require copied approval prose.

## Resume pending decisions

Treat the card session and approval lifetime separately. A card-session expiry
ends the synchronous wait but never rejects, decides, or deletes the approval.

- On a new user or tool signal, first read the stored approval. If it was
  decided by a late card response, consume that decision without asking again.
- Otherwise call `list_approvals`, then `review_approval` for one relevant
  pending item at a time. Do not combine or reopen unrelated decisions.
- After `interaction: expired`, save the exact approval id and recovery point,
  then end the turn or continue only independent authorized work. Do not poll
  or immediately reopen it without a new signal.
- Do not promise that an expired card will wake an already-finished task. The
  server may still persist a late click while it remains connected, but task
  continuation happens on the next project activation.

## Decision integrity

- Treat only an explicit accepted option as the human decision.
- Read the complete returned decision. A non-empty `decision.note` is part of
  the effective human decision, not incidental metadata.
- Use the note to refine the selected option. If they conflict, the note
  controls the specific detail but never turns a non-passage option into
  approval. Ask only when the combined meaning is materially ambiguous.
- A declined, cancelled, timed-out, or deferred interaction remains pending or
  deferred; it does not grant passage.
- After a decision, briefly restate the combined effective decision and
  synchronize the project files required by `game-production-system`. Never
  report guidance as missing when a non-empty note supplies it.
- Do not use filesystem, network, command, or connector permission prompts as
  substitutes for game-production approval.
- Do not expose secrets or private file contents in approval messages. Refer to
  exact artifact paths or evidence IDs instead.
