# Cross-platform production-tool runtime design

## Goal

Make the governed-project bootstrap, contract check, and evidence registration behave the same on Windows, macOS, and Linux without creating separate per-OS workflows.

## Decisions

- Keep `install.ps1`, `bootstrap.ps1`, `check.ps1`, and `evidence.ps1` as the single public command surface.
- Require PowerShell 7 for macOS and Linux. Recommend PowerShell 7 on Windows while retaining Windows PowerShell 5.1 compatibility as a tested legacy path.
- Replace `System.Drawing` image access with one dependency-free Node.js PNG inspector copied into each governed project. Screenshot evidence is PNG-only so validation is deterministic across systems.
- Store repository-relative manifest locations with `/`; accept either separator while reading older manifests.
- Normalize template-relative paths before optional-file decisions so `production/PLAN.md` remains opt-in on every OS.
- Keep dependency installation out of `install.ps1`. It performs actionable preflight checks; README owns OS-specific installation commands.
- Run the real bootstrap → check → ordinary evidence → screenshot evidence flow in automated tests, and execute verification on Windows, macOS, and Linux.

## Compatibility and burden controls

- No macOS-only `sips`, Windows-only drawing API, or duplicated `install-mac`/`install-windows` scripts.
- Existing evidence entries remain readable. If an older non-PNG screenshot cannot be inspected, `check.ps1` reports the existing dimensions-unavailable warning rather than corrupting or rejecting history.
- The new helper uses only Node.js built-ins; Node.js 18+ is already required by the approval MCP.
- Governance, approval, and game-production gates do not change. This patch changes only portability, runtime verification, and installation guidance.

## Acceptance

- On macOS, bootstrap omits `production/PLAN.md`, copies all three production tools, and both evidence paths use `/` in the manifest.
- A generated non-uniform PNG can be registered as screenshot evidence without `System.Drawing`, and a later check validates its dimensions.
- The same runtime smoke runs under PowerShell 7 on Windows, macOS, and Linux; Windows PowerShell 5.1 remains separately verified.
- Full repository, plugin, and skill validation passes before the existing draft PR is updated.
