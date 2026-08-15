param(
    [Parameter(Mandatory = $true)]
    [string]$ScriptPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Normalize-Text {
    param([string]$Text)

    return (($Text -replace '\r?\n', ' ') -replace '\s+', ' ').Trim()
}

function Assert-Contract {
    param(
        [bool]$Condition,
        [string]$Message
    )

    if (-not $Condition) {
        throw $Message
    }
}

function Get-CommandSignature {
    param([System.Management.Automation.Language.CommandAst]$Command)

    return @($Command.CommandElements | ForEach-Object { Normalize-Text $_.Extent.Text })
}

function Test-ExactCommand {
    param(
        [System.Management.Automation.Language.CommandAst[]]$Commands,
        [string[]]$Expected
    )

    foreach ($command in $Commands) {
        $signature = @(Get-CommandSignature $command)
        if ($signature.Count -ne $Expected.Count) {
            continue
        }

        $matches = $true
        for ($index = 0; $index -lt $Expected.Count; $index += 1) {
            if ($signature[$index] -cne $Expected[$index]) {
                $matches = $false
                break
            }
        }

        if ($matches) {
            return $true
        }
    }

    return $false
}

function Find-Assignment {
    param(
        [System.Management.Automation.Language.AssignmentStatementAst[]]$Assignments,
        [string]$Left,
        [string]$Right
    )

    $matchingLeft = @($Assignments | Where-Object {
        (Normalize-Text $_.Left.Extent.Text) -ceq $Left
    })
    return $matchingLeft.Count -eq 1 -and
        (Normalize-Text $matchingLeft[0].Right.Extent.Text) -ceq $Right
}

function Test-DirectThrowingIf {
    param(
        [System.Management.Automation.Language.Ast]$Statement,
        [string]$Condition
    )

    if ($Statement -isnot [System.Management.Automation.Language.IfStatementAst]) {
        return $false
    }
    if ($Statement.Clauses.Count -ne 1 -or $null -ne $Statement.ElseClause) {
        return $false
    }
    $clause = $Statement.Clauses[0]
    $bodyStatements = @($clause.Item2.Statements)
    return (Normalize-Text $clause.Item1.Extent.Text) -ceq $Condition -and
        $bodyStatements.Count -eq 1 -and
        $bodyStatements[0] -is [System.Management.Automation.Language.ThrowStatementAst]
}

function Find-CommandWithArguments {
    param(
        [System.Management.Automation.Language.CommandAst[]]$Commands,
        [string]$Name,
        [string[]]$Required
    )

    foreach ($command in $Commands | Where-Object { $_.GetCommandName() -ceq $Name }) {
        $signature = @(Get-CommandSignature $command)
        $allPresent = $true
        foreach ($argument in $Required) {
            if ($signature -cnotcontains $argument) {
                $allPresent = $false
                break
            }
        }
        if ($allPresent) {
            return $true
        }
    }

    return $false
}

$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile(
    (Resolve-Path -LiteralPath $ScriptPath).Path,
    [ref]$tokens,
    [ref]$parseErrors
)
Assert-Contract ($parseErrors.Count -eq 0) "workflow PowerShell must parse without errors"
Assert-Contract ($null -eq $ast.ParamBlock) `
    "workflow PowerShell must not declare a parameter block"
Assert-Contract ($null -eq $ast.DynamicParamBlock -and $null -eq $ast.BeginBlock -and
    $null -eq $ast.ProcessBlock -and $null -eq $ast.CleanBlock) `
    "workflow PowerShell must contain only the canonical end block"
Assert-Contract ($ast.Attributes.Count -eq 0 -and $ast.UsingStatements.Count -eq 0 -and
    $null -eq $ast.ScriptRequirements) `
    "workflow PowerShell must not add root attributes, using statements, or requirements"

$topLevel = @($ast.EndBlock.Statements)
$assignments = @($ast.FindAll({
    param($node)
    $node -is [System.Management.Automation.Language.AssignmentStatementAst]
}, $true))
$commands = @($ast.FindAll({
    param($node)
    $node -is [System.Management.Automation.Language.CommandAst]
}, $true))
$strings = @($ast.FindAll({
    param($node)
    $node -is [System.Management.Automation.Language.StringConstantExpressionAst] -or
    $node -is [System.Management.Automation.Language.ExpandableStringExpressionAst]
}, $true) | ForEach-Object { Normalize-Text $_.Extent.Text })

Assert-Contract ($null -eq $ast.EndBlock.Traps -or $ast.EndBlock.Traps.Count -eq 0) `
    "workflow PowerShell must not declare traps that can swallow guard failures"
Assert-Contract ($topLevel.Count -eq 16) `
    "workflow PowerShell must retain the canonical 16-step top-level execution chain"
Assert-Contract ($topLevel[0] -is [System.Management.Automation.Language.AssignmentStatementAst] -and
    (Normalize-Text $topLevel[0].Extent.Text) -ceq '$ErrorActionPreference = ''Stop''') `
    "workflow must fail closed on PowerShell errors"
Assert-Contract ($topLevel[1] -is [System.Management.Automation.Language.AssignmentStatementAst] -and
    (Normalize-Text $topLevel[1].Extent.Text) -ceq '$evidenceRoot = ''.tmp/task8-platform''') `
    "workflow must use the fixed evidence root"
Assert-Contract ($topLevel[2] -is [System.Management.Automation.Language.PipelineAst] -and
    (Normalize-Text $topLevel[2].Extent.Text) -ceq `
        'New-Item -ItemType Directory -Force -Path $evidenceRoot | Out-Null') `
    "workflow must prepare evidence before measuring the candidate"
Assert-Contract ($topLevel[3] -is [System.Management.Automation.Language.AssignmentStatementAst] -and
    (Normalize-Text $topLevel[3].Extent.Text) -ceq '$expectedHead = $env:GITHUB_SHA') `
    "workflow must bind expected HEAD before measuring actual HEAD"
Assert-Contract ($topLevel[4] -is [System.Management.Automation.Language.AssignmentStatementAst] -and
    (Normalize-Text $topLevel[4].Extent.Text) -ceq '$actualHead = (& git rev-parse HEAD).Trim()') `
    "workflow must measure actual HEAD before verification"
Assert-Contract ($topLevel[5] -is [System.Management.Automation.Language.PipelineAst] -and
    (Normalize-Text $topLevel[5].Extent.Text) -ceq `
        '@( "runnerOS=$env:RUNNER_OS" "runnerArch=$env:RUNNER_ARCH" "expectedCandidateCommit=$expectedHead" "actualCandidateCommit=$actualHead" "nodeVersion=$(& node --version)" "powerShellVersion=$($PSVersionTable.PSVersion)" "gitVersion=$(& git --version)" "osDescription=$([System.Runtime.InteropServices.RuntimeInformation]::OSDescription)" ) | Set-Content -Encoding utf8 "$evidenceRoot/environment.log"') `
    "workflow must persist environment evidence before verification"
Assert-Contract ((Test-DirectThrowingIf $topLevel[6] '$actualHead -ne $expectedHead') -and
    (Normalize-Text $topLevel[6].Extent.Text) -ceq `
        'if ($actualHead -ne $expectedHead) { throw "Checked-out HEAD does not match GITHUB_SHA: actual=$actualHead expected=$expectedHead" }') `
    "workflow must reject a SHA mismatch before running the verifier"
Assert-Contract ($topLevel[7] -is [System.Management.Automation.Language.AssignmentStatementAst] -and
    (Normalize-Text $topLevel[7].Left.Extent.Text) -ceq '$verifyOutput' -and
    (Normalize-Text $topLevel[7].Right.Extent.Text) -ceq `
        '@(& pwsh -NoProfile -File ./verify.ps1 -CompareRef origin/main 2>&1)') `
    "workflow must execute the top-level verifier with stderr capture"
Assert-Contract ($topLevel[8] -is [System.Management.Automation.Language.AssignmentStatementAst] -and
    (Normalize-Text $topLevel[8].Extent.Text) -ceq '$verifyExit = $LASTEXITCODE') `
    "workflow must capture verifier status immediately"
Assert-Contract ($topLevel[9] -is [System.Management.Automation.Language.PipelineAst] -and
    (Normalize-Text $topLevel[9].Extent.Text) -ceq `
        '$verifyOutput | Tee-Object -FilePath "$evidenceRoot/verify.log"') `
    "workflow must persist the captured verifier output"
Assert-Contract ($topLevel[10] -is [System.Management.Automation.Language.AssignmentStatementAst] -and
    (Normalize-Text $topLevel[10].Left.Extent.Text) -ceq '$installOutput' -and
    (Normalize-Text $topLevel[10].Right.Extent.Text) -ceq `
        '@( & node ./install.mjs --dry-run --json ` --repository qiaoxuelin/game-production-workflow ` --ref $actualHead 2>&1 )') `
    "workflow must execute the top-level installer dry-run with stderr capture"
Assert-Contract ($topLevel[11] -is [System.Management.Automation.Language.AssignmentStatementAst] -and
    (Normalize-Text $topLevel[11].Extent.Text) -ceq '$installExit = $LASTEXITCODE') `
    "workflow must capture installer status immediately"
Assert-Contract ($topLevel[12] -is [System.Management.Automation.Language.PipelineAst] -and
    (Normalize-Text $topLevel[12].Extent.Text) -ceq `
        '$installOutput | Tee-Object -FilePath "$evidenceRoot/install-dry-run.json"') `
    "workflow must persist the captured installer output"
Assert-Contract ($topLevel[13] -is [System.Management.Automation.Language.PipelineAst] -and
    (Normalize-Text $topLevel[13].Extent.Text) -ceq `
        '@( "verifyExit=$verifyExit" "installDryRunExit=$installExit" ) | Set-Content -Encoding utf8 "$evidenceRoot/exit-status.log"') `
    "workflow must persist exit-status evidence before hashing"
Assert-Contract ($topLevel[14] -is [System.Management.Automation.Language.PipelineAst] -and
    (Normalize-Text $topLevel[14].Extent.Text) -ceq `
        'Get-ChildItem -LiteralPath $evidenceRoot -File | Sort-Object Name | ForEach-Object { $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash.ToLowerInvariant() "$hash $($_.Name)" } | Set-Content -Encoding utf8 "$evidenceRoot/SHA256SUMS"') `
    "workflow must hash evidence before the terminal gate"
Assert-Contract ((Test-DirectThrowingIf $topLevel[15] '$verifyExit -ne 0 -or $installExit -ne 0') -and
    (Normalize-Text $topLevel[15].Extent.Text) -ceq `
        'if ($verifyExit -ne 0 -or $installExit -ne 0) { throw "Platform verification failed: verify=$verifyExit installDryRun=$installExit" }') `
    "workflow must terminate on verifier or installer failure"

Assert-Contract (Find-Assignment $assignments '$expectedHead' '$env:GITHUB_SHA') `
    "workflow must bind expected HEAD to GITHUB_SHA"
Assert-Contract (Find-Assignment $assignments '$actualHead' '(& git rev-parse HEAD).Trim()') `
    "workflow must measure the checked-out HEAD"

Assert-Contract (Test-ExactCommand $commands @(
    'pwsh', '-NoProfile', '-File', './verify.ps1', '-CompareRef', 'origin/main'
)) "workflow must execute the full verifier against origin/main"
Assert-Contract (Test-ExactCommand $commands @(
    'node', './install.mjs', '--dry-run', '--json',
    '--repository', 'qiaoxuelin/game-production-workflow', '--ref', '$actualHead'
)) "workflow must execute the installer dry-run at the measured candidate commit"

Assert-Contract (Find-Assignment $assignments '$verifyExit' '$LASTEXITCODE') `
    "workflow must capture verifier exit status"
Assert-Contract (Find-Assignment $assignments '$installExit' '$LASTEXITCODE') `
    "workflow must capture installer exit status"
Assert-Contract (Find-CommandWithArguments $commands 'Tee-Object' @(
    '-FilePath', '"$evidenceRoot/verify.log"'
)) "workflow must persist verifier output"
Assert-Contract (Find-CommandWithArguments $commands 'Tee-Object' @(
    '-FilePath', '"$evidenceRoot/install-dry-run.json"'
)) "workflow must persist installer dry-run output"
Assert-Contract (Find-CommandWithArguments $commands 'Set-Content' @(
    '-Encoding', 'utf8', '"$evidenceRoot/exit-status.log"'
)) "workflow must persist exit-status evidence"
Assert-Contract (Find-CommandWithArguments $commands 'Get-FileHash' @(
    '-Algorithm', 'SHA256', '-LiteralPath', '$_.FullName'
)) "workflow must hash evidence with SHA256"
Assert-Contract (Find-CommandWithArguments $commands 'Set-Content' @(
    '-Encoding', 'utf8', '"$evidenceRoot/SHA256SUMS"'
)) "workflow must persist evidence hashes"
foreach ($requiredString in @(
    '"expectedCandidateCommit=$expectedHead"',
    '"actualCandidateCommit=$actualHead"',
    '"verifyExit=$verifyExit"',
    '"installDryRunExit=$installExit"'
)) {
    Assert-Contract ($strings -ccontains $requiredString) `
        "workflow evidence is missing $requiredString"
}

Write-Output "PASS workflow PowerShell AST contract"
