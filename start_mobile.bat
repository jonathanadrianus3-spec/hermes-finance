@echo off
title Hermes Finance Mobile (Expo)
echo ========================================================
echo   Hermes Finance - Android App (iOS 18 Theme)
echo ========================================================
echo.
echo Starting in Tunnel mode (bypasses Windows Firewall and Wi-Fi isolation)...
echo 1. Scan the QR code with Expo Go on your Android phone.
echo 2. Or press 'w' to view in web browser.
echo.
cd mobile
npx expo start --tunnel -g
pause
