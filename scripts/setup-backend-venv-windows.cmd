@echo off
setlocal EnableExtensions
title ControleExped v1.2 — preparar backend Python (Windows)
cd /d "%~dp0..\backend" || exit /b 1

echo.
echo === A remover .venv antigo (se existir) ===
if exist ".venv" rmdir /s /q ".venv"

echo.
echo === A criar novo venv (.venv) ===
where py >nul 2>&1
if %errorlevel% equ 0 (
  py -m venv --copies .venv
) else (
  python -m venv --copies .venv
)
if not exist ".venv\Scripts\python.exe" (
  echo ERRO: nao foi criado .venv\Scripts\python.exe. Instale Python 3 de python.org e marque "Add to PATH", ou use: py -m venv .venv
  pause
  exit /b 1
)

echo.
echo === A instalar dependencias (requirements.txt) ===
".venv\Scripts\python.exe" -m pip install --upgrade pip
".venv\Scripts\pip.exe" install -r requirements.txt
if %errorlevel% neq 0 (
  echo ERRO: pip install falhou.
  pause
  exit /b 1
)

echo.
echo === Concluido. Na raiz do projeto corra: npm run electron:dist:win ===
echo.
pause
