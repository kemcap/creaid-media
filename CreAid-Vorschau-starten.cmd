@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js wurde nicht gefunden. Bitte Node.js installieren und dieses Programm erneut starten.
  pause
  exit /b 1
)
echo.
echo CreAid-Media V10.1 - lokale Vorschau
 echo Adresse: http://127.0.0.1:8080/
echo Dieses Fenster fuer die Vorschau geoeffnet lassen.
echo.
start "" "http://127.0.0.1:8080/"
node scripts\preview.mjs
if errorlevel 1 pause
