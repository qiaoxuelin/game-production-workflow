[CmdletBinding()]
param(
    [string]$Repository = "qiaoxuelin/game-production-workflow",
    [string]$Ref = "main"
)

$ErrorActionPreference = "Stop"

$codexCommand = Get-Command codex.cmd -ErrorAction SilentlyContinue
if (-not $codexCommand) {
    $codexCommand = Get-Command codex -ErrorAction SilentlyContinue
}
if (-not $codexCommand) {
    throw "Codex CLI was not found. Install or open Codex before running this script."
}

$marketplaceName = "game-production-workflow"
$marketplaces = & $codexCommand.Source plugin marketplace list --json | ConvertFrom-Json
$alreadyConfigured = $marketplaces.marketplaces.name -contains $marketplaceName

if ($alreadyConfigured) {
    & $codexCommand.Source plugin marketplace upgrade $marketplaceName
} else {
    & $codexCommand.Source plugin marketplace add $Repository --ref $Ref
}

if ($LASTEXITCODE -ne 0) {
    throw "Marketplace setup failed. Confirm GitHub access and retry."
}

& $codexCommand.Source plugin add "game-production-system@$marketplaceName"
if ($LASTEXITCODE -ne 0) {
    throw "Installing game-production-system failed."
}

& $codexCommand.Source plugin add "game-approval-ui@$marketplaceName"
if ($LASTEXITCODE -ne 0) {
    throw "Installing game-approval-ui failed."
}

Write-Host "Installed both game-production plugins. Restart Codex and use a new task."
