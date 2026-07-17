param(
  [Parameter(Mandatory = $true)][string]$JobSource,
  [Parameter(Mandatory = $true)][int]$ParentProcessId,
  [Parameter(Mandatory = $true)][string]$ReadyCanary,
  [Parameter(Mandatory = $true)][string]$AfterParentCanary
)

$ErrorActionPreference = "Stop"
Add-Type -Path $JobSource
[IO.File]::WriteAllText($ReadyCanary, "ready", (New-Object Text.UTF8Encoding($false)))
if (![AasVerifier.JobProcess]::WaitForProcessExit($ParentProcessId, 6000)) { exit 66 }
[IO.File]::WriteAllText($AfterParentCanary, "child", (New-Object Text.UTF8Encoding($false)))
while ($true) { Start-Sleep -Seconds 1 }
