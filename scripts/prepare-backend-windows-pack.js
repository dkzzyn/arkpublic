#!/usr/bin/env node
/**
 * Copia backend/ para build/backend-pack/ expandindo symlinks (arquivos reais).
 * Evita erro "Cannot create symbolic link" no instalador Windows do cliente.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const srcRoot = path.join(root, "backend");
const destRoot = path.join(root, "build", "backend-pack");

const SKIP_DIRS = new Set(["__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache"]);
const SKIP_EXT = new Set([".pyc", ".pyo", ".pyd"]);

function shouldSkip(name, isDir) {
  if (isDir && SKIP_DIRS.has(name)) return true;
  const ext = path.extname(name).toLowerCase();
  return SKIP_EXT.has(ext);
}

function copyDereference(src, dest, depth = 0) {
  if (depth > 40) {
    throw new Error(`Symlink chain too deep: ${src}`);
  }

  let stat;
  try {
    stat = fs.lstatSync(src);
  } catch (err) {
    throw new Error(`Cannot read ${src}: ${err.message}`);
  }

  if (stat.isSymbolicLink()) {
    const linkTarget = fs.readlinkSync(src);
    const resolved = path.isAbsolute(linkTarget)
      ? linkTarget
      : path.resolve(path.dirname(src), linkTarget);
    return copyDereference(resolved, dest, depth + 1);
  }

  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      if (shouldSkip(entry, true)) continue;
      copyDereference(path.join(src, entry), path.join(dest, entry), 0);
    }
    return;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function main() {
  if (!fs.existsSync(srcRoot)) {
    console.error("[prepare-backend-windows-pack] ERRO: pasta backend/ nao encontrada.");
    process.exit(1);
  }

  fs.rmSync(destRoot, { recursive: true, force: true });
  fs.mkdirSync(destRoot, { recursive: true });

  console.log("[prepare-backend-windows-pack] Copiando backend (sem symlinks)...");
  for (const entry of fs.readdirSync(srcRoot)) {
    if (shouldSkip(entry, fs.statSync(path.join(srcRoot, entry)).isDirectory())) continue;
    copyDereference(path.join(srcRoot, entry), path.join(destRoot, entry));
  }

  const winPython = path.join(destRoot, ".venv", "Scripts", "python.exe");
  if (!fs.existsSync(winPython)) {
    console.warn(
      "[prepare-backend-windows-pack] AVISO: .venv\\Scripts\\python.exe nao encontrado no pacote.",
    );
    console.warn("  Corra scripts\\setup-backend-venv-windows.cmd antes do build Windows.");
  } else {
    console.log("[prepare-backend-windows-pack] OK: venv Windows incluido (copia real, sem symlinks).");
  }

  console.log(`[prepare-backend-windows-pack] Pronto: ${destRoot}`);
}

main();
