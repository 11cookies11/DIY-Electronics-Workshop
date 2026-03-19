Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

param(
  [string]$ComposeFile = "docker-compose.prod.yml",
  [switch]$Rebuild
)

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$composePath = Join-Path $root $ComposeFile

if (!(Test-Path $composePath)) {
  throw "Compose file not found: $composePath"
}

Push-Location $root
try {
  Write-Host "[deploy-docker] project root: $root"

  docker --version | Out-Null
  docker compose version | Out-Null

  $buildArgs = @("compose", "-f", $ComposeFile, "up", "-d")
  if ($Rebuild) {
    $buildArgs += "--build"
  }

  if (!(Test-Path ".env.local")) {
    Write-Host "[deploy-docker] warning: .env.local not found, container may miss required env vars"
  }

  Write-Host "[deploy-docker] docker $($buildArgs -join ' ')"
  docker @buildArgs

  Write-Host "[deploy-docker] services:"
  docker compose -f $ComposeFile ps
  $port = if ($env:PORT) { $env:PORT } else { "3000" }
  Write-Host "[deploy-docker] done. open: http://127.0.0.1:$port"
}
finally {
  Pop-Location
}
