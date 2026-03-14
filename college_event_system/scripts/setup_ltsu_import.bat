@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "SCRIPT_DIR=%~dp0"
set "PROJECT_DIR=%SCRIPT_DIR%.."
set "DEFAULT_SOURCE=%PROJECT_DIR%\..\LTSU_Complete_20260205_090720"
set "ENV_FILE=%PROJECT_DIR%\flask_api\.env"
set "PY=py -3"

where py >nul 2>nul
if errorlevel 1 set "PY=python"

if "%~1"=="" goto :help
if /I "%~1"=="setup" goto :setup
if /I "%~1"=="check" goto :check
if /I "%~1"=="dry" goto :dry
if /I "%~1"=="auto" goto :auto
if /I "%~1"=="file" goto :file
if /I "%~1"=="help" goto :help

echo Unknown command: %~1
goto :help

:setup
echo [1/3] Verifying Python...
%PY% --version
if errorlevel 1 (
  echo ERROR: Python was not found. Install Python 3.11+ or open the project venv first.
  exit /b 1
)

echo.
echo [2/3] Installing importer dependencies...
%PY% -m pip install supabase python-dotenv pandas openpyxl
if errorlevel 1 (
  echo ERROR: Failed to install importer dependencies.
  exit /b 1
)

echo.
echo [3/3] Checking configuration...
call :check_internal
if errorlevel 1 exit /b 1

echo.
echo Setup complete.
echo Next commands:
echo   setup_ltsu_import.bat dry
echo   setup_ltsu_import.bat auto
echo   setup_ltsu_import.bat file users D:\data\students_update.xlsx email
exit /b 0

:check
call :check_internal
exit /b %ERRORLEVEL%

:check_internal
echo Checking importer prerequisites...

if exist "%ENV_FILE%" (
  echo [ok] Found env file: %ENV_FILE%
) else (
  echo [warn] Missing env file: %ENV_FILE%
  echo        The importer can still work if SUPABASE_URL and SUPABASE_SERVICE_KEY are set in the shell.
)

if exist "%ENV_FILE%" (
  findstr /B /C:"SUPABASE_URL=" "%ENV_FILE%" >nul 2>nul
  if errorlevel 1 (
    echo [warn] SUPABASE_URL is not present in flask_api\.env
  ) else (
    echo [ok] SUPABASE_URL entry found in flask_api\.env
  )

  findstr /B /C:"SUPABASE_SERVICE_KEY=" "%ENV_FILE%" >nul 2>nul
  if errorlevel 1 (
    echo [warn] SUPABASE_SERVICE_KEY is not present in flask_api\.env
  ) else (
    echo [ok] SUPABASE_SERVICE_KEY entry found in flask_api\.env
  )
)

if exist "%DEFAULT_SOURCE%" (
  echo [ok] Default dataset folder found: %DEFAULT_SOURCE%
) else (
  echo [warn] Default dataset folder not found: %DEFAULT_SOURCE%
  echo        Pass a source path explicitly to dry/auto if your dataset is elsewhere.
)

echo [ok] Importer script: %SCRIPT_DIR%import_ltsu_data.py
echo [ok] Wrapper script: %SCRIPT_DIR%import_ltsu_data.bat
exit /b 0

:dry
call :check_internal
set "SRC=%~2"
if "%SRC%"=="" set "SRC=%DEFAULT_SOURCE%"
echo.
echo Running dry import from: %SRC%
call "%SCRIPT_DIR%import_ltsu_data.bat" dry "%SRC%"
exit /b %ERRORLEVEL%

:auto
call :check_internal
set "SRC=%~2"
if "%SRC%"=="" set "SRC=%DEFAULT_SOURCE%"
echo.
echo Running real import from: %SRC%
call "%SCRIPT_DIR%import_ltsu_data.bat" auto "%SRC%"
exit /b %ERRORLEVEL%

:file
call :check_internal
if "%~2"=="" (
  echo ERROR: Missing table name.
  goto :help_fail
)
if "%~3"=="" (
  echo ERROR: Missing file path.
  goto :help_fail
)

echo.
echo Running file import: table=%~2 file=%~3 conflict=%~4
call "%SCRIPT_DIR%import_ltsu_data.bat" file "%~2" "%~3" "%~4"
exit /b %ERRORLEVEL%

:help
echo.
echo Usage:
echo   setup_ltsu_import.bat setup
echo   setup_ltsu_import.bat check
echo   setup_ltsu_import.bat dry [source_folder]
echo   setup_ltsu_import.bat auto [source_folder]
echo   setup_ltsu_import.bat file ^<table^> ^<file_path^> [on_conflict]
echo.
echo Commands:
echo   setup  - install required Python packages and verify env + dataset paths
echo   check  - verify env file entries and default dataset folder
echo   dry    - preview import using the default or provided source folder
echo   auto   - run the real import using the default or provided source folder
echo   file   - import one specific file into one specific table
echo.
echo Examples:
echo   setup_ltsu_import.bat setup
echo   setup_ltsu_import.bat dry
echo   setup_ltsu_import.bat auto
echo   setup_ltsu_import.bat dry D:\event manager\LTSU_Complete_20260205_090720
echo   setup_ltsu_import.bat file users D:\data\students_update.xlsx email
echo   setup_ltsu_import.bat file departments D:\data\departments.json code
exit /b 0

:help_fail
call :help
exit /b 1