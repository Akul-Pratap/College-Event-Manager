@echo off
setlocal EnableDelayedExpansion

set SCRIPT_DIR=%~dp0
set PY=py -3
where py >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  set PY=python
)

if "%~1"=="" goto :auto
if /I "%~1"=="auto" goto :auto
if /I "%~1"=="dry" goto :dry
if /I "%~1"=="file" goto :file
if /I "%~1"=="help" goto :help

echo Unknown mode: %~1
goto :help

:auto
set SRC=%~2
if "%SRC%"=="" set SRC=%SCRIPT_DIR%..\..\LTSU_Complete_20260205_090720
%PY% "%SCRIPT_DIR%import_ltsu_data.py" --source "%SRC%"
goto :end

:dry
set SRC=%~2
if "%SRC%"=="" set SRC=%SCRIPT_DIR%..\..\LTSU_Complete_20260205_090720
%PY% "%SCRIPT_DIR%import_ltsu_data.py" --source "%SRC%" --dry-run
goto :end

:file
if "%~2"=="" (
  echo Missing table name.
  goto :help
)
if "%~3"=="" (
  echo Missing file path.
  goto :help
)
set TABLE=%~2
set FILEPATH=%~3
set CONFLICT=%~4
if "%CONFLICT%"=="" (
  %PY% "%SCRIPT_DIR%import_ltsu_data.py" --source "%FILEPATH%" --table "%TABLE%"
) else (
  %PY% "%SCRIPT_DIR%import_ltsu_data.py" --source "%FILEPATH%" --table "%TABLE%" --on-conflict "%CONFLICT%"
)
goto :end

:help
echo.
echo Usage:
echo   import_ltsu_data.bat auto [source_folder]
echo   import_ltsu_data.bat dry [source_folder]
echo   import_ltsu_data.bat file ^<table^> ^<file_path^> [on_conflict]
echo.
echo Examples:
echo   import_ltsu_data.bat auto
echo   import_ltsu_data.bat dry D:\event manager\LTSU_Complete_20260205_090720
echo   import_ltsu_data.bat file users D:\data\students.xlsx email
echo.

:end
endlocal
