#!/usr/bin/env node
/**
 * Valida ícones exigidos pelo Electron Builder e Tauri.
 * Uso: node scripts/validate-icons.js [--fix]
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const fix = process.argv.includes("--fix");

const checks = [
  {
    id: "electron-main",
    label: "Ícone principal do Electron (mín. 256×256)",
    file: "frontend/public/image.png",
    minWidth: 256,
    minHeight: 256,
    square: true,
    fixFrom: "src-tauri/icons/icon.png",
    fixSize: 256,
  },
  {
    id: "tauri-128@2x",
    label: "Tauri 128x128@2x (256×256)",
    file: "src-tauri/icons/128x128@2x.png",
    minWidth: 256,
    minHeight: 256,
    square: true,
  },
  {
    id: "tauri-icon-png",
    label: "Tauri icon.png (recomendado ≥512×512)",
    file: "src-tauri/icons/icon.png",
    minWidth: 512,
    minHeight: 512,
    square: true,
  },
  {
    id: "tauri-ico",
    label: "Windows icon.ico (256×256)",
    file: "src-tauri/icons/icon.ico",
    minWidth: 256,
    minHeight: 256,
    square: true,
  },
];

function getDimensions(filePath) {
  try {
    const out = execSync(`sips -g pixelWidth -g pixelHeight "${filePath}"`, {
      encoding: "utf8",
    });
    const w = Number(out.match(/pixelWidth:\s*(\d+)/)?.[1]);
    const h = Number(out.match(/pixelHeight:\s*(\d+)/)?.[1]);
    if (!w || !h) return null;
    return { width: w, height: h };
  } catch {
    return null;
  }
}

function resizeSquare(src, dest, size) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  execSync(`sips -z ${size} ${size} "${src}" --out "${dest}"`, { stdio: "inherit" });
}

const errors = [];
const fixed = [];

for (const check of checks) {
  const abs = path.join(root, check.file);
  if (!fs.existsSync(abs)) {
    errors.push(`[${check.id}] Arquivo ausente: ${check.file}`);
    continue;
  }

  const dim = getDimensions(abs);
  if (!dim) {
    errors.push(`[${check.id}] Não foi possível ler dimensões: ${check.file}`);
    continue;
  }

  const okW = dim.width >= check.minWidth;
  const okH = dim.height >= check.minHeight;
  const okSquare = !check.square || dim.width === dim.height;

  if (okW && okH && okSquare) {
    console.log(`OK  ${check.label} → ${dim.width}×${dim.height} (${check.file})`);
    continue;
  }

  const msg = `[${check.id}] ${check.label}: ${dim.width}×${dim.height} em ${check.file} (exige ≥${check.minWidth}×${check.minHeight}${check.square ? ", quadrado" : ""})`;
  errors.push(msg);

  if (fix && check.fixFrom && check.fixSize) {
    const src = path.join(root, check.fixFrom);
    if (!fs.existsSync(src)) {
      errors.push(`[${check.id}] --fix: origem ausente ${check.fixFrom}`);
      continue;
    }
    resizeSquare(src, abs, check.fixSize);
    const after = getDimensions(abs);
    fixed.push(`[${check.id}] Corrigido → ${after.width}×${after.height} (${check.file})`);
  }
}

if (fixed.length) {
  console.log("\nCorreções aplicadas:");
  fixed.forEach((line) => console.log(line));
}

if (errors.length) {
  console.error("\nProblemas encontrados:");
  errors.forEach((line) => console.error(line));
  if (!fix) {
    console.error("\nExecute: npm run icons:fix");
  }
  process.exit(1);
}

console.log("\nTodos os ícones validados com sucesso.");
