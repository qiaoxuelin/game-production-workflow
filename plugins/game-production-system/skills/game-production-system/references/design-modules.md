# Design modules

Use modules for reusable design decisions, not for every document or one-off
solution. A module may cover level grammar, mechanics, balance, progression,
economy, onboarding, content pacing, UX/feedback, visual systems, or another
stable design domain.

## Decide whether to create one

Require a clear boundary, stable input/output, owner, and validation method.
Then propose a candidate when any applies:

- the same decision recurs three times;
- two or more features/content units will reuse it;
- inconsistency creates material rework or gate risk;
- bulk content production is about to begin;
- a stable formula, configuration skeleton, or method now exists.

Keep unstable exploration and isolated exceptions as cases. Do not block a task
merely because no module exists.

## Roles

- Production coordination detects reuse and routes the decision.
- Design/experience owns intent, invariants, knobs, presets, and failure modes.
- Technical/implementation confirms configurability, dependencies, tests, and
  migration impact.
- Independent review or player/data evidence validates the claimed result.
- The human producer approves an `adopted` default or a breaking replacement.

These are task perspectives. Do not create permanent agents solely for module
maintenance.

## Lifecycle

Use:

```text
case-only -> candidate -> validated -> adopted -> deprecated
```

AI may create `case-only` records or draft a `candidate`. It may recommend
promotion. It must not mark a module `adopted` without an explicit human
decision recorded in the registry.

## Required module content

Each module must state:

- ID, semantic version, status, scope, owner, and dependencies;
- player/design intent and applicability;
- invariants and protected behavior;
- the applicable completeness model for enumerable entities, states, paths,
  branches, dependencies, or budgets, plus its static/manual validator;
- knobs, formulas, units, ranges, and interaction effects as applicable;
- reusable presets or authoring skeletons;
- failure modes, anti-patterns, and non-goals;
- validation method, evidence IDs, and known cases;
- downstream impact and migration rule.

Store machine-readable formulas/configuration beside the module when they are
meant to be reused directly.
Copy `assets/design-module-template/MODULE.md` from the installed Skill only
when a module is actually created.

## Task use

At task start:

1. Identify design domains.
2. Read `design/modules/index.json`.
3. Reuse exact adopted/validated versions when applicable.
4. Record deviations as explicit decisions.

At task close choose exactly one module-harvest result:

- `No change`
- `Case only`
- `Candidate`
- `Updated`
- `Deprecated`

Only load module files referenced by the task. Do not read the entire design
library on every conversation.
