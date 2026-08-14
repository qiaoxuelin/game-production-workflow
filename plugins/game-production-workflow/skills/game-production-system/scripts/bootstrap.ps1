[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectPath,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$')]
    [string]$ProjectId,

    [Parameter(Mandatory = $true)]
    [ValidateSet('indie_game', 'mobile_game')]
    [string]$ProjectTrack,

    [ValidateSet('premium', 'f2p', 'iaa', 'hybrid', 'undecided')]
    [string]$BusinessModel = 'undecided',

    [ValidateSet('mechanics', 'visual', 'content', 'liveops')]
    [string[]]$QualityFocus = @('mechanics'),

    [ValidateSet('product_first', 'creative_first')]
    [string]$ValidationMode = 'product_first',

    [ValidateSet('original_design', 'reference_replication')]
    [string]$DevelopmentMode = 'original_design',

    [Parameter(Mandatory = $true)]
    [string[]]$Platform,

    [Parameter(Mandatory = $true)]
    [string]$Engine,

    [string]$CanonicalClient = '',

    [ValidateSet('single_repo', 'umbrella_repo', 'multi_repo')]
    [string]$GitPolicy = 'single_repo',

    [switch]$CreateProjectDirectory,

    [switch]$InitializeGit
)

$ErrorActionPreference = 'Stop'

if ($ValidationMode -eq 'creative_first' -and $ProjectTrack -ne 'mobile_game') {
    throw 'creative_first is only valid for mobile_game.'
}
if ($ValidationMode -eq 'creative_first' -and $BusinessModel -notin @('iaa', 'hybrid')) {
    throw 'creative_first requires iaa or hybrid businessModel.'
}

function Get-SafeFullPath {
    param([Parameter(Mandatory = $true)][string]$Path)

    $fullPath = [System.IO.Path]::GetFullPath($Path)
    $trimmed = $fullPath.TrimEnd(
        [System.IO.Path]::DirectorySeparatorChar,
        [System.IO.Path]::AltDirectorySeparatorChar
    )
    $root = [System.IO.Path]::GetPathRoot($fullPath).TrimEnd(
        [System.IO.Path]::DirectorySeparatorChar,
        [System.IO.Path]::AltDirectorySeparatorChar
    )

    if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed -eq $root) {
        throw "Refusing to initialize a filesystem root: $fullPath"
    }

    return $fullPath
}

function Write-Utf8File {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Content
    )

    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Test-OwnGitRepository {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path -LiteralPath (Join-Path $Path '.git'))) {
        return $false
    }

    $gitCommand = Get-Command git -ErrorAction SilentlyContinue
    if ($null -eq $gitCommand) {
        return $false
    }

    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'SilentlyContinue'
        $result = & $gitCommand.Source -C $Path rev-parse --is-inside-work-tree 2>$null
        $gitExitCode = $LASTEXITCODE
    }
    catch {
        return $false
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    return ($gitExitCode -eq 0 -and (($result | Select-Object -Last 1) -eq 'true'))
}

$resolvedProject = Get-SafeFullPath -Path $ProjectPath

if (-not (Test-Path -LiteralPath $resolvedProject -PathType Container)) {
    if (-not $CreateProjectDirectory) {
        throw "Project directory does not exist. Pass -CreateProjectDirectory after confirming the exact path."
    }

    if ($PSCmdlet.ShouldProcess($resolvedProject, 'Create project directory')) {
        New-Item -ItemType Directory -Path $resolvedProject -Force | Out-Null
    }
}

$resolvedProject = (Resolve-Path -LiteralPath $resolvedProject).Path
$templateRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\assets\project-template')).Path
$today = (Get-Date).ToString('yyyy-MM-dd')
$platformText = ($Platform -join ', ')
$canonicalClientText = if ([string]::IsNullOrWhiteSpace($CanonicalClient)) {
    'TBD'
}
else {
    $CanonicalClient
}

$created = New-Object System.Collections.Generic.List[string]
$skipped = New-Object System.Collections.Generic.List[string]

$templateFiles = Get-ChildItem -LiteralPath $templateRoot -Recurse -File
foreach ($templateFile in $templateFiles) {
    $relative = $templateFile.FullName.Substring($templateRoot.Length).TrimStart('\', '/')
    if ($relative -eq 'production\PLAN.md') {
        continue
    }
    $destination = Join-Path $resolvedProject $relative
    $destinationDirectory = Split-Path -Parent $destination

    if (Test-Path -LiteralPath $destination) {
        $skipped.Add($relative)
        continue
    }

    if ($PSCmdlet.ShouldProcess($destination, 'Create governance file')) {
        New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
        $content = [System.IO.File]::ReadAllText($templateFile.FullName)
        $content = $content.Replace('__PROJECT_ID__', $ProjectId)
        $content = $content.Replace('__PROJECT_TRACK__', $ProjectTrack)
        $content = $content.Replace('__BUSINESS_MODEL__', $BusinessModel)
        $content = $content.Replace('__VALIDATION_MODE__', $ValidationMode)
        $content = $content.Replace('__DEVELOPMENT_MODE__', $DevelopmentMode)
        $content = $content.Replace('__QUALITY_FOCUS__', ($QualityFocus -join ', '))
        $content = $content.Replace('__PLATFORM__', $platformText)
        $content = $content.Replace('__ENGINE__', $Engine)
        $content = $content.Replace('__CANONICAL_CLIENT__', $canonicalClientText)
        $content = $content.Replace('__GIT_POLICY__', $GitPolicy)
        $content = $content.Replace('__DATE__', $today)
        Write-Utf8File -Path $destination -Content $content
        $created.Add($relative)
    }
}

$projectStatePath = Join-Path $resolvedProject 'production\project.json'
if (Test-Path -LiteralPath $projectStatePath) {
    $skipped.Add('production\project.json')
}
elseif ($PSCmdlet.ShouldProcess($projectStatePath, 'Create project state')) {
    $state = [ordered]@{
        schemaVersion    = 1
        systemVersion    = '1.7.2'
        projectId        = $ProjectId
        developmentMode  = $DevelopmentMode
        projectTrack     = $ProjectTrack
        businessModel    = $BusinessModel
        validationMode   = $ValidationMode
        qualityFocus     = @($QualityFocus)
        platform         = @($Platform)
        engine           = $Engine
        canonicalClient  = $CanonicalClient
        gitPolicy        = $GitPolicy
        components       = @(
            [ordered]@{
                name        = $ProjectId
                path        = '.'
                role        = 'canonical'
                gitRequired = $true
            }
        )
        referenceClients = @()
        sharedContracts  = @()
        gate             = 'G0'
        currentTask      = ''
        status           = 'Clarifying'
        blockers         = @('G0 clarification is incomplete')
        nextAction       = 'Complete project clarification and obtain explicit G0 approval'
        humanApprovals   = [ordered]@{
            G0           = $null
            G1           = $null
            goldenVisual = $null
            G2           = $null
            G3           = $null
        }
        updatedAt       = $today
    }
    $json = $state | ConvertTo-Json -Depth 8
    New-Item -ItemType Directory -Path (Split-Path -Parent $projectStatePath) -Force | Out-Null
    Write-Utf8File -Path $projectStatePath -Content ($json + [Environment]::NewLine)
    $created.Add('production\project.json')
}

$toolTarget = Join-Path $resolvedProject 'tools\production'
foreach ($scriptName in @('check.ps1', 'evidence.ps1')) {
    $source = Join-Path $PSScriptRoot $scriptName
    $destination = Join-Path $toolTarget $scriptName

    if (Test-Path -LiteralPath $destination) {
        $skipped.Add("tools\production\$scriptName")
        continue
    }

    if ($PSCmdlet.ShouldProcess($destination, 'Install production tool')) {
        New-Item -ItemType Directory -Path $toolTarget -Force | Out-Null
        Copy-Item -LiteralPath $source -Destination $destination
        $created.Add("tools\production\$scriptName")
    }
}

$gitStatus = 'missing'
$gitDirectory = Join-Path $resolvedProject '.git'
if (Test-Path -LiteralPath $gitDirectory) {
    if (Test-OwnGitRepository -Path $resolvedProject) {
        $gitStatus = 'present_valid'
    }
    else {
        $gitStatus = 'present_invalid'
    }
}
elseif ($InitializeGit) {
    $gitCommand = Get-Command git -ErrorAction SilentlyContinue
    if ($null -eq $gitCommand) {
        throw 'Git is not available on PATH; governance files were created but Git was not initialized.'
    }

    if ($PSCmdlet.ShouldProcess($resolvedProject, 'Initialize Git repository')) {
        & $gitCommand.Source -C $resolvedProject init | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "git init failed for $resolvedProject"
        }
        if (-not (Test-OwnGitRepository -Path $resolvedProject)) {
            throw "git init completed but repository validation failed for $resolvedProject"
        }
        $gitStatus = 'initialized_valid'
    }
}

$result = [ordered]@{
    projectPath = $resolvedProject
    created     = @($created)
    skipped     = @($skipped)
    git         = $gitStatus
    next        = @(
        'Merge AGENTS.md manually if an existing file was skipped.',
        'Complete production/PROJECT.md, planning/design ownership in production/TASK.md, and project-specific acceptance.',
        'Use Single-task for bounded work or activate production/PLAN.md for multi-package work.',
        'Adopt design modules only after repeated use or evidence.',
        'Record explicit G0 approval only after the human producer confirms it.',
        'Run tools/production/check.ps1.'
    )
}

$result | ConvertTo-Json -Depth 8
