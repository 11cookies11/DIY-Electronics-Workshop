Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

param(
  [Parameter(Mandatory = $true)]
  [string]$PackagePath,
  [string]$DeployRoot = ".deploy",
  [int]$Port = 3000,
  [switch]$SkipInstall
)

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$resolvedPackagePath = (Resolve-Path $PackagePath).Path
$resolvedDeployRoot = Join-Path $root $DeployRoot
$releaseId = Get-Date -Format "yyyyMMdd-HHmmss"
$releaseDir = Join-Path $resolvedDeployRoot ("releases\" + $releaseId)
$currentDir = Join-Path $resolvedDeployRoot "current"
$runtimeDir = Join-Path $resolvedDeployRoot "runtime"
$pidFile = Join-Path $runtimeDir "app.pid"
$stdoutLog = Join-Path $runtimeDir "app.stdout.log"
$stderrLog = Join-Path $runtimeDir "app.stderr.log"

Write-Host "[deploy-run] package: $resolvedPackagePath"
Write-Host "[deploy-run] deploy root: $resolvedDeployRoot"
Write-Host "[deploy-run] port: $Port"

New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null

Write-Host "[deploy-run] extracting package"
Expand-Archive -Path $resolvedPackagePath -DestinationPath $releaseDir -Force

if (-not $SkipInstall) {
  Write-Host "[deploy-run] npm ci --omit=dev"
  Push-Location $releaseDir
  try {
    npm ci --omit=dev
  }
  finally {
    Pop-Location
  }
}

if (Test-Path $pidFile) {
  try {
    $oldPid = [int](Get-Content $pidFile -ErrorAction Stop)
    $oldProcess = Get-Process -Id $oldPid -ErrorAction SilentlyContinue
    if ($null -ne $oldProcess) {
      Write-Host "[deploy-run] stopping old process: $oldPid"
      Stop-Process -Id $oldPid -Force
      Start-Sleep -Milliseconds 500
    }
  }
  catch {
    Write-Host "[deploy-run] skip stopping old process: $($_.Exception.Message)"
  }
}

if (Test-Path $currentDir) {
  Remove-Item -Recurse -Force $currentDir
}
Copy-Item $releaseDir $currentDir -Recurse -Force

if (Test-Path $stdoutLog) { Remove-Item -Force $stdoutLog }
if (Test-Path $stderrLog) { Remove-Item -Force $stderrLog }

Write-Host "[deploy-run] starting app"
$startCommand = "npm run start -- -p $Port"
$process = Start-Process `
  -FilePath "cmd.exe" `
  -ArgumentList "/c", $startCommand `
  -WorkingDirectory $currentDir `
  -PassThru `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdoutLog `
  -RedirectStandardError $stderrLog

Set-Content -Path $pidFile -Value $process.Id -Encoding UTF8
Write-Host "[deploy-run] pid: $($process.Id)"

$healthy = $false
for ($i = 0; $i -lt 15; $i++) {
  Start-Sleep -Seconds 2
  try {
    $resp = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port" -TimeoutSec 3
    if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
      $healthy = $true
      break
    }
  }
  catch {
  }
}

if ($healthy) {
  Write-Host "[deploy-run] health check passed: http://127.0.0.1:$Port"
}
else {
  Write-Host "[deploy-run] health check failed, see logs:"
  Write-Host "  stdout: $stdoutLog"
  Write-Host "  stderr: $stderrLog"
  exit 1
}
