param(
  [Parameter(Mandatory = $true)][string]$Executable,
  [Parameter(Mandatory = $true)][string]$ArgumentsBase64,
  [Parameter(Mandatory = $true)][string]$TraceOutput,
  [Parameter(Mandatory = $true)][string]$ResultOutput,
  [Parameter(Mandatory = $true)][ValidatePattern('^AASVerifier-[A-Za-z0-9-]+$')][string]$SessionName,
  [Parameter(Mandatory = $true)][ValidateRange(1, 900000)][int]$CandidateTimeoutMilliseconds
)

$ErrorActionPreference = "Stop"
$jobSource = Join-Path $PSScriptRoot "windows-job.cs"
if (!(Test-Path -LiteralPath $jobSource -PathType Leaf)) { throw "Windows Job Object helper is unavailable" }
Add-Type -Path $jobSource
$etl = Join-Path ([IO.Path]::GetDirectoryName($TraceOutput)) "$SessionName.etl"
$csv = Join-Path ([IO.Path]::GetDirectoryName($TraceOutput)) "$SessionName.csv"
$arguments = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($ArgumentsBase64)) | ConvertFrom-Json
$providers = @(
  "Microsoft-Windows-Kernel-Process",
  "Microsoft-Windows-Kernel-File",
  "Microsoft-Windows-Winsock-AFD",
  "Microsoft-Windows-DNS-Client"
)
$jobProcess = $null

try {
  & logman.exe create trace $SessionName -o $etl -ets | Out-Null
  foreach ($provider in $providers) {
    & logman.exe update trace $SessionName -p $provider 0xffffffffffffffff 0xff -ets | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Unable to enable ETW provider $provider" }
  }
  $started = [DateTimeOffset]::UtcNow
  $jobProcess = [AasVerifier.JobProcess]::Start(
    $Executable,
    [string[]]$arguments,
    "$ResultOutput.stdout",
    "$ResultOutput.stderr"
  )
  $waitResult = [AasVerifier.JobProcess]::Wait($jobProcess, $CandidateTimeoutMilliseconds)
  $timedOut = $waitResult -eq [AasVerifier.JobProcess]::WaitTimeout
  if ($timedOut) {
    [AasVerifier.JobProcess]::Terminate($jobProcess, 124)
    $waitResult = [AasVerifier.JobProcess]::Wait($jobProcess, 5000)
  }
  if ($waitResult -ne [AasVerifier.JobProcess]::WaitObject0) {
    throw "Windows Job Object did not reach an empty process-tree state"
  }
  $rootExitCode = [AasVerifier.JobProcess]::ExitCode($jobProcess)
  $jobTotalProcesses = [AasVerifier.JobProcess]::TotalProcesses($jobProcess)
  $ended = [DateTimeOffset]::UtcNow
  & logman.exe stop $SessionName -ets | Out-Null
  & tracerpt.exe $etl -of CSV -o $csv -y | Out-Null
  if ($LASTEXITCODE -ne 0 -or !(Test-Path -LiteralPath $csv -PathType Leaf)) { throw "ETW trace export failed" }
  $rootPid = $jobProcess.ProcessId
  $lines = New-Object System.Collections.Generic.List[string]
  for ($processIndex = 1; $processIndex -lt $jobTotalProcesses; $processIndex++) {
    $lines.Add("process|job-object|index=$processIndex")
  }
  $childPids = New-Object System.Collections.Generic.HashSet[int]
  $childPids.Add($rootPid) | Out-Null
  function Get-IntegerField($row, [string[]]$patterns) {
    foreach ($property in $row.PSObject.Properties) {
      foreach ($pattern in $patterns) {
        if ($property.Name -match $pattern) {
          $parsed = 0
          $raw = ([string]$property.Value).Trim()
          if ([int]::TryParse($raw, [ref]$parsed)) { return $parsed }
          if ($raw -match '^0[xX][0-9a-fA-F]+$') {
            try { return [Convert]::ToInt32($raw.Substring(2), 16) } catch { }
          }
        }
      }
    }
    return 0
  }
  function Convert-ObservedInteger([string]$raw) {
    $value = $raw.Trim().Trim('"').Trim("'")
    $parsed = 0
    if ([int]::TryParse($value, [ref]$parsed)) { return $parsed }
    if ($value -match '^0[xX][0-9a-fA-F]+$') {
      try { return [Convert]::ToInt32($value.Substring(2), 16) } catch { }
    }
    return 0
  }
  function Get-PayloadInteger($row, [string]$name) {
    foreach ($property in $row.PSObject.Properties) {
      if (([string]$property.Name).Trim() -ieq $name) {
        $direct = Convert-ObservedInteger ([string]$property.Value)
        if ($direct -gt 0) { return $direct }
      }
    }
    $payloadPattern = '(?i)(?:^|[;,{\s])["'']?' + [regex]::Escape($name) + '["'']?\s*[:=]\s*["'']?(0[xX][0-9a-fA-F]+|[0-9]+)["'']?'
    foreach ($property in $row.PSObject.Properties) {
      $text = [string]$property.Value
      $match = [regex]::Match($text, $payloadPattern)
      if ($match.Success) { return Convert-ObservedInteger $match.Groups[1].Value }
    }
    return 0
  }
  $totalRows = 0
  $rootRows = 0
  $networkRows = 0
  $writeRows = 0
  $winsockCreateRows = 0
  $winsockDecodedPids = New-Object System.Collections.Generic.List[int]
  $processStartRows = 0
  $rootStopRows = 0
  $rootExitObserved = $false
  $postRootDescendantWriteRows = 0
  $rootEventSamples = New-Object System.Collections.Generic.List[string]
  foreach ($row in (Import-Csv -LiteralPath $csv)) {
    $totalRows++
    $serialized = $row | ConvertTo-Json -Compress
    $eventName = (($row.PSObject.Properties | ForEach-Object { "$($_.Name)=$($_.Value)" }) -join " ")
    $providerName = ([string]$row.'Event Name').Trim()
    $eventType = ([string]$row.Type).Trim()
    $eventId = Get-IntegerField $row @("(?i)^Event ID$")
    $opcode = Get-IntegerField $row @("(?i)^Opcode$")
    if ($providerName -eq 'Microsoft-Windows-Kernel-Process' -and $eventType -eq 'Start' -and $opcode -eq 1) {
      $processStartRows++
      # Process Start events are emitted in the creating process context, so the
      # ETW header PID is the parent. The payload ProcessID is the new process.
      $parentPid = Get-IntegerField $row @("(?i)^PID$")
      if ($parentPid -eq 0) { $parentPid = Get-PayloadInteger $row 'ParentProcessID' }
      $newPid = Get-PayloadInteger $row 'ProcessID'
      if ($childPids.Contains($parentPid) -and $newPid -gt 0 -and !$childPids.Contains($newPid)) {
        $childPids.Add($newPid) | Out-Null
        $lines.Add("process|$newPid|parent=$parentPid")
      }
      continue
    }
    if ($providerName -eq 'Microsoft-Windows-Kernel-Process' -and $eventType -eq 'Stop' -and $opcode -eq 2) {
      $stoppedPid = Get-PayloadInteger $row 'ProcessID'
      if ($stoppedPid -eq 0) { $stoppedPid = Get-IntegerField $row @("(?i)^PID$") }
      if ($stoppedPid -eq $rootPid) {
        $rootStopRows++
        $rootExitObserved = $true
      }
      continue
    }
    if ($providerName -like 'Microsoft-Windows-Winsock*' -and $eventId -eq 1000) {
      $winsockCreateRows++
      $userModePid = Get-PayloadInteger $row 'UserModePid'
      if ($userModePid -gt 0 -and $winsockDecodedPids.Count -lt 8 -and !$winsockDecodedPids.Contains($userModePid)) {
        $winsockDecodedPids.Add($userModePid)
      }
      $networkPid = Get-IntegerField $row @("(?i)^Process.*Id$", "(?i)^PID$")
      if ($childPids.Contains($networkPid) -or $childPids.Contains($userModePid)) {
        $networkRows++
        $lines.Add("network|$networkPid|provider=$providerName;event=$eventId")
      }
      continue
    }
    $pidValue = Get-IntegerField $row @("(?i)^Process.*Id$", "(?i)^PID$")
    if (!$childPids.Contains($pidValue)) { continue }
    $rootRows++
    if ($rootEventSamples.Count -lt 12) {
      $safeIdentity = (($row.PSObject.Properties | Where-Object {
        $_.Name -match '(?i)^(Event Name|Type|Event ID|Opcode|Task|Keyword|PID|Provider Name|Provider Guid)$'
      } | ForEach-Object { "$($_.Name)=$($_.Value)" }) -join ';')
      if ($safeIdentity -and !$rootEventSamples.Contains($safeIdentity)) { $rootEventSamples.Add($safeIdentity) }
    }
    if ($providerName -eq 'Microsoft-Windows-DNS-Client') {
      $networkRows++
      $lines.Add("network|$pidValue|provider=$providerName;event=$eventId")
    }
    elseif ($providerName -eq 'Microsoft-Windows-Kernel-File' -and $eventId -in @(16,17,18,19)) {
      $writeRows++
      if ($rootExitObserved -and $pidValue -ne $rootPid) { $postRootDescendantWriteRows++ }
      $lines.Add("write|$pidValue|provider=$providerName;event=$eventId")
    }
  }
  [IO.File]::WriteAllLines($TraceOutput, $lines, (New-Object Text.UTF8Encoding($false)))
  $receipt = [ordered]@{
    code = $(if ($timedOut) { 124 } else { $rootExitCode })
    signal = $null
    stdout = [IO.File]::ReadAllText("$ResultOutput.stdout")
    stderr = [IO.File]::ReadAllText("$ResultOutput.stderr")
    timedOut = $timedOut
    outputLimitExceeded = $false
    startedAt = $started.ToString("o")
    endedAt = $ended.ToString("o")
    observerDiagnostics = [ordered]@{
      totalRows = $totalRows
      rootRows = $rootRows
      networkRows = $networkRows
      writeRows = $writeRows
      winsockCreateRows = $winsockCreateRows
      winsockDecodedPids = @($winsockDecodedPids)
      processStartRows = $processStartRows
      rootStopRows = $rootStopRows
      postRootDescendantWriteRows = $postRootDescendantWriteRows
      rootEventSamples = @($rootEventSamples)
      sessionName = $SessionName
      processTreeTimedOut = $timedOut
      processTreeEmpty = $waitResult -eq [AasVerifier.JobProcess]::WaitObject0
      jobTotalProcesses = $jobTotalProcesses
    }
  }
  [IO.File]::WriteAllText($ResultOutput, ($receipt | ConvertTo-Json -Compress), (New-Object Text.UTF8Encoding($false)))
}
finally {
  & logman.exe stop $SessionName -ets 2>$null | Out-Null
  [AasVerifier.JobProcess]::Close($jobProcess)
  Remove-Item -LiteralPath $etl,$csv,"$ResultOutput.stdout","$ResultOutput.stderr" -Force -ErrorAction SilentlyContinue
}
