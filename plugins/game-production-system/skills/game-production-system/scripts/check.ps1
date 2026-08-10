[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectPath,

    [ValidateSet('Task', 'Gate')]
    [string]$Mode = 'Task',

    [switch]$AuditHistory
)

$ErrorActionPreference = 'Stop'

function Get-SafeProjectRoot {
    param([Parameter(Mandatory = $true)][string]$Path)

    $fullPath = [System.IO.Path]::GetFullPath($Path)
    if (-not (Test-Path -LiteralPath $fullPath -PathType Container)) {
        throw "Project directory does not exist: $fullPath"
    }

    $resolved = (Resolve-Path -LiteralPath $fullPath).Path
    $filesystemRoot = [System.IO.Path]::GetPathRoot($resolved).TrimEnd('\', '/')
    if ($resolved.TrimEnd('\', '/') -eq $filesystemRoot) {
        throw "Refusing to validate a filesystem root: $resolved"
    }

    return $resolved
}

function Get-TaskField {
    param(
        [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Text,
        [Parameter(Mandatory = $true)][string]$Name
    )

    $pattern = '(?m)^- ' + [Regex]::Escape($Name) + ':\s*`?([^`\r\n]+)`?'
    $match = [Regex]::Match($Text, $pattern)
    if (-not $match.Success) {
        return $null
    }

    return $match.Groups[1].Value.Trim().Trim('`')
}

function Get-TaskList {
    param([string]$Value)

    if (
        [string]::IsNullOrWhiteSpace($Value) -or
        $Value -in @('None', 'Not applicable')
    ) {
        return @()
    }

    return @(
        $Value -split '[,;]' |
            ForEach-Object { $_.Trim().Trim('`') } |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    )
}

function Test-ConcreteTaskValue {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $false
    }

    return $Value.Trim() -notin @(
        'TBD',
        'Pending',
        'None',
        'Not applicable',
        'Not started'
    )
}

function Test-DomainDesignRole {
    param([string]$Role)

    if ([string]::IsNullOrWhiteSpace($Role)) {
        return $false
    }

    return $Role -match (
        '(?i)(design|designer|art|ux|gui|animation|vfx|audio|narrative|' +
        'economy|balance|level|content|策划|设计|美术|视觉|交互|关卡|' +
        '数值|经济|叙事|动画|特效|音效)'
    )
}

function Get-AcceptanceReference {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $null
    }

    $match = [Regex]::Match($Value.Trim(), '(?i)^Accepted\s*:\s*(?<reference>.+)$')
    if (-not $match.Success) {
        return $null
    }

    $reference = $match.Groups['reference'].Value.Trim().Trim('`')
    if (-not (Test-ConcreteTaskValue -Value $reference)) {
        return $null
    }

    return $reference
}

function Add-Issue {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet('contract', 'task', 'gate')]
        [string]$Scope,

        [Parameter(Mandatory = $true)]
        [ValidateSet('error', 'warning')]
        [string]$Level,

        [Parameter(Mandatory = $true)]
        [string]$Code,

        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    $script:issues.Add([pscustomobject]@{
        scope   = $Scope
        level   = $Level
        code    = $Code
        message = $Message
    })
}

function Normalize-Role {
    param([string]$Role)

    if ([string]::IsNullOrWhiteSpace($Role)) {
        return ''
    }

    return ([Regex]::Replace($Role.ToLowerInvariant(), '[^a-z0-9\u4e00-\u9fff]', ''))
}

function Test-RoleConflict {
    param(
        [string]$Left,
        [string]$Right
    )

    $normalizedLeft = Normalize-Role -Role $Left
    $normalizedRight = Normalize-Role -Role $Right
    if (
        [string]::IsNullOrWhiteSpace($normalizedLeft) -or
        [string]::IsNullOrWhiteSpace($normalizedRight)
    ) {
        return $false
    }

    if ($normalizedLeft -eq $normalizedRight) {
        return $true
    }

    if (
        $normalizedLeft.Length -ge 8 -and
        $normalizedRight.Contains($normalizedLeft)
    ) {
        return $true
    }
    if (
        $normalizedRight.Length -ge 8 -and
        $normalizedLeft.Contains($normalizedRight)
    ) {
        return $true
    }

    return $false
}

function Test-IndependentReview {
    param(
        $Entry,
        [string]$OwnerRole,
        [string]$IntegratorRole
    )

    if (
        $null -eq $Entry -or
        $Entry.type -ne 'review' -or
        $Entry.verdict -ne 'Pass' -or
        [string]::IsNullOrWhiteSpace([string]$Entry.reviewerRole)
    ) {
        return $false
    }

    if (Test-RoleConflict -Left ([string]$Entry.reviewerRole) -Right $OwnerRole) {
        return $false
    }
    if (Test-RoleConflict -Left ([string]$Entry.reviewerRole) -Right $IntegratorRole) {
        return $false
    }

    return $true
}

function Invoke-GitRead {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    $gitCommand = Get-Command git -ErrorAction SilentlyContinue
    if ($null -eq $gitCommand) {
        return [pscustomobject]@{
            exitCode = 127
            output   = @()
        }
    }

    $safePath = ([System.IO.Path]::GetFullPath($Path)).Replace('\', '/')
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'SilentlyContinue'
        $output = @(
            & $gitCommand.Source -c "safe.directory=$safePath" -C $Path @Arguments 2>$null
        )
        $exitCode = $LASTEXITCODE
    }
    catch {
        $output = @()
        $exitCode = 1
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    return [pscustomobject]@{
        exitCode = $exitCode
        output   = $output
    }
}

function Test-OwnGitRepository {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path -LiteralPath (Join-Path $Path '.git'))) {
        return $false
    }

    $result = Invoke-GitRead -Path $Path -Arguments @(
        'rev-parse',
        '--is-inside-work-tree'
    )
    return (
        $result.exitCode -eq 0 -and
        (($result.output | Select-Object -Last 1) -eq 'true')
    )
}

function Test-GitHasCommit {
    param([Parameter(Mandatory = $true)][string]$Path)

    $result = Invoke-GitRead -Path $Path -Arguments @(
        'rev-parse',
        '--verify',
        'HEAD'
    )
    return ($result.exitCode -eq 0)
}

function Test-GitPathTracked {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$RelativePath
    )

    $gitPath = $RelativePath.Replace('\', '/')
    $result = Invoke-GitRead -Path $Path -Arguments @(
        'ls-files',
        '--error-unmatch',
        '--',
        $gitPath
    )
    return ($result.exitCode -eq 0)
}

function Test-IgnoredSourcePath {
    param([string]$Path)

    $normalized = $Path.Replace('\', '/').Trim('"')
    $paths = if ($normalized -match ' -> ') {
        @($normalized -split ' -> ')
    }
    else {
        @($normalized)
    }
    foreach ($candidate in $paths) {
        $lower = $candidate.Trim('"').ToLowerInvariant()
        if (
            $lower -ne 'production/task.md' -and
            $lower -ne 'production/project.json' -and
            -not $lower.StartsWith('production/evidence/') -and
            -not $lower.StartsWith('evidence/')
        ) {
            return $false
        }
    }
    return $true
}

function Get-TaskContractFingerprint {
    param([Parameter(Mandatory = $true)][string]$Root)

    $taskPath = Join-Path $Root 'production\TASK.md'
    if (-not (Test-Path -LiteralPath $taskPath -PathType Leaf)) {
        return $null
    }
    $text = Get-Content -LiteralPath $taskPath -Raw -Encoding UTF8
    $contractText = [Regex]::Replace(
        $text,
        '(?m)^- (Status|Result|Evidence IDs|Module harvest|Next action):.*(?:\r?\n)?',
        ''
    ).Replace("`r`n", "`n")
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($contractText)
        return ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-', '').ToLowerInvariant()
    }
    finally {
        $sha.Dispose()
    }
}

function Get-GitRelevantWorkingChanges {
    param([Parameter(Mandatory = $true)][string]$Path)

    $result = Invoke-GitRead -Path $Path -Arguments @(
        'status',
        '--porcelain=v1',
        '--untracked-files=all'
    )
    if ($result.exitCode -ne 0) {
        return @()
    }

    return @(
        $result.output | Where-Object {
            $line = [string]$_
            $pathText = if ($line.Length -gt 3) {
                $line.Substring(3)
            }
            else {
                $line
            }
            -not (Test-IgnoredSourcePath -Path $pathText)
        }
    )
}

function Test-GitRevisionAncestor {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Revision
    )

    if ($Revision -notmatch '^[0-9a-fA-F]{7,64}$') {
        return $false
    }
    $result = Invoke-GitRead -Path $Path -Arguments @(
        'merge-base',
        '--is-ancestor',
        $Revision,
        'HEAD'
    )
    return ($result.exitCode -eq 0)
}

function Get-GitRelevantChangesSince {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Revision
    )

    $result = Invoke-GitRead -Path $Path -Arguments @(
        'diff',
        '--name-only',
        "$Revision..HEAD",
        '--',
        '.'
    )
    if ($result.exitCode -ne 0) {
        return @()
    }

    return @(
        $result.output | Where-Object {
            -not (Test-IgnoredSourcePath -Path ([string]$_))
        }
    )
}

function Test-UaMetrics {
    param($Entry)

    if ($null -eq $Entry -or $null -eq $Entry.metrics) {
        return $false
    }

    foreach ($metricName in @(
        'region',
        'spend',
        'currency',
        'impressions',
        'installs',
        'cpi',
        'ipm',
        'd1Retention'
    )) {
        if ($null -eq $Entry.metrics.PSObject.Properties[$metricName]) {
            return $false
        }
    }
    if (
        [string]::IsNullOrWhiteSpace([string]$Entry.metrics.region) -or
        [string]::IsNullOrWhiteSpace([string]$Entry.metrics.currency)
    ) {
        return $false
    }

    try {
        $spend = [double]$Entry.metrics.spend
        $impressions = [double]$Entry.metrics.impressions
        $installs = [double]$Entry.metrics.installs
        $cpi = [double]$Entry.metrics.cpi
        $ipm = [double]$Entry.metrics.ipm
        $d1Retention = [double]$Entry.metrics.d1Retention
    }
    catch {
        return $false
    }

    return (
        $spend -ge 0 -and
        $impressions -ge 0 -and
        $installs -ge 0 -and
        $cpi -ge 0 -and
        $ipm -ge 0 -and
        $impressions -eq [Math]::Floor($impressions) -and
        $installs -eq [Math]::Floor($installs) -and
        $installs -le $impressions -and
        $d1Retention -ge 0 -and
        $d1Retention -le 1
    )
}

function Test-ProvenanceComplete {
    param($Entry)

    if ($null -eq $Entry -or $null -eq $Entry.provenance) {
        return $false
    }

    foreach ($fieldName in @(
        'tool',
        'sourceInputs',
        'edits',
        'license',
        'reviewer'
    )) {
        $property = $Entry.provenance.PSObject.Properties[$fieldName]
        if (
            $null -eq $property -or
            [string]::IsNullOrWhiteSpace([string]$property.Value)
        ) {
            return $false
        }
    }

    return $true
}

function Get-HumanDecision {
    param($Record)

    if ($null -eq $Record) {
        return ''
    }
    if ($Record -is [string]) {
        return $Record.Trim().ToLowerInvariant()
    }

    $decisionProperty = $Record.PSObject.Properties['decision']
    if ($null -eq $decisionProperty) {
        return ''
    }

    return ([string]$decisionProperty.Value).Trim().ToLowerInvariant()
}

function Test-StructuredHumanDecision {
    param($Record)

    if ($null -eq $Record -or $Record -is [string]) {
        return $false
    }

    foreach ($fieldName in @(
        'decision',
        'decidedBy',
        'decidedAt',
        'source',
        'scope'
    )) {
        $property = $Record.PSObject.Properties[$fieldName]
        if (
            $null -eq $property -or
            [string]::IsNullOrWhiteSpace([string]$property.Value)
        ) {
            return $false
        }
    }

    $parsedDate = [DateTimeOffset]::MinValue
    return [DateTimeOffset]::TryParse(
        [string]$Record.decidedAt,
        [ref]$parsedDate
    )
}

function Test-HumanPassage {
    param(
        $Record,
        [string[]]$AllowedDecisions
    )

    $decision = Get-HumanDecision -Record $Record
    if ([string]::IsNullOrWhiteSpace($decision)) {
        return $false
    }

    if ($Record -isnot [string]) {
        return ($decision -in $AllowedDecisions)
    }

    return (
        $decision -notmatch (
            'pending|recommended|review[_ -]?required|unapproved|denied|' +
            'rejected|revise|stop|blocked|待审批|待定|未批准|不通过|' +
            '拒绝|退回|停止|修改|暂缓'
        )
    )
}

function Test-LocalEvidenceLocation {
    param([string]$Location)

    if ([string]::IsNullOrWhiteSpace($Location)) {
        return $false
    }
    if ($Location -match '^[A-Za-z]:[\\/]') {
        return $true
    }
    if ($Location -match '^(Codex task|Codex thread)\s*:') {
        return $false
    }
    if ($Location -match '^[A-Za-z][A-Za-z0-9+.-]*:') {
        return $false
    }

    return ($Location -match '\.[A-Za-z0-9]{1,8}$')
}

function Get-ImageDimensions {
    param([Parameter(Mandatory = $true)][string]$Path)

    try {
        Add-Type -AssemblyName System.Drawing -ErrorAction Stop
        $image = [System.Drawing.Image]::FromFile($Path)
        try {
            return [pscustomobject]@{
                width  = $image.Width
                height = $image.Height
            }
        }
        finally {
            $image.Dispose()
        }
    }
    catch {
        return $null
    }
}

function Get-PassingEntries {
    param(
        [object[]]$Entries,
        [string[]]$Types
    )

    return @(
        $Entries | Where-Object {
            $_.type -in $Types -and $_.verdict -eq 'Pass'
        }
    )
}

$projectRoot = Get-SafeProjectRoot -Path $ProjectPath
$issues = New-Object System.Collections.Generic.List[object]

$requiredFiles = @(
    'AGENTS.md',
    'production\project.json',
    'production\PROJECT.md',
    'production\TASK.md',
    'production\ACCEPTANCE.md',
    'production\evidence\manifest.json',
    'docs\ART_BIBLE.md',
    'tools\production\check.ps1',
    'tools\production\evidence.ps1'
)

foreach ($relative in $requiredFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot $relative) -PathType Leaf)) {
        Add-Issue -Scope contract -Level error -Code 'missing_file' -Message "Missing required file: $relative"
    }
}

$requiredReadFiles = @(
    'production\project.json',
    'production\TASK.md',
    'production\evidence\manifest.json'
)
$canReadState = $true
foreach ($relative in $requiredReadFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot $relative) -PathType Leaf)) {
        $canReadState = $false
    }
}

$project = $null
$manifest = $null
$taskText = ''
if ($canReadState) {
    try {
        $project = Get-Content -LiteralPath (
            Join-Path $projectRoot 'production\project.json'
        ) -Raw -Encoding UTF8 | ConvertFrom-Json
    }
    catch {
        Add-Issue -Scope contract -Level error -Code 'invalid_project_json' -Message $_.Exception.Message
    }

    try {
        $manifest = Get-Content -LiteralPath (
            Join-Path $projectRoot 'production\evidence\manifest.json'
        ) -Raw -Encoding UTF8 | ConvertFrom-Json
    }
    catch {
        Add-Issue -Scope contract -Level error -Code 'invalid_manifest_json' -Message $_.Exception.Message
    }

    $taskText = Get-Content -LiteralPath (
        Join-Path $projectRoot 'production\TASK.md'
    ) -Raw -Encoding UTF8
}
$currentTaskFingerprint = Get-TaskContractFingerprint -Root $projectRoot

$taskId = Get-TaskField -Text $taskText -Name 'Task ID'
$taskStatus = Get-TaskField -Text $taskText -Name 'Status'
$taskGate = Get-TaskField -Text $taskText -Name 'Gate'
$executionLane = Get-TaskField -Text $taskText -Name 'Execution lane'
$highRiskText = Get-TaskField -Text $taskText -Name 'High-risk open decisions'
$ownerRole = Get-TaskField -Text $taskText -Name 'Owner role'
$integratorRole = Get-TaskField -Text $taskText -Name 'Integrator role'
$reviewerRole = Get-TaskField -Text $taskText -Name 'Reviewer role'
$planningOwner = Get-TaskField -Text $taskText -Name 'Planning owner'
$planReference = Get-TaskField -Text $taskText -Name 'Plan reference'
$designStatus = Get-TaskField -Text $taskText -Name 'Design status'
$designOwnersText = Get-TaskField -Text $taskText -Name 'Design owners'
$frozenDesignOutputs = Get-TaskField -Text $taskText -Name 'Frozen design outputs'
$technicalArchitectureOwner = Get-TaskField -Text $taskText -Name 'Technical architecture owner'
$implementationHandoff = Get-TaskField -Text $taskText -Name 'Implementation handoff'
$producerAcceptanceOwner = Get-TaskField -Text $taskText -Name 'Producer acceptance owner'
$designAcceptance = Get-TaskField -Text $taskText -Name 'Design acceptance'
$producerAcceptance = Get-TaskField -Text $taskText -Name 'Producer acceptance'
$designDomainsText = Get-TaskField -Text $taskText -Name 'Design domains'
$designModulesText = Get-TaskField -Text $taskText -Name 'Design modules'
$guiRestoration = Get-TaskField -Text $taskText -Name 'GUI restoration'
$moduleHarvest = Get-TaskField -Text $taskText -Name 'Module harvest'
$referenceBaseline = Get-TaskField -Text $taskText -Name 'Reference baseline'
$replicationScope = Get-TaskField -Text $taskText -Name 'Replication scope'
$criticalReplicationPoints = Get-TaskField -Text $taskText -Name 'Critical replication points'
$comparisonMethod = Get-TaskField -Text $taskText -Name 'Comparison method and tolerances'
$allowedDeviations = Get-TaskField -Text $taskText -Name 'Allowed deviations'
$designOwners = @(Get-TaskList -Value $designOwnersText)
$designModuleRefs = @(Get-TaskList -Value $designModulesText)

$knownStatuses = @(
    'Clarifying',
    'Ready',
    'Implementing',
    'Functionally Verified',
    'Visually Approved',
    'Accepted',
    'Blocked'
)
$activeStatuses = @(
    'Ready',
    'Implementing',
    'Functionally Verified',
    'Visually Approved',
    'Accepted'
)
$preferredStatuses = @(
    'Clarifying',
    'Ready',
    'Implementing',
    'Accepted',
    'Blocked'
)
$knownGates = @('G0', 'G1', 'G2', 'G3')
$knownTracks = @('indie_game', 'mobile_game')
$knownBusinessModels = @('premium', 'f2p', 'iaa', 'hybrid', 'undecided')
$knownValidationModes = @('product_first', 'creative_first')
$knownDevelopmentModes = @('original_design', 'reference_replication')
$knownQualityFocus = @('mechanics', 'visual', 'content', 'liveops')
$knownGuiRestoration = @('Required', 'Not applicable')
$knownDesignStatuses = @('Draft', 'Frozen', 'Not applicable')
$knownModuleHarvest = @(
    'Pending',
    'No change',
    'Case only',
    'Candidate',
    'Updated',
    'Deprecated'
)
$knownGitPolicies = @('single_repo', 'umbrella_repo', 'multi_repo')
$knownEvidenceTypes = @(
    'test',
    'build',
    'screenshot',
    'video',
    'performance',
    'playtest',
    'review',
    'provenance',
    'creative',
    'ua_test',
    'gui'
)
$knownEvidenceVerdicts = @('Pass', 'Fail', 'Informational', 'Pending')
$approvalPassDecisions = @(
    'approved',
    'approve',
    'accepted',
    'accept',
    'passed',
    'pass'
)
$validationMode = 'product_first'
$developmentMode = 'original_design'
$systemVersion = $null
$systemVersionAtLeast122 = $false
$systemVersionAtLeast130 = $false
$systemVersionAtLeast140 = $false
$systemVersionAtLeast150 = $false
$registeredModules = @{}
$moduleIndex = $null

if ($null -ne $project) {
    foreach ($propertyName in @(
        'schemaVersion',
        'systemVersion',
        'projectId',
        'projectTrack',
        'businessModel',
        'qualityFocus',
        'platform',
        'engine',
        'canonicalClient',
        'gitPolicy',
        'components',
        'gate',
        'currentTask',
        'status',
        'nextAction',
        'humanApprovals'
    )) {
        if ($null -eq $project.PSObject.Properties[$propertyName]) {
            Add-Issue -Scope contract -Level error -Code 'missing_project_field' -Message "project.json is missing: $propertyName"
        }
    }

    $systemVersion = [string]$project.systemVersion
    try {
        $parsedSystemVersion = [version]$systemVersion
        $systemVersionAtLeast122 = ($parsedSystemVersion -ge [version]'1.2.2')
        $systemVersionAtLeast130 = ($parsedSystemVersion -ge [version]'1.3.0')
        $systemVersionAtLeast140 = ($parsedSystemVersion -ge [version]'1.4.0')
        $systemVersionAtLeast150 = ($parsedSystemVersion -ge [version]'1.5.0')
        if ($parsedSystemVersion -lt [version]'1.3.0') {
            Add-Issue -Scope contract -Level warning -Code 'contract_version_legacy' -Message "Project contract $systemVersion predates the compatible v1.3 baseline; migrate when the active task reaches a safe checkpoint."
        }
    }
    catch {
        Add-Issue -Scope contract -Level error -Code 'invalid_system_version' -Message "Invalid systemVersion: $systemVersion"
    }

    if ($project.projectTrack -notin $knownTracks) {
        Add-Issue -Scope contract -Level error -Code 'invalid_project_track' -Message "Unknown project track: $($project.projectTrack)"
    }
    if ($project.businessModel -notin $knownBusinessModels) {
        Add-Issue -Scope contract -Level error -Code 'invalid_business_model' -Message "Unknown business model: $($project.businessModel)"
    }
    if ($null -eq $project.PSObject.Properties['validationMode']) {
        Add-Issue -Scope contract -Level warning -Code 'validation_mode_defaulted' -Message 'validationMode is absent; legacy compatibility defaults it to product_first.'
    }
    else {
        $validationMode = [string]$project.validationMode
    }
    if ($validationMode -notin $knownValidationModes) {
        Add-Issue -Scope contract -Level error -Code 'invalid_validation_mode' -Message "Unknown validation mode: $validationMode"
    }
    if ($null -eq $project.PSObject.Properties['developmentMode']) {
        Add-Issue -Scope contract -Level warning -Code 'development_mode_defaulted' -Message 'developmentMode is absent; legacy compatibility defaults it to original_design. Confirm original_design or reference_replication at the next natural checkpoint.'
    }
    else {
        $developmentMode = [string]$project.developmentMode
    }
    if ($developmentMode -notin $knownDevelopmentModes) {
        Add-Issue -Scope contract -Level error -Code 'invalid_development_mode' -Message "Unknown development mode: $developmentMode"
    }
    if ($validationMode -eq 'creative_first' -and $project.projectTrack -ne 'mobile_game') {
        Add-Issue -Scope contract -Level error -Code 'creative_first_track_mismatch' -Message 'creative_first is only valid for mobile_game.'
    }
    if ($validationMode -eq 'creative_first' -and $project.businessModel -notin @('iaa', 'hybrid')) {
        Add-Issue -Scope contract -Level error -Code 'creative_first_business_mismatch' -Message 'creative_first requires iaa or hybrid businessModel.'
    }
    foreach ($focus in @($project.qualityFocus)) {
        if ($focus -notin $knownQualityFocus) {
            Add-Issue -Scope contract -Level error -Code 'invalid_quality_focus' -Message "Unknown quality focus: $focus"
        }
    }
    if (@($project.qualityFocus).Count -eq 0) {
        Add-Issue -Scope contract -Level error -Code 'quality_focus_missing' -Message 'At least one quality-focus tag is required.'
    }
    if ($project.gitPolicy -notin $knownGitPolicies) {
        Add-Issue -Scope contract -Level error -Code 'invalid_git_policy' -Message "Unknown Git policy: $($project.gitPolicy)"
    }
    if ($project.gate -notin $knownGates) {
        Add-Issue -Scope contract -Level error -Code 'invalid_gate' -Message "Unknown project gate: $($project.gate)"
    }
    if ($project.status -notin $knownStatuses) {
        Add-Issue -Scope contract -Level error -Code 'invalid_project_status' -Message "Unknown project status: $($project.status)"
    }
    if ([string]::IsNullOrWhiteSpace([string]$project.nextAction)) {
        Add-Issue -Scope task -Level error -Code 'next_action_missing' -Message 'project.json nextAction is empty.'
    }

    if (
        $project.gate -in @('G1', 'G2', 'G3') -and
        -not (Test-HumanPassage -Record $project.humanApprovals.G0 -AllowedDecisions $approvalPassDecisions)
    ) {
        Add-Issue -Scope contract -Level error -Code 'missing_g0_approval' -Message 'Current gate requires explicit human G0 approval.'
    }
    if (
        $project.gate -in @('G1', 'G2', 'G3') -and
        $project.businessModel -eq 'undecided'
    ) {
        Add-Issue -Scope contract -Level error -Code 'business_model_undecided' -Message 'A project cannot leave G0 with an undecided business model.'
    }
    if (
        $project.gate -eq 'G3' -and
        -not (Test-HumanPassage -Record $project.humanApprovals.G2 -AllowedDecisions $approvalPassDecisions)
    ) {
        Add-Issue -Scope contract -Level error -Code 'missing_g2_approval' -Message 'G3 work requires explicit human G2 approval.'
    }
    if ($null -eq $project.humanApprovals.PSObject.Properties['G1']) {
        Add-Issue -Scope contract -Level warning -Code 'g1_approval_field_missing' -Message 'humanApprovals.G1 is absent; add it when upgrading to v1.2.'
    }

    foreach ($approvalName in @('G0', 'G1', 'goldenVisual', 'G2', 'G3')) {
        $approvalProperty = $project.humanApprovals.PSObject.Properties[$approvalName]
        if ($null -eq $approvalProperty -or $null -eq $approvalProperty.Value) {
            continue
        }

        if ($approvalProperty.Value -is [string]) {
            Add-Issue -Scope contract -Level warning -Code 'approval_legacy_format' -Message "humanApprovals.$approvalName uses a legacy string; migrate it to a structured decision record."
        }
        elseif (-not (Test-StructuredHumanDecision -Record $approvalProperty.Value)) {
            Add-Issue -Scope contract -Level error -Code 'approval_record_invalid' -Message "humanApprovals.$approvalName must include decision, decidedBy, decidedAt, source, and scope."
        }
    }
}

$moduleIndexRelative = 'design\modules\index.json'
if ($systemVersionAtLeast130) {
    $requiredFiles += @($moduleIndexRelative)
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot $moduleIndexRelative) -PathType Leaf)) {
        Add-Issue -Scope contract -Level error -Code 'missing_design_module_file' -Message "Missing required design-module file: $moduleIndexRelative"
    }
}

$moduleIndexPath = Join-Path $projectRoot $moduleIndexRelative
if (Test-Path -LiteralPath $moduleIndexPath -PathType Leaf) {
    try {
        $moduleIndex = Get-Content -LiteralPath $moduleIndexPath -Raw -Encoding UTF8 | ConvertFrom-Json
    }
    catch {
        Add-Issue -Scope contract -Level error -Code 'invalid_design_module_index' -Message $_.Exception.Message
    }
}

if ($null -ne $moduleIndex) {
    if ($null -eq $moduleIndex.PSObject.Properties['schemaVersion']) {
        Add-Issue -Scope contract -Level error -Code 'design_module_schema_missing' -Message 'Design-module index schemaVersion is missing.'
    }
    if ($null -eq $moduleIndex.PSObject.Properties['modules']) {
        Add-Issue -Scope contract -Level error -Code 'design_module_entries_missing' -Message 'Design-module index modules array is missing.'
    }
    foreach ($module in @($moduleIndex.modules)) {
        $moduleId = [string]$module.id
        $moduleVersion = [string]$module.version
        $moduleKey = "$moduleId@$moduleVersion"
        if ($moduleId -notmatch '^[a-z0-9][a-z0-9-]*(/[a-z0-9][a-z0-9-]*)+$') {
            Add-Issue -Scope contract -Level error -Code 'design_module_id_invalid' -Message "Invalid design-module ID: $moduleId"
        }
        try {
            $null = [version]$moduleVersion
        }
        catch {
            Add-Issue -Scope contract -Level error -Code 'design_module_version_invalid' -Message "Invalid design-module version: $moduleKey"
        }
        if ([string]$module.status -notin @('candidate', 'validated', 'adopted', 'deprecated')) {
            Add-Issue -Scope contract -Level error -Code 'design_module_status_invalid' -Message "Invalid design-module status: $moduleKey"
        }
        if ([string]$module.scope -notin @('project', 'shared')) {
            Add-Issue -Scope contract -Level error -Code 'design_module_scope_invalid' -Message "Invalid design-module scope: $moduleKey"
        }
        if ([string]::IsNullOrWhiteSpace([string]$module.owner)) {
            Add-Issue -Scope contract -Level error -Code 'design_module_owner_missing' -Message "Design module has no owner: $moduleKey"
        }
        if ([string]::IsNullOrWhiteSpace([string]$module.path)) {
            Add-Issue -Scope contract -Level error -Code 'design_module_path_missing' -Message "Design module has no path: $moduleKey"
        }
        else {
            try {
                $modulePath = [System.IO.Path]::GetFullPath(
                    (Join-Path $projectRoot ([string]$module.path))
                )
                $rootPrefix = $projectRoot.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
                if (-not $modulePath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
                    Add-Issue -Scope contract -Level error -Code 'design_module_path_outside_root' -Message "Design module path leaves the project root: $moduleKey"
                }
                elseif (-not (Test-Path -LiteralPath $modulePath -PathType Leaf)) {
                    Add-Issue -Scope contract -Level error -Code 'design_module_path_missing' -Message "Design module file is missing: $moduleKey"
                }
            }
            catch {
                Add-Issue -Scope contract -Level error -Code 'design_module_path_invalid' -Message "Design module path is invalid: $moduleKey"
            }
        }
        if ([string]$module.status -eq 'adopted') {
            if (
                $null -eq $module.PSObject.Properties['approval'] -or
                -not (Test-StructuredHumanDecision -Record $module.approval)
            ) {
                Add-Issue -Scope contract -Level error -Code 'design_module_adoption_missing' -Message "Adopted module lacks a structured human approval: $moduleKey"
            }
        }
        if ($registeredModules.ContainsKey($moduleKey)) {
            Add-Issue -Scope contract -Level error -Code 'design_module_duplicate' -Message "Duplicate design-module version: $moduleKey"
        }
        else {
            $registeredModules[$moduleKey] = $module
        }
    }

    foreach ($module in @($moduleIndex.modules)) {
        foreach ($dependency in @($module.dependencies)) {
            if (-not $registeredModules.ContainsKey([string]$dependency)) {
                Add-Issue -Scope contract -Level error -Code 'design_module_dependency_missing' -Message "Design module dependency is not registered: $dependency"
            }
        }
    }
}

if ([string]::IsNullOrWhiteSpace($taskId) -or $taskId -eq 'TBD') {
    Add-Issue -Scope task -Level warning -Code 'task_id_unset' -Message 'Task ID is not set.'
}
if ($taskStatus -notin $knownStatuses) {
    Add-Issue -Scope task -Level error -Code 'invalid_task_status' -Message "Unknown task status: $taskStatus"
}
elseif ($systemVersionAtLeast130 -and $taskStatus -notin $preferredStatuses) {
    Add-Issue -Scope task -Level warning -Code 'milestone_status_legacy' -Message "$taskStatus is a legacy milestone status; record functional or visual passage as evidence and use Implementing or Accepted."
}
if ($taskGate -notin $knownGates) {
    Add-Issue -Scope task -Level error -Code 'invalid_task_gate' -Message "Unknown task gate: $taskGate"
}
if ([string]::IsNullOrWhiteSpace($executionLane)) {
    if ($systemVersionAtLeast150) {
        Add-Issue -Scope task -Level error -Code 'execution_lane_missing' -Message 'TASK.md must declare Execution lane as Fast, Standard, or Full.'
    }
    elseif (
        $planReference -ne 'Single-task' -or
        $taskGate -in @('G2', 'G3') -or
        $taskId -match '(?i)(core[-_ ]?loop|replica|high[-_ ]?fidelity|monetization|migration|bulk|golden|release|gate)'
    ) {
        $executionLane = 'Full'
    }
    elseif ($guiRestoration -eq 'Required') {
        $executionLane = 'Standard'
    }
    elseif (
        $planReference -eq 'Single-task' -and
        $designStatus -eq 'Not applicable'
    ) {
        $executionLane = 'Fast'
    }
    else {
        $executionLane = 'Standard'
    }
}
elseif ($executionLane -notin @('Fast', 'Standard', 'Full')) {
    Add-Issue -Scope task -Level error -Code 'execution_lane_invalid' -Message 'Execution lane must be Fast, Standard, or Full.'
}
if ($systemVersionAtLeast150 -and [string]::IsNullOrWhiteSpace($technicalArchitectureOwner)) {
    Add-Issue -Scope task -Level error -Code 'technical_architecture_owner_missing' -Message 'TASK.md must declare a Technical architecture owner or Not applicable.'
}
if (
    $systemVersionAtLeast150 -and
    $executionLane -eq 'Full' -and
    -not (Test-ConcreteTaskValue -Value $technicalArchitectureOwner)
) {
    Add-Issue -Scope task -Level error -Code 'full_lane_architecture_owner_missing' -Message 'Full work requires an explicit technical architecture owner before implementation.'
}
if (
    $executionLane -eq 'Fast' -and
    -not [string]::IsNullOrWhiteSpace($technicalArchitectureOwner) -and
    $technicalArchitectureOwner -ne 'Not applicable'
) {
    Add-Issue -Scope task -Level error -Code 'fast_lane_architecture_conflict' -Message 'Work requiring technical architecture ownership belongs in Standard or Full, not Fast.'
}
if ([string]::IsNullOrWhiteSpace($ownerRole) -or $ownerRole -eq 'TBD') {
    Add-Issue -Scope task -Level error -Code 'missing_owner' -Message 'Task owner role is missing.'
}
if ([string]::IsNullOrWhiteSpace($integratorRole) -or $integratorRole -eq 'TBD') {
    Add-Issue -Scope task -Level error -Code 'missing_integrator' -Message 'Task integrator role is missing.'
}
if ([string]::IsNullOrWhiteSpace($reviewerRole) -or $reviewerRole -eq 'TBD') {
    Add-Issue -Scope task -Level error -Code 'missing_reviewer' -Message 'Task reviewer role is missing.'
}
if ($systemVersionAtLeast130 -and [string]::IsNullOrWhiteSpace($designDomainsText)) {
    Add-Issue -Scope task -Level error -Code 'design_domains_missing' -Message 'TASK.md must declare design domains or Not applicable.'
}
if ($systemVersionAtLeast130 -and [string]::IsNullOrWhiteSpace($designModulesText)) {
    Add-Issue -Scope task -Level error -Code 'design_modules_missing' -Message 'TASK.md must declare design modules or None.'
}
if ($systemVersionAtLeast140) {
    if ([string]::IsNullOrWhiteSpace($planningOwner) -or $planningOwner -eq 'TBD') {
        Add-Issue -Scope task -Level error -Code 'planning_owner_missing' -Message 'TASK.md must name the production-planning/task-architecture owner.'
    }
    if ([string]::IsNullOrWhiteSpace($producerAcceptanceOwner) -or $producerAcceptanceOwner -eq 'TBD') {
        Add-Issue -Scope task -Level error -Code 'producer_acceptance_owner_missing' -Message 'TASK.md must name the producer responsible for integrated outcome acceptance.'
    }
    if ([string]::IsNullOrWhiteSpace($planReference) -or $planReference -eq 'TBD') {
        Add-Issue -Scope task -Level error -Code 'plan_reference_missing' -Message 'TASK.md must use Plan reference Single-task or a repository-relative plan path.'
    }
    elseif ($planReference -ne 'Single-task') {
        $planPathText = @($planReference -split '#', 2)[0].Trim()
        if ([System.IO.Path]::IsPathRooted($planPathText)) {
            Add-Issue -Scope task -Level error -Code 'plan_reference_absolute' -Message 'Plan reference must be Single-task or a repository-relative path.'
        }
        else {
            try {
                $planFullPath = [System.IO.Path]::GetFullPath(
                    (Join-Path $projectRoot $planPathText)
                )
                $projectPrefix = $projectRoot.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
                if (-not $planFullPath.StartsWith($projectPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
                    Add-Issue -Scope task -Level error -Code 'plan_reference_outside_root' -Message 'Plan reference leaves the project root.'
                }
                elseif (-not (Test-Path -LiteralPath $planFullPath -PathType Leaf)) {
                    Add-Issue -Scope task -Level error -Code 'plan_reference_missing_file' -Message "Referenced production plan does not exist: $planPathText"
                }
                elseif (-not [string]::IsNullOrWhiteSpace($taskId) -and $taskId -ne 'TBD') {
                    $planText = Get-Content -LiteralPath $planFullPath -Raw -Encoding UTF8
                    if ($planText -notmatch [Regex]::Escape($taskId)) {
                        Add-Issue -Scope task -Level error -Code 'plan_missing_current_task' -Message "Referenced production plan does not contain current task: $taskId"
                    }
                }
            }
            catch {
                Add-Issue -Scope task -Level error -Code 'plan_reference_invalid' -Message "Invalid Plan reference: $planReference"
            }
        }
    }

    if ($designStatus -notin $knownDesignStatuses) {
        Add-Issue -Scope task -Level error -Code 'design_status_invalid' -Message 'Design status must be Draft, Frozen, or Not applicable.'
    }

    $designRequired = (
        -not [string]::IsNullOrWhiteSpace($designDomainsText) -and
        $designDomainsText -notin @('None', 'Not applicable')
    )
    if ($designRequired -and $designStatus -eq 'Not applicable') {
        Add-Issue -Scope task -Level error -Code 'design_status_inapplicable_conflict' -Message 'Tasks with design domains cannot mark design status Not applicable.'
    }
    if ($executionLane -eq 'Fast') {
        if ($planReference -ne 'Single-task') {
            Add-Issue -Scope task -Level error -Code 'fast_lane_plan_conflict' -Message 'Fast tasks use Plan reference Single-task.'
        }
        if ($designStatus -ne 'Not applicable' -or $designRequired) {
            Add-Issue -Scope task -Level error -Code 'fast_lane_design_conflict' -Message 'Work with design domains or frozen player-facing rules belongs in Standard or Full, not Fast.'
        }
    }
    if (
        $systemVersionAtLeast150 -and
        $executionLane -eq 'Full' -and
        $taskStatus -in $activeStatuses -and
        -not (Test-ConcreteTaskValue -Value $implementationHandoff)
    ) {
        Add-Issue -Scope task -Level error -Code 'full_lane_architecture_handoff_missing' -Message 'Ready, Implementing, or Accepted Full work requires a concrete combined design/technical implementation handoff.'
    }
    if ($taskStatus -in $activeStatuses -and $designStatus -eq 'Draft') {
        Add-Issue -Scope task -Level error -Code 'design_not_frozen' -Message 'Ready, Implementing, or Accepted tasks require Frozen design or Not applicable.'
    }
    if ($designStatus -eq 'Frozen') {
        if (-not $designRequired) {
            Add-Issue -Scope task -Level error -Code 'frozen_design_without_domains' -Message 'Frozen design requires explicit design domains.'
        }
        if ($designOwners.Count -eq 0) {
            Add-Issue -Scope task -Level error -Code 'design_owners_missing' -Message 'Frozen design requires one or more domain-design owners.'
        }
        elseif (@($designOwners | Where-Object { Test-DomainDesignRole -Role $_ }).Count -eq 0) {
            Add-Issue -Scope task -Level error -Code 'domain_design_owner_missing' -Message 'Frozen design must name a game/level/balance/economy/content/art/UX/animation/VFX/audio design role, not implementation alone.'
        }
        if (-not (Test-ConcreteTaskValue -Value $frozenDesignOutputs)) {
            Add-Issue -Scope task -Level error -Code 'frozen_design_outputs_missing' -Message 'Frozen design requires concrete repository design outputs or task sections.'
        }
        if (-not (Test-ConcreteTaskValue -Value $implementationHandoff)) {
            Add-Issue -Scope task -Level error -Code 'implementation_handoff_missing' -Message 'Frozen design requires a concrete implementation handoff.'
        }
    }
    elseif ($designStatus -eq 'Not applicable') {
        if ($designRequired) {
            Add-Issue -Scope task -Level error -Code 'design_domains_not_applicable_conflict' -Message 'Design domains must be Not applicable when design status is Not applicable.'
        }
    }

    $designAcceptanceReference = Get-AcceptanceReference -Value $designAcceptance
    $producerAcceptanceReference = Get-AcceptanceReference -Value $producerAcceptance
    $producerAcceptanceMayBeInapplicable = (
        $executionLane -eq 'Fast' -or
        (
            $executionLane -eq 'Standard' -and
            -not $designRequired -and
            $taskGate -notin @('G2', 'G3')
        )
    )
    if (
        $designAcceptance -notin @('Pending', 'Not applicable') -and
        [string]::IsNullOrWhiteSpace($designAcceptanceReference)
    ) {
        Add-Issue -Scope task -Level error -Code 'design_acceptance_invalid' -Message 'Design acceptance must be Pending, Not applicable, or Accepted: <evidence ID or repository-relative review record>.'
    }
    if (
        $producerAcceptance -notin @('Pending', 'Not applicable') -and
        [string]::IsNullOrWhiteSpace($producerAcceptanceReference)
    ) {
        Add-Issue -Scope task -Level error -Code 'producer_acceptance_invalid' -Message 'Producer acceptance must be Pending, applicable-lane Not applicable, or Accepted: <evidence ID or repository-relative review record>.'
    }
    if ($producerAcceptance -eq 'Not applicable' -and -not $producerAcceptanceMayBeInapplicable) {
        Add-Issue -Scope task -Level error -Code 'producer_acceptance_inapplicable_conflict' -Message 'Producer acceptance may be Not applicable only for Fast work or non-player-facing Standard work outside G2/G3.'
    }
    if ($designRequired -and $designAcceptance -eq 'Not applicable') {
        Add-Issue -Scope task -Level error -Code 'design_acceptance_inapplicable_conflict' -Message 'A task with design domains requires acceptance by its original design owners.'
    }
    if (-not $designRequired -and $designAcceptance -ne 'Not applicable') {
        Add-Issue -Scope task -Level error -Code 'design_acceptance_unnecessary' -Message 'Use Design acceptance Not applicable when no design domain applies.'
    }
    if ($taskStatus -eq 'Accepted') {
        if ($designRequired -and [string]::IsNullOrWhiteSpace($designAcceptanceReference)) {
            Add-Issue -Scope task -Level error -Code 'design_acceptance_missing' -Message 'Accepted tasks require design-owner conformance acceptance.'
        }
        $producerAcceptanceRequired = (
            -not $producerAcceptanceMayBeInapplicable -or
            $producerAcceptance -ne 'Not applicable'
        )
        if ($producerAcceptanceRequired -and [string]::IsNullOrWhiteSpace($producerAcceptanceReference)) {
            Add-Issue -Scope task -Level error -Code 'producer_acceptance_missing' -Message 'Accepted tasks require producer integrated-outcome acceptance.'
        }
    }
}
foreach ($moduleRef in $designModuleRefs) {
    if ($moduleRef -notmatch '^[a-z0-9][a-z0-9-]*(/[a-z0-9][a-z0-9-]*)+@\d+\.\d+\.\d+$') {
        Add-Issue -Scope task -Level error -Code 'design_module_reference_invalid' -Message "Invalid design-module reference: $moduleRef"
        continue
    }
    if (-not $registeredModules.ContainsKey($moduleRef)) {
        Add-Issue -Scope task -Level error -Code 'design_module_reference_missing' -Message "Task references an unregistered design module: $moduleRef"
        continue
    }
    $referencedModule = $registeredModules[$moduleRef]
    if ([string]$referencedModule.status -eq 'deprecated') {
        Add-Issue -Scope task -Level error -Code 'design_module_deprecated' -Message "Task references a deprecated design module: $moduleRef"
    }
    elseif ([string]$referencedModule.status -eq 'candidate') {
        Add-Issue -Scope task -Level warning -Code 'design_module_candidate' -Message "Task uses candidate design module $moduleRef; treat it as an experiment, not a default."
    }
}
if ($systemVersionAtLeast130) {
    if ([string]::IsNullOrWhiteSpace($moduleHarvest)) {
        Add-Issue -Scope task -Level error -Code 'module_harvest_missing' -Message 'TASK.md must declare Module harvest.'
    }
    elseif ($moduleHarvest -notin $knownModuleHarvest) {
        Add-Issue -Scope task -Level error -Code 'module_harvest_invalid' -Message "Unknown Module harvest value: $moduleHarvest"
    }
    elseif ($taskStatus -eq 'Accepted' -and $moduleHarvest -eq 'Pending') {
        Add-Issue -Scope task -Level error -Code 'module_harvest_pending' -Message 'Accepted tasks must finish module harvest.'
    }
}
if ([string]::IsNullOrWhiteSpace($guiRestoration)) {
    if ($systemVersionAtLeast122) {
        Add-Issue -Scope task -Level error -Code 'gui_restoration_missing' -Message 'TASK.md must declare GUI restoration as Required or Not applicable.'
    }
    else {
        Add-Issue -Scope task -Level warning -Code 'gui_restoration_legacy' -Message 'TASK.md has no GUI restoration field; add it when migrating to v1.2.2.'
    }
}
elseif ($guiRestoration -notin $knownGuiRestoration) {
    if ($systemVersionAtLeast130) {
        Add-Issue -Scope task -Level error -Code 'gui_restoration_invalid' -Message "Unknown GUI restoration value: $guiRestoration"
    }
    else {
        Add-Issue -Scope task -Level warning -Code 'gui_restoration_legacy_value' -Message 'Legacy GUI restoration detail is treated as Required; migrate the field to Required and move the baseline into ART_BIBLE/design modules.'
        $guiRestoration = 'Required'
    }
}
$guiRequired = ($guiRestoration -eq 'Required')

$taskLineCount = @($taskText -split "\r?\n").Count
if ($taskLineCount -gt 160 -or $taskText.Length -gt 24000) {
    Add-Issue -Scope task -Level warning -Code 'task_history_bloat' -Message 'TASK.md is carrying project history; archive completed natural checkpoints and keep only the active contract and current handoff.'
}

$highRisk = 0
if (-not [int]::TryParse($highRiskText, [ref]$highRisk)) {
    Add-Issue -Scope task -Level error -Code 'invalid_high_risk_count' -Message 'High-risk open decisions must be an integer.'
}
elseif ($taskStatus -ne 'Clarifying' -and $highRisk -gt 0) {
    Add-Issue -Scope task -Level error -Code 'unresolved_high_risk' -Message 'A task cannot leave Clarifying while high-risk decisions remain.'
}
elseif (
    $taskStatus -eq 'Clarifying' -and
    $highRisk -eq 0 -and
    $designStatus -in @('Frozen', 'Not applicable') -and
    -not [string]::IsNullOrWhiteSpace($implementationHandoff) -and
    $implementationHandoff -notmatch '(?i)^(TBD|Pending|None|Not applicable)$'
) {
    Add-Issue -Scope task -Level warning -Code 'clarifying_without_open_decision' -Message 'Clarifying has no open high-risk design or authority decision. If repair criteria are frozen, use Ready or Implementing instead of reopening clarification.'
}

if ($developmentMode -eq 'reference_replication' -and $taskStatus -in $activeStatuses) {
    $replicationContract = [ordered]@{
        'Reference baseline'               = $referenceBaseline
        'Replication scope'                = $replicationScope
        'Critical replication points'      = $criticalReplicationPoints
        'Comparison method and tolerances' = $comparisonMethod
        'Allowed deviations'               = $allowedDeviations
    }
    foreach ($replicationField in $replicationContract.GetEnumerator()) {
        if (
            [string]::IsNullOrWhiteSpace([string]$replicationField.Value) -or
            [string]$replicationField.Value -match '(?i)^(TBD|Pending|None|Not applicable)$'
        ) {
            Add-Issue -Scope task -Level error -Code 'reference_replication_contract_missing' -Message "reference_replication requires an explicit $($replicationField.Key) before implementation."
        }
    }
    if ($designStatus -ne 'Frozen') {
        Add-Issue -Scope task -Level error -Code 'reference_replication_not_deconstructed' -Message 'reference_replication cannot implement until the reference deconstruction and affected design outputs are Frozen.'
    }
}

if (
    $taskStatus -in $activeStatuses -and
    (
        (Test-RoleConflict -Left $reviewerRole -Right $ownerRole) -or
        (Test-RoleConflict -Left $reviewerRole -Right $integratorRole)
    )
) {
    Add-Issue -Scope task -Level error -Code 'reviewer_not_independent' -Message 'The declared reviewer role must differ from task ownership and integration roles.'
}

foreach ($requiredHeading in @(
    '## Goal and player value',
    '## Known facts',
    '## Assumptions',
    '## Decisions required',
    '## Allowed paths',
    '## Protected paths and behavior',
    '## Dependencies and risks',
    '## Acceptance',
    '## Result and handoff'
)) {
    if ($taskText -notmatch [Regex]::Escape($requiredHeading)) {
        Add-Issue -Scope task -Level error -Code 'missing_task_section' -Message "TASK.md is missing section: $requiredHeading"
    }
}

if (
    $taskStatus -in $activeStatuses -and
    $taskText -match '(?i)(?<![A-Za-z0-9_])TBD(?![A-Za-z0-9_])'
) {
    Add-Issue -Scope task -Level error -Code 'task_tbd_remaining' -Message 'TASK.md still contains unresolved TBD placeholders.'
}

if ($null -ne $project) {
    if (
        -not [string]::IsNullOrWhiteSpace($taskId) -and
        $taskId -ne 'TBD' -and
        [string]$project.currentTask -ne $taskId
    ) {
        Add-Issue -Scope task -Level error -Code 'current_task_mismatch' -Message "project.json currentTask '$($project.currentTask)' does not match TASK.md '$taskId'."
    }
    if (
        $taskStatus -in $knownStatuses -and
        [string]$project.status -ne $taskStatus
    ) {
        Add-Issue -Scope task -Level error -Code 'status_mismatch' -Message "project.json status '$($project.status)' does not match TASK.md '$taskStatus'."
    }
    if (
        $taskGate -in $knownGates -and
        [string]$project.gate -ne $taskGate
    ) {
        Add-Issue -Scope task -Level error -Code 'gate_mismatch' -Message "project.json gate '$($project.gate)' does not match TASK.md '$taskGate'."
    }
}

$entries = @()
if ($null -ne $manifest) {
    if ($null -eq $manifest.PSObject.Properties['schemaVersion']) {
        Add-Issue -Scope contract -Level error -Code 'manifest_schema_missing' -Message 'Evidence manifest schemaVersion is missing.'
    }
    if ($null -ne $manifest.entries) {
        $entries = @($manifest.entries)
    }
}

if ($systemVersionAtLeast140) {
    foreach ($acceptanceRecord in @(
        [pscustomobject]@{
            name      = 'Design acceptance'
            reference = Get-AcceptanceReference -Value $designAcceptance
        },
        [pscustomobject]@{
            name      = 'Producer acceptance'
            reference = Get-AcceptanceReference -Value $producerAcceptance
        }
    )) {
        $acceptanceReference = [string]$acceptanceRecord.reference
        if ([string]::IsNullOrWhiteSpace($acceptanceReference)) {
            continue
        }

        if ($acceptanceReference -match '^EV-\d{14}-[A-Za-z0-9]+$') {
            $matchingAcceptanceEvidence = @(
                $entries | Where-Object {
                    [string]$_.id -eq $acceptanceReference -and
                    [string]$_.taskId -eq $taskId -and
                    [string]$_.type -eq 'review' -and
                    [string]$_.verdict -eq 'Pass'
                }
            )
            if ($matchingAcceptanceEvidence.Count -eq 0) {
                Add-Issue -Scope task -Level error -Code 'acceptance_evidence_missing' -Message "$($acceptanceRecord.name) references no passing review evidence for the current task: $acceptanceReference"
            }
            continue
        }

        if ([System.IO.Path]::IsPathRooted($acceptanceReference)) {
            Add-Issue -Scope task -Level error -Code 'acceptance_record_absolute' -Message "$($acceptanceRecord.name) must reference an evidence ID or repository-relative review record."
            continue
        }

        try {
            $acceptanceRecordPath = [System.IO.Path]::GetFullPath(
                (Join-Path $projectRoot $acceptanceReference)
            )
            $projectPrefix = $projectRoot.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
            if (-not $acceptanceRecordPath.StartsWith($projectPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
                Add-Issue -Scope task -Level error -Code 'acceptance_record_outside_root' -Message "$($acceptanceRecord.name) review record leaves the project root."
            }
            elseif (
                -not (Test-Path -LiteralPath $acceptanceRecordPath -PathType Leaf) -or
                (Get-Item -LiteralPath $acceptanceRecordPath).Length -le 0
            ) {
                Add-Issue -Scope task -Level error -Code 'acceptance_record_missing' -Message "$($acceptanceRecord.name) review record is missing or empty: $acceptanceReference"
            }
        }
        catch {
            Add-Issue -Scope task -Level error -Code 'acceptance_record_invalid' -Message "$($acceptanceRecord.name) has an invalid review-record reference: $acceptanceReference"
        }
    }
}

$referencedEvidenceIds = @{}
foreach ($match in [Regex]::Matches($taskText, 'EV-\d{14}-[A-Za-z0-9]+')) {
    $referencedEvidenceIds[$match.Value] = $true
}

$seenEvidenceIds = @{}
foreach ($entry in $entries) {
    foreach ($fieldName in @(
        'id',
        'taskId',
        'gate',
        'type',
        'location',
        'verdict'
    )) {
        if (
            $null -eq $entry.PSObject.Properties[$fieldName] -or
            [string]::IsNullOrWhiteSpace([string]$entry.$fieldName)
        ) {
            Add-Issue -Scope contract -Level error -Code 'evidence_field_missing' -Message "Evidence entry is missing $fieldName."
        }
    }

    $entryId = [string]$entry.id
    $strictEvidenceCheck = (
        $AuditHistory -or
        [string]$entry.taskId -eq $taskId -or
        $referencedEvidenceIds.ContainsKey($entryId)
    )
    if (-not [string]::IsNullOrWhiteSpace($entryId)) {
        if ($seenEvidenceIds.ContainsKey($entryId)) {
            Add-Issue -Scope contract -Level error -Code 'duplicate_evidence_id' -Message "Duplicate evidence ID: $entryId"
        }
        else {
            $seenEvidenceIds[$entryId] = $true
        }
    }
    if ($entry.gate -notin $knownGates) {
        Add-Issue -Scope contract -Level error -Code 'invalid_evidence_gate' -Message "Evidence $entryId has invalid gate: $($entry.gate)"
    }
    if ($entry.type -notin $knownEvidenceTypes) {
        Add-Issue -Scope contract -Level error -Code 'invalid_evidence_type' -Message "Evidence $entryId has invalid type: $($entry.type)"
    }
    if ($entry.verdict -notin $knownEvidenceVerdicts) {
        Add-Issue -Scope contract -Level error -Code 'invalid_evidence_verdict' -Message "Evidence $entryId has invalid verdict: $($entry.verdict)"
    }
    if (
        $strictEvidenceCheck -and
        $entry.type -eq 'review' -and
        $entry.verdict -eq 'Pass' -and
        [string]::IsNullOrWhiteSpace([string]$entry.reviewerRole)
    ) {
        Add-Issue -Scope contract -Level error -Code 'passing_review_role_missing' -Message "Passing review $entryId has no reviewerRole."
    }
    if (
        $strictEvidenceCheck -and
        $entry.type -eq 'provenance' -and
        $entry.verdict -eq 'Pass' -and
        -not (Test-ProvenanceComplete -Entry $entry)
    ) {
        Add-Issue -Scope contract -Level error -Code 'passing_provenance_incomplete' -Message "Passing provenance $entryId lacks tool, sourceInputs, edits, license, or reviewer."
    }
    if (
        $strictEvidenceCheck -and
        $entry.type -eq 'gui' -and
        $entry.verdict -eq 'Pass' -and
        (
            [string]::IsNullOrWhiteSpace([string]$entry.designBaseline) -or
            [string]::IsNullOrWhiteSpace([string]$entry.resolution) -or
            [string]::IsNullOrWhiteSpace([string]$entry.notes)
        )
    ) {
        Add-Issue -Scope contract -Level error -Code 'passing_gui_incomplete' -Message "Passing gui evidence $entryId requires designBaseline, resolution, and comparison notes."
    }

    if (
        $strictEvidenceCheck -and
        (Test-LocalEvidenceLocation -Location ([string]$entry.location))
    ) {
        try {
            $candidatePath = if ([System.IO.Path]::IsPathRooted([string]$entry.location)) {
                [System.IO.Path]::GetFullPath([string]$entry.location)
            }
            else {
                [System.IO.Path]::GetFullPath(
                    (Join-Path $projectRoot ([string]$entry.location))
                )
            }
        }
        catch {
            Add-Issue -Scope contract -Level error -Code 'evidence_path_invalid' -Message "Evidence $entryId has an invalid local path."
            continue
        }

        if (-not (Test-Path -LiteralPath $candidatePath -PathType Leaf)) {
            Add-Issue -Scope contract -Level error -Code 'evidence_file_missing' -Message "Evidence file is missing for $entryId`: $candidatePath"
            continue
        }

        $fileInfo = Get-Item -LiteralPath $candidatePath
        if ($fileInfo.Length -le 0) {
            Add-Issue -Scope contract -Level error -Code 'evidence_file_empty' -Message "Evidence file is empty for $entryId."
        }
        if ($null -eq $entry.sizeBytes) {
            Add-Issue -Scope contract -Level warning -Code 'evidence_size_missing' -Message "Local evidence $entryId has no sizeBytes."
        }
        elseif ([int64]$entry.sizeBytes -ne $fileInfo.Length) {
            Add-Issue -Scope contract -Level error -Code 'evidence_size_mismatch' -Message "Evidence size changed for $entryId."
        }
        if ([string]::IsNullOrWhiteSpace([string]$entry.sha256)) {
            Add-Issue -Scope contract -Level warning -Code 'evidence_hash_missing' -Message "Local evidence $entryId has no SHA-256."
        }
        else {
            $actualHash = (Get-FileHash -LiteralPath $candidatePath -Algorithm SHA256).Hash.ToLowerInvariant()
            if ($actualHash -ne ([string]$entry.sha256).ToLowerInvariant()) {
                Add-Issue -Scope contract -Level error -Code 'evidence_hash_mismatch' -Message "Evidence hash changed for $entryId."
            }
        }

        if (
            $entry.type -eq 'screenshot' -and
            -not [string]::IsNullOrWhiteSpace([string]$entry.resolution)
        ) {
            $resolutionMatch = [Regex]::Match(
                [string]$entry.resolution,
                '^(?<w>\d+)[xX×](?<h>\d+)$'
            )
            if (-not $resolutionMatch.Success) {
                Add-Issue -Scope contract -Level error -Code 'evidence_resolution_invalid' -Message "Screenshot $entryId has invalid resolution syntax."
            }
            else {
                $dimensions = Get-ImageDimensions -Path $candidatePath
                if ($null -eq $dimensions) {
                    Add-Issue -Scope contract -Level warning -Code 'evidence_dimensions_unavailable' -Message "Could not inspect screenshot dimensions for $entryId."
                }
                elseif (
                    $dimensions.width -ne [int]$resolutionMatch.Groups['w'].Value -or
                    $dimensions.height -ne [int]$resolutionMatch.Groups['h'].Value
                ) {
                    Add-Issue -Scope contract -Level error -Code 'evidence_resolution_mismatch' -Message "Screenshot dimensions changed for $entryId."
                }
            }
        }
    }
}

$evidenceRoot = [System.IO.Path]::GetFullPath(
    (Join-Path $projectRoot 'production\evidence')
)
$evidenceRootPrefix = $evidenceRoot.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
$externalEvidenceRoot = [System.IO.Path]::GetFullPath(
    (Join-Path $evidenceRoot 'external')
)
$externalEvidencePrefix = $externalEvidenceRoot.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
$registeredDurableEvidencePaths = @{}
foreach ($entry in $entries) {
    $location = [string]$entry.location
    if (-not (Test-LocalEvidenceLocation -Location $location)) {
        continue
    }
    try {
        $registeredPath = if ([System.IO.Path]::IsPathRooted($location)) {
            [System.IO.Path]::GetFullPath($location)
        }
        else {
            [System.IO.Path]::GetFullPath((Join-Path $projectRoot $location))
        }
        if ($registeredPath.StartsWith($evidenceRootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
            $registeredDurableEvidencePaths[$registeredPath.ToLowerInvariant()] = $true
        }
    }
    catch {
        continue
    }
}

$durableEvidenceFiles = @()
$rawEvidenceDirectories = @()
$unregisteredDurableEvidenceFiles = @()
if (Test-Path -LiteralPath $evidenceRoot -PathType Container) {
    $durableEvidenceFiles = @(
        Get-ChildItem -LiteralPath $evidenceRoot -Recurse -File -ErrorAction SilentlyContinue |
            Where-Object {
                $_.Name -ne 'manifest.json' -and
                -not $_.FullName.StartsWith(
                    $externalEvidencePrefix,
                    [System.StringComparison]::OrdinalIgnoreCase
                )
            }
    )
    $rawEvidenceDirectories = @(
        Get-ChildItem -LiteralPath $evidenceRoot -Recurse -Directory -ErrorAction SilentlyContinue |
            Where-Object {
                -not $_.FullName.StartsWith(
                    $externalEvidencePrefix,
                    [System.StringComparison]::OrdinalIgnoreCase
                ) -and
                $_.Name -match '(?i)(^|[-_.])(frames?|states?|stems?|raw|scratch|temp|tmp)([-_.]|$)'
            }
    )
    $unregisteredDurableEvidenceFiles = @(
        $durableEvidenceFiles | Where-Object {
            -not $registeredDurableEvidencePaths.ContainsKey(
                ([System.IO.Path]::GetFullPath($_.FullName)).ToLowerInvariant()
            )
        }
    )
}
if ($rawEvidenceDirectories.Count -gt 0) {
    $examples = @(
        $rawEvidenceDirectories |
            Select-Object -First 3 |
            ForEach-Object { $_.FullName.Substring($evidenceRootPrefix.Length) }
    ) -join ', '
    Add-Issue -Scope contract -Level error -Code 'raw_evidence_directory' -Message "production/evidence contains $($rawEvidenceDirectories.Count) raw/scratch directories ($examples). Move raw frames, state matrices, stems, logs, and experiments to task-owned scratch, then promote only final registered artifacts."
}
if ($unregisteredDurableEvidenceFiles.Count -gt 0) {
    Add-Issue -Scope contract -Level warning -Code 'unregistered_durable_evidence' -Message "production/evidence contains $($unregisteredDurableEvidenceFiles.Count) unregistered durable files. Register promoted artifacts or move intermediates to task-owned scratch."
}

$taskEntries = @($entries | Where-Object { $_.taskId -eq $taskId })
$passingTaskEntries = @(
    $taskEntries | Where-Object { [string]$_.verdict -eq 'Pass' }
)
$cleanPassingTaskEntries = @(
    $passingTaskEntries | Where-Object {
        $sourceDirtyProperty = $_.PSObject.Properties['sourceDirty']
        $null -ne $sourceDirtyProperty -and $sourceDirtyProperty.Value -eq $false
    }
)
if (
    $executionLane -in @('Standard', 'Full') -and
    $taskStatus -in @('Implementing', 'Functionally Verified', 'Visually Approved', 'Accepted') -and
    $passingTaskEntries.Count -gt 0 -and
    $cleanPassingTaskEntries.Count -eq 0
) {
    Add-Issue -Scope task -Level warning -Code 'recoverable_checkpoint_missing' -Message 'Current Standard/Full passing evidence is not tied to an explicitly clean source state. Create a recoverable scoped commit, patch, or source archive before acceptance.'
}
$visualAcceptanceMatch = [Regex]::Match(
    $taskText,
    '(?s)### Visual and UX\s*(?<body>.*?)(?=### Evidence)'
)
$visualEvidenceRequired = (
    $visualAcceptanceMatch.Success -and
    $visualAcceptanceMatch.Groups['body'].Value -notmatch 'Not applicable'
)
if (
    $guiRequired -and
    (
        -not $visualAcceptanceMatch.Success -or
        $visualAcceptanceMatch.Groups['body'].Value -match 'Not applicable'
    )
) {
    Add-Issue -Scope task -Level error -Code 'gui_visual_acceptance_missing' -Message 'GUI restoration requires explicit Visual and UX acceptance criteria.'
}
$independentTaskReviews = @(
    $taskEntries | Where-Object {
        Test-IndependentReview -Entry $_ -OwnerRole $ownerRole -IntegratorRole $integratorRole
    }
)

if ($taskStatus -eq 'Functionally Verified') {
    if ((Get-PassingEntries -Entries $taskEntries -Types @('test', 'build')).Count -eq 0) {
        Add-Issue -Scope task -Level error -Code 'missing_functional_evidence' -Message 'Functionally Verified requires passing test or build evidence.'
    }
}

if ($taskStatus -eq 'Visually Approved') {
    if ((Get-PassingEntries -Entries $taskEntries -Types @('screenshot', 'video')).Count -eq 0) {
        Add-Issue -Scope task -Level error -Code 'missing_visual_evidence' -Message 'Visually Approved requires passing runtime screenshot or video evidence.'
    }
    if ($independentTaskReviews.Count -eq 0) {
        Add-Issue -Scope task -Level error -Code 'missing_independent_visual_review' -Message 'Visually Approved requires a passing independent review.'
    }
    if (
        $guiRequired -and
        (Get-PassingEntries -Entries $taskEntries -Types @('gui')).Count -eq 0
    ) {
        Add-Issue -Scope task -Level error -Code 'missing_gui_comparison' -Message 'GUI restoration requires passing gui comparison evidence.'
    }
}

if ($taskStatus -eq 'Accepted') {
    if ($taskEntries.Count -eq 0) {
        Add-Issue -Scope task -Level error -Code 'missing_acceptance_evidence' -Message 'Accepted requires registered evidence.'
    }
    if (
        (Get-PassingEntries -Entries $taskEntries -Types @('test', 'build')).Count -eq 0 -and
        $taskGate -ne 'G0' -and
        -not ($taskGate -eq 'G1' -and $validationMode -eq 'creative_first')
    ) {
        Add-Issue -Scope task -Level error -Code 'missing_acceptance_functional' -Message 'Accepted requires passing test or build evidence outside G0.'
    }
    $independentAcceptanceReviewRequired = (
        $executionLane -eq 'Full' -or
        $taskGate -in @('G2', 'G3') -or
        (
            $executionLane -eq 'Standard' -and
            $reviewerRole -notin @('Not applicable', 'None')
        )
    )
    if ($independentAcceptanceReviewRequired -and $independentTaskReviews.Count -eq 0) {
        Add-Issue -Scope task -Level error -Code 'missing_independent_acceptance_review' -Message 'Accepted requires a passing independent review.'
    }
    if (
        $visualEvidenceRequired -and
        (Get-PassingEntries -Entries $taskEntries -Types @('screenshot', 'video')).Count -eq 0
    ) {
        Add-Issue -Scope task -Level error -Code 'missing_acceptance_visual' -Message 'This task declares visual/UX acceptance, so Accepted requires passing runtime visual evidence.'
    }
    if (
        $guiRequired -and
        (Get-PassingEntries -Entries $taskEntries -Types @('gui')).Count -eq 0
    ) {
        Add-Issue -Scope task -Level error -Code 'missing_gui_comparison' -Message 'Accepted GUI restoration requires passing gui comparison evidence.'
    }
}

$gitValid = Test-OwnGitRepository -Path $projectRoot
if (-not $gitValid) {
    if ($null -ne $project -and $project.gate -ne 'G0') {
        Add-Issue -Scope contract -Level error -Code 'git_invalid_after_g0' -Message 'Beyond G0, the governance root must be its own valid Git repository.'
    }
    else {
        Add-Issue -Scope contract -Level warning -Code 'git_invalid' -Message 'The governance root is not its own valid Git repository.'
    }
}
else {
    $hasCommit = Test-GitHasCommit -Path $projectRoot
    if (-not $hasCommit) {
        if ($null -ne $project -and $project.gate -ne 'G0') {
            Add-Issue -Scope contract -Level error -Code 'git_no_commit_after_g0' -Message 'Beyond G0, the governance repository must have a baseline commit.'
        }
        else {
            Add-Issue -Scope contract -Level warning -Code 'git_no_commit' -Message 'The governance repository has no baseline commit.'
        }
    }

    $untrackedGovernance = New-Object System.Collections.Generic.List[string]
    foreach ($relative in $requiredFiles) {
        if (
            (Test-Path -LiteralPath (Join-Path $projectRoot $relative) -PathType Leaf) -and
            -not (Test-GitPathTracked -Path $projectRoot -RelativePath $relative)
        ) {
            $untrackedGovernance.Add($relative)
        }
    }
    if ($untrackedGovernance.Count -gt 0) {
        $message = 'Governance files are not tracked: ' + ($untrackedGovernance -join ', ')
        if ($null -ne $project -and $project.gate -ne 'G0') {
            Add-Issue -Scope contract -Level error -Code 'governance_untracked_after_g0' -Message $message
        }
        else {
            Add-Issue -Scope contract -Level warning -Code 'governance_untracked' -Message $message
        }
    }
}

if ($null -ne $project -and $project.gitPolicy -eq 'multi_repo') {
    foreach ($component in @($project.components)) {
        if ($component.gitRequired -eq $true) {
            $componentPath = Join-Path $projectRoot ([string]$component.path)
            $resolvedComponentPath = [System.IO.Path]::GetFullPath($componentPath).TrimEnd('\', '/')
            if ($resolvedComponentPath -eq $projectRoot.TrimEnd('\', '/')) {
                continue
            }
            if (-not (Test-Path -LiteralPath $componentPath -PathType Container)) {
                Add-Issue -Scope contract -Level error -Code 'component_missing' -Message "Declared component is missing: $($component.name) at $($component.path)"
            }
            elseif (-not (Test-OwnGitRepository -Path $componentPath)) {
                Add-Issue -Scope contract -Level error -Code 'component_git_invalid' -Message "Component must be its own valid Git repository: $($component.name) at $($component.path)"
            }
            elseif (
                $project.gate -ne 'G0' -and
                -not (Test-GitHasCommit -Path $componentPath)
            ) {
                Add-Issue -Scope contract -Level error -Code 'component_git_no_commit' -Message "Component has no baseline commit: $($component.name) at $($component.path)"
            }
        }
    }
}

$projectContractPath = Join-Path $projectRoot 'production\PROJECT.md'
$projectContract = ''
if (Test-Path -LiteralPath $projectContractPath -PathType Leaf) {
    $projectContract = Get-Content -LiteralPath $projectContractPath -Raw -Encoding UTF8
    foreach ($requiredHeading in @(
        '## Product',
        '## Components and repository boundaries',
        '## Core experience',
        '## Success and stop criteria',
        '## First proof',
        '## Golden vertical slice',
        '## Non-goals',
        '## Frozen decisions',
        '## Maintenance ownership'
    )) {
        if ($projectContract -notmatch [Regex]::Escape($requiredHeading)) {
            Add-Issue -Scope contract -Level error -Code 'missing_project_section' -Message "PROJECT.md is missing section: $requiredHeading"
        }
    }
    if (
        $null -ne $project -and
        $project.gate -ne 'G0' -and
        $projectContract -match '(?i)(?<![A-Za-z0-9_])TBD(?![A-Za-z0-9_])'
    ) {
        Add-Issue -Scope contract -Level error -Code 'project_contract_tbd' -Message 'PROJECT.md still contains TBD fields beyond G0.'
    }
}

$artBiblePath = Join-Path $projectRoot 'docs\ART_BIBLE.md'
$artBibleText = ''
if (Test-Path -LiteralPath $artBiblePath -PathType Leaf) {
    $artBibleText = Get-Content -LiteralPath $artBiblePath -Raw -Encoding UTF8
}
$guiContractMatch = [Regex]::Match(
    $artBibleText,
    '(?s)## GUI restoration contract\s*(?<body>.*?)(?=\r?\n## |\z)'
)
if (
    $guiRequired -and
    $taskStatus -in $activeStatuses -and
    (
        -not $guiContractMatch.Success -or
        $guiContractMatch.Groups['body'].Value -match (
            '(?i)(?<![A-Za-z0-9_])TBD(?![A-Za-z0-9_])|Not applicable'
        )
    )
) {
    Add-Issue -Scope task -Level error -Code 'gui_contract_incomplete' -Message 'Required GUI restoration needs a complete ART_BIBLE design baseline, state matrix, tolerances, and reviewer.'
}

$acceptancePath = Join-Path $projectRoot 'production\ACCEPTANCE.md'
$acceptanceText = ''
if (Test-Path -LiteralPath $acceptancePath -PathType Leaf) {
    $acceptanceText = Get-Content -LiteralPath $acceptancePath -Raw -Encoding UTF8
}

if ($Mode -eq 'Gate' -and $null -ne $project) {
    $gateEntries = if ($systemVersionAtLeast130) {
        @(
            $entries | Where-Object {
                $_.gate -eq $project.gate -and
                (
                    $_.taskId -eq $taskId -or
                    $referencedEvidenceIds.ContainsKey([string]$_.id)
                )
            }
        )
    }
    else {
        @($entries | Where-Object { $_.gate -eq $project.gate })
    }
    $passingGateEntries = @($gateEntries | Where-Object { $_.verdict -eq 'Pass' })
    $readinessEntries = @($gateEntries)

    if ($taskStatus -ne 'Accepted' -or [string]$project.status -ne 'Accepted') {
        Add-Issue -Scope gate -Level error -Code 'gate_task_not_accepted' -Message 'Gate readiness requires both TASK.md and project.json status Accepted.'
    }
    if (
        $project.gate -in @('G1', 'G2', 'G3') -and
        $acceptanceText -match '(?i)(?<![A-Za-z0-9_])TBD(?![A-Za-z0-9_])'
    ) {
        Add-Issue -Scope gate -Level error -Code 'acceptance_contract_tbd' -Message 'A post-G0 gate cannot pass while ACCEPTANCE.md contains TBD placeholders.'
    }
    if ($project.gate -in @('G1', 'G2', 'G3') -and $gitValid) {
        $freshPassingGateEntries = [System.Collections.Generic.List[object]]::new()
        $workingChanges = @(Get-GitRelevantWorkingChanges -Path $projectRoot)
        if ($workingChanges.Count -gt 0) {
            Add-Issue -Scope gate -Level error -Code 'gate_source_dirty' -Message 'Gate review has uncommitted implementation or contract changes outside task/evidence state.'
        }

        foreach ($entry in $passingGateEntries) {
            $entryId = [string]$entry.id
            $revision = [string]$entry.sourceRevision
            $dirtyProperty = $entry.PSObject.Properties['sourceDirty']
            $entryTaskFingerprint = [string]$entry.taskFingerprint
            if ([string]::IsNullOrWhiteSpace($entryTaskFingerprint)) {
                Add-Issue -Scope gate -Level warning -Code 'task_fingerprint_missing' -Message "Evidence $entryId has no task contract fingerprint and is retained as history only."
                if (-not $systemVersionAtLeast122) {
                    $freshPassingGateEntries.Add($entry)
                }
                continue
            }
            if ($entryTaskFingerprint -ne $currentTaskFingerprint) {
                Add-Issue -Scope gate -Level warning -Code 'task_contract_stale' -Message "Evidence $entryId belongs to an earlier task contract and is retained as history only."
                continue
            }
            if ([string]::IsNullOrWhiteSpace($revision)) {
                Add-Issue -Scope gate -Level warning -Code 'evidence_revision_missing' -Message "Passing gate evidence $entryId has no sourceRevision and is retained as history only."
                if (-not $systemVersionAtLeast122) {
                    $freshPassingGateEntries.Add($entry)
                }
                continue
            }
            $sourceStateValid = $true
            if ($null -eq $dirtyProperty) {
                Add-Issue -Scope gate -Level warning -Code 'evidence_source_state_missing' -Message "Passing gate evidence $entryId has no sourceDirty state and is retained as history only."
                $sourceStateValid = (-not $systemVersionAtLeast122)
            }
            elseif ($dirtyProperty.Value -eq $true) {
                Add-Issue -Scope gate -Level warning -Code 'evidence_source_dirty' -Message "Passing gate evidence $entryId was captured from a materially dirty source state and is retained as history only."
                $sourceStateValid = $false
            }

            if (-not (Test-GitRevisionAncestor -Path $projectRoot -Revision $revision)) {
                Add-Issue -Scope gate -Level warning -Code 'evidence_revision_invalid' -Message "Evidence $entryId sourceRevision is not an ancestor of current HEAD and is retained as history only."
                continue
            }
            $changedSince = @(Get-GitRelevantChangesSince -Path $projectRoot -Revision $revision)
            if ($changedSince.Count -gt 0) {
                Add-Issue -Scope gate -Level warning -Code 'evidence_stale' -Message "Evidence $entryId predates relevant source or contract changes and is retained as history only."
                continue
            }
            if ($sourceStateValid) {
                $freshPassingGateEntries.Add($entry)
            }
        }
        $readinessEntries = @($freshPassingGateEntries)
    }

    $independentGateReviews = @(
        $readinessEntries | Where-Object {
            Test-IndependentReview -Entry $_ -OwnerRole $ownerRole -IntegratorRole $integratorRole
        }
    )
    $passingBuilds = Get-PassingEntries -Entries $readinessEntries -Types @('build')
    $passingFunctional = Get-PassingEntries -Entries $readinessEntries -Types @('test', 'build')
    $passingVisuals = Get-PassingEntries -Entries $readinessEntries -Types @('screenshot', 'video')
    $passingGui = Get-PassingEntries -Entries $readinessEntries -Types @('gui')
    $passingPerformance = Get-PassingEntries -Entries $readinessEntries -Types @('performance')
    $passingPlaytests = Get-PassingEntries -Entries $readinessEntries -Types @('playtest')
    $passingCreative = Get-PassingEntries -Entries $readinessEntries -Types @('creative')
    $passingCompleteProvenance = @(
        $readinessEntries | Where-Object {
            $_.type -eq 'provenance' -and
            $_.verdict -eq 'Pass' -and
            (Test-ProvenanceComplete -Entry $_)
        }
    )

    if ($project.gate -in @('G1', 'G2', 'G3') -and $independentGateReviews.Count -eq 0) {
        Add-Issue -Scope gate -Level error -Code 'missing_fresh_gate_review' -Message 'This gate requires a passing independent review from the current source revision.'
    }
    if ($project.gate -in @('G1', 'G2', 'G3') -and $guiRequired -and $passingGui.Count -eq 0) {
        Add-Issue -Scope gate -Level error -Code 'missing_fresh_gui_evidence' -Message 'GUI restoration requires passing comparison evidence from the current source revision.'
    }

    $artBibleRequired = (
        $project.gate -in @('G2', 'G3') -or
        (
            $project.gate -eq 'G1' -and
            'visual' -in @($project.qualityFocus)
        )
    )
    if (
        $artBibleRequired -and
        $artBibleText -match '(?i)(?<![A-Za-z0-9_])TBD(?![A-Za-z0-9_])'
    ) {
        Add-Issue -Scope gate -Level error -Code 'art_bible_tbd' -Message 'This visual gate cannot pass while ART_BIBLE.md contains TBD placeholders.'
    }

    switch ([string]$project.gate) {
        'G0' {
            if ($project.businessModel -eq 'undecided') {
                Add-Issue -Scope gate -Level error -Code 'g0_business_model_undecided' -Message 'G0 cannot pass with an undecided business model.'
            }
            if (@($project.platform).Count -eq 0) {
                Add-Issue -Scope gate -Level error -Code 'g0_platform_missing' -Message 'G0 requires at least one target platform.'
            }
            if ([string]::IsNullOrWhiteSpace([string]$project.engine)) {
                Add-Issue -Scope gate -Level error -Code 'g0_engine_missing' -Message 'G0 requires an engine decision.'
            }
            if ([string]::IsNullOrWhiteSpace([string]$project.canonicalClient)) {
                Add-Issue -Scope gate -Level error -Code 'g0_canonical_client_missing' -Message 'G0 requires a canonical client.'
            }
            if (@($project.components).Count -eq 0) {
                Add-Issue -Scope gate -Level error -Code 'g0_components_missing' -Message 'G0 requires repository and component boundaries.'
            }
            if ($projectContract -match '(?i)(?<![A-Za-z0-9_])TBD(?![A-Za-z0-9_])') {
                Add-Issue -Scope gate -Level error -Code 'g0_contract_tbd' -Message 'G0 cannot pass while PROJECT.md contains TBD placeholders.'
            }
            if (-not (Test-HumanPassage -Record $project.humanApprovals.G0 -AllowedDecisions $approvalPassDecisions)) {
                Add-Issue -Scope gate -Level error -Code 'missing_gate_g0_approval' -Message 'G0 gate readiness requires an approving human decision.'
            }
        }
        'G1' {
            $g1Decision = Get-HumanDecision -Record $project.humanApprovals.G1
            if ([string]::IsNullOrWhiteSpace($g1Decision)) {
                Add-Issue -Scope gate -Level error -Code 'missing_g1_decision' -Message 'G1 gate readiness requires an explicit human continue/revise/stop decision.'
            }
            elseif (-not (Test-HumanPassage -Record $project.humanApprovals.G1 -AllowedDecisions @('continue'))) {
                Add-Issue -Scope gate -Level error -Code 'g1_decision_blocks_passage' -Message "G1 decision '$g1Decision' does not grant passage; only continue does."
            }

            if ($validationMode -eq 'creative_first') {
                if ($passingCreative.Count -lt 3) {
                    Add-Issue -Scope gate -Level error -Code 'missing_creative_set' -Message 'G1 creative_first requires at least three passing original creative entries.'
                }
                if ($passingCompleteProvenance.Count -eq 0) {
                    Add-Issue -Scope gate -Level error -Code 'missing_creative_provenance' -Message 'G1 creative_first requires complete passing provenance.'
                }
                if ($passingPlaytests.Count -eq 0) {
                    Add-Issue -Scope gate -Level error -Code 'missing_creative_comprehension' -Message 'G1 creative_first requires passing first-seconds comprehension evidence.'
                }
            }
            else {
                if ($passingFunctional.Count -eq 0) {
                    Add-Issue -Scope gate -Level error -Code 'missing_g1_functional' -Message 'G1 product_first requires passing test or build evidence.'
                }
                if (
                    $project.projectTrack -eq 'indie_game' -and
                    $passingBuilds.Count -eq 0
                ) {
                    Add-Issue -Scope gate -Level error -Code 'missing_indie_build' -Message 'G1 indie_game requires a passing playable build.'
                }
                if ($project.projectTrack -eq 'mobile_game') {
                    if ($passingBuilds.Count -eq 0) {
                        Add-Issue -Scope gate -Level error -Code 'missing_mobile_build' -Message 'G1 mobile_game requires a passing target-class build.'
                    }
                    if ($passingPerformance.Count -eq 0) {
                        Add-Issue -Scope gate -Level error -Code 'missing_mobile_performance' -Message 'G1 mobile_game requires initial target-device performance evidence.'
                    }
                }
                if (
                    (
                        $project.projectTrack -eq 'indie_game' -or
                        'mechanics' -in @($project.qualityFocus)
                    ) -and
                    $passingPlaytests.Count -eq 0
                ) {
                    Add-Issue -Scope gate -Level error -Code 'missing_player_proof' -Message 'G1 requires passing player-promise or first-player comprehension evidence.'
                }
                if ('visual' -in @($project.qualityFocus)) {
                    if ($passingVisuals.Count -eq 0) {
                        Add-Issue -Scope gate -Level error -Code 'missing_g1_runtime_visual' -Message 'Visual focus requires passing runtime screenshot or video evidence.'
                    }
                    if (-not (Test-HumanPassage -Record $project.humanApprovals.goldenVisual -AllowedDecisions $approvalPassDecisions)) {
                        Add-Issue -Scope gate -Level error -Code 'missing_golden_visual_approval' -Message 'Visual gate readiness requires an approving human golden-visual decision.'
                    }
                }
            }
        }
        'G2' {
            if ($passingBuilds.Count -eq 0) {
                Add-Issue -Scope gate -Level error -Code 'missing_gate_build' -Message 'G2 requires a passing build from the reviewed state.'
            }
            if ($passingVisuals.Count -eq 0) {
                Add-Issue -Scope gate -Level error -Code 'missing_gate_visual' -Message 'G2 requires passing runtime visual evidence.'
            }
            if (-not (Test-HumanPassage -Record $project.humanApprovals.goldenVisual -AllowedDecisions $approvalPassDecisions)) {
                Add-Issue -Scope gate -Level error -Code 'missing_golden_visual_approval' -Message 'G2 requires an approving human golden-visual decision.'
            }
            if (-not (Test-HumanPassage -Record $project.humanApprovals.G2 -AllowedDecisions $approvalPassDecisions)) {
                Add-Issue -Scope gate -Level error -Code 'missing_gate_g2_approval' -Message 'G2 requires an approving human decision.'
            }
            if (
                $project.projectTrack -eq 'mobile_game' -and
                $passingPerformance.Count -eq 0
            ) {
                Add-Issue -Scope gate -Level error -Code 'missing_mobile_performance' -Message 'G2 mobile_game requires passing target-device performance evidence.'
            }
            if ($validationMode -eq 'creative_first') {
                if ($passingCreative.Count -eq 0) {
                    Add-Issue -Scope gate -Level error -Code 'missing_ad_to_game_contract' -Message 'G2 creative_first requires a passing ad-to-game creative contract.'
                }
                if ($passingPlaytests.Count -eq 0) {
                    Add-Issue -Scope gate -Level error -Code 'missing_internal_playtest' -Message 'G2 creative_first requires passing internal first-session player evidence.'
                }
            }
        }
        'G3' {
            if ($passingBuilds.Count -eq 0) {
                Add-Issue -Scope gate -Level error -Code 'missing_release_build' -Message 'G3 requires a passing release-candidate build.'
            }
            if ($passingVisuals.Count -eq 0) {
                Add-Issue -Scope gate -Level error -Code 'missing_release_visual' -Message 'G3 requires passing runtime release visuals.'
            }
            if ($passingPlaytests.Count -eq 0) {
                Add-Issue -Scope gate -Level error -Code 'missing_release_playtest' -Message 'G3 requires passing external player or market evidence.'
            }
            if ($passingCompleteProvenance.Count -eq 0) {
                Add-Issue -Scope gate -Level error -Code 'missing_release_provenance' -Message 'G3 requires complete passing release-asset provenance.'
            }
            if (
                $project.projectTrack -eq 'mobile_game' -and
                $passingPerformance.Count -eq 0
            ) {
                Add-Issue -Scope gate -Level error -Code 'missing_release_performance' -Message 'G3 mobile_game requires passing target-device performance evidence.'
            }
            if ($validationMode -eq 'creative_first') {
                $validUaTests = @(
                    $readinessEntries | Where-Object {
                        $_.type -eq 'ua_test' -and
                        $_.verdict -eq 'Pass' -and
                        (Test-UaMetrics -Entry $_)
                    }
                )
                if ($validUaTests.Count -eq 0) {
                    Add-Issue -Scope gate -Level error -Code 'missing_structured_ua_test' -Message 'G3 creative_first requires passing structured ua_test evidence.'
                }
            }
            if (-not (Test-HumanPassage -Record $project.humanApprovals.G3 -AllowedDecisions $approvalPassDecisions)) {
                Add-Issue -Scope gate -Level error -Code 'missing_gate_g3_approval' -Message 'G3 requires an approving human decision.'
            }
        }
    }
}

$contractErrorCount = @(
    $issues | Where-Object {
        $_.scope -eq 'contract' -and $_.level -eq 'error'
    }
).Count
$taskErrorCount = @(
    $issues | Where-Object {
        $_.scope -eq 'task' -and $_.level -eq 'error'
    }
).Count
$gateErrorCount = @(
    $issues | Where-Object {
        $_.scope -eq 'gate' -and $_.level -eq 'error'
    }
).Count
$warningCount = @($issues | Where-Object level -eq 'warning').Count
$contractValid = ($contractErrorCount -eq 0)
$taskStructurallyValid = ($taskErrorCount -eq 0)
$taskReady = (
    $contractValid -and
    $taskStructurallyValid -and
    $taskStatus -in $activeStatuses -and
    $highRisk -eq 0
)
$gateReady = (
    $Mode -eq 'Gate' -and
    $contractValid -and
    $taskStructurallyValid -and
    $gateErrorCount -eq 0
)
$valid = if ($Mode -eq 'Gate') {
    $gateReady
}
else {
    $contractValid -and $taskStructurallyValid
}

$resultProjectId = $null
$resultGate = $null
if ($null -ne $project) {
    $resultProjectId = [string]$project.projectId
    $resultGate = [string]$project.gate
}

$result = [ordered]@{
    valid          = $valid
    contractValid  = $contractValid
    taskReady      = $taskReady
    gateReady      = $gateReady
    projectPath    = $projectRoot
    mode           = $Mode
    policyVersion  = '1.5.8'
    systemVersion  = $systemVersion
    projectId      = $resultProjectId
    gate           = $resultGate
    validationMode = $validationMode
    developmentMode = $developmentMode
    executionLane  = $executionLane
    planningOwner  = $planningOwner
    planReference  = $planReference
    designStatus   = $designStatus
    designOwners   = $designOwners.Count
    technicalArchitectureOwner = $technicalArchitectureOwner
    designAcceptance = $designAcceptance
    producerAcceptanceOwner = $producerAcceptanceOwner
    producerAcceptance = $producerAcceptance
    designModules   = $designModuleRefs.Count
    taskId         = $taskId
    taskStatus     = $taskStatus
    evidence       = $taskEntries.Count
    durableEvidenceFiles = $durableEvidenceFiles.Count
    unregisteredEvidenceFiles = $unregisteredDurableEvidenceFiles.Count
    rawEvidenceDirectories = $rawEvidenceDirectories.Count
    historyAudited = [bool]$AuditHistory
    errors         = $contractErrorCount + $taskErrorCount + $gateErrorCount
    warnings       = $warningCount
    issues         = $issues.ToArray()
}

$result | ConvertTo-Json -Depth 12
if (-not $valid) {
    exit 1
}
