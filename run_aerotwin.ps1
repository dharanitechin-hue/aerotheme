# AeroTwin-X All-in-One Launcher Script
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "      AeroTwin-X: MALE UAV Digital Twin Platform          " -ForegroundColor Yellow
Write-Host "  DRDO-Oriented Aero Piston Engine Health & Prediction  " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $ScriptDir "backend"
$FrontendDir = Join-Path $ScriptDir "frontend"

Write-Host "`n[1/2] Starting AeroTwin-X FastAPI Backend (Port 8000)..." -ForegroundColor Cyan
$BackendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BackendDir'; `$env:PYTHONPATH = '$BackendDir'; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" -PassThru

Start-Sleep -Seconds 3

Write-Host "[2/2] Starting AeroTwin-X React Dashboard (Port 5173)..." -ForegroundColor Cyan
$FrontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$FrontendDir'; npm run dev" -PassThru

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " Systems launched successfully!" -ForegroundColor Green
Write-Host " - Backend API & WebSocket: http://localhost:8000" -ForegroundColor White
Write-Host " - Interactive Dashboard:   http://localhost:5173" -ForegroundColor White
Write-Host " - Telemetry Stream:       ws://localhost:8000/ws/telemetry/ENG-001" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
