@echo off
SETLOCAL EnableDelayedExpansion

:: ============================================================================
:: JANUS7 FOUNDRY VTT & PYTHON BRIDGE STARTER
:: ============================================================================

set "MODULE_PATH=d:\RPG Lokal\FoundryVTT\Data\modules\Janus7"
set "BRIDGE_SCRIPT=%MODULE_PATH%\extensions\external-bridge\janus_bridge.py"

echo [JANUS7] Suche Python...
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set "PYTHON_CMD=python"
) else (
    echo [!] Python nicht im PATH gefunden. Suche Standardpfade...
    if exist "C:\Python312\python.exe" set "PYTHON_CMD=C:\Python312\python.exe"
    if exist "C:\Python311\python.exe" set "PYTHON_CMD=C:\Python311\python.exe"
    if exist "C:\Python310\python.exe" set "PYTHON_CMD=C:\Python310\python.exe"
    if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
)

if "%PYTHON_CMD%"=="" (
    echo [ERROR] Python konnte nicht gefunden werden. Bitte installiere Python oder setze den Pfad manuell.
    pause
    exit /b 1
)

echo [JANUS7] Suche Foundry VTT...
set "FOUNDRY_EXE="
if exist "C:\Program Files\FoundryVTT\FoundryVTT.exe" set "FOUNDRY_EXE=C:\Program Files\FoundryVTT\FoundryVTT.exe"
if exist "C:\Program Files\Foundry Virtual Tabletop\Foundry Virtual Tabletop.exe" set "FOUNDRY_EXE=C:\Program Files\Foundry Virtual Tabletop\Foundry Virtual Tabletop.exe"
if exist "%LOCALAPPDATA%\FoundryVTT\FoundryVTT.exe" set "FOUNDRY_EXE=%LOCALAPPDATA%\FoundryVTT\FoundryVTT.exe"

if "%FOUNDRY_EXE%"=="" (
    echo [!] FoundryVTT.exe nicht in Standardpfaden gefunden.
    set /p "FOUNDRY_EXE=Bitte gib den Pfad zur FoundryVTT.exe manuell ein: "
)

echo [JANUS7] Suche Node.js...
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set "NODE_CMD=node"
) else (
    echo [!] Node.js nicht im PATH gefunden.
    set "NODE_CMD="
)

:: Determine Foundry Directory and Main.js
set "FOUNDRY_DIR=%FOUNDRY_EXE:\Foundry Virtual Tabletop.exe=%"
set "FOUNDRY_DIR=%FOUNDRY_DIR:\FoundryVTT.exe=%"
set "FOUNDRY_MAIN=%FOUNDRY_DIR%\resources\app\main.js"
set "DATA_PATH=d:\RPG Lokal\FoundryVTT"

echo.
echo ============================================================================
echo  JANUS7 STARTUP (SERVER MODE)
echo ============================================================================
echo Python:    %PYTHON_CMD%
echo Foundry:   %FOUNDRY_EXE%
echo Main JS:   %FOUNDRY_MAIN%
echo Node:      %NODE_CMD%
echo Data Path: d:\RPG Lokal\FoundryVTT
echo ============================================================================
echo.

:: 1. Starte die Python Bridge in einem neuen Fenster
echo [JANUS7] Starte Python Bridge...
start "JANUS7 External Bridge" /D "%MODULE_PATH%\extensions\external-bridge" %PYTHON_CMD% janus_bridge.py

:: 2. Starte Foundry VTT (Headless Server Mode)
echo [JANUS7] Starte Foundry VTT Server...
if "%NODE_CMD%"=="" (
    echo [ERROR] Node.js wurde nicht gefunden. Server-Modus erfordert Node.js.
    echo Bitte installiere Node.js von https://nodejs.org/
    pause
    exit /b 1
)

start "Foundry VTT Server" %NODE_CMD% "%FOUNDRY_MAIN%" --dataPath="%DATA_PATH%"

echo.
echo [OK] Beide Prozesse wurden gestartet (Server-Modus).
echo Dieses Fenster kann nun geschlossen werden.
timeout /t 5
exit
