@echo off
chcp 65001 >nul
setlocal

rem Cree un dossier sur le Bureau. Double-cliquer pour lancer.
set "NOM=Chef Digital"
set /p "NOM=Nom du dossier (Entree = Chef Digital) : "

rem Bureau classique ou Bureau synchronise par OneDrive
set "BUREAU=%USERPROFILE%\Desktop"
if exist "%USERPROFILE%\OneDrive\Desktop" set "BUREAU=%USERPROFILE%\OneDrive\Desktop"
if exist "%USERPROFILE%\OneDrive\Bureau" set "BUREAU=%USERPROFILE%\OneDrive\Bureau"

set "CIBLE=%BUREAU%\%NOM%"
if exist "%CIBLE%" (
    echo Le dossier existe deja : %CIBLE%
) else (
    mkdir "%CIBLE%" && echo Dossier cree : %CIBLE%
)

start "" "%CIBLE%"
pause
