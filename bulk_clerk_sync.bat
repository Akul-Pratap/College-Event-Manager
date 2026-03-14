@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
set "VENV_PY=%SCRIPT_DIR%.venv\Scripts\python.exe"
set "PYFILE=%SCRIPT_DIR%bulk_clerk_sync.py"

if /i "%~1"=="setup" goto :setup
if /i "%~1"=="check" goto :check
if /i "%~1"=="dry"   goto :dry
if /i "%~1"=="run"   goto :run
if "%~1"==""         goto :usage
goto :usage

:setup
echo Installing dependencies...
if exist "%VENV_PY%" (
    "%VENV_PY%" -m pip install requests python-dotenv -q
) else (
    py -3 -m pip install requests python-dotenv -q
)
echo Done. Run:  bulk_clerk_sync.bat check
goto :eof

:check
if exist "%VENV_PY%" ( "%VENV_PY%" "%PYFILE%" check ) else ( py -3 "%PYFILE%" check )
goto :eof

:dry
if "%~2"=="" (
    echo Usage: bulk_clerk_sync.bat dry ^<csv_file^>
    goto :eof
)
if exist "%VENV_PY%" ( "%VENV_PY%" "%PYFILE%" dry "%~2" ) else ( py -3 "%PYFILE%" dry "%~2" )
goto :eof

:run
if "%~2"=="" (
    echo Usage: bulk_clerk_sync.bat run ^<csv_file^> [password]
    goto :eof
)
set "PASS=LTSU@12345"
if not "%~3"=="" set "PASS=%~3"
if exist "%VENV_PY%" ( "%VENV_PY%" "%PYFILE%" run "%~2" "%PASS%" ) else ( py -3 "%PYFILE%" run "%~2" "%PASS%" )
goto :eof

:usage
echo.
echo  Bulk Clerk User Sync
echo  ─────────────────────────────────────────────────
echo  bulk_clerk_sync.bat setup                 Install dependencies
echo  bulk_clerk_sync.bat check                 Verify env vars
echo  bulk_clerk_sync.bat dry  ^<csv^>             Preview (nothing created)
echo  bulk_clerk_sync.bat run  ^<csv^> [password]  Create users in Clerk + Supabase
echo.
echo  Examples:
echo    bulk_clerk_sync.bat dry  clerk_users_template.csv
echo    bulk_clerk_sync.bat run  clerk_users_template.csv LTSU@12345
echo.
goto :eof
