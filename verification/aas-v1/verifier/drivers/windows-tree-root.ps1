param(
  [Parameter(Mandatory = $true)][string]$Powershell,
  [Parameter(Mandatory = $true)][string]$ChildDriver,
  [Parameter(Mandatory = $true)][string]$JobSource,
  [Parameter(Mandatory = $true)][string]$ReadyCanary,
  [Parameter(Mandatory = $true)][string]$RootAckCanary,
  [Parameter(Mandatory = $true)][string]$AfterParentCanary
)

$ErrorActionPreference = "Stop"
function Quote-NativeArgument([string]$Value) {
  return '"' + $Value.Replace('"', '\"') + '"'
}

$childArguments = @(
  "-NoLogo",
  "-NoProfile",
  "-NonInteractive",
  "-ExecutionPolicy",
  "Bypass",
  "-File",
  (Quote-NativeArgument $ChildDriver),
  "-JobSource",
  (Quote-NativeArgument $JobSource),
  "-ParentProcessId",
  "$PID",
  "-ReadyCanary",
  (Quote-NativeArgument $ReadyCanary),
  "-AfterParentCanary",
  (Quote-NativeArgument $AfterParentCanary)
)
$child = Start-Process -FilePath $Powershell -ArgumentList $childArguments -NoNewWindow -PassThru
[Console]::Out.Write("$($child.Id)")

$deadline = [DateTimeOffset]::UtcNow.AddSeconds(6)
while ([DateTimeOffset]::UtcNow -lt $deadline) {
  if (Test-Path -LiteralPath $ReadyCanary -PathType Leaf) {
    [IO.File]::WriteAllText($RootAckCanary, "ack", (New-Object Text.UTF8Encoding($false)))
    exit 0
  }
  if ($child.HasExited) {
    [Console]::Error.Write("child-exited-before-readiness:$($child.ExitCode)")
    exit 67
  }
  Start-Sleep -Milliseconds 25
}
[Console]::Error.Write("child-readiness-timeout")
exit 65
