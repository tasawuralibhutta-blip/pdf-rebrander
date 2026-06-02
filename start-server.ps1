# PowerShell Automation script to launch the local Python server and open Aether Rebrand Tool

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "    Aether Rebrand Local Server Init     " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
$pythonCheck = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCheck) {
    Write-Host "[ERROR] Python was not found in your system's PATH." -ForegroundColor Red
    Write-Host "Please install Python 3 or run your own local HTTP server in this directory." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

# Start local server on port 8000
Write-Host "[*] Booting up Python HTTP Server on port 8000..." -ForegroundColor Yellow
$serverProcess = Start-Process python -ArgumentList "-m http.server 8000" -PassThru -NoNewWindow

# Wait 1 second for port binding
Start-Sleep -Seconds 1

# Launch default browser
Write-Host "[*] Opening Aether Rebrand Studio in your browser (http://localhost:8000)..." -ForegroundColor Green
Start-Process "http://localhost:8000"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  Studio is running on localhost:8000    " -ForegroundColor Green
Write-Host "  To close the server, terminate this    " -ForegroundColor Yellow
Write-Host "  PowerShell console process (Ctrl+C).   " -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Green

# Loop to keep the window open and track server life
try {
    while ($true) {
        Start-Sleep -Seconds 2
    }
}
catch {
    # Terminate process if user closes console
    Write-Host "[*] Terminating server process..." -ForegroundColor Red
    Stop-Process -Id $serverProcess.Id -Force
}
