# Game Production System 1.7.2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Release a behavior-tested 1.7.2 policy that prevents Fast UI repairs from entering GUI-restoration ceremony and makes direct production routing easier to follow.

**Architecture:** Preserve the single bundled production Skill, existing task schema, checker, and reference paths. Add one checker invariant and its regression fixture, then add a compact operation router, evidence-derived red flags, and a development-only evaluation corpus. Reduce only duplicated prose that has an unchanged authoritative contract elsewhere.

**Tech Stack:** Markdown Skill/reference files, PowerShell contract checker, Node.js assertion tests, JSON evaluation fixtures.

## Global Constraints

- Do not add task fields, states, approval layers, or external-Skill requirements.
- Keep `workflow.md` and existing headings/anchors compatible.
- Keep `SKILL.md` at or below 500 lines and reduce, rather than increase, its word count.
- Preserve 1.7.0 and 1.7.1 project compatibility.
- Use `apply_patch` for tracked-file edits.
- Run the focused RED test before policy implementation and the full verifier before completion.

---

### Task 1: Fast GUI-restoration policy invariant

**Files:**
- Modify: `plugins/game-production-workflow/scripts/test-convergence-policy.mjs`
- Modify: `plugins/game-production-workflow/skills/game-production-system/scripts/check.ps1`
- Modify: `plugins/game-production-workflow/skills/game-production-system/references/workflow.md`
- Modify: `plugins/game-production-workflow/skills/game-production-system/assets/project-template/AGENTS.md`

**Interfaces:**
- Consumes: existing `Execution lane` and `GUI restoration` task fields.
- Produces: checker issue code `gui_restoration_fast_lane_conflict` for `Fast + Required`; documented conditional scope for restoration.

- [ ] **Step 1: Write the failing regression fixture**

Extend the convergence test's temporary project flow with a Fast task whose
`GUI restoration` is `Required`, run Task mode, and assert the new issue code is
present. Add the paired case with `Not applicable` and assert it is absent.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node plugins/game-production-workflow/scripts/test-convergence-policy.mjs
```

Expected: failure because `gui_restoration_fast_lane_conflict` is not emitted.

- [ ] **Step 3: Implement the minimal checker rule**

After `GUI restoration` is parsed, add an error when the lane is Fast and the
field is Required. Do not infer UI scope from filenames or acceptance prose.

- [ ] **Step 4: Rewrite the workflow predicate positively**

State when restoration is Required and when a baseline-reusing Fast repair is
Not applicable. Mirror the same stable project rule in the project AGENTS
template without adding a reviewer requirement to Fast.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the convergence and production-policy tests. Expected: both pass.

---

### Task 2: Operation router and recurring red flags

**Files:**
- Modify: `plugins/game-production-workflow/skills/game-production-system/SKILL.md`
- Modify: `plugins/game-production-workflow/skills/game-production-system/references/execution.md`
- Modify: `plugins/game-production-workflow/scripts/test-production-policy.mjs`

**Interfaces:**
- Consumes: existing intent classes and operation references.
- Produces: a compact intent/reference/result router and four positive recovery routes.

- [ ] **Step 1: Add failing structural assertions**

Assert that the core contains the six operation intents and that execution
contains the four demonstrated rationalizations plus their existing positive
routes. Also assert that the core word count does not increase from the 1.7.1
baseline of 4,159 words.

- [ ] **Step 2: Run the policy test and verify RED**

Run:

```bash
node plugins/game-production-workflow/scripts/test-production-policy.mjs
```

Expected: failure because the router/red-flag contracts are absent.

- [ ] **Step 3: Add the smallest router and red-flag table**

Place the router before detailed lane policy. Put red flags in `execution.md`,
where they are loaded for actual production, rather than in every game task.

- [ ] **Step 4: Remove equivalent repeated prose**

Delete or compress duplicated wording in the core so both the line and word
budgets improve. Keep human authority, false-completion, provenance, and
bulk-before-proof prohibitions intact.

- [ ] **Step 5: Run the policy test and verify GREEN**

Expected: the new assertions and all prior assertions pass.

---

### Task 3: Development-only behavior evaluation corpus

**Files:**
- Create: `plugins/game-production-workflow/evals/game-production-system.json`
- Create: `plugins/game-production-workflow/scripts/test-skill-evals.mjs`
- Modify: `verify.ps1`

**Interfaces:**
- Produces: JSON object `{schemaVersion, skill, scenarios[]}` with stable scenario IDs and a deterministic schema validator.
- Consumes: no runtime game-project state; the corpus is development-only.

- [ ] **Step 1: Write the failing evaluator test**

Create the validator first. It requires at least the scenarios
`fast-gui-repair`, `missing-visual-capability`, `same-root-return`,
`approval-timeout`, and `composite-is-not-runtime-ui`, with non-empty pressures,
required actions, prohibited actions, and terminal claims.

- [ ] **Step 2: Run it and verify RED**

Run:

```bash
node plugins/game-production-workflow/scripts/test-skill-evals.mjs
```

Expected: failure because the corpus file does not yet exist.

- [ ] **Step 3: Add the minimal corpus**

Encode only repository-neutral prompts and observable outcomes. Do not include
the desired reasoning or prose answer in the request field.

- [ ] **Step 4: Add the evaluator to `verify.ps1` and verify GREEN**

Run the evaluator directly, then `pwsh -NoProfile -File ./verify.ps1`.

- [ ] **Step 5: Forward-test representative scenarios**

Use fresh-context agents where available. Pass the candidate Skill and raw
scenario, not the diagnosis. Compare the outputs to the rubric and retain only
findings, not generated task artifacts.

---

### Task 4: Compatible version and documentation update

**Files:**
- Modify: `plugins/game-production-workflow/.codex-plugin/plugin.json`
- Modify: `.agents/plugins/marketplace.json`
- Modify: `plugins/game-production-workflow/skills/game-production-system/scripts/check.ps1`
- Modify: `plugins/game-production-workflow/skills/game-production-system/scripts/bootstrap.ps1`
- Modify: `plugins/game-production-workflow/scripts/test-production-policy.mjs`
- Modify: `README.md`

**Interfaces:**
- Produces: aligned public/plugin/policy/bootstrap version 1.7.2 with a new cachebuster.

- [ ] **Step 1: Update version assertions first**

Change test expectations to 1.7.2 and run the policy test. Expected: RED on
current 1.7.1 metadata.

- [ ] **Step 2: Update all version surfaces**

Set the plugin base, checker policy, bootstrap contract, marketplace entry, and
README to 1.7.2. Generate a fresh UTC cachebuster using the repository's
existing `+codex.<timestamp>` format.

- [ ] **Step 3: Run focused version validation**

Run the policy test and `pwsh -NoProfile -File ./verify.ps1 -CompareRef origin/main`.

---

### Task 5: Final verification and integration readiness

**Files:**
- Review all changed files.

**Interfaces:**
- Produces: one verified commit and a merge-ready branch; no remote mutation without the user's existing authorization and passing final review.

- [ ] **Step 1: Inspect scope and formatting**

Run:

```bash
git diff --check
git diff --stat origin/main
git status --short
```

- [ ] **Step 2: Run the complete verifier fresh**

Run:

```bash
pwsh -NoProfile -File ./verify.ps1 -CompareRef origin/main
```

- [ ] **Step 3: Review behavior and specification coverage**

Confirm the Fast/GUI conflict, router, red flags, eval corpus, compatibility,
and non-goals against the design document. Request an independent review of
the final diff and repair only evidence-backed findings.

- [ ] **Step 4: Commit intentionally**

Stage the scoped files and commit with:

```bash
git commit -m "feat: tighten game production behavior routing"
```
