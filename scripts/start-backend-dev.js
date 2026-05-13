/**
 * Dev: sobe uvicorn no backend com o mesmo Python do venv em Mac/Linux/Windows.
 */
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const backendCwd = path.join(root, "backend");

function venvPythonPath() {
  if (process.platform === "win32") {
    return path.join(backendCwd, ".venv", "Scripts", "python.exe");
  }
  return path.join(backendCwd, ".venv", "bin", "python");
}

const venvPy = venvPythonPath();
const python = fs.existsSync(venvPy) ? venvPy : process.platform === "win32" ? "python" : "python3";

const child = spawn(
  python,
  ["-m", "uvicorn", "main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"],
  {
    cwd: backendCwd,
    stdio: "inherit",
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
    windowsHide: true,
  },
);

child.on("error", (err) => {
  console.error(err);
  process.exit(1);
});

child.on("exit", (code) => process.exit(code == null ? 1 : code));
