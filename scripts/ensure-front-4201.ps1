param(
  [switch]$KillExisting,
  [int]$Port = 4201
)

Write-Output "Ensuring frontend dev server runs on port $Port..."

function Get-NgServeProcesses {
  Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'ng (serve|s)' -or $_.CommandLine -match 'npx.*ng' }
}

if ($KillExisting) {
  $procs = Get-NgServeProcesses
  foreach ($p in $procs) {
    try {
      Write-Output "Stopping process Id=$($p.ProcessId) CommandLine=$($p.CommandLine)"
      Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
    } catch {
      Write-Warning "Could not stop $($p.ProcessId): $_"
    }
  }
}

# Start backend if not running
$backend = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'node .*backend\\index.js' }
if (-not $backend) {
  Write-Output "Starting backend (JSON fallback) in a new window..."
  Start-Process cmd -ArgumentList '/k', 'set USE_JSON_DB=true && node backend/index.js'
  Start-Sleep -Seconds 1
}

Write-Output "Starting frontend dev server on port $Port in a new cmd window..."
Start-Process cmd -ArgumentList '/k', "npx.cmd ng serve --port $Port --proxy-config proxy.conf.json"

Write-Output "Frontend should be available at http://localhost:$Port"
