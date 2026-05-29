#!/usr/bin/env node
/**
 * Monta build/backend-pack/ com backend + Python embeddable portátil (Windows).
 * Não depende do Python instalado na máquina do cliente.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const https = require("https");
const path = require("path");

const PYTHON_VERSION = process.env.PYTHON_EMBED_VERSION || "3.12.10";
const root = path.join(__dirname, "..");
const srcRoot = path.join(root, "backend");
const destRoot = path.join(root, "build", "backend-pack");
const runtimeDir = path.join(destRoot, "runtime");
const cacheDir = path.join(root, "build", "python-embed-cache");
const zipName = `python-${PYTHON_VERSION}-embed-amd64.zip`;
const zipPath = path.join(cacheDir, zipName);
const zipUrl = `https://www.python.org/ftp/python/${PYTHON_VERSION}/${zipName}`;

function log(msg) {
  console.log(`[setup-backend-runtime-windows] ${msg}`);
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlinkSync(dest);
          download(res.headers.location, dest).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Download falhou (${res.statusCode}): ${url}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", reject);
  });
}

function copyBackendSources() {
  fs.mkdirSync(destRoot, { recursive: true });
  for (const entry of fs.readdirSync(srcRoot)) {
    if (entry === ".venv" || entry === "__pycache__") continue;
    const src = path.join(srcRoot, entry);
    const dest = path.join(destRoot, entry);
    fs.cpSync(src, dest, { recursive: true, force: true });
  }
}

function configureEmbedPth() {
  const pthFile = fs.readdirSync(runtimeDir).find((f) => f.endsWith("._pth"));
  if (!pthFile) {
    throw new Error("Arquivo ._pth não encontrado no Python embeddable.");
  }
  const pthPath = path.join(runtimeDir, pthFile);
  const zipLine = fs.readdirSync(runtimeDir).find((f) => f.endsWith(".zip")) || "python312.zip";
  const siteDir = path.join(runtimeDir, "Lib", "site-packages");
  fs.mkdirSync(siteDir, { recursive: true });
  fs.writeFileSync(
    pthPath,
    `${zipLine}\n.\nLib\\site-packages\nimport site\n`,
    "utf8",
  );
}

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", ...opts });
}

async function main() {
  if (!fs.existsSync(path.join(srcRoot, "main.py"))) {
    console.error("[setup-backend-runtime-windows] ERRO: backend/main.py não encontrado.");
    process.exit(1);
  }

  fs.rmSync(destRoot, { recursive: true, force: true });
  fs.mkdirSync(cacheDir, { recursive: true });

  log("Copiando código do backend...");
  copyBackendSources();

  if (!fs.existsSync(zipPath)) {
    log(`Baixando Python embeddable ${PYTHON_VERSION}...`);
    await download(zipUrl, zipPath);
  } else {
    log(`Usando cache: ${zipPath}`);
  }

  fs.mkdirSync(runtimeDir, { recursive: true });
  log("Extraindo Python embeddable...");
  run(`tar -xf "${zipPath}" -C "${runtimeDir}"`);

  configureEmbedPth();

  const pythonExe = path.join(runtimeDir, "python.exe");
  const getPip = path.join(destRoot, "get-pip.py");
  log("Instalando pip...");
  await download("https://bootstrap.pypa.io/get-pip.py", getPip);
  run(`"${pythonExe}" "${getPip}" --no-warn-script-location`);
  fs.unlinkSync(getPip);

  log("Instalando dependências do backend...");
  run(
    `"${pythonExe}" -m pip install --no-warn-script-location -r "${path.join(destRoot, "requirements.txt")}"`,
  );

  log("Validando uvicorn...");
  run(`"${pythonExe}" -c "import uvicorn, fastapi, pandas, openpyxl"`);

  log(`OK: runtime em ${runtimeDir}`);
  log(`OK: pacote em ${destRoot}`);
}

main().catch((err) => {
  console.error("[setup-backend-runtime-windows] ERRO:", err.message || err);
  process.exit(1);
});
