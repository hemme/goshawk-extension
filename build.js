#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const BUILD = path.join(ROOT, 'build');

const targets = {
  chrome: 'manifest-chrome.json',
  firefox: 'manifest-firefox.json',
};

function readManifest(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
}

function writeManifest(file, data) {
  fs.writeFileSync(path.join(ROOT, file), JSON.stringify(data, null, 2) + '\n');
}

function getVersion() {
  return readManifest('manifest-chrome.json').version;
}

function setVersion(v) {
  for (const f of Object.values(targets)) {
    const m = readManifest(f);
    m.version = v;
    writeManifest(f, m);
  }
}

function parseVersion(v) {
  const parts = String(v).split('.');
  if (parts.length !== 3 || parts.some((p) => !/^\d+$/.test(p))) {
    throw new Error(`Invalid version format "${v}". Expected "X.Y.Z".`);
  }
  return parts.map(Number);
}

function bumpBuild(v) {
  const [major, minor, build] = parseVersion(v);
  return `${major}.${minor}.${build + 1}`;
}

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function promptVersion() {
  const current = getVersion();
  console.log(`Current version: ${current}`);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await ask(rl, 'Choose an option - 0: keep current | 1: increment build (default) | 2: insert new version\n> ')).trim();
    if (answer === '' || answer === '1') {
      const next = bumpBuild(current);
      setVersion(next);
      console.log(`Version bumped to ${next}`);
      return next;
    }
    if (answer === '0') {
      console.log(`Keeping current version ${current}`);
      return current;
    }
    if (answer === '2') {
      const next = (await ask(rl, 'Enter new version (X.Y.Z): ')).trim();
      parseVersion(next);
      setVersion(next);
      console.log(`Version set to ${next}`);
      return next;
    }
    console.error(`Invalid option "${answer}". Aborting.`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

const SKIP_FILES = new Set(['.DS_Store', 'Thumbs.db', '.gitkeep']);

function copyRecursive(src, dst) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dst, entry));
    }
  } else {
    if (SKIP_FILES.has(path.basename(src))) return;
    fs.copyFileSync(src, dst);
  }
}

function zipFolder(folder, outFile) {
  const isWin = process.platform === 'win32';
  if (isWin) {
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -Path '${folder.replace(/\\/g, '/')}/*' -DestinationPath '${outFile.replace(/\\/g, '/')}' -Force"`,
      { stdio: 'inherit' }
    );
  } else {
    execSync(`zip -r "${outFile}" .`, { cwd: folder, stdio: 'inherit' });
  }
}

(async () => {
  const version = await promptVersion();
  console.log(`Building GoShawk extensions [v${version}]...`);

  if (!fs.existsSync(SRC)) {
    console.error(`Error: src/ folder not found at ${SRC}`);
    process.exit(1);
  }

  fs.mkdirSync(BUILD, { recursive: true });

  for (const [browser, manifestFile] of Object.entries(targets)) {
    const manifestSrc = path.join(ROOT, manifestFile);
    if (!fs.existsSync(manifestSrc)) {
      console.error(`Error: ${manifestFile} not found at ${manifestSrc}`);
      process.exit(1);
    }

    const outDir = path.join(BUILD, browser);
    rmrf(outDir);
    fs.mkdirSync(outDir, { recursive: true });

    copyRecursive(SRC, outDir);

    // Copy hen-js dependency (needed by sgf_from_image/load_hen.js: import '../hen-js/src/index.js')
    const henJsSrc = path.join(ROOT, 'hen-js', 'src');
    const henJsDst = path.join(outDir, 'hen-js', 'src');
    if (fs.existsSync(henJsSrc)) {
      copyRecursive(henJsSrc, henJsDst);
    } else {
      console.error('Warning: hen-js/src not found - load_hen.js will fail at runtime');
    }

    fs.copyFileSync(manifestSrc, path.join(outDir, 'manifest.json'));

    const zipName = `goshawk-${browser}-v${version}.zip`;
    const zipPath = path.join(BUILD, zipName);
    rmrf(zipPath);
    zipFolder(outDir, zipPath);

    console.log(`  \u2713 ${browser}: build/${browser}/ \u2192 ${zipName}`);
  }

  console.log('Done.');
})();
