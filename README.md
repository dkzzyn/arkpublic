# Arkexpedd

Aplicação **ControleExped v1.2** — dashboard de expedição com backend FastAPI embutido, frontend React e empacotamento Electron (Windows / macOS / Linux).

## Stack

- Frontend: React (Create React App) + Recharts + Tailwind
- Backend: FastAPI + Pandas (porta local 8000, só escuta em `127.0.0.1`)
- Empacotamento desktop: Electron + electron-builder (NSIS para Windows)
- Alternativa: Tauri

## Comandos principais

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Sobe backend + frontend em paralelo (modo desenvolvimento) |
| `npm run electron:start` | Faz build do frontend e abre a app Electron |
| `npm run electron:dist:win` | Gera instalador Windows (.exe) — precisa de `.venv` Windows |
| `npm run electron:dist:win-desktop` | Idem, com saída direta para o Ambiente de Trabalho |
| `npm run electron:dist:mac` | Gera DMG/ZIP para macOS |
| `npm run electron:dist:linux` | Gera AppImage para Linux |

## Build no Windows

```cmd
git clone https://github.com/dkzzyn/Arkexpedd.git
cd Arkexpedd
npm install
npm --prefix ./frontend install
scripts\setup-backend-venv-windows.cmd
npm run electron:dist:win
```

Instalador final em `electron-dist\ControleExped-v1.2.0-Setup.exe`.

## Build no GitHub Actions

Workflow `Electron Windows (.exe)` em `.github/workflows/electron-windows.yml` — corre automaticamente em `push` para `main` ou manualmente em **Actions → Run workflow**.

## Atualizações automáticas (opcional)

Define a variável de ambiente `CONTROLEEXPED_UPDATE_URL` na máquina do cliente apontando para a pasta pública onde estão `latest.yml` + `.exe` (ex.: GitHub Releases, S3, servidor interno). O `electron-updater` faz o resto.

## Desinstalação no Windows

Se o desinstalador normal falhar, executa em **PowerShell como administrador**:

```cmd
scripts\windows-uninstall.cmd
```
