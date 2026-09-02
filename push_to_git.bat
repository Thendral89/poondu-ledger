@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================
echo   Poondu Ledger - Push changes to GitHub
echo ============================================
echo.

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo ERROR: This folder is not a git repository. Aborting.
    pause
    exit /b 1
)

echo Staging changes...
git add -A

git diff --cached --quiet
if not errorlevel 1 (
    echo Nothing to commit - your local folder already matches the last commit.
    pause
    exit /b 0
)

echo.
echo Changes to be committed:
git status --short
echo.

set "MSG="
set /p MSG="Enter a commit message (press Enter to use a timestamped default): "
if "%MSG%"=="" set "MSG=Update Poondu Ledger - %date% %time%"

git commit -m "%MSG%"
if errorlevel 1 (
    echo.
    echo Commit failed - see the message above.
    pause
    exit /b 1
)

echo.
echo Pushing to origin main...
git push origin main
if errorlevel 1 (
    echo.
    echo PUSH FAILED. Common causes: no internet connection, GitHub asking you to
    echo sign in again, or someone else pushed commits you don't have yet
    echo ^(try running "git pull" once, then run this script again^).
    pause
    exit /b 1
)

echo.
echo Done. Your changes are now on https://github.com/Thendral89/poondu-ledger
pause
