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

function getExpectedRuntimePythonPath(backendCwd) {
  if (process.platform === "win32") {
    return path.join(backendCwd, "runtime", "python.exe");
  }
  return null;
}

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
  const runtimePython = getExpectedRuntimePythonPath(backendCwd);
  if (
    process.platform === "win32" &&
    fs.existsSync(macVenvPython) &&
    !fs.existsSync(winVenvPython) &&
    !(runtimePython && fs.existsSync(runtimePython))
  ) {
    return (
      "\n\nO instalador foi gerado com o Python do macOS dentro de backend/.venv.\n" +
      "No Windows isso não funciona (ENOENT em python.exe).\n\n" +
      "Solução: gere o instalador de novo com:\n" +
      "  npm run electron:dist:win\n" +
      "(usa Python embeddable portátil, sem depender do Python do cliente).\n"
    );
  }
  return "";
}

function getBackendLogPath() {
  try {
    return path.join(app.getPath("userData"), "backend.log");
  } catch {
    return null;
  }
}

function appendBackendLog(text) {
  const logPath = getBackendLogPath();
  if (!logPath) return;
  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, text, "utf8");
  } catch {
    /* ignore */
  }
}

function readBackendLogTail(maxLines = 24) {
  const logPath = getBackendLogPath();
  if (!logPath || !fs.existsSync(logPath)) return "";
  try {
    const lines = fs.readFileSync(logPath, "utf8").split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return "";
    return `\n\nÚltimas linhas do log (${logPath}):\n${lines.slice(-maxLines).join("\n")}`;
  } catch {
    return "";
  }
}

async function waitForBackendHealth(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch("http://127.0.0.1:8000/health");
      if (res.ok) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

function getBackendPythonPath() {
  return getExpectedVenvPythonPath(getBackendDir());
}

/** Em dev, se não houver .venv, tenta python do sistema. Empacotado: runtime portátil ou venv. */
function resolvePythonAndCwd() {
  const backendCwd = path.resolve(getBackendDir());
  const runtimePyPath = getExpectedRuntimePythonPath(backendCwd);
  if (runtimePyPath) {
    const runtimePy = path.resolve(runtimePyPath);
    if (fs.existsSync(runtimePy)) {
      return { pythonPath: runtimePy, backendCwd, mode: "runtime" };
    }
  }
  const venvPy = path.resolve(getExpectedVenvPythonPath(backendCwd));
  if (fs.existsSync(venvPy)) {
    return { pythonPath: venvPy, backendCwd, mode: "venv" };
  }
  if (!app.isPackaged) {
    const systemPy = process.platform === "win32" ? "python" : "python3";
    return { pythonPath: systemPy, backendCwd, mode: "system" };
  }
  return { pythonPath: runtimePyPath || venvPy, backendCwd, mode: "missing" };
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
          ? "O instalador deve incluir resources\\backend\\runtime\\python.exe.\n" +
            "Gere o .exe de novo na raiz do projeto:\n" +
            "  npm run electron:dist:win\n\n" +
            "Esse comando baixa Python embeddable portátil e instala as dependências do FastAPI."
          : "No Mac, na pasta do projeto:\n" +
            "  cd backend && python3 -m venv .venv\n" +
            "  ./.venv/bin/pip install -r requirements.txt\n\n" +
            "Depois gere o instalador de novo com o .venv já criado.";
      reject(
        new Error(
          `Python embutido não encontrado:\n${resolved.pythonPath}\n\n` +
            winHint +
            wrongPlat,
        ),
      );
      return;
    }

    const { pythonPath, backendCwd: spawnCwd } = resolved;
    const args = ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"];
    const logPath = getBackendLogPath();
    if (logPath) {
      appendBackendLog(`\n--- ${new Date().toISOString()} ---\n`);
      appendBackendLog(`python: ${pythonPath}\ncwd: ${spawnCwd}\n`);
    }

    backendProcess = spawn(pythonPath, args, {
      cwd: spawnCwd,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });

    let started = false;
    let settled = false;
    let stderrBuf = "";
    const maxWait = 30000;

    const markStarted = () => {
      if (started || settled) return;
      started = true;
      settled = true;
      clearTimeout(timer);
      resolve();
    };

    const fail = (message) => {
      if (started || settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`${message}${readBackendLogTail()}`));
    };

    const timer = setTimeout(async () => {
      if (started || settled) return;
      if (await waitForBackendHealth(1500)) {
        markStarted();
        return;
      }
      fail(
        `O uvicorn não respondeu em ${maxWait / 1000}s (porta 8000).\n` +
          (stderrBuf.trim() ? `\nSaída do Python:\n${stderrBuf.trim().slice(-2000)}` : ""),
      );
    }, maxWait);

    const onData = (chunk, isErr = false) => {
      const output = String(chunk || "");
      appendBackendLog(output);
      if (isErr) stderrBuf += output;
      if (
        !started &&
        (output.includes("Uvicorn running on") || output.includes("Application startup complete"))
      ) {
        markStarted();
      }
    };

    backendProcess.stdout.on("data", (c) => onData(c, false));
    backendProcess.stderr.on("data", (c) => onData(c, true));

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
      reject(new Error(`${err.message || err}${extra}${readBackendLogTail()}`));
    });

    backendProcess.on("exit", (code) => {
      if (started || settled) return;
      settled = true;
      clearTimeout(timer);
      const tail = stderrBuf.trim() ? `\nSaída do Python:\n${stderrBuf.trim().slice(-2000)}` : "";
      reject(
        new Error(`Backend encerrou antes de ficar pronto. Código: ${code ?? "?"}${tail}${readBackendLogTail()}`),
      );
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
