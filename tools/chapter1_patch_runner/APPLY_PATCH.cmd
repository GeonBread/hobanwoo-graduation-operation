@rem ZIP Patch Runner v9.2 - safe GitHub auto-sync before patching
@echo off
setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..\..") do set "DEFAULT_PROJECT=%%~fI"

set "ZIP_PATH=%~1"
set "PROJECT_PATH=%~2"
if not defined PROJECT_PATH set "PROJECT_PATH=%DEFAULT_PROJECT%"

if not exist "%PROJECT_PATH%\.git" (
  echo.
  echo [WARN] Git project marker was not found at:
  echo        %PROJECT_PATH%
  echo.
  set /p "PROJECT_PATH=Paste the full Git project folder path: "
)

if not exist "%PROJECT_PATH%\.git" (
  echo.
  echo [ERROR] The selected folder does not contain .git:
  echo         %PROJECT_PATH%
  echo.
  pause
  exit /b 1
)

echo.
echo [INFO] The runner checks GitHub and fast-forwards a clean project before applying the ZIP.
echo [INFO] Divergent local commits will be protected; unsafe sync stops before patching.
echo.

if "%ZIP_PATH%"=="" (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -STA -File "%SCRIPT_DIR%APPLY_PATCH.ps1" -ProjectPath "%PROJECT_PATH%"
) else (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -STA -File "%SCRIPT_DIR%APPLY_PATCH.ps1" -ProjectPath "%PROJECT_PATH%" -ZipPath "%ZIP_PATH%"
)

set "EXIT_CODE=%ERRORLEVEL%"
echo.
if "%EXIT_CODE%"=="0" (
  echo Patch processing completed. Validated changes, if any, were committed and pushed.
) else if "%EXIT_CODE%"=="2" (
  echo Patch was applied and committed, but Git push failed.
  echo The local commit was preserved. No automatic rollback was performed.
) else (
  echo Patch processing failed. No automatic hard reset or git clean was used.
)
echo.
pause
exit /b %EXIT_CODE%
