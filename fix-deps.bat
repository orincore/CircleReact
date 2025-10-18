@echo off
echo ========================================
echo Fixing Circle App Dependencies
echo ========================================
echo.

cd /d "%~dp0"

echo Step 1: Installing expo-media-library...
call npx expo install expo-media-library@~18.2.0

echo.
echo Step 2: Running expo doctor...
call npx expo-doctor

echo.
echo ========================================
echo Done! Check the output above.
echo ========================================
pause
