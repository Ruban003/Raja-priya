@echo off
title Closing GlamPro...
color 4F

echo.
echo    STOPPING GLAMPRO SERVER...
echo    (Please wait...)
echo.

:: This command kills the invisible Node.js server
taskkill /F /IM node.exe /T

echo.
echo    ✅ Shop Closed Successfully.
echo    Server is off.
timeout /t 3