# Standalone production execution

Use this reference after product/design boundaries are frozen and the user asks
to build, continue, implement, produce, integrate, or repair the current game
task. The Game Production System is the standalone lifecycle authority: it must
produce and verify game work even when no other Skill is installed.

## Entry contract

Enter production when all are true:

- the request authorizes implementation;
- the task is `Ready` or `Implementing`;
- required human-owned product, scope, platform, cost, and risk decisions are
  resolved;
- the next player-visible result and applicable acceptance are explicit.

Frozen design and an accepted direction are inputs, not invitations to create
another specification, plan, or approval. A missing reversible implementation
detail belongs in the bounded implementation handoff. Return to `Clarifying`
only when a genuinely human-owned boundary is absent or contradicted.

## Capability handshake

Before the first product mutation or when the environment changes:

1. Run `node scripts/doctor.mjs --project-root <root> --json` from the installed
   Skill when Node is available. Add `--require` only for capabilities the next
   slice actually needs.
2. Read `production/adapter.json` when present. Resolve the current host command
   first, then its `default` command.
3. Classify each needed capability as available, replaceable, installable with
   authorization, or blocking. Do not inventory unrelated tools.
4. Use base file editing, shell execution, engine primitives, code-native UI,
   and greybox assets as the standalone fallback. External Skills are optional;
   their absence never sends a healthy task back to planning.
5. When a capability is truly unavailable, keep completed work, record the
   exact missing command or authority, and switch to another authorized package
   or stop at a recoverable blocker. Never claim runtime or release proof that
   could not be observed.

Do not persist a full environment report. Record only a material constraint or
the adapter command needed to reproduce acceptance.

An adapter capability may remain a command string while it is only descriptive.
Before using `--require`, give it a verification object so the doctor distinguishes
configured from runnable instead of executing the production command itself:

```json
{
  "command": { "default": "node tools/capture.mjs" },
  "probe": { "type": "file", "path": "tools/capture.mjs" }
}
```

Use a `file` probe for project-local entry points or an `executable` probe with
an absolute path or bare PATH command in `value`. The doctor only resolves its
existence and executable bit; it never runs project-provided probe commands or
arguments. Only explicitly required capabilities are probed; all other
configured capabilities remain `available: null`.

## Production loop

Run one bounded loop at a time:

1. **Select:** choose the smallest next player-visible slice that retires a
   dominant product, interaction, assembly, integration, or runtime risk.
2. **Produce:** edit actual product code, scenes, data, content, source assets,
   audio, or project-native UI. A task/process document edit alone is not
   production.
3. **Integrate:** import or assemble the change immediately through the project
   adapter; do not defer integration until after a batch is complete.
4. **Observe:** run the cheapest relevant test, build, smoke, capture, listen,
   or target-device check and inspect the real output.
5. **Repair:** group findings by root cause and make one bounded repair. Do not
   polish unrelated findings before the observable slice works.
6. **Checkpoint:** preserve the product delta, command/result, failed criterion,
   and next action in the existing task/evidence budget.
7. **Continue or stop:** unlock the next slice when evidence advanced; invoke
   stop-loss after two same-root cycles without new evidence.

A healthy cycle yields at least one player-visible product delta, runnable
capability delta, falsifying result that changes the route, or removed root
blocker. Planning prose, status synchronization, approval bookkeeping, and
renamed candidates do not independently satisfy this rule.

Move `Ready` to `Implementing` when the first product source change or executable
product precheck begins. Update governance state at the same checkpoint, not as
a substitute for starting production.

## Returned-candidate convergence

When a Standard or Full representative candidate is returned, including when
stop-loss explicitly selects returning that candidate on its failed criterion,
keep the task `Implementing` and replace vague handoff prose with this positive
recipe in the existing task fields:

- `Result: Candidate returned — <failed criterion>; evidence: <observable evidence>`
- `Unresolved risks: <primary root cause>; retained: <passing parts>`
- `Next action: <one bounded executable repair>; verify: <command/artifact>`
- `Stop/replan triggers: <observable no-progress condition>; fallback: <next route>`

The production coordinator selects exactly one repair, replan,
enabling-capability, materially new candidate, or abandonment route with the
affected design or technical owner. The independent reviewer supplies the
failed criterion, evidence, retained proof, conditions for passage, and next
owner; review remains read-only. Do not add a `Returned` task state, recovery
document, approval, or duplicate plan. Fast work continues its direct
edit-check-recovery loop without this record.

If the fallback changes a frozen product, quality, scope, cost, platform, or
release boundary, request the owning human decision. Otherwise execute the
selected route without reopening planning or lowering the quality bar.

## Interactive visual execution

Do not treat a composed design image as an asset inventory or runtime UI. For
each representative slice, execute this causal chain:

**player action → interface state → required feedback/layer → asset family →
source/export/import boundary → assembly precheck → runtime proof**

1. Derive interface states from actual controls and game transitions, including
   applicable default, press/drag, success, failure, cancel, disabled, loading,
   recovery, viewport, content-extreme, and accessibility states.
2. For each state, name the authoritative game/UI state source, renderer,
   ownership/lifetime, input boundary, camera or coordinate space, layer and
   occlusion behavior, and visual feedback beat.
3. Establish one shared spatial master for elements that must appear co-located.
   Check perspective, scale, anchor, contact point, lighting direction, crop,
   occlusion, and safe area before accepting source candidates as one space.
4. Derive the required asset inventory from those states. Split asset families
   by shared master, variants, production method, runtime destination, and
   acceptance boundary; preserve interactive parts as separate sources.
5. Build the cheapest actual-size assembly or engine-greybox precheck before
   polished or bulk assets. It must expose input hit regions, layout, layering,
   state switching, source separation, and spatial contact.
6. Build one representative runtime slice on the target viewport/device. Bulk
   production unlocks only when the assembly precheck and runtime proof pass.

If the accepted direction lacks a reversible detail, use a visible placeholder
or greybox within its declared boundary and test it. Reopen product authority
only when the missing choice changes player rules, promised presentation,
scope, cost, platform, or another protected boundary.

## Optional external-Skill interoperability

External Skills are optional accelerators, never prerequisites or lifecycle
owners.

For `Ready` or `Implementing` work, do not invoke external discovery or planning Skills.
The existing canonical design and plan gates are already satisfied. Only bounded
technique Skills may run inside the selected production loop.

- A discovery or brainstorming Skill may help resolve an actually open product
  decision. If the task already contains an accepted frozen design, treat that
  gate as satisfied and do not regenerate or re-approve it.
- A planning Skill may help decompose Full multi-package work. It must write the
  executable route into the existing `production/TASK.md` or
  `production/PLAN.md`, not a parallel canonical plan.
- Coding, debugging, image, audio, browser, or computer-control Skills may
  execute a bounded technique inside the selected production loop. They do not
  change task state or acceptance authority.
- An approval UI transports a decision. It does not create an approval need.

When another installed workflow imposes an equivalent design, plan, test, or
review gate, satisfy it with the existing canonical artifact and recorded
decision. Invoke the technique at most once for the current boundary and resume
this production loop immediately afterward.

## Stop signs during production

These statements signal a demonstrated wrong route:

| Rationalization | Required route |
| --- | --- |
| **A renamed candidate is progress.** | Compare evidence against the same failed criterion; when it did not advance, invoke stop-loss without resetting the root cause. |
| **A composed image is the runtime UI or asset inventory.** | Execute the player-action-to-runtime chain, preserve independent state as separate sources, and prove assembly before bulk work. |
| **An external Skill is missing, so return to planning.** | Use an available or replaceable capability, base tools, engine primitives, or record the exact blocker; do not reopen a healthy Ready contract. |
| **Tests pass, so experience quality passed.** | Keep objective validity separate from runtime design conformance, product-quality judgment, and integrated acceptance. |

## Completion boundary

Do not close from documentation alone. Close through the main Skill only after
the promised product delta is integrated, applicable real-output checks pass,
evidence maps to a recoverable source checkpoint, and the required design,
producer, independent, or human authority has recorded its actual decision.
