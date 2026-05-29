#!/usr/bin/env node
/**
 * Garante que build/backend-pack/ existe e tem Python antes do electron-builder.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const packRoot = path.join(root, "build", "backend-pack");
const mainPy = path.join(packRoot, "main.py");
const runtimePy = path.join(packRoot, "runtime", "python.exe");
const venvWin = path.join(packRoot, ".venv", "Scripts", "python.exe");
const venvUnix = path.join(packRoot, ".venv", "bin", "python");

if (!fs.existsSync(mainPy)) {
  console.error(
    "\n[assert-backend-pack] ERRO: build/backend-pack/main.py não encontrado.\n" +
      "Execute antes: node scripts/prepare-backend-pack.js\n",
  );
  process.exit(1);
}

const hasRuntime = fs.existsSync(runtimePy);
const hasVenv = fs.existsSync(venvWin) || fs.existsSync(venvUnix);

if (process.platform === "win32" && !hasRuntime && !hasVenv) {
  console.error(
    "\n[assert-backend-pack] ERRO: pacote Windows sem Python.\n" +
      "Execute: node scripts/prepare-backend-pack.js\n" +
      "(baixa Python embeddable portátil + dependências do backend)\n",
  );
  process.exit(1);
}

if (!hasRuntime && !hasVenv) {
  console.error(
    "\n[assert-backend-pack] ERRO: build/backend-pack sem Python (.venv ou runtime).\n" +
      "Execute: node scripts/prepare-backend-pack.js\n",
  );
  process.exit(1);
}

console.log(
  `[assert-backend-pack] OK: ${hasRuntime ? "runtime/python.exe" : ".venv"} presente.\n`,
);
