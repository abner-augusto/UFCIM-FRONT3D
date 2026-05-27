# E2E test orchestration script
# Usage: .\scripts\e2e-start.ps1 [--ci] [--skip-seed]
#
# What it does:
#   1. Starts the backend (wrangler dev) on :8787
#   2. Seeds the D1 local database
#   3. Starts the frontend dev server on :5173
#   4. Runs Playwright tests
#
# Requirements:
#   - Both repos checked out as siblings:
#       ..\ufcim-backend-proto\  (backend)
#       .\                       (this frontend)
#   - Backend has .dev.vars (copy from .dev.vars.example if missing)
#   - npm install run in both repos

param(
  [switch]$SkipSeed,
  [switch]$CI
)

$ErrorActionPreference = 'Stop'
$BackendDir = Resolve-Path "..\ufcim-backend-proto"

Write-Host "[e2e] Backend dir: $BackendDir" -ForegroundColor Cyan

# ── Start backend ────────────────────────────────────────────────────────────
Write-Host "[e2e] Starting backend (wrangler dev)..." -ForegroundColor Cyan
$backend = Start-Process -NoNewWindow -PassThru -FilePath "npx" `
  -ArgumentList "wrangler", "dev", "--env", "dev" `
  -WorkingDirectory $BackendDir

# Wait for backend to be ready
$maxWait = 30
$waited = 0
do {
  Start-Sleep -Seconds 1
  $waited++
  try {
    $null = Invoke-WebRequest -Uri "http://localhost:8787" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    break
  } catch {
    if ($waited -ge $maxWait) {
      Write-Error "[e2e] Backend did not start within ${maxWait}s"
      $backend | Stop-Process -Force
      exit 1
    }
  }
} while ($true)
Write-Host "[e2e] Backend ready on :8787" -ForegroundColor Green

# ── Seed DB ──────────────────────────────────────────────────────────────────
if (-not $SkipSeed) {
  Write-Host "[e2e] Seeding D1 database..." -ForegroundColor Cyan
  try {
    npx wrangler d1 execute ufcim-db --local --env dev --file=scripts/seed.sql 2>&1 | Write-Host
    Write-Host "[e2e] DB seeded" -ForegroundColor Green
  } catch {
    Write-Warning "[e2e] Seed warning (data may already exist): $_"
  }
}

# ── Run tests ────────────────────────────────────────────────────────────────
Write-Host "[e2e] Running Playwright tests..." -ForegroundColor Cyan
try {
  npx playwright test @args
  $exitCode = $LASTEXITCODE
} finally {
  Write-Host "[e2e] Stopping backend..." -ForegroundColor Cyan
  $backend | Stop-Process -Force -ErrorAction SilentlyContinue
  # Also kill any child wrangler processes
  Get-Process -Name "node" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like "*wrangler*" } |
    Stop-Process -Force -ErrorAction SilentlyContinue
}

exit $exitCode
