# UI Interaction Design Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make material game UI interaction behavior an explicit Design output that Produce consumes and Review verifies.

**Architecture:** Keep the core task contract and execution lanes unchanged. Add the minimum behavior-shaping language to the three operation-specific art references, with executable regression assertions and independent pressure evaluation; update only the plugin cachebuster required by repository packaging policy.

**Tech Stack:** Markdown Skills, Node.js assertion harness, PowerShell repository verifier, plugin-creator and skill-creator validators.

## Global Constraints

- Add no Skill, role, approval, lifecycle state, TASK field, required authoring tool, or marketplace change.
- Fast work that reuses an accepted interaction/render baseline remains excluded.
- UI Design consumes authoritative gameplay semantics and cannot invent state changes.
- Static prototypes never count as target-project runtime evidence.
- Preserve all route word-count budgets and current maturity/authority rules.

---

### Task 1: Lock the interaction-design behavior

**Files:**
- Modify: `plugins/game-production-workflow/scripts/test-game-art-production.mjs`

**Interfaces:**
- Consumes: existing Design/Produce/Review reference texts and route word-count formulas.
- Produces: regressions for the interaction-to-visual design chain, scope controls, production consumption boundary, and review coverage.

- [x] **Step 1: Run three fresh-context baseline pressure scenarios**

Use the current Skill on a selected controller-first UI direction that has polished static states but lacks navigation, timing, recovery, and an interaction prototype. Record whether the agents recommend freeze, leave interaction design to Produce, or retain Design ownership.

- [x] **Step 2: Add the failing contract assertions**

Assert that Design requires the complete input/authoritative-state/presentation/feedback/recovery chain, an inspectable behavior representation, and a static-proof limitation; Produce must consume the frozen mapping and return missing product boundaries; Review must inspect navigation, timing/interruption, recovery, and real causality. Assert Fast reuse and core authority remain unchanged.

- [x] **Step 3: Run the focused test and verify RED**

Run: `node plugins/game-production-workflow/scripts/test-game-art-production.mjs`

Expected: FAIL at the first missing interaction-design contract assertion.

### Task 2: Implement the minimum operation-boundary change

**Files:**
- Modify: `plugins/game-production-workflow/skills/game-art-production/references/visual-design.md`
- Modify: `plugins/game-production-workflow/skills/game-art-production/references/interactive-ui-2d.md`
- Modify: `plugins/game-production-workflow/skills/game-art-production/references/visual-review.md`

**Interfaces:**
- Consumes: core-owned authoritative semantics, frozen `Interaction/render contract`, selected Direction, viewports, evidence and authority boundaries.
- Produces: a Proposed Production-design candidate, an implementation handoff, and read-only interaction-conformance evidence.

- [x] **Step 1: Add the Design interaction-to-visual contract**

Require only scoped critical paths and dominant-risk extremes; cover applicable input/focus/navigation, state transitions, feedback/motion/timing/interruption, failure/recovery, content/viewports, source boundaries, and required runtime proof. Permit one consolidated artifact or bounded prototype and reject static-only completion.

- [x] **Step 2: Change Produce from discovery to consumption**

Require Produce to validate and consume the frozen mapping, return missing or contradictory product interaction decisions, implement through real input and authoritative state, and record expected-versus-observed conformance without silently redesigning behavior.

- [x] **Step 3: Expand Review interaction conformance**

Require actual observation of applicable focus/navigation, timing/interruption, state continuity, failure/recovery, and input-to-state-to-feedback causality while preserving read-only and authority boundaries.

- [x] **Step 4: Run focused tests and verify GREEN**

Run: `node plugins/game-production-workflow/scripts/test-game-art-production.mjs`

Expected: PASS and all route budgets remain within limits.

- [x] **Step 5: Repeat the fresh-context pressure scenario with the updated Skill**

Expected: the agent retains Design ownership, refuses a static-only freeze recommendation, identifies the bounded missing interaction artifacts, and prevents Produce from inventing product interaction behavior.

### Task 3: Package and verify the update

**Files:**
- Modify: `plugins/game-production-workflow/.codex-plugin/plugin.json`

**Interfaces:**
- Consumes: validated changed plugin content.
- Produces: a fresh `1.8.0+codex.<timestamp>` cachebuster without changing the base version.

- [x] **Step 1: Refresh the cachebuster with the plugin-creator helper**

Run: `python3 /Users/qxl/.codex/skills/.system/plugin-creator/scripts/update_plugin_cachebuster.py plugins/game-production-workflow`

- [x] **Step 2: Run focused policy and convergence tests**

Run:

```bash
node plugins/game-production-workflow/scripts/test-game-art-production.mjs
node plugins/game-production-workflow/scripts/test-production-policy.mjs
node plugins/game-production-workflow/scripts/test-skill-evals.mjs
node plugins/game-production-workflow/scripts/test-convergence-policy.mjs
```

- [x] **Step 3: Run full repository verification**

Run: `pwsh -NoProfile -File ./verify.ps1 -CompareRef origin/main`

- [x] **Step 4: Run plugin and Skill validation**

Run the plugin-creator validator on `plugins/game-production-workflow` and skill-creator `quick_validate.py` on all three bundled Skills using a disposable dependency environment if needed.

- [x] **Step 5: Review scope and compatibility**

Confirm `git diff --check`, route budgets, Fast exclusion, no core/schema/installer/marketplace changes, and no installed-plugin changes.

- [x] **Step 6: Commit the bounded change**

Commit the approved contract, behavior scenarios/regressions, plan record, and cachebuster without changing core schema, roles, gates, installer behavior, or marketplace state.
