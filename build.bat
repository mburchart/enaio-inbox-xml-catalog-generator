@echo off
cd /d "%~dp0"

set "NODE_DIR=<placeholder>"
set "NODE=%NODE_DIR%\node.exe"
set "NPM=%NODE_DIR%\npm.cmd"
set "NPX=%NODE_DIR%\npx.cmd"
set "PATH=%NODE_DIR%;%PATH%"

echo [1/4] Abhaengigkeiten installieren...
call "%NPM%" install
if errorlevel 1 goto :error
call "%NPM%" install --no-save esbuild
if errorlevel 1 goto :error

echo [2/4] Bundle erstellen (inkl. node_modules)...
call "%NODE%" node_modules\esbuild\bin\esbuild dist/index.js --bundle --platform=node --format=cjs --outfile=dist/bundle.js
if errorlevel 1 goto :error

echo [3/4] SEA Blob generieren...
"%NODE%" --experimental-sea-config sea-config.json
if errorlevel 1 goto :error

echo [4/4] node.exe kopieren und Blob injizieren...
copy /y "%NODE%" enaio-import.exe
if errorlevel 1 goto :error
call "%NPX%" --yes postject enaio-import.exe NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
if errorlevel 1 goto :error

echo.
echo Fertig! enaio-import.exe wurde erstellt.
goto :end

:error
echo.
echo FEHLER: Die Erstellung ist fehlgeschlagen.
pause
exit /b 1

:end
pause