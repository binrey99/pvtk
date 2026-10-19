@echo off
chcp 65001 >nul
title Phong Van Truyen Ky 2 Offline Server ^& Web GM Panel
echo ============================================================================
echo   PHONG VAN TRUYEN KY 2 (WORLDOL) - OFFLINE SERVER ^& WEB GM DASHBOARD
echo   - TCP Game Server : 0.0.0.0:30000 (Localhost 127.0.0.1 / Emulator 10.0.2.2)
echo   - Web GM Panel    : http://127.0.0.1:8079
echo   - Photo Server    : 0.0.0.0:28080
echo ============================================================================
echo [ADB] Dang tu dong kiem tra va ket noi gia lap Android (adb reverse)...
node "%~dp0tools\setup_adb_reverse.js"
echo ============================================================================
start "" "http://127.0.0.1:8079"
node "%~dp0server\index.js"
pause
