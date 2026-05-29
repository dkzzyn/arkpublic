#!/usr/bin/env node
/**
 * Build do instalador Windows (.exe).
 * No Windows a saída vai para %LOCALAPPDATA%\\CE-Eb (caminho curto; evita MAX_PATH com Desktop/OneDrive).
 * Em outros SOs: ~/Desktop/ControleExpedicao-Build (ou equivalentes).
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");

const preparePack = spawnSync(process.execPath, [path.join(__dirname, "prepare-backend-pack.js")], {
  cwd: root,
  stdio: "inherit",
});
if (preparePack.status !== 0) {
  process.exit(preparePack.status ?? 1);
}

const assertPack = spawnSync(process.execPath, [path.join(__dirname, "assert-backend-pack.js")], {
  cwd: root,
  stdio: "inherit",
});
if (assertPack.status !== 0) {
  process.exit(assertPack.status ?? 1);
}

function resolveDesktopDir() {
  const home = os.homedir();
  const candidates = [
    path.join(home, "Desktop"),
    path.join(home, "OneDrive", "Desktop"),
    path.join(home, "Escritorio"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      return dir;
    }
  }
  return path.join(home, "Desktop");
}

/** Pasta de saída do electron-builder: curta no Windows para reduzir erros de caminho longo. */
function resolveBuilderOutDir() {
  if (process.platform === "win32") {
    const local = process.env.LOCALAPPDATA;
    if (local && local.length > 0) {
      return path.join(local, "CE-Eb");
    }
    return path.join(os.tmpdir(), "CE-Eb");
  }
  return path.join(resolveDesktopDir(), "ControleExpedicao-Build");
}

const outDir = resolveBuilderOutDir();
fs.mkdirSync(outDir, { recursive: true });

console.log("\n>>> Build Windows (.exe) — saída em:\n", outDir, "\n");

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

const buildFront = spawnSync(npmCmd, ["run", "frontend:build"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});
if (buildFront.status !== 0) {
  process.exit(buildFront.status ?? 1);
}

const builder = spawnSync(
  "npx",
  ["electron-builder", "--win", `--config.directories.output=${outDir}`],
  {
    cwd: root,
    stdio: "inherit",
    shell: true,
  },
);

if (builder.status === 0) {
  const desktop = resolveDesktopDir();
  const inOut = fs
    .readdirSync(outDir)
    .filter((f) => f.endsWith(".exe") && fs.statSync(path.join(outDir, f)).isFile());
  const setup = inOut.find((f) => /setup/i.test(f)) || inOut[0];
  if (setup) {
    const dest = path.join(desktop, setup);
    fs.copyFileSync(path.join(outDir, setup), dest);
    console.log("\n>>> Pronto. Instalador na pasta de build:\n ", path.join(outDir, setup));
    console.log("\n>>> Copiado para o Ambiente de Trabalho:\n ", dest, "\n");
  } else {
    console.log("\n>>> Pronto. Procure o .exe em:\n", outDir, "\n");
  }
}

process.exit(builder.status ?? 1);
