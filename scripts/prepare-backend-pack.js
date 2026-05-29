#!/usr/bin/env node
/**
 * Prepara build/backend-pack/ antes do electron-builder.
 * Windows (instalador .exe): Python embeddable portátil — funciona no PC do cliente sem Python instalado.
 * Outros SOs: cópia do backend com venv expandido (sem symlinks).
 *
 * Use --win para forçar o pacote Windows mesmo em macOS/Linux (cross-build).
 */
const { spawnSync } = require("child_process");
const path = require("path");

const forceWin = process.argv.includes("--win") || process.env.WINDOWS_BACKEND_PACK === "1";
const useWindowsRuntime = forceWin || process.platform === "win32";

const script = useWindowsRuntime
  ? "setup-backend-runtime-windows.js"
  : "prepare-backend-windows-pack.js";

const result = spawnSync(process.execPath, [path.join(__dirname, script)], {
  cwd: path.join(__dirname, ".."),
  stdio: "inherit",
});

process.exit(result.status ?? 1);
