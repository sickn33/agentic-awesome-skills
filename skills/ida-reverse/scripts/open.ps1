<#
.SYNOPSIS
Open binary file via IDA HTTP API (bypass MCP schema issue)

.PARAMETER Path
Binary file path (required)
.PARAMETER SessionId
Preferred session ID (optional, auto-generated)
.PARAMETER NoAutoAnalysis
Skip automatic analysis (faster open for large files)
.PARAMETER TimeoutSeconds
Open timeout in seconds, returns timeout instead of blocking forever
.PARAMETER Port
MCP HTTP port (default 13337)
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Path,
    [string]$SessionId = "",
    [switch]$NoAutoAnalysis = $false,
    [int]$TimeoutSeconds = 120,
    [int]$Port = 13337
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Test-IdaInstallDir {
    param([string]$Path)
    if ([string]::IsNullOrWhiteSpace($Path)) { return $false }
    if (-not (Test-Path -LiteralPath $Path)) { return $false }
    return (Test-Path -LiteralPath (Join-Path $Path 'ida.exe')) -or (Test-Path -LiteralPath (Join-Path $Path 'ida.dll'))
}

if (-not [string]::IsNullOrWhiteSpace($env:IDADIR) -and (Test-IdaInstallDir -Path $env:IDADIR)) {
    $env:IDADIR = [System.IO.Path]::GetFullPath($env:IDADIR)
}
else {
    $persisted = [Environment]::GetEnvironmentVariable('IDADIR', 'User')
    if ([string]::IsNullOrWhiteSpace($persisted)) {
        $persisted = [Environment]::GetEnvironmentVariable('IDADIR', 'Machine')
    }
    if (-not [string]::IsNullOrWhiteSpace($persisted) -and (Test-IdaInstallDir -Path $persisted)) {
        $env:IDADIR = [System.IO.Path]::GetFullPath($persisted)
    }
    else {
        $desktop = [Environment]::GetFolderPath('Desktop')
        $idaCandidates = @(
            (Join-Path $desktop 'IDA Pro 9.4\App\IDA Pro'),
            (Join-Path $env:USERPROFILE 'Desktop\IDA Pro 9.4\App\IDA Pro'),
            (Join-Path $env:USERPROFILE 'Tools\IDA Pro 9.4\App\IDA Pro'),
            (Join-Path $env:USERPROFILE 'Tools\IDA'),
            'C:\Program Files\IDA Professional 9.4',
            'C:\Program Files\IDA Pro 9.4',
            'C:\Program Files\IDA Pro',
            'C:\IDA Pro',
            'D:\IDA',
            'D:\Tools\IDA Pro 9.4\App\IDA Pro'
        )
        $foundIda = $idaCandidates | Where-Object { Test-IdaInstallDir -Path $_ } | Select-Object -First 1
        if ($foundIda) {
            $env:IDADIR = [System.IO.Path]::GetFullPath($foundIda)
        } else {
            Write-Error "ERR:IDADIR not set and IDA Pro not found at common paths. Set IDADIR environment variable to your IDA installation directory."
            exit 1
        }
    }
}

# Use a fresh per-run directory; never share or overwrite predictable temp copies.
$TempDir = Join-Path ([System.IO.Path]::GetTempPath()) ('rs-ida-' + [System.Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $TempDir -ErrorAction Stop | Out-Null
$PollIntervalMs = 2000
$ProgressIntervalSeconds = 10

function Invoke-IdaMcp {
    param(
        [string]$Method,
        [hashtable]$Params = @{},
        [int]$RequestPort,
        [int]$TimeoutSec = 30
    )

    $payload = @{
        jsonrpc = '2.0'
        id      = 1
        method  = $Method
        params  = $Params
    } | ConvertTo-Json -Depth 12 -Compress

    return Invoke-RestMethod "http://127.0.0.1:$RequestPort/mcp" -Method Post -Body $payload `
        -ContentType 'application/json' -TimeoutSec $TimeoutSec -ErrorAction Stop
}

function Get-OpenReadySession {
    param(
        [string]$ExpectedSessionId,
        [string]$ExpectedPath,
        [int]$RequestPort
    )

    $listResult = Invoke-IdaMcp -Method 'tools/call' -Params @{
        name      = 'idb_list'
        arguments = @{}
    } -RequestPort $RequestPort -TimeoutSec 10

    $content = $listResult.result.structuredContent
    if (-not $content) {
        # Some MCP servers put content in result.content[0].text JSON
        $text = $listResult.result.content | Where-Object { $_.type -eq 'text' } | Select-Object -First 1 -ExpandProperty text
        if ($text) {
            try { $content = $text | ConvertFrom-Json } catch { $content = $null }
        }
    }

    $sessions = @()
    if ($content -and $content.sessions) {
        $sessions = @($content.sessions)
    }

    foreach ($candidate in $sessions) {
        if (-not $candidate) { continue }

        $sameSession = $candidate.session_id -eq $ExpectedSessionId
        $samePath = $false
        if ($candidate.input_path) {
            try {
                $samePath = [System.IO.Path]::GetFullPath([string]$candidate.input_path) -eq [System.IO.Path]::GetFullPath($ExpectedPath)
            } catch {
                $samePath = [string]$candidate.input_path -eq $ExpectedPath
            }
        }
        $isAnalyzing = $false
        if ($null -ne $candidate.PSObject.Properties['is_analyzing']) {
            $isAnalyzing = [bool]$candidate.is_analyzing
        }

        $sid = [string]$candidate.session_id
        if ([string]::IsNullOrWhiteSpace($sid)) { continue }

        if ($sameSession -and $samePath -and -not $isAnalyzing) {
            return $candidate
        }
    }

    return $null
}

if (-not (Test-Path -LiteralPath $Path)) {
    Write-Output "ERR:file_not_found"
    exit 1
}

# Normalize to absolute path
$Path = [System.IO.Path]::GetFullPath($Path)

if ($TimeoutSeconds -le 0) {
    Write-Output "ERR:invalid_timeout"
    exit 1
}

# Probe server first
try {
    $null = Invoke-IdaMcp -Method 'tools/list' -Params @{} -RequestPort $Port -TimeoutSec 5
} catch {
    Write-Output "ERR:server_not_ready:$($_.Exception.Message)"
    Write-Output "HINT: run scripts/start.ps1 first"
    exit 1
}

# System32 / locked DB -> temp copy
$isTempCopy = $Path.StartsWith($TempDir, [StringComparison]::OrdinalIgnoreCase)

if (-not $isTempCopy -and $Path -match "C:\\Windows\\System32") {
    $Filename = [System.IO.Path]::GetFileName($Path)
    $TempPath = Join-Path $TempDir $Filename
    Copy-Item -LiteralPath $Path -Destination $TempPath -Force -ErrorAction SilentlyContinue
    if ($?) {
        $Path = $TempPath
        $isTempCopy = $true
    }
}

. (Join-Path $PSScriptRoot 'IdaOpenHelpers.ps1')

if (-not $isTempCopy) {
    $lockPlan = Get-IdaOpenLockPlan -BinaryPath $Path
    $hasLocked = [bool]$lockPlan.PreferTempCopy
    if ($hasLocked) {
        $guid = [System.Guid]::NewGuid().ToString('N').Substring(0, 8)
        $newName = "$guid-$([System.IO.Path]::GetFileName($Path))"
        $TempPath = Join-Path $TempDir $newName
        Copy-Item -LiteralPath $Path -Destination $TempPath -Force
        $Path = $TempPath
        $isTempCopy = $true
    }
}

$autoAnalysis = -not $NoAutoAnalysis
if (-not $SessionId) {
    $SessionId = [System.Guid]::NewGuid().ToString('N').Substring(0, 8)
}

$arguments = @{
    input_path           = $Path
    run_auto_analysis    = $autoAnalysis
    preferred_session_id = $SessionId
    mode                 = 'prefer_headless'
}
$argJson = $arguments | ConvertTo-Json -Compress
# Keep boolean literals as JSON bools for background job
$bodyObj = @{
    jsonrpc = '2.0'
    id      = 1
    method  = 'tools/call'
    params  = @{
        name      = 'idb_open'
        arguments = $arguments
    }
}
$body = $bodyObj | ConvertTo-Json -Depth 12 -Compress

Set-IdaMcpOpeningLock -Port $Port -TtlSeconds ($TimeoutSeconds + 60)

$openJob = Start-Job -ScriptBlock {
    param($RequestBody, $RequestPort)
    try {
        Invoke-RestMethod "http://127.0.0.1:$RequestPort/mcp" -Method Post -Body $RequestBody `
            -ContentType 'application/json' -TimeoutSec 0 -ErrorAction Stop
    } catch {
        $_.Exception.Message
    }
} -ArgumentList $body, $Port

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$openCompleted = $false
$startTime = Get-Date
$lastProgressAt = $startTime.AddSeconds(-$ProgressIntervalSeconds)

try {
    while ((Get-Date) -lt $deadline) {
        if (Wait-Job -Job $openJob -Timeout 1) {
            $openCompleted = $true
            break
        }

        try {
            $session = Get-OpenReadySession -ExpectedSessionId $SessionId -ExpectedPath $Path -RequestPort $Port
            if ($session) {
                $tag = if ($isTempCopy) { ' (temp copy)' } else { '' }
                Stop-Job -Job $openJob -ErrorAction SilentlyContinue
                Remove-Job -Job $openJob -Force -ErrorAction SilentlyContinue
                $name = if ($session.filename) { $session.filename } else { [System.IO.Path]::GetFileName($Path) }
                $sid = if ($session.session_id) { $session.session_id } else { $SessionId }
                Write-Output "OK:${name}:${sid}${tag}"
                exit 0
            }
        } catch {}

        $now = Get-Date
        if (($now - $lastProgressAt).TotalSeconds -ge $ProgressIntervalSeconds) {
            $elapsed = [math]::Floor(($now - $startTime).TotalSeconds)
            Write-Output "INFO:opening:$elapsed/${TimeoutSeconds}s"
            $lastProgressAt = $now
        }

        Start-Sleep -Milliseconds $PollIntervalMs
    }

    if (-not $openCompleted) {
        Stop-Job -Job $openJob -ErrorAction SilentlyContinue
        Remove-Job -Job $openJob -Force -ErrorAction SilentlyContinue

        try {
            $session = Get-OpenReadySession -ExpectedSessionId $SessionId -ExpectedPath $Path -RequestPort $Port
            if ($session) {
                $tag = if ($isTempCopy) { ' (temp copy)' } else { '' }
                $name = if ($session.filename) { $session.filename } else { [System.IO.Path]::GetFileName($Path) }
                $sid = if ($session.session_id) { $session.session_id } else { $SessionId }
                Write-Output "OK:${name}:${sid}${tag}"
                exit 0
            }
        } catch {}

        Write-Output "ERR:open_timeout_${TimeoutSeconds}s"
        exit 1
    }

    $jobResult = Receive-Job -Job $openJob
    Remove-Job -Job $openJob -Force -ErrorAction SilentlyContinue

    if ($jobResult -is [string]) {
        Write-Output "ERR:$jobResult"
        exit 1
    }

    $structured = $jobResult.result.structuredContent
    if (-not $structured) {
        $text = $jobResult.result.content | Where-Object { $_.type -eq 'text' } | Select-Object -First 1 -ExpandProperty text
        if ($text) {
            try { $structured = $text | ConvertFrom-Json } catch { $structured = $null }
        }
    }

    $success = $false
    $session = $null
    $errMsg = $null
    if ($structured) {
        if ($null -ne $structured.PSObject.Properties['success'] -and $structured.success -eq $true) {
            $success = $true
            $session = $structured.session
        }
        if ($null -ne $structured.PSObject.Properties['error'] -and $structured.error) {
            $errMsg = [string]$structured.error
        }
        if ($null -ne $structured.PSObject.Properties['session'] -and $structured.session -and -not $success) {
            # Some builds return session without success flag
            $success = $true
            $session = $structured.session
        }
    }

    if ($success -and $session) {
        $tag = if ($isTempCopy) { ' (temp copy)' } else { '' }
        $name = if ($session.filename) { $session.filename } else { [System.IO.Path]::GetFileName($Path) }
        $sid = if ($session.session_id) { $session.session_id } else { $SessionId }
        Write-Output "OK:${name}:${sid}${tag}"
        exit 0
    }

    # Auto-fallback: temp copy retry (skip if license / idalib hard failure)
    $hardFail = $false
    if ($errMsg -and ($errMsg -match 'license|EULA|Cannot continue without a valid license|batch mode')) {
        $hardFail = $true
    }
    if (-not $isTempCopy -and -not $hardFail) {
        try {
            $guid = [System.Guid]::NewGuid().ToString('N').Substring(0, 8)
            $baseName = [System.IO.Path]::GetFileName($Path)
            if ($baseName.Length -gt 40) { $baseName = $baseName.Substring(0, 40) }
            $newName = "$guid-$baseName"
            $TempPath = Join-Path $TempDir $newName
            Copy-Item -LiteralPath $Path -Destination $TempPath -Force
            & $PSCommandPath -Path $TempPath -SessionId $SessionId -NoAutoAnalysis:$NoAutoAnalysis -TimeoutSeconds $TimeoutSeconds -Port $Port
            exit $LASTEXITCODE
        } catch {
            Write-Output "ERR:temp_copy_failed:$($_.Exception.Message)"
            if ($errMsg) { Write-Output "ERR:open:$errMsg" }
            exit 1
        }
    }

    if ($hardFail) {
        Write-Output "ERR:idalib_license:$errMsg"
        Write-Output "HINT: This machine's hexlic cannot open databases in headless idalib mode. Use GUI mode: Launch-IDA-Pro.cmd, open the binary, then use idapro MCP tools against the GUI plugin on port 13337. See LOCAL-SETUP.md."
        exit 1
    }

    $err = if ($errMsg) { $errMsg } elseif ($structured) { ($structured | ConvertTo-Json -Compress) } else { 'open_failed' }
    Write-Output "ERR:$err"
    exit 1
} finally {
    Clear-IdaMcpOpeningLock -Port $Port
    if ($openJob) {
        Stop-Job -Job $openJob -ErrorAction SilentlyContinue
        Remove-Job -Job $openJob -Force -ErrorAction SilentlyContinue
    }
}
