[CmdletBinding()]
param(
    [string]$Repository = "qiaoxuelin/game-production-workflow",
    [string]$Ref = "main",
    [switch]$KeepLegacyPlugins
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
