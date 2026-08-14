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
$bootstrapPath = Join-Path $plugin "skills/game-production-system/scripts/bootstrap.ps1"
$visualProductionPath = Join-Path $plugin "skills/game-production-system/references/visual-production.md"
$experienceReviewPath = Join-Path $plugin "skills/game-production-system/references/experience-review.md"
$executionPath = Join-Path $plugin "skills/game-production-system/references/execution.md"
$doctorPath = Join-Path $plugin "skills/game-production-system/scripts/doctor.mjs"
$adapterTemplatePath = Join-Path $plugin "skills/game-production-system/assets/project-template/production/adapter.json"
$nodeInstallerPath = Join-Path $repo "install.mjs"
$taskTemplatePath = Join-Path $plugin "skills/game-production-system/assets/project-template/production/TASK.md"
$planTemplatePath = Join-Path $plugin "skills/game-production-system/assets/project-template/production/PLAN.md"
$mcpPath = Join-Path $plugin ".mcp.json"
$approvalTestPath = Join-Path $plugin "scripts/test-server.mjs"
$policyTestPath = Join-Path $plugin "scripts/test-production-policy.mjs"
$convergenceTestPath = Join-Path $plugin "scripts/test-convergence-policy.mjs"
$skillEvalTestPath = Join-Path $plugin "scripts/test-skill-evals.mjs"
$skillEvalCorpusPath = Join-Path $plugin "evals/game-production-system.json"
$doctorTestPath = Join-Path $plugin "scripts/test-doctor.mjs"
$installTestPath = Join-Path $plugin "scripts/test-install.mjs"

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
    $bootstrapPath,
    $visualProductionPath,
    $experienceReviewPath,
    $executionPath,
    $doctorPath,
    $adapterTemplatePath,
    $nodeInstallerPath,
    $taskTemplatePath,
    $planTemplatePath,
    $mcpPath,
    $approvalTestPath,
    $policyTestPath,
    $convergenceTestPath,
    $skillEvalTestPath,
    $skillEvalCorpusPath,
    $doctorTestPath,
    $installTestPath
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

$visualProductionText = Get-Content -Raw -Encoding utf8 $visualProductionPath
$experienceReviewText = Get-Content -Raw -Encoding utf8 $experienceReviewPath
$taskTemplateText = Get-Content -Raw -Encoding utf8 $taskTemplatePath
$planTemplateText = Get-Content -Raw -Encoding utf8 $planTemplatePath
$bootstrapText = Get-Content -Raw -Encoding utf8 $bootstrapPath
$readmeText = Get-Content -Raw -Encoding utf8 (Join-Path $repo 'README.md')
$coreSkillText = Get-Content -Raw -Encoding utf8 $coreSkillPath
Assert-True ($visualProductionText -match 'derive the required asset inventory') "Visual production must derive a required asset inventory before packages."
Assert-True ($visualProductionText -match 'Do not\s+trigger it from a fixed file or asset count') "Asset-family splitting must not use a fixed item count."
Assert-True ($visualProductionText -match 'human approval per asset') "Asset production must not add per-asset human approvals."
Assert-True ($taskTemplateText -match 'Required asset inventory:') "TASK template must carry the required asset inventory."
Assert-True ($taskTemplateText -match 'Asset-family packages:') "TASK template must carry bounded asset-family packages."
Assert-True ($planTemplateText -match '### Asset-family extension') "PLAN template must support multi-package asset-family production."
Assert-True ($visualProductionText -match 'authoritative state source') "Interactive visual work must distinguish authoritative state from renderers."
Assert-True ($visualProductionText -match 'cheapest assembly precheck') "Interactive visual work must use a technology-appropriate assembly precheck."
Assert-True ($experienceReviewText -match 'interaction-to-visual causality') "Experience review must inspect interaction-to-visual causality."
Assert-True ($taskTemplateText -match 'Interactive visual scope:') "TASK template must classify interactive visual scope."
Assert-True ($taskTemplateText -match 'Interaction/render contract:') "TASK template must carry a compact interaction/render contract."
Assert-True ($taskTemplateText -match 'Assembly precheck:') "TASK template must carry assembly-precheck state."
Assert-True ($checkerText -match 'interactive_visual_scope_missing') "Checker must require the v1.6 interactive visual scope field."
Assert-True ($checkerText -match 'interaction_render_contract_missing') "Checker must require a frozen interaction/render contract for active work."
Assert-True ($checkerText -match 'visual_bulk_unlock_without_prechecks') "Checker must keep visual bulk work locked until both prechecks pass."
Assert-True ($checkerText -match 'systemVersionAtLeast160') "Checker must preserve v1.5 project compatibility behind a v1.6 predicate."
Assert-True ($bootstrapText -match "systemVersion\s*=\s*'1\.7\.2'") "New projects must bootstrap the v1.7.2 contract."
Assert-True ($readmeText -match 'game-production-system` `1\.7\.2') "README system version must match the v1.7.2 release."
Assert-True (@($coreSkillText.TrimEnd() -split "\r?\n").Count -le 500) "Core SKILL.md must remain at or below 500 lines; keep interactive details in its reference."

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
& $node.Source $policyTestPath
Assert-True ($LASTEXITCODE -eq 0) "Production policy structure test failed."
& $node.Source $convergenceTestPath
Assert-True ($LASTEXITCODE -eq 0) "Returned-candidate convergence test failed."
& $node.Source $skillEvalTestPath
Assert-True ($LASTEXITCODE -eq 0) "Game-production behavior evaluation corpus failed."
& $node.Source $doctorTestPath
Assert-True ($LASTEXITCODE -eq 0) "Production capability doctor test failed."
& $node.Source $installTestPath
Assert-True ($LASTEXITCODE -eq 0) "Cross-platform installer test failed."

Write-Host "PASS atomic plugin structure, versions, skills, policy, scripts, links, secret scan, and approval MCP protocol"
