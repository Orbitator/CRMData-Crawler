@echo off
setlocal
rem Lokaler CORS-/Auth-Proxy fuer ALSO CRM Intelligence.
rem Voraussetzung: Node.js 18+ installiert (node im PATH).
cd /d "%~dp0"
if "%IMPLISENSE_KEY%"=="" set /p IMPLISENSE_KEY=Implisense API-Key (IMP-...), leer lassen wenn nicht benoetigt:
echo.
echo Starte CRM-Proxy auf http://127.0.0.1:8787 ...
echo In der App unter "Quellen ^& Crawling" als CORS-Proxy-Praefix eintragen:
echo     http://127.0.0.1:8787/proxy?url=
echo (Implisense-API-Schluessel-Feld in der App leer lassen - der Proxy injiziert ihn.)
echo.
node "%~dp0server.mjs"
pause
