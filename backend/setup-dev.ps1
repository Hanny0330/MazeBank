<#
setup-dev.ps1

Automates dev setup on Windows:
- Installs nvm-windows via winget if not present
- Installs Node LTS 18.20.0 via nvm and switches to it
- Runs npm install in project root
- Starts backend

Usage:
  - As admin (recommended to install nvm):
    .\backend\setup-dev.ps1

  - Force JSON fallback mode (no native sqlite build):
    .\backend\setup-dev.ps1 -UseJson

Notes: This script uses winget to install nvm. If your machine doesn't have winget, install nvm manually from https://github.com/coreybutler/nvm-windows/releases
#>

param(
  [switch]$UseJson
)

function Write-Info($m){ Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Write-Warn($m){ Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Write-ErrorExit($m){ Write-Host "[ERROR] $m" -ForegroundColor Red; exit 1 }

Write-Info "Starting dev setup script..."

# Check for nvm
$nvmExists = (Get-Command nvm -ErrorAction SilentlyContinue) -ne $null
if (-not $nvmExists) {
  Write-Info "nvm not found. Attempting to install via winget..."
  $wingetExists = (Get-Command winget -ErrorAction SilentlyContinue) -ne $null
  if (-not $wingetExists) {
    Write-Warn "winget not found. Please install nvm-windows manually from https://github.com/coreybutler/nvm-windows/releases and re-run this script."
    return
  }
  Write-Info "Installing nvm-windows via winget (requires admin)..."
  winget install -e --id ChrisTitusTech.NVM --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) { Write-Warn "winget install reported non-zero exit code; verify installation manually." }
  Write-Info "Installation attempted. Please close and re-open PowerShell if nvm is not available, then re-run this script." 
  # Try to reload environment (best-effort)
  $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
}

# Ensure nvm is available now
if ((Get-Command nvm -ErrorAction SilentlyContinue) -eq $null) {
  Write-Warn "nvm still not available. You can install Node LTS manually or open a new shell and run this script again." 
} else {
  # Install and use Node LTS
  $nodeVersion = '18.20.0'
  Write-Info "Installing Node $nodeVersion via nvm (if not installed) and switching to it..."
  nvm install $nodeVersion
  nvm use $nodeVersion
  Write-Info "Node version: $(node -v)"
}

# Run npm install in repo root
$repoRoot = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path "$repoRoot\.." | Select-Object -ExpandProperty Path
Write-Info "Running npm install in project root: $repoRoot"
& npm install
if ($LASTEXITCODE -ne 0) { Write-Warn "npm install exited with code $LASTEXITCODE; check output." }

Write-Info "Starting backend..."
if ($UseJson.IsPresent) {
  Write-Info "Starting backend in JSON fallback mode (USE_JSON_DB=true)"
  $env:USE_JSON_DB = 'true'
}

Push-Location $repoRoot
Start-Process -NoNewWindow -FilePath node -ArgumentList 'backend/index.js' -PassThru | Out-Null
Pop-Location

Write-Info "Backend start requested. Use your browser to visit http://localhost:3000 (or check logs)."
