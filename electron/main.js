const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

/** Mesmo valor que package.json build.appId — necessario no Windows para notificacoes e identidade consistente com o instalador NSIS. */
const APP_ID = "com.controleexped.v12";
if (process.platform === "win32") {
  app.setAppUserModelId(APP_ID);
}

let backendProcess = null;

/** Conteúdo da app (dev = raiz do repo; empacotado = pasta do app.asar / app). */
function getAppContentRoot() {
  if (app.isPackaged) {
    return app.getAppPath();
  }
  return path.join(__dirname, "..");
}

/** No app instalado, `backend` vem de extraResources (pasta resources ao lado do .exe). */
function getPackagedResourcesRoot() {
  const candidates = [];
  if (process.resourcesPath) {
    candidates.push(process.resourcesPath);
  }
  try {
    const exeDir = path.dirname(app.getPath("exe"));
    candidates.push(path.join(exeDir, "resources"));
    // Alguns layouts portáteis
    candidates.push(path.join(exeDir, "..", "resources"));
  } catch (_) {
    /* ignore */
  }
  for (const root of candidates) {
    if (!root) continue;
    const backend = path.join(root, "backend");
    if (fs.existsSync(path.join(backend, "main.py"))) {
      return root;
    }
  }
  return process.resourcesPath || path.dirname(process.execPath);
}

function getBackendDir() {
  if (app.isPackaged) {
    return path.join(getPackagedResourcesRoot(), "backend");
  }
  return path.join(__dirname, "..", "backend");
}

const appIconPath = path.join(getAppContentRoot(), "frontend", "public", "image.png");

function getExpectedVenvPythonPath(backendCwd) {
  if (process.platform === "win32") {
    return path.join(backendCwd, ".venv", "Scripts", "python.exe");
  }
  return path.join(backendCwd, ".venv", "bin", "python");
}

/** Venv criado no Mac empacotado dentro do instalador Windows → só existe bin/python, não Scripts/python.exe. */
function explainWrongPlatformVenv(backendCwd) {
  const macVenvPython = path.join(backendCwd, ".venv", "bin", "python");
  const winVenvPython = path.join(backendCwd, ".venv", "Scripts", "python.exe");
  if (process.platform === "win32" && fs.existsSync(macVenvPython) && !fs.existsSync(winVenvPython)) {
    return (
      "\n\nO instalador foi gerado com o Python do macOS dentro de backend/.venv.\n" +
      "No Windows isso não funciona (ENOENT em python.exe).\n\n" +
      "Solução: no PC Windows execute scripts\\setup-backend-venv-windows.cmd (na raiz do repo),\n" +
      "ou manualmente: cd backend, apague .venv, python -m venv .venv, .venv\\Scripts\\pip install -r requirements.txt, cd .., npm run electron:dist:win.\n" +
      "Em Mac use o GitHub Actions \"Electron Windows (.exe)\" para gerar o .exe.\n"
    );
  }
  return "";
}

function getBackendPythonPath() {
  return getExpectedVenvPythonPath(getBackendDir());
}

/** Em dev, se não houver .venv, tenta python do sistema. Empacotado: só venv (deve existir no pacote). */
function resolvePythonAndCwd() {
  const backendCwd = path.resolve(getBackendDir());
  const venvPy = path.resolve(getExpectedVenvPythonPath(backendCwd));
  if (fs.existsSync(venvPy)) {
    return { pythonPath: venvPy, backendCwd, mode: "venv" };
  }
  if (!app.isPackaged) {
    const systemPy = process.platform === "win32" ? "python" : "python3";
    return { pythonPath: systemPy, backendCwd, mode: "system" };
  }
  return { pythonPath: venvPy, backendCwd, mode: "missing" };
}

function startBackend() {
  return new Promise((resolve, reject) => {
    const backendCwd = getBackendDir();
    if (!fs.existsSync(backendCwd)) {
      reject(
        new Error(
          `Pasta "backend" não encontrada:\n${backendCwd}\n\n` +
            (app.isPackaged
              ? "O pacote pode estar incompleto. Reinstale ou gere o instalador com a pasta backend incluída."
              : "Abra o app a partir da raiz do projeto (npm run electron:start)."),
        ),
      );
      return;
    }

    const resolved = resolvePythonAndCwd();
    if (resolved.mode === "missing") {
      const wrongPlat = explainWrongPlatformVenv(backendCwd);
      const winHint =
        process.platform === "win32"
          ? "No Windows, na pasta do projeto, antes de gerar o instalador:\n" +
            "  cd backend\n" +
            "  python -m venv .venv\n" +
            "  .venv\\Scripts\\pip install -r requirements.txt\n\n" +
            "Depois: npm run electron:dist:win (no PC Windows ou no GitHub Actions)."
          : "No Mac, na pasta do projeto:\n" +
            "  cd backend && python3 -m venv .venv\n" +
            "  ./.venv/bin/pip install -r requirements.txt\n\n" +
            "Depois gere o instalador de novo com o .venv já criado.";
      reject(
        new Error(
          `Python do venv não encontrado (ENOENT):\n${resolved.pythonPath}\n\n` +
            winHint +
            wrongPlat,
        ),
      );
      return;
    }

    const { pythonPath } = resolved;
    const args = ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"];

    backendProcess = spawn(pythonPath, args, {
      cwd: backendCwd,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });

    let started = false;
    let settled = false;
    const maxWait = 20000;
    const timer = setTimeout(() => {
      if (!started && !settled) {
        settled = true;
        reject(
          new Error(
            `O uvicorn não respondeu em ${maxWait / 1000}s (porta 8000).\n` +
              "Confira se o Python tem fastapi/uvicorn/pandas instalados.",
          ),
        );
      }
    }, maxWait);

    const onData = (chunk) => {
      const output = String(chunk || "");
      if (!started && (output.includes("Uvicorn running on") || output.includes("Application startup complete"))) {
        started = true;
        settled = true;
        clearTimeout(timer);
        resolve();
      }
    };

    backendProcess.stdout.on("data", onData);
    backendProcess.stderr.on("data", onData);

    backendProcess.on("error", (err) => {
      if (started || settled) return;
      settled = true;
      clearTimeout(timer);
      const code = err && err.code;
      const extra =
        code === "ENOENT"
          ? `\n\nO executável não foi encontrado:\n${pythonPath}\n` +
            explainWrongPlatformVenv(backendCwd) +
            (resolved.mode === "system"
              ? process.platform === "win32"
                ? "\nInstale Python 3 do python.org (marque \"Add to PATH\") e rode: pip install -r requirements.txt na pasta backend."
                : "\nInstale o Python 3 e: pip install -r backend/requirements.txt"
              : "")
          : "";
      reject(new Error(`${err.message || err}${extra}`));
    });

    backendProcess.on("exit", (code) => {
      if (started || settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`Backend encerrou antes de ficar pronto. Código: ${code ?? "?"}`));
    });
  });
}

function stopBackend() {
  if (!backendProcess || backendProcess.killed) return;
  backendProcess.kill();
}

function isAllowedNavigationUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol === "file:") return true;
    if (
      (u.protocol === "http:" || u.protocol === "https:") &&
      (u.hostname === "127.0.0.1" || u.hostname === "localhost")
    ) {
      const def = u.protocol === "https:" ? "443" : "80";
      const p = u.port || def;
      return p === "8000" || p === "80" || p === "443" || p === "3000" || p === "3001";
    }
    return false;
  } catch {
    return false;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1100,
    minHeight: 700,
    autoHideMenuBar: true,
    icon: appIconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (!isAllowedNavigationUrl(url)) {
      event.preventDefault();
    }
  });
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  const indexPath = path.join(getAppContentRoot(), "frontend", "build", "index.html");
  win.loadFile(indexPath);
}

/** Atualizacoes automaticas (opcional): defina CONTROLEEXPED_UPDATE_URL para a pasta publica do generic provider (ex.: URL base onde esta latest.yml). */
function setupAutoUpdater() {
  if (!app.isPackaged) return;
  const base = process.env.CONTROLEEXPED_UPDATE_URL;
  if (!base || typeof base !== "string" || !base.trim()) return;
  try {
    const { autoUpdater } = require("electron-updater");
    const url = base.replace(/\/?$/, "");
    autoUpdater.setFeedURL({ provider: "generic", url });
    autoUpdater.autoDownload = false;
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  } catch (err) {
    console.warn("[autoUpdater]", err && err.message);
  }
}

app.whenReady().then(async () => {
  try {
    if (process.platform === "darwin" && app.dock?.setIcon) {
      app.dock.setIcon(appIconPath);
    }
    await startBackend();
    createWindow();
    setupAutoUpdater();
  } catch (error) {
    dialog.showErrorBox(
      "Falha ao iniciar backend local",
      `Não foi possível iniciar o FastAPI embutido.\n\n${error?.message || error}`,
    );
    app.quit();
  }
});

app.on("window-all-closed", () => {
  stopBackend();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  stopBackend();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
