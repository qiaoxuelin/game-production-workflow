# Repository instructions

## Skill evolution stability

These rules apply when changing files under
`plugins/game-production-workflow/skills/`. They govern maintenance of the
Skills; they are not runtime game-production instructions.

Keep the released behavior stable by default. Start from an observed failure
or measured burden, state one change hypothesis, and prefer the smallest change
that can falsify that hypothesis. Do not add Skill prose merely because a rule
sounds useful, and do not combine unrelated routing, authority, output, or
validation changes in one change set.

Classify the change before editing:

- **Patch** — repairs or clarifies an existing contract without changing its
  owner, route, authority, or artifact shape.
- **Extension** — adds a capability, route, artifact, or conditional behavior
  while preserving existing contracts.
- **Restructure** — adds, deletes, renames, or moves a `SKILL.md` or reference,
  or changes ownership, routing, authority, or always-loaded context. The
  highest applicable class governs.

For every Skill-source change:

1. Preserve the raw failing case or measurable baseline.
2. Change a behavior eval or executable `test-*.mjs` in the same change set.
3. Cover the intended case, a boundary case, and an off-route or prohibited
   case when the behavior could spread beyond its target.
4. Keep one hypothesis per pull request. Separate changes that need different
   evidence or rollback decisions.
5. Put mechanical repository rules in scripts or tests, not in runtime Skill
   prose.

A structural change also requires a changed Skill-specific design under
`docs/superpowers/specs/` and implementation plan under
`docs/superpowers/plans/`. The design must identify compatibility, migration,
contract ownership, and removed burden; the plan must preserve old behavior
until its replacement is verified. Bind the pair with the same lowercase slug
and classification in both documents:

```text
Skill evolution id: example-change
Skill evolution class: Restructure
```

After a structural release, observe at least two real production packages
before another restructure. During that window, accept only fixes for Critical,
Important, or execution-blocking findings. Record outcomes without changing the
shared Skill when evidence is project-specific or the current behavior did not
reproduce the reported failure.

Judge benefit with task outcomes, not document churn: time to first
representative proof, cycles repeating the same root cause, loaded-context and
durable-document burden, full regression/runtime evidence, and human correction
count. If the candidate does not improve the predeclared measure without a
regression, do not merge it.

Run `pwsh -NoProfile -File ./verify.ps1 -CompareRef <ref>` before handoff. The
repository checker enforces the minimum evidence co-change and structural
design/plan requirements; reviewers remain responsible for the classification,
evidence quality, observation window, and one-hypothesis boundary.
