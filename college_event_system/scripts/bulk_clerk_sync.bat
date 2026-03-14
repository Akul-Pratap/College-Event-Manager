@echo off
setlocal EnableDelayedExpansion

set SCRIPT_DIR=%~dp0
set PROJECT_DIR=%SCRIPT_DIR%..
set ENV_FILE=%PROJECT_DIR%\flask_api\.env
set PY=py -3
where py >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  set PY=python
)

if "%~1"=="" goto :help
if /I "%~1"=="setup" goto :setup
if /I "%~1"=="check" goto :check
if /I "%~1"=="dry" goto :dry
if /I "%~1"=="run" goto :run
if /I "%~1"=="help" goto :help

echo Unknown mode: %~1
goto :help

:setup
echo [1/2] Installing dependencies...
%PY% -m pip install supabase python-dotenv
if errorlevel 1 (
  echo ERROR: Failed to install dependencies.
  exit /b 1
)

echo.
echo [2/2] Checking environment...
call :check_internal
if errorlevel 1 exit /b 1

echo.
echo Setup complete.
echo Next:
echo   bulk_clerk_sync.bat dry "%SCRIPT_DIR%templates\clerk_users_template.csv"
echo   bulk_clerk_sync.bat run "%SCRIPT_DIR%templates\clerk_users_template.csv" LTSU@12345
goto :end

:check
call :check_internal
goto :end

:check_internal
if exist "%ENV_FILE%" (
  echo [ok] Found env file: %ENV_FILE%
) else (
  echo [warn] Missing env file: %ENV_FILE%
  echo        Set CLERK_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY in shell or create flask_api\.env
)

if exist "%ENV_FILE%" (
  findstr /B /C:"CLERK_SECRET_KEY=" "%ENV_FILE%" >nul 2>nul
  if errorlevel 1 (
    echo [warn] CLERK_SECRET_KEY not found in flask_api\.env
  ) else (
    echo [ok] CLERK_SECRET_KEY entry found
  )

  findstr /B /C:"SUPABASE_URL=" "%ENV_FILE%" >nul 2>nul
  if errorlevel 1 (
    echo [warn] SUPABASE_URL not found in flask_api\.env
  ) else (
    echo [ok] SUPABASE_URL entry found
  )

  findstr /B /C:"SUPABASE_SERVICE_KEY=" "%ENV_FILE%" >nul 2>nul
  if errorlevel 1 (
    echo [warn] SUPABASE_SERVICE_KEY not found in flask_api\.env
  ) else (
    echo [ok] SUPABASE_SERVICE_KEY entry found
  )
)
exit /b 0

:dry
if "%~2"=="" (
  echo Missing CSV path.
  goto :help
)
%PY% "%SCRIPT_DIR%bulk_clerk_sync.py" --csv "%~2" --dry-run
goto :end

:run
if "%~2"=="" (
  echo Missing CSV path.
  goto :help
)
if "%~3"=="" (
  echo Missing default password.
  goto :help
)
%PY% "%SCRIPT_DIR%bulk_clerk_sync.py" --csv "%~2" --default-password "%~3"
goto :end

:help
echo.
echo Usage:
echo   bulk_clerk_sync.bat setup
echo   bulk_clerk_sync.bat check
echo   bulk_clerk_sync.bat dry ^<csv_path^>
echo   bulk_clerk_sync.bat run ^<csv_path^> ^<default_password^>
echo.
echo Example:
echo   bulk_clerk_sync.bat setup
echo   bulk_clerk_sync.bat dry "%SCRIPT_DIR%templates\clerk_users_template.csv"
echo   bulk_clerk_sync.bat run D:\data\clerk_users.csv LTSU@12345
echo.
echo Required env vars:
echo   CLERK_SECRET_KEY
echo   SUPABASE_URL
echo   SUPABASE_SERVICE_KEY

goto :end

:end
endlocal
