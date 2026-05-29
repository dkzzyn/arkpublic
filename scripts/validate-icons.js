#!/usr/bin/env node
/**
 * Valida ícones exigidos pelo Electron Builder, Tauri, assets do app e Font Awesome.
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
    id: "electron-win",
    label: "Windows icon.ico (256×256)",
    file: "src-tauri/icons/icon.ico",
    minWidth: 256,
    minHeight: 256,
    square: true,
  },
  {
    id: "electron-mac",
    label: "macOS icon.icns",
    file: "src-tauri/icons/icon.icns",
    existsOnly: true,
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
    id: "tauri-128@2x",
    label: "Tauri 128x128@2x (256×256)",
    file: "src-tauri/icons/128x128@2x.png",
    minWidth: 256,
    minHeight: 256,
    square: true,
  },
  {
    id: "tauri-128",
    label: "Tauri 128x128",
    file: "src-tauri/icons/128x128.png",
    minWidth: 128,
    minHeight: 128,
    square: true,
  },
  {
    id: "tauri-64",
    label: "Tauri 64x64",
    file: "src-tauri/icons/64x64.png",
    minWidth: 64,
    minHeight: 64,
    square: true,
  },
  {
    id: "tauri-32",
    label: "Tauri 32x32",
    file: "src-tauri/icons/32x32.png",
    minWidth: 32,
    minHeight: 32,
    square: true,
  },
  {
    id: "logo-brand",
    label: "Logo Arklok (app/slides)",
    file: "frontend/public/Logo.png",
    minWidth: 64,
    minHeight: 32,
  },
  {
    id: "logo-metade",
    label: "LogoMetade (watermark slides)",
    file: "frontend/public/LogoMetade.png",
    minWidth: 64,
    minHeight: 32,
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

function loadTauriBundleIcons() {
  try {
    const conf = JSON.parse(fs.readFileSync(path.join(root, "src-tauri/tauri.conf.json"), "utf8"));
    return (conf.bundle?.icon || []).map((p) => p.replace(/^icons\//, "src-tauri/icons/"));
  } catch {
    return [];
  }
}

function collectFontAwesomeIcons() {
  const dirs = [path.join(root, "frontend"), path.join(root, "electron")];
  const reSolid = /fa-solid\s+(fa-[a-z0-9-]+)/g;
  const reBare = /["'`]fa-[a-z0-9-]+["'`]/g;
  const found = new Set();

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const abs = path.join(dir, name);
      const stat = fs.statSync(abs);
      if (stat.isDirectory()) {
        if (name === "node_modules" || name === "build") continue;
        walk(abs);
        continue;
      }
      if (!/\.(html|js|jsx|ts|tsx)$/.test(name)) continue;
      const text = fs.readFileSync(abs, "utf8");
      let m;
      while ((m = reSolid.exec(text)) !== null) {
        found.add(m[1]);
      }
      while ((m = reBare.exec(text)) !== null) {
        found.add(m[0].slice(1, -1));
      }
    }
  }

  dirs.forEach(walk);
  return [...found].sort();
}

/** Ícones Font Awesome 6.4 free solid usados no projeto (validação offline). */
const FA6_FREE_SOLID_USED = new Set([
  "fa-arrow-down",
  "fa-arrow-up",
  "fa-building",
  "fa-bullseye",
  "fa-calendar",
  "fa-chart-column",
  "fa-chart-line",
  "fa-chart-pie",
  "fa-check",
  "fa-chevron-left",
  "fa-chevron-right",
  "fa-clock",
  "fa-comment",
  "fa-crown",
  "fa-envelope",
  "fa-expand",
  "fa-file-invoice",
  "fa-file-invoice-dollar",
  "fa-flag-checkered",
  "fa-gauge-high",
  "fa-hourglass",
  "fa-layer-group",
  "fa-moon",
  "fa-percent",
  "fa-phone",
  "fa-qrcode",
  "fa-rotate-left",
  "fa-sack-dollar",
  "fa-star",
  "fa-sun",
  "fa-table",
  "fa-truck",
  "fa-truck-fast",
  "fa-user",
  "fa-users",
]);

function loadFreeSolidIconSet() {
  const cachePath = path.join(root, "node_modules", ".cache-fa6-free-solid.json");
  if (fs.existsSync(cachePath)) {
    try {
      return new Set(JSON.parse(fs.readFileSync(cachePath, "utf8")));
    } catch {
      /* ignore */
    }
  }

  const urls = [
    "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/metadata/icons.json",
    "https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/metadata/icons.json",
  ];

  for (const url of urls) {
    try {
      const raw = execSync(`curl -fsSL "${url}"`, {
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
      });
      const icons = JSON.parse(raw);
      const freeSolid = Object.entries(icons)
        .filter(([, meta]) => meta.free?.includes("solid"))
        .map(([name]) => `fa-${name}`);
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });
      fs.writeFileSync(cachePath, JSON.stringify(freeSolid));
      return new Set(freeSolid);
    } catch {
      /* try next url */
    }
  }

  return null;
}

const errors = [];
const fixed = [];

for (const check of checks) {
  const abs = path.join(root, check.file);
  if (!fs.existsSync(abs)) {
    errors.push(`[${check.id}] Arquivo ausente: ${check.file}`);
    continue;
  }

  if (check.existsOnly) {
    console.log(`OK  ${check.label} → ${check.file}`);
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

for (const rel of loadTauriBundleIcons()) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    errors.push(`[tauri-bundle] Ícone referenciado em tauri.conf.json ausente: ${rel}`);
  } else {
    console.log(`OK  Tauri bundle → ${rel}`);
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const build = pkg.build || {};
const buildIconPaths = [
  build.icon,
  build.win?.icon,
  build.mac?.icon,
  build.linux?.icon,
].filter(Boolean);

for (const rel of [...new Set(buildIconPaths)]) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    errors.push(`[electron-builder] Ícone ausente: ${rel}`);
  } else {
    console.log(`OK  Electron Builder → ${rel}`);
  }
}

const faIcons = collectFontAwesomeIcons();
const faFree = loadFreeSolidIconSet();
if (faFree) {
  for (const icon of faIcons) {
    if (faFree.has(icon)) {
      console.log(`OK  Font Awesome 6 (free solid) → ${icon}`);
    } else {
      errors.push(`[fontawesome] Ícone não disponível no pacote free solid: ${icon}`);
    }
  }
} else {
  console.warn("AVISO  Font Awesome: metadata online indisponível. Validando lista embutida do projeto.");
  for (const icon of faIcons) {
    if (FA6_FREE_SOLID_USED.has(icon)) {
      console.log(`OK  Font Awesome (lista embutida) → ${icon}`);
    } else {
      errors.push(`[fontawesome] Ícone não reconhecido na lista embutida: ${icon}`);
    }
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
