@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Instale Node.js para executar este site local.
 pause
 exit /b 1
)
node server.cjs --rede
pause
