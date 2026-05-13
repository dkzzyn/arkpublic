@echo off
REM Duplo clique ou:  cmd /c windows-uninstall.cmd
REM Opcional:        cmd /c windows-uninstall.cmd -SkipUninstaller
setlocal
title ControleExped v1.2 - desinstalacao
cd /d "%~dp0"
echo A executar desinstalacao de emergencia...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows-force-uninstall.ps1" %*
if errorlevel 1 (
  echo Falhou com codigo %errorlevel%.
  pause
  exit /b 1
)
echo Concluido.
pause
