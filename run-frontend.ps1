<#
Runs the frontend: prefers local Node/npm when available, otherwise falls back to Docker Compose.

Usage:
  .\run-frontend.ps1
#>

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $scriptDir 'frontend'

Write-Host "Starting frontend from: $frontendDir"

Push-Location $frontendDir
try {
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    $npmCmd = Get-Command npm -ErrorAction SilentlyContinue
    if ($nodeCmd -and $npmCmd) {
        Write-Host "Node and npm detected. Installing dependencies and starting frontend..."
        npm install
        npm start
        return
    }

    $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
    if ($dockerCmd) {
        Write-Host "Node/npm not found. Using Docker Compose to run the frontend (requires Docker)."
        docker compose up --build frontend
        return
    }

    Write-Error "Neither Node/npm nor Docker were found on PATH. Install Node.js (https://nodejs.org/) or Docker (https://www.docker.com/) and retry."
    exit 1
}
finally {
    Pop-Location
}
