@echo off
chcp 65001 >nul
title Tu Dong Ket Noi Gia Lap Android (ADB Reverse 30000 / 8079 / 28080)
echo ============================================================================
echo   TU DONG KET NOI GIA LAP ANDROID (LDPlayer / BlueStacks / Nox / MuMu)
echo   Chuyen tiep cong: 127.0.0.1:30000, 127.0.0.1:8079, 127.0.0.1:28080
echo ============================================================================
node "%~dp0tools\setup_adb_reverse.js" %*
echo.
pause
