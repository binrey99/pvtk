@echo off
chcp 65001 >nul
title Phong Van Truyen Ky 2 (WorldOL v1.3) - Web Edition & Offline Server
echo ========================================================================
echo   PHONG VAN TRUYEN KY 2 (WorldOL v1.3) - BAN WEB CHAY TRUC TIEP
echo   - Web Game URL : http://127.0.0.1:8079/
echo   - Server GM URL: http://127.0.0.1:8079/gm
echo   - TCP Port     : 127.0.0.1:30000
echo ========================================================================
start "" "http://127.0.0.1:8079/"
node "%~dp0server\index.js"
pause
