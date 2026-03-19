Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

param(
  [string]$OutputDir = "dist",
  [string]$ArtifactPrefix = "secondme-embedded-store"
)

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outputPath = Join-Path $root $OutputDir
$stagePath = Join-Path $outputPath "package-stage"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$artifactName = "$ArtifactPrefix-$timestamp.zip"
$artifactPath = Join-Path $outputPath $artifactName

Write-Host "[deploy-package] project root: $root"
Write-Host "[deploy-package] output dir: $outputPath"

if (!(Test-Path $outputPath)) {
  New-Item -ItemType Directory -Path $outputPath | Out-Null
}

if (Test-Path $stagePath) {
  Remove-Item -Recurse -Force $stagePath
}
New-Item -ItemType Directory -Path $stagePath | Out-Null

if (Test-Path $artifactPath) {
  Remove-Item -Force $artifactPath
}

Push-Location $root
try {
  Write-Host "[deploy-package] npm ci"
  npm ci

  Write-Host "[deploy-package] npm run build"
  npm run build

  Write-Host "[deploy-package] collecting runtime files"
  Copy-Item ".next" (Join-Path $stagePath ".next") -Recurse -Force
  if (Test-Path "public") {
    Copy-Item "public" (Join-Path $stagePath "public") -Recurse -Force
  }
  Copy-Item "package.json" (Join-Path $stagePath "package.json") -Force
  if (Test-Path "package-lock.json") {
    Copy-Item "package-lock.json" (Join-Path $stagePath "package-lock.json") -Force
  }
  if (Test-Path "next.config.ts") {
    Copy-Item "next.config.ts" (Join-Path $stagePath "next.config.ts") -Force
  }
  if (Test-Path ".env.production") {
    Copy-Item ".env.production" (Join-Path $stagePath ".env.production") -Force
  }
  if (Test-Path ".env.local") {
    Copy-Item ".env.local" (Join-Path $stagePath ".env.local") -Force
  }

  Write-Host "[deploy-package] compressing $artifactName"
  Compress-Archive -Path (Join-Path $stagePath "*") -DestinationPath $artifactPath
  Write-Host "[deploy-package] done: $artifactPath"
}
finally {
  Pop-Location
}

$artifactPath
