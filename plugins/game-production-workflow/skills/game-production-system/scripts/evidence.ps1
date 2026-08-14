[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectPath,

    [Parameter(Mandatory = $true)]
    [string]$TaskId,

    [Parameter(Mandatory = $true)]
    [ValidateSet('G0', 'G1', 'G2', 'G3')]
    [string]$Gate,

    [Parameter(Mandatory = $true)]
    [ValidateSet('test', 'build', 'screenshot', 'video', 'performance', 'playtest', 'review', 'provenance', 'creative', 'ua_test', 'gui')]
    [string]$Type,

    [string]$FilePath,

    [string]$Location,

    [ValidateSet('Pass', 'Fail', 'Informational', 'Pending')]
    [string]$Verdict = 'Informational',

    [string]$Device = '',

    [string]$Resolution = '',

    [string]$ReviewerRole = '',

    [string]$DesignBaseline = '',

    [string]$Notes = '',

    [string]$MetricsJson = '',

    [string]$ProvenanceJson = '',

    [switch]$AllowUniformImage
)

$ErrorActionPreference = 'Stop'

function Write-Utf8File {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Content
    )

    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Get-RelativeOrAbsolutePath {
    param(
        [Parameter(Mandatory = $true)][string]$Root,
        [Parameter(Mandatory = $true)][string]$Path
    )

    $rootWithSeparator = $Root.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
    $rootUri = New-Object System.Uri($rootWithSeparator)
    $pathUri = New-Object System.Uri($Path)

    if ($rootUri.IsBaseOf($pathUri)) {
        return [System.Uri]::UnescapeDataString($rootUri.MakeRelativeUri($pathUri).ToString()).Replace('/', '\')
    }

    return $Path
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
    $mutableFields = @('Status', 'Result', 'Evidence IDs', 'Module harvest', 'Next action')
    $projectStatePath = Join-Path $Root 'production\project.json'
    if (Test-Path -LiteralPath $projectStatePath -PathType Leaf) {
        try {
            $fingerprintProject = Get-Content -LiteralPath $projectStatePath -Raw -Encoding UTF8 | ConvertFrom-Json
            $fingerprintVersion = [version]([string]$fingerprintProject.systemVersion)
            if ($fingerprintVersion -ge [version]'1.7.1') {
                $mutableFields += @('Unresolved risks', 'Stop/replan triggers')
            }
        }
        catch {
            # Invalid project metadata is reported by check.ps1; preserve the legacy fingerprint here.
        }
    }
    $mutableFieldPattern = ($mutableFields | ForEach-Object { [Regex]::Escape($_) }) -join '|'
    $text = Get-Content -LiteralPath $taskPath -Raw -Encoding UTF8
    $contractText = [Regex]::Replace(
        $text,
        "(?m)^- ($mutableFieldPattern):.*(?:\r?\n)?",
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

function Get-GitSourceState {
    param([Parameter(Mandatory = $true)][string]$Root)

    $state = [ordered]@{
        sourceRevision = $null
        sourceDirty    = $null
    }
    if (-not (Test-Path -LiteralPath (Join-Path $Root '.git'))) {
        return [pscustomobject]$state
    }

    $gitCommand = Get-Command git -ErrorAction SilentlyContinue
    if ($null -eq $gitCommand) {
        return [pscustomobject]$state
    }

    $safePath = ([System.IO.Path]::GetFullPath($Root)).Replace('\', '/')
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'SilentlyContinue'
        $head = @(
            & $gitCommand.Source -c "safe.directory=$safePath" -C $Root rev-parse --verify HEAD 2>$null
        )
        if ($LASTEXITCODE -ne 0) {
            return [pscustomobject]$state
        }
        $state.sourceRevision = [string]($head | Select-Object -Last 1)

        $status = @(
            & $gitCommand.Source -c "safe.directory=$safePath" -C $Root status --porcelain=v1 --untracked-files=all 2>$null
        )
        if ($LASTEXITCODE -eq 0) {
            $relevant = @(
                $status | Where-Object {
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
            $state.sourceDirty = ($relevant.Count -gt 0)
        }
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    return [pscustomobject]$state
}

function Test-Screenshot {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [string]$ExpectedResolution,
        [switch]$AllowUniform
    )

    Add-Type -AssemblyName System.Drawing
    $bitmap = New-Object System.Drawing.Bitmap($Path)
    try {
        if ($bitmap.Width -lt 2 -or $bitmap.Height -lt 2) {
            throw "Screenshot dimensions are invalid: $($bitmap.Width)x$($bitmap.Height)"
        }

        if (-not [string]::IsNullOrWhiteSpace($ExpectedResolution)) {
            $match = [Regex]::Match($ExpectedResolution, '^(?<w>\d+)[xX×](?<h>\d+)$')
            if (-not $match.Success) {
                throw "Resolution must look like 1280x720: $ExpectedResolution"
            }
            $expectedWidth = [int]$match.Groups['w'].Value
            $expectedHeight = [int]$match.Groups['h'].Value
            if ($bitmap.Width -ne $expectedWidth -or $bitmap.Height -ne $expectedHeight) {
                throw "Screenshot is $($bitmap.Width)x$($bitmap.Height), expected ${expectedWidth}x${expectedHeight}."
            }
        }

        $minR = 255
        $minG = 255
        $minB = 255
        $maxR = 0
        $maxG = 0
        $maxB = 0
        $luminances = New-Object System.Collections.Generic.List[double]
        $quantizedColors = @{}
        $darkSamples = 0
        $sampleGrid = 32

        for ($gridX = 0; $gridX -lt $sampleGrid; $gridX++) {
            for ($gridY = 0; $gridY -lt $sampleGrid; $gridY++) {
                $xFactor = ($gridX + 0.5) / $sampleGrid
                $yFactor = ($gridY + 0.5) / $sampleGrid
                $x = [Math]::Min($bitmap.Width - 1, [Math]::Max(0, [int](($bitmap.Width - 1) * $xFactor)))
                $y = [Math]::Min($bitmap.Height - 1, [Math]::Max(0, [int](($bitmap.Height - 1) * $yFactor)))
                $pixel = $bitmap.GetPixel($x, $y)
                $minR = [Math]::Min($minR, $pixel.R)
                $minG = [Math]::Min($minG, $pixel.G)
                $minB = [Math]::Min($minB, $pixel.B)
                $maxR = [Math]::Max($maxR, $pixel.R)
                $maxG = [Math]::Max($maxG, $pixel.G)
                $maxB = [Math]::Max($maxB, $pixel.B)

                $luminance = (0.2126 * $pixel.R) + (0.7152 * $pixel.G) + (0.0722 * $pixel.B)
                $luminances.Add($luminance)
                if ($luminance -lt 35) {
                    $darkSamples++
                }

                $quantizedKey = '{0}-{1}-{2}' -f [int]($pixel.R / 16), [int]($pixel.G / 16), [int]($pixel.B / 16)
                $quantizedColors[$quantizedKey] = $true
            }
        }

        $range = [Math]::Max(
            [Math]::Max($maxR - $minR, $maxG - $minG),
            $maxB - $minB
        )

        $meanLuminance = 0.0
        foreach ($value in $luminances) {
            $meanLuminance += $value
        }
        $meanLuminance /= $luminances.Count

        $variance = 0.0
        foreach ($value in $luminances) {
            $variance += [Math]::Pow($value - $meanLuminance, 2)
        }
        $standardDeviation = [Math]::Sqrt($variance / $luminances.Count)
        $darkPercent = 100.0 * $darkSamples / $luminances.Count
        $lowInformation = (
            $range -lt 4 -or
            ($standardDeviation -lt 12 -and $quantizedColors.Count -lt 16) -or
            $darkPercent -gt 95
        )

        if ($lowInformation -and -not $AllowUniform) {
            throw (
                'Screenshot has very low visual information and may be blank or invalid ' +
                "(std=$([Math]::Round($standardDeviation, 1)), colors=$($quantizedColors.Count), dark=$([Math]::Round($darkPercent, 1))%). " +
                'Use -AllowUniformImage only with an explicit review reason.'
            )
        }

        return [ordered]@{
            width             = $bitmap.Width
            height            = $bitmap.Height
            sampleRange       = $range
            luminanceStdDev   = [Math]::Round($standardDeviation, 2)
            quantizedColors   = $quantizedColors.Count
            darkSamplePercent = [Math]::Round($darkPercent, 2)
        }
    }
    finally {
        $bitmap.Dispose()
    }
}

$projectRoot = [System.IO.Path]::GetFullPath($ProjectPath)
if (-not (Test-Path -LiteralPath $projectRoot -PathType Container)) {
    throw "Project directory does not exist: $projectRoot"
}
$projectRoot = (Resolve-Path -LiteralPath $projectRoot).Path
$sourceState = Get-GitSourceState -Root $projectRoot
$taskFingerprint = Get-TaskContractFingerprint -Root $projectRoot

if ([string]::IsNullOrWhiteSpace($FilePath) -eq [string]::IsNullOrWhiteSpace($Location)) {
    throw 'Provide exactly one of -FilePath or -Location.'
}

$manifestPath = Join-Path $projectRoot 'production\evidence\manifest.json'
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "Evidence manifest is missing: $manifestPath"
}

$artifactLocation = $Location
$sha256 = $null
$sizeBytes = $null
$imageInfo = $null
$metrics = $null
$provenance = $null

if ($Type -eq 'ua_test') {
    if ([string]::IsNullOrWhiteSpace($MetricsJson)) {
        throw 'ua_test evidence requires -MetricsJson.'
    }

    try {
        $metrics = $MetricsJson | ConvertFrom-Json
    }
    catch {
        throw "MetricsJson is invalid JSON: $($_.Exception.Message)"
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
        if ($null -eq $metrics.PSObject.Properties[$metricName]) {
            throw "MetricsJson is missing required metric: $metricName"
        }
    }
    if (
        [string]::IsNullOrWhiteSpace([string]$metrics.region) -or
        [string]::IsNullOrWhiteSpace([string]$metrics.currency)
    ) {
        throw 'UA region and currency must be non-empty.'
    }

    try {
        $spend = [double]$metrics.spend
        $impressions = [double]$metrics.impressions
        $installs = [double]$metrics.installs
        $cpi = [double]$metrics.cpi
        $ipm = [double]$metrics.ipm
        $d1Retention = [double]$metrics.d1Retention
    }
    catch {
        throw 'UA numeric metrics must be valid numbers.'
    }

    if ($spend -lt 0 -or $impressions -lt 0 -or $installs -lt 0 -or $cpi -lt 0 -or $ipm -lt 0) {
        throw 'UA numeric metrics cannot be negative.'
    }
    if ($impressions -ne [Math]::Floor($impressions) -or $installs -ne [Math]::Floor($installs)) {
        throw 'impressions and installs must be whole numbers.'
    }
    if ($installs -gt $impressions) {
        throw 'installs cannot exceed impressions.'
    }
    if ($d1Retention -lt 0 -or $d1Retention -gt 1) {
        throw 'd1Retention must be a ratio from 0 to 1.'
    }
}

if ($Type -eq 'provenance') {
    if (-not [string]::IsNullOrWhiteSpace($ProvenanceJson)) {
        try {
            $provenance = $ProvenanceJson | ConvertFrom-Json
        }
        catch {
            throw "ProvenanceJson is invalid JSON: $($_.Exception.Message)"
        }
    }

    $requiredProvenanceFields = @(
        'tool',
        'sourceInputs',
        'edits',
        'license',
        'reviewer'
    )
    $missingProvenanceFields = New-Object System.Collections.Generic.List[string]
    foreach ($fieldName in $requiredProvenanceFields) {
        $field = if ($null -ne $provenance) {
            $provenance.PSObject.Properties[$fieldName]
        }
        else {
            $null
        }
        if (
            $null -eq $field -or
            [string]::IsNullOrWhiteSpace([string]$field.Value)
        ) {
            $missingProvenanceFields.Add($fieldName)
        }
    }

    if ($Verdict -eq 'Pass' -and $missingProvenanceFields.Count -gt 0) {
        throw (
            'Passing provenance requires tool, sourceInputs, edits, license, and reviewer. ' +
            "Missing: $($missingProvenanceFields -join ', ')"
        )
    }
}

if ($Type -eq 'review' -and $Verdict -eq 'Pass' -and [string]::IsNullOrWhiteSpace($ReviewerRole)) {
    throw 'Passing review evidence requires -ReviewerRole.'
}
if (
    $Type -eq 'gui' -and
    $Verdict -eq 'Pass' -and
    (
        [string]::IsNullOrWhiteSpace($DesignBaseline) -or
        [string]::IsNullOrWhiteSpace($Resolution) -or
        [string]::IsNullOrWhiteSpace($Notes)
    )
) {
    throw 'Passing gui evidence requires -DesignBaseline, -Resolution, and -Notes describing compared states and result.'
}

if (-not [string]::IsNullOrWhiteSpace($FilePath)) {
    $resolvedFile = [System.IO.Path]::GetFullPath($FilePath)
    if (-not (Test-Path -LiteralPath $resolvedFile -PathType Leaf)) {
        throw "Evidence file does not exist: $resolvedFile"
    }
    $resolvedFile = (Resolve-Path -LiteralPath $resolvedFile).Path
    $fileInfo = Get-Item -LiteralPath $resolvedFile
    if ($fileInfo.Length -le 0) {
        throw "Evidence file is empty: $resolvedFile"
    }

    if ($Type -eq 'screenshot') {
        $imageInfo = Test-Screenshot -Path $resolvedFile -ExpectedResolution $Resolution -AllowUniform:$AllowUniformImage
        if ([string]::IsNullOrWhiteSpace($Resolution)) {
            $Resolution = "$($imageInfo.width)x$($imageInfo.height)"
        }
    }

    $sha256 = (Get-FileHash -LiteralPath $resolvedFile -Algorithm SHA256).Hash.ToLowerInvariant()
    $sizeBytes = $fileInfo.Length
    $artifactLocation = Get-RelativeOrAbsolutePath -Root $projectRoot -Path $resolvedFile
}

try {
    $manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
}
catch {
    throw "Evidence manifest is invalid JSON: $($_.Exception.Message)"
}

$existingEntries = @()
if ($null -ne $manifest.entries) {
    $existingEntries = @($manifest.entries)
}

$entryId = 'EV-' + (Get-Date).ToString('yyyyMMddHHmmss') + '-' + ([Guid]::NewGuid().ToString('N').Substring(0, 6))
$entry = [ordered]@{
    id           = $entryId
    taskId       = $TaskId
    gate         = $Gate
    type         = $Type
    location     = $artifactLocation
    sha256       = $sha256
    sizeBytes    = $sizeBytes
    recordedAt   = (Get-Date).ToString('o')
    device       = $Device
    resolution   = $Resolution
    reviewerRole = $ReviewerRole
    designBaseline = $DesignBaseline
    sourceRevision = $sourceState.sourceRevision
    sourceDirty  = $sourceState.sourceDirty
    taskFingerprint = $taskFingerprint
    verdict      = $Verdict
    notes        = $Notes
    metrics      = $metrics
    provenance   = $provenance
}

$newManifest = [ordered]@{
    schemaVersion = if (
        $null -ne $manifest.schemaVersion -and
        [int]$manifest.schemaVersion -gt 2
    ) {
        [int]$manifest.schemaVersion
    }
    else {
        3
    }
    entries       = @($existingEntries) + @([pscustomobject]$entry)
}

$json = $newManifest | ConvertTo-Json -Depth 10
Write-Utf8File -Path $manifestPath -Content ($json + [Environment]::NewLine)
$entry | ConvertTo-Json -Depth 8
