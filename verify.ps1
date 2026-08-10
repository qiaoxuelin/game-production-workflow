[CmdletBinding()]
param(
    [string]$CompareRef
)

$ErrorActionPreference = "Stop"
$repo = $PSScriptRoot
$pluginRelative = "plugins/game-production-workflow"
$plugin = Join-Path $repo $pluginRelative
$manifestPath = Join-Path $plugin ".codex-plugin/plugin.json"
$marketplacePath = Join-Path $repo ".agents/plugins/marketplace.json"
$coreSkillPath = Join-Path $plugin "skills/game-production-system/SKILL.md"
$approvalSkillPath = Join-Path $plugin "skills/game-approval-ui/SKILL.md"
$checkerPath = Join-Path $plugin "skills/game-production-system/scripts/check.ps1"
$mcpPath = Join-Path $plugin ".mcp.json"
$approvalTestPath = Join-Path $plugin "scripts/test-server.mjs"

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

foreach ($required in @(
    $manifestPath,
    $marketplacePath,
    $coreSkillPath,
    $approvalSkillPath,
    $checkerPath,
    $mcpPath,
    $approvalTestPath
)) {
    Assert-True (Test-Path -LiteralPath $required -PathType Leaf) "Missing required file: $required"
}
Assert-True (-not (Test-Path -LiteralPath (Join-Path $repo "plugins/game-production-system"))) "Legacy production plugin directory still exists."
Assert-True (-not (Test-Path -LiteralPath (Join-Path $repo "plugins/game-approval-ui"))) "Legacy approval plugin directory still exists."

$manifest = Get-Content -Raw -Encoding utf8 $manifestPath | ConvertFrom-Json
$marketplace = Get-Content -Raw -Encoding utf8 $marketplacePath | ConvertFrom-Json
$mcp = Get-Content -Raw -Encoding utf8 $mcpPath | ConvertFrom-Json

Assert-True ($manifest.name -eq "game-production-workflow") "Plugin manifest name does not match the combined plugin."
Assert-True ($manifest.skills -eq "./skills/") "Plugin manifest must expose both skills from ./skills/."
Assert-True ($manifest.mcpServers -eq "./.mcp.json") "Plugin manifest must expose the approval MCP."
Assert-True ($marketplace.plugins.Count -eq 1) "Marketplace must expose exactly one atomic plugin."
Assert-True ($marketplace.plugins[0].name -eq $manifest.name) "Marketplace and manifest plugin names differ."
Assert-True ($marketplace.plugins[0].source.path -eq "./plugins/game-production-workflow") "Marketplace source path is incorrect."
Assert-True ($mcp.mcpServers."game-approval-ui".args[0] -eq "./mcp/server.mjs") "Approval MCP entry point is incorrect."
Assert-True (Test-Path -LiteralPath (Join-Path $plugin "mcp/server.mjs") -PathType Leaf) "Approval MCP server is missing."

$versionMatch = [regex]::Match(
    [string]$manifest.version,
    '^(?<base>\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\+codex\.(?<cache>[0-9A-Za-z.-]+)$'
)
Assert-True $versionMatch.Success "Plugin version must include one +codex.<cachebuster> suffix."
$checkerText = Get-Content -Raw -Encoding utf8 $checkerPath
$policyMatch = [regex]::Match($checkerText, "policyVersion\s*=\s*'(?<version>[^']+)'")
Assert-True $policyMatch.Success "Could not read policyVersion from check.ps1."
Assert-True ($versionMatch.Groups["base"].Value -eq $policyMatch.Groups["version"].Value) "Plugin base version and production policyVersion differ."

foreach ($skill in @(
    @{ Path = $coreSkillPath; Name = "game-production-system" },
    @{ Path = $approvalSkillPath; Name = "game-approval-ui" }
)) {
    $text = Get-Content -Raw -Encoding utf8 $skill.Path
    $frontmatter = [regex]::Match($text, '(?s)\A---\s*\r?\n(?<yaml>.*?)\r?\n---')
    Assert-True $frontmatter.Success "Missing YAML frontmatter: $($skill.Path)"
    $nameMatch = [regex]::Match($frontmatter.Groups["yaml"].Value, '(?m)^name:\s*(?<name>[^\r\n]+)\s*$')
    Assert-True ($nameMatch.Success -and $nameMatch.Groups["name"].Value.Trim() -eq $skill.Name) "Skill name mismatch: $($skill.Path)"
}

$parseFailures = @()
foreach ($script in Get-ChildItem -LiteralPath $repo -Recurse -Filter *.ps1 -File) {
    $tokens = $null
    $errors = $null
    $null = [System.Management.Automation.Language.Parser]::ParseFile(
        $script.FullName,
        [ref]$tokens,
        [ref]$errors
    )
    foreach ($error in $errors) {
        $parseFailures += "$($script.FullName): $($error.Message)"
    }
}
Assert-True ($parseFailures.Count -eq 0) (
    "PowerShell parse failures:" + [Environment]::NewLine +
    ($parseFailures -join [Environment]::NewLine)
)

$brokenLinks = @()
foreach ($markdown in Get-ChildItem -LiteralPath $repo -Recurse -Filter *.md -File) {
    $content = Get-Content -Raw -Encoding utf8 $markdown.FullName
    foreach ($match in [regex]::Matches($content, '\]\((?<target>[^)]+)\)')) {
        $target = $match.Groups["target"].Value.Trim().Trim("<", ">")
        if ($target -match '^(?:https?://|mailto:|codex:|#)') { continue }
        $target = ($target -split "#", 2)[0]
        if ([string]::IsNullOrWhiteSpace($target)) { continue }
        $resolved = Join-Path $markdown.DirectoryName $target
        if (-not (Test-Path -LiteralPath $resolved)) {
            $brokenLinks += "$($markdown.FullName) -> $target"
        }
    }
}
Assert-True ($brokenLinks.Count -eq 0) (
    "Broken Markdown links:" + [Environment]::NewLine +
    ($brokenLinks -join [Environment]::NewLine)
)

$scanFiles = @(& git -C $repo ls-files --cached --others --exclude-standard)
Assert-True ($LASTEXITCODE -eq 0) "git ls-files failed."
$secretPattern = '(?i)(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,})'
$secretHits = @()
foreach ($relative in $scanFiles) {
    $path = Join-Path $repo $relative
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { continue }
    foreach ($hit in Select-String -LiteralPath $path -Pattern $secretPattern -AllMatches -ErrorAction SilentlyContinue) {
        $secretHits += ("{0}:{1}" -f $relative, $hit.LineNumber)
    }
}
Assert-True ($secretHits.Count -eq 0) (
    "Possible secrets detected: " + ($secretHits -join ", ")
)

if ($CompareRef) {
    & git -C $repo rev-parse --verify $CompareRef *> $null
    Assert-True ($LASTEXITCODE -eq 0) "Compare ref does not exist: $CompareRef"
    $changed = @(& git -C $repo diff --name-only $CompareRef --)
    Assert-True ($LASTEXITCODE -eq 0) "Could not compare changes with $CompareRef."
    $pluginChanged = @($changed | Where-Object { $_ -like "$pluginRelative/*" })
    if ($pluginChanged.Count -gt 0) {
        Assert-True (
            $changed -contains "$pluginRelative/.codex-plugin/plugin.json"
        ) "Plugin content changed without updating its manifest cachebuster."
    }
}

$node = Get-Command node -ErrorAction SilentlyContinue
Assert-True ($null -ne $node) "Node.js is required for approval MCP validation."
& $node.Source $approvalTestPath
Assert-True ($LASTEXITCODE -eq 0) "Approval MCP protocol test failed."

Write-Host "PASS atomic plugin structure, versions, scripts, links, secret scan, and approval MCP protocol"
