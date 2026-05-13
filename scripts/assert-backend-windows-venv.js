/**
 * Antes de empacotar o backend no instalador Windows, exige um .venv criado NO Windows
 * (Scripts\\python.exe). Evita incluir um .venv do macOS/Linux que quebra em runtime.
 *
 * Ignorar (nao recomendado): set SKIP_VENV_CHECK=1
 */
const fs = require("fs");
const path = require("path");

if (process.env.SKIP_VENV_CHECK === "1") {
  console.warn(
    "[assert-backend-windows-venv] SKIP_VENV_CHECK=1 — o instalador pode ficar sem Python compativel com Windows.\n",
  );
  process.exit(0);
}

const root = path.join(__dirname, "..");
const backend = path.join(root, "backend");
const venvWin = path.join(backend, ".venv", "Scripts", "python.exe");
const venvMac = path.join(backend, ".venv", "bin", "python");
const venvMac3 = path.join(backend, ".venv", "bin", "python3");

const hasWinVenv = fs.existsSync(venvWin);
const hasMacStyle = fs.existsSync(venvMac) || fs.existsSync(venvMac3);

if (hasWinVenv) {
  console.log("[assert-backend-windows-venv] OK: encontrado backend\\.venv\\Scripts\\python.exe\n");
  process.exit(0);
}

console.error("\n[assert-backend-windows-venv] ERRO: o instalador Windows precisa de um ambiente virtual criado no Windows.\n");

if (hasMacStyle && !hasWinVenv) {
  console.error(
    "Foi detetado um .venv de macOS/Linux (pasta bin/python), mas nao existe Scripts\\python.exe.\n" +
      "O Python do Mac nao pode ser empacotado para correr no Windows.\n\n" +
      "Resolva no PC Windows (Prompt de comandos ou PowerShell), na raiz do projeto:\n\n" +
      "  scripts\\setup-backend-venv-windows.cmd\n\n" +
      "Ou manualmente:\n" +
      "  cd backend\n" +
      "  rmdir /s /q .venv\n" +
      "  python -m venv .venv\n" +
      "  .venv\\Scripts\\pip install -r requirements.txt\n" +
      "  cd ..\n" +
      "  npm run electron:dist:win\n\n" +
      "Se nao tiver o comando python, experimente: py -m venv .venv\n\n" +
      "Alternativa: GitHub Actions \"Electron Windows (.exe)\" (ja cria o venv no runner).\n",
  );
} else {
  console.error(
    "Nao existe backend\\.venv\\Scripts\\python.exe.\n\n" +
      "No Windows, na raiz do projeto, execute:\n\n" +
      "  scripts\\setup-backend-venv-windows.cmd\n\n" +
      "Depois volte a correr: npm run electron:dist:win\n",
  );
}

process.exit(1);
