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
  "Microsoft-Windows-Kernel-Network",
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
  $totalRows = 0
  $rootRows = 0
  $networkRows = 0
  $writeRows = 0
  foreach ($row in (Import-Csv -LiteralPath $csv)) {
    $totalRows++
    $serialized = $row | ConvertTo-Json -Compress
    $eventName = (($row.PSObject.Properties | ForEach-Object { "$($_.Name)=$($_.Value)" }) -join " ")
    if ($eventName -match "(?i)(Process.*Start|Start.*Process)") {
      $parentPid = Get-IntegerField $row @("(?i)^Parent.*Process.*Id$", "(?i)^Parent.*PID$")
      $newPid = Get-IntegerField $row @("(?i)^New.*Process.*Id$", "(?i)^Process.*Id$", "(?i)^PID$")
      if ($childPids.Contains($parentPid) -and $newPid -gt 0 -and !$childPids.Contains($newPid)) {
        $childPids.Add($newPid) | Out-Null
        $lines.Add("process|$newPid|parent=$parentPid")
      }
      continue
    }
    $pidValue = Get-IntegerField $row @("(?i)^Process.*Id$", "(?i)^PID$")
    if (!$childPids.Contains($pidValue)) { continue }
    $rootRows++
    if ($eventName -match "(?i)(TCP|UDP|DNS|Connect|Socket|Network)") {
      $networkRows++
      $lines.Add("network|$pidValue|$serialized")
    }
    elseif ($eventName -match "(?i)(File.*(?:Write|Delete|Rename)|Directory.*(?:Create|Delete)|SetInformation|Flush|CreateAlways|CreateNew|Overwrite|Supersede)") {
      $writeRows++
      $lines.Add("write|$pidValue|$serialized")
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
    }
  }
  [IO.File]::WriteAllText($ResultOutput, ($receipt | ConvertTo-Json -Compress), (New-Object Text.UTF8Encoding($false)))
}
finally {
  & logman.exe stop $session -ets 2>$null | Out-Null
  Remove-Item -LiteralPath $etl,$csv,"$ResultOutput.stdout","$ResultOutput.stderr" -Force -ErrorAction SilentlyContinue
}
