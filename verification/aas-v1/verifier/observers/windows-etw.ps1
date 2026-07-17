param(
  [Parameter(Mandatory = $true)][string]$Executable,
  [Parameter(Mandatory = $true)][string]$ArgumentsBase64,
  [Parameter(Mandatory = $true)][string]$TraceOutput,
  [Parameter(Mandatory = $true)][string]$ResultOutput
)

$ErrorActionPreference = "Stop"
$session = "AASVerifier-$PID-$([Guid]::NewGuid().ToString('N'))"
$etl = Join-Path ([IO.Path]::GetDirectoryName($TraceOutput)) "$session.etl"
$csv = Join-Path ([IO.Path]::GetDirectoryName($TraceOutput)) "$session.csv"
$arguments = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($ArgumentsBase64)) | ConvertFrom-Json
$providers = @(
  "Microsoft-Windows-Kernel-Process",
  "Microsoft-Windows-Kernel-File",
  "Microsoft-Windows-Winsock-AFD",
  "Microsoft-Windows-DNS-Client"
)

try {
  & logman.exe create trace $session -o $etl -ets | Out-Null
  foreach ($provider in $providers) {
    & logman.exe update trace $session -p $provider 0xffffffffffffffff 0xff -ets | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Unable to enable ETW provider $provider" }
  }
  $started = [DateTimeOffset]::UtcNow
  $process = Start-Process -FilePath $Executable -ArgumentList @($arguments) -NoNewWindow -Wait -PassThru `
    -RedirectStandardOutput "$ResultOutput.stdout" -RedirectStandardError "$ResultOutput.stderr"
  $ended = [DateTimeOffset]::UtcNow
  & logman.exe stop $session -ets | Out-Null
  & tracerpt.exe $etl -of CSV -o $csv -y | Out-Null
  if ($LASTEXITCODE -ne 0 -or !(Test-Path -LiteralPath $csv -PathType Leaf)) { throw "ETW trace export failed" }
  $rootPid = $process.Id
  $lines = New-Object System.Collections.Generic.List[string]
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
    $value = $raw.Trim()
    $parsed = 0
    if ([int]::TryParse($value, [ref]$parsed)) { return $parsed }
    if ($value -match '^0[xX][0-9a-fA-F]+$') {
      try { return [Convert]::ToInt32($value.Substring(2), 16) } catch { }
    }
    return 0
  }
  function Get-PayloadInteger($row, [string]$name) {
    foreach ($property in $row.PSObject.Properties) {
      $text = [string]$property.Value
      $match = [regex]::Match($text, "(?i)(?:^|[;,{\s])$([regex]::Escape($name))\s*[:=]\s*(0[xX][0-9a-fA-F]+|[0-9]+)")
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
  $rootEventSamples = New-Object System.Collections.Generic.List[string]
  foreach ($row in (Import-Csv -LiteralPath $csv)) {
    $totalRows++
    $serialized = $row | ConvertTo-Json -Compress
    $eventName = (($row.PSObject.Properties | ForEach-Object { "$($_.Name)=$($_.Value)" }) -join " ")
    $providerName = ([string]$row.'Event Name').Trim()
    $eventId = Get-IntegerField $row @("(?i)^Event ID$")
    if ($providerName -eq 'Microsoft-Windows-Kernel-Process' -and $eventId -eq 1) {
      $processStartRows++
      $parentPid = Get-PayloadInteger $row 'ParentProcessID'
      if ($parentPid -eq 0) { $parentPid = Get-PayloadInteger $row 'ParentProcessId' }
      $newPid = Get-PayloadInteger $row 'ProcessID'
      if ($newPid -eq 0) { $newPid = Get-PayloadInteger $row 'ProcessId' }
      if ($childPids.Contains($parentPid) -and $newPid -gt 0 -and !$childPids.Contains($newPid)) {
        $childPids.Add($newPid) | Out-Null
        $lines.Add("process|$newPid|parent=$parentPid")
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
      $lines.Add("write|$pidValue|provider=$providerName;event=$eventId")
    }
  }
  [IO.File]::WriteAllLines($TraceOutput, $lines, (New-Object Text.UTF8Encoding($false)))
  $receipt = [ordered]@{
    code = $process.ExitCode
    signal = $null
    stdout = [IO.File]::ReadAllText("$ResultOutput.stdout")
    stderr = [IO.File]::ReadAllText("$ResultOutput.stderr")
    timedOut = $false
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
      rootEventSamples = @($rootEventSamples)
    }
  }
  [IO.File]::WriteAllText($ResultOutput, ($receipt | ConvertTo-Json -Compress), (New-Object Text.UTF8Encoding($false)))
}
finally {
  & logman.exe stop $session -ets 2>$null | Out-Null
  Remove-Item -LiteralPath $etl,$csv,"$ResultOutput.stdout","$ResultOutput.stderr" -Force -ErrorAction SilentlyContinue
}
