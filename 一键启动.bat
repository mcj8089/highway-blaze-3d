@echo off
rem ============================================================
rem  Highway Blaze 3D — 一键启动本地服务器并打开游戏
rem ============================================================
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  ==============================================
echo    HIGHWAY BLAZE 3D - pipygames.com
echo    Starting local server (localhost:8231) ...
echo  ==============================================
echo.
start "" "http://localhost:8231/"
python tools\start.py 8231
pause
