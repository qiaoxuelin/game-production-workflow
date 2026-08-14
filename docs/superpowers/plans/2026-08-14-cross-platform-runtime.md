# Cross-platform production-tool runtime implementation plan

**Goal:** Remove macOS-specific runtime failures and document/test one portable installation and production-tool flow.

**Architecture:** PowerShell remains the public interface. A sibling Node.js helper performs deterministic PNG inspection with built-in modules, while PowerShell owns validation policy and evidence persistence. Repository-relative paths are serialized with `/` and normalized only at filesystem boundaries.

**Tech stack:** PowerShell 5.1/7, Node.js 18+, GitHub Actions.

### Task 1: Add failing runtime coverage

- Add `plugins/game-production-workflow/scripts/test-cross-platform-runtime.mjs`.
- Exercise real bootstrap, check, nested-file evidence, and screenshot evidence commands in temporary projects.
- Assert optional plan omission, helper copying, portable manifest paths, and successful PNG inspection.
- Run the test against the current implementation and record the expected failures.

### Task 2: Make governed-project tooling portable

- Add `image-inspect.mjs` beside the production PowerShell scripts.
- Normalize bootstrap template paths and copy the helper.
- Replace both `System.Drawing` call sites with the Node helper.
- Serialize new relative evidence locations with `/` while preserving backward-compatible reads.
- Run the targeted runtime test until green.

### Task 3: Separate OS installation guidance without duplicating workflows

- Add Node/Codex preflight checks to `install.ps1`.
- Document Windows, macOS, and Linux prerequisite installation separately in README.
- Keep a single install/update/verify command surface using PowerShell 7, with a tested Windows PowerShell 5.1 legacy command.

### Task 4: Automate the platform matrix

- Add a GitHub Actions verification matrix for Windows, macOS, and Linux PowerShell 7.
- Add a Windows PowerShell 5.1 compatibility job.
- Wire the runtime smoke into `verify.ps1`.

### Task 5: Release verification and existing-PR update

- Run targeted runtime tests, `verify.ps1 -CompareRef origin/main`, skill validators, and plugin validator.
- Update the plugin cachebuster with the plugin-creator helper.
- Commit and push the existing branch, update draft PR #1, and inspect its remote checks.
