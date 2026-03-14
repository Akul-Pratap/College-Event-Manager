@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "SCRIPT_DIR=%~dp0"
set "PROJECT_DIR=%SCRIPT_DIR%.."
set "DEFAULT_ROOT=%SCRIPT_DIR%data_updates"
set "ENV_FILE=%PROJECT_DIR%\flask_api\.env"
set "PY=py -3"

where py >nul 2>nul
if errorlevel 1 set "PY=python"

if "%~1"=="" goto :help
if /I "%~1"=="setup" goto :setup
if /I "%~1"=="check" goto :check
if /I "%~1"=="dry" goto :dry
if /I "%~1"=="run" goto :run
if /I "%~1"=="table-dry" goto :table_dry
if /I "%~1"=="table-run" goto :table_run
if /I "%~1"=="help" goto :help

echo Unknown command: %~1
goto :help

:setup
echo [1/2] Installing dependencies for folder updater...
%PY% -m pip install supabase python-dotenv pandas openpyxl
if errorlevel 1 (
  echo ERROR: Dependency install failed.
  exit /b 1
)

echo.
echo [2/2] Checking folders and env...
call :check_internal
if errorlevel 1 exit /b 1

echo.
echo Setup complete.
echo Use:
echo   update_data_folder.bat dry
echo   update_data_folder.bat run
exit /b 0

:check
call :check_internal
exit /b %ERRORLEVEL%

:check_internal
if exist "%ENV_FILE%" (
  echo [ok] Found env file: %ENV_FILE%
) else (
  echo [warn] Missing env file: %ENV_FILE%
  echo        Set SUPABASE_URL and SUPABASE_SERVICE_KEY in the shell or create flask_api\.env
)

if exist "%DEFAULT_ROOT%" (
  echo [ok] Data root exists: %DEFAULT_ROOT%
) else (
  echo [warn] Data root missing: %DEFAULT_ROOT%
)

echo [ok] Expected folders:
echo   %DEFAULT_ROOT%\departments
echo   %DEFAULT_ROOT%\users
echo   %DEFAULT_ROOT%\clubs
echo   %DEFAULT_ROOT%\venues
echo   %DEFAULT_ROOT%\events
echo   %DEFAULT_ROOT%\registrations
echo   %DEFAULT_ROOT%\money_collection
exit /b 0

:dry
set "ROOT=%~2"
if "%ROOT%"=="" set "ROOT=%DEFAULT_ROOT%"
call :check_internal

echo.
echo Running folder dry-run for root: %ROOT%
%PY% "%SCRIPT_DIR%update_data_folder.py" --root "%ROOT%" --dry-run
exit /b %ERRORLEVEL%

:run
set "ROOT=%~2"
if "%ROOT%"=="" set "ROOT=%DEFAULT_ROOT%"
call :check_internal

echo.
echo Running folder update for root: %ROOT%
%PY% "%SCRIPT_DIR%update_data_folder.py" --root "%ROOT%"
exit /b %ERRORLEVEL%

:table_dry
if "%~2"=="" (
  echo ERROR: Missing table name.
  goto :help_fail
)
set "ROOT=%~3"
if "%ROOT%"=="" set "ROOT=%DEFAULT_ROOT%"
call :check_internal

echo.
echo Running table dry-run: %~2 from root %ROOT%
%PY% "%SCRIPT_DIR%update_data_folder.py" --root "%ROOT%" --table "%~2" --dry-run
exit /b %ERRORLEVEL%

:table_run
if "%~2"=="" (
  echo ERROR: Missing table name.
  goto :help_fail
)
set "ROOT=%~3"
if "%ROOT%"=="" set "ROOT=%DEFAULT_ROOT%"
call :check_internal

echo.
echo Running table update: %~2 from root %ROOT%
%PY% "%SCRIPT_DIR%update_data_folder.py" --root "%ROOT%" --table "%~2"
exit /b %ERRORLEVEL%

:help
echo.
echo Usage:
echo   update_data_folder.bat setup
echo   update_data_folder.bat check
echo   update_data_folder.bat dry [root_folder]
echo   update_data_folder.bat run [root_folder]
echo   update_data_folder.bat table-dry ^<table^> [root_folder]
echo   update_data_folder.bat table-run ^<table^> [root_folder]
echo.
echo Examples:
echo   update_data_folder.bat setup
echo   update_data_folder.bat dry
echo   update_data_folder.bat run
echo   update_data_folder.bat table-dry users
echo   update_data_folder.bat table-run events
exit /b 0

:help_fail
call :help
exit /b 1
