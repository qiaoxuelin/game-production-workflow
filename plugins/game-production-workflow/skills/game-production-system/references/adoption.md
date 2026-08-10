# Existing-project adoption

## 1. Read-only audit

Inspect before writing:

- project roots, duplicate clients, prototypes, and generated directories;
- valid Git boundaries, including empty `.git` markers, parent-only
  repositories, and nested repositories;
- dirty state, build/test commands, platforms, engine, and release targets;
- current code and asset structure;
- product, technical, art, and QA documents;
- repeated design rules, formulas, content templates, and conflicting versions;
- recent screenshots, videos, builds, and player evidence;
- conflicting claims such as "complete" versus unmet external gates.

Do not change code or assets during the audit.

## 2. Baseline

Prefer a clean Git commit or tag. If no valid Git repository exists, report it
as a P0 governance gap and initialize or repair it only with user authorization.
Preserve unrelated changes.

Beyond G0, require at least one commit and require the governance files to be
tracked. A valid but commitless repository, or governance that exists only as
untracked files, is not a durable baseline.

Do not recreate complete history. Record the adoption date, current runnable
build, actual checks, known debt, and reference-only artifacts.

## 3. Truth mapping

Determine:

- canonical product and client;
- frozen prototypes and reference builds;
- current project track, business model, quality focus, and real gate;
- what is designed, implemented, functionally verified, visually approved,
  externally validated, and release-ready;
- unresolved platform, engine, art-direction, and repository-boundary decisions.
- which repeated design knowledge is adopted, candidate-only, or historical.

Use evidence, not prior completion language.

## 4. Governance installation

Run `scripts/bootstrap.ps1` without overwrite. Replace template content with
audited truth. Do not change business code or assets.

If a project-local `AGENTS.md` exists, merge rules carefully instead of
replacing it. Project-local rules take priority.

For multi-client or multi-repository projects, choose a version-controlled
governance root before G1. Declare `gitPolicy`, `components`,
`referenceClients`, and `sharedContracts` in `project.json`. The source of truth
must not live only in an unversioned parent directory.

Large builds and videos may remain outside Git; register their location, hash,
environment, and purpose.

Do not import every legacy design document as a module. Build the index from
current authority, repeated use, and evidence; retain the rest as cases/history.

## 5. Pilot tasks

Run four representative operations before declaring adoption stable:

1. small defect;
2. feature with clarification;
3. visual task with runtime evidence;
4. read-only gate review.

Remove redundant fields or steps after the pilot.
