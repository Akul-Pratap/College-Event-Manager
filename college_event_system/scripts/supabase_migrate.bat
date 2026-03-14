@echo off
setlocal enabledelayedexpansion

:: ============================================================
:: supabase_migrate.bat - LTSU Supabase CLI Migration Tool
:: Usage:
::   supabase_migrate.bat new        - create new migration from setup SQL
::   supabase_migrate.bat push       - apply pending migrations
::   supabase_migrate.bat run        - create + push in one step
::   supabase_migrate.bat status     - show migration status
::   supabase_migrate.bat reset      - reset local DB (destructive!)
:: ============================================================

set SCRIPT_DIR=%~dp0
set PROJECT_DIR=%SCRIPT_DIR%..
set SQL_SOURCE=%PROJECT_DIR%\supabase\supabase_full_setup.sql
set MIGRATION_NAME=ltsu_full_setup

if "%1"=="" (
    echo Usage: supabase_migrate.bat [new ^| push ^| run ^| status ^| reset]
    echo.
    echo Commands:
    echo   new     - Create a new migration file from supabase_full_setup.sql
    echo   push    - Push pending migrations to Supabase (supabase db push)
    echo   run     - Create migration + push in one step
    echo   status  - Show current migration status
    echo   reset   - Reset local DB and re-apply all migrations (destructive)
    echo.
    exit /b 0
)

:: Check supabase CLI is installed
where supabase >nul 2>&1
if errorlevel 1 (
    echo ERROR: 'supabase' CLI not found.
    echo Install it from: https://supabase.com/docs/guides/cli
    echo   Windows: scoop install supabase ^| or download from GitHub releases
    exit /b 1
)

:: Verify SQL source file exists
if not exist "%SQL_SOURCE%" (
    echo ERROR: SQL source file not found:
    echo   %SQL_SOURCE%
    exit /b 1
)

cd /d "%PROJECT_DIR%"

if "%1"=="new" goto :do_new
if "%1"=="push" goto :do_push
if "%1"=="run" goto :do_run
if "%1"=="status" goto :do_status
if "%1"=="reset" goto :do_reset

echo ERROR: Unknown command "%1"
echo Run without arguments to see usage.
exit /b 1

:: -------------------------------------------------------
:do_new
echo [1/2] Creating migration: %MIGRATION_NAME%
supabase migration new %MIGRATION_NAME%
if errorlevel 1 (
    echo ERROR: Failed to create migration.
    exit /b 1
)

:: Find the latest migration file created
set MIGRATION_FILE=
for /f "delims=" %%f in ('dir /b /od "%PROJECT_DIR%\supabase\migrations\*_%MIGRATION_NAME%.sql" 2^>nul') do (
    set MIGRATION_FILE=%%f
)

if "!MIGRATION_FILE!"=="" (
    echo ERROR: Could not find generated migration file in supabase\migrations\
    exit /b 1
)

echo [2/2] Copying SQL into migrations\!MIGRATION_FILE!
copy /y "%SQL_SOURCE%" "%PROJECT_DIR%\supabase\migrations\!MIGRATION_FILE!" >nul
if errorlevel 1 (
    echo ERROR: Failed to copy SQL into migration file.
    exit /b 1
)

echo.
echo SUCCESS: Migration file ready:
echo   supabase\migrations\!MIGRATION_FILE!
echo.
echo Next step: run "supabase_migrate.bat push" to apply it.
goto :end

:: -------------------------------------------------------
:do_push
echo Pushing migrations to Supabase...
echo.
supabase db push
if errorlevel 1 (
    echo ERROR: Migration push failed. Check the error above.
    exit /b 1
)
echo.
echo SUCCESS: All migrations applied.
goto :end

:: -------------------------------------------------------
:do_run
echo [Step 1] Creating migration...
call :do_new
if errorlevel 1 exit /b 1
echo.
echo [Step 2] Pushing migration...
call :do_push
if errorlevel 1 exit /b 1
goto :end

:: -------------------------------------------------------
:do_status
echo Fetching migration status...
echo.
supabase migration list
goto :end

:: -------------------------------------------------------
:do_reset
echo WARNING: This will reset your LOCAL Supabase database.
echo All data will be lost. Remote Supabase is NOT affected.
echo.
set /p CONFIRM=Type YES to continue: 
if /i not "!CONFIRM!"=="YES" (
    echo Aborted.
    exit /b 0
)
echo Resetting local DB...
supabase db reset
if errorlevel 1 (
    echo ERROR: Reset failed.
    exit /b 1
)
echo.
echo SUCCESS: Local DB reset and all migrations re-applied.
goto :end

:: -------------------------------------------------------
:end
endlocal
