[CmdletBinding()]
param(
    [string]$Repository = "qiaoxuelin/game-production-workflow",
    [string]$Ref = "main",
    [switch]$KeepLegacyPlugins
)

$ErrorActionPreference = "Stop"

$gitCommand = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCommand) {
    throw "Git was not found. Install it using the operating-system instructions in README.md, then retry."
}

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
    throw "Node.js 18+ was not found. Install it using the operating-system instructions in README.md, then retry."
}
$nodeVersionOutput = @(& $nodeCommand.Source --version 2>$null)
if ($LASTEXITCODE -ne 0) {
    throw "Node.js was found but its version could not be read."
}
$nodeVersionMatch = [Regex]::Match(
    [string]($nodeVersionOutput | Select-Object -Last 1),
    '^v?(?<major>\d+)(?:\.\d+){1,2}'
)
if (-not $nodeVersionMatch.Success -or [int]$nodeVersionMatch.Groups['major'].Value -lt 18) {
    throw "Node.js 18+ is required; found $($nodeVersionOutput | Select-Object -Last 1)."
}

$codexCommand = Get-Command codex.cmd -ErrorAction SilentlyContinue
if (-not $codexCommand) {
    $codexCommand = Get-Command codex -ErrorAction SilentlyContinue
}
if (-not $codexCommand) {
    throw "Codex CLI was not found. Install or open Codex before running this script."
}

$marketplaceName = "game-production-workflow"

if (-not $KeepLegacyPlugins) {
    $pluginList = & $codexCommand.Source plugin list --json | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) {
        throw "Could not inspect installed plugins before migration."
    }

    $legacyPlugins = @(
        $pluginList.installed |
            Where-Object { $_.name -in @("game-production-system", "game-approval-ui") }
    )
    foreach ($legacy in $legacyPlugins) {
        Write-Host "Removing legacy installation $($legacy.pluginId); its source files are not deleted."
        & $codexCommand.Source plugin remove $legacy.pluginId
        if ($LASTEXITCODE -ne 0) {
            throw "Removing legacy plugin $($legacy.pluginId) failed."
        }
    }
}

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

& $codexCommand.Source plugin add "game-production-workflow@$marketplaceName"
if ($LASTEXITCODE -ne 0) {
    throw "Installing game-production-workflow failed."
}

$installed = & $codexCommand.Source plugin list --json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) {
    throw "Could not verify the installed plugin."
}
$combined = @($installed.installed | Where-Object { $_.name -eq "game-production-workflow" })
if ($combined.Count -ne 1 -or -not $combined[0].enabled) {
    throw "game-production-workflow is not installed and enabled exactly once."
}

$standaloneSkill = Join-Path ([Environment]::GetFolderPath("UserProfile")) ".codex\skills\game-production-system"
if (Test-Path -LiteralPath $standaloneSkill) {
    Write-Warning "A standalone game-production-system skill still exists at $standaloneSkill. Archive or remove that old copy before restarting Codex to avoid duplicate sources."
}

Write-Host "Installed game-production-workflow with both skills and the approval UI. Restart Codex and use a new task."
