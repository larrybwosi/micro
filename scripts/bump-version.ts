import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = process.cwd();
const pkgPath = path.join(rootDir, 'package.json');
const tauriConfPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json');
const cargoTomlPath = path.join(rootDir, 'src-tauri', 'Cargo.toml');

const type = process.argv[2] || 'patch'; // patch, minor, major, or explicit version e.g. 0.1.7

function parseSemver(v: string) {
  const m = v.trim().match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!m) throw new Error(`Invalid semver version: ${v}`);
  return { major: parseInt(m[1], 10), minor: parseInt(m[2], 10), patch: parseInt(m[3], 10), prerelease: m[4] };
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const currentVersion = pkg.version || '0.1.0';

let newVersion = '';
if (['patch', 'minor', 'major'].includes(type)) {
  const { major, minor, patch } = parseSemver(currentVersion);
  if (type === 'patch') newVersion = `${major}.${minor}.${patch + 1}`;
  else if (type === 'minor') newVersion = `${major}.${minor + 1}.0`;
  else if (type === 'major') newVersion = `${major + 1}.0.0`;
} else if (/^\d+\.\d+\.\d+/.test(type)) {
  newVersion = type;
} else {
  console.error(`Unknown bump type or version format: ${type}`);
  process.exit(1);
}

console.log(`Bumping version from ${currentVersion} -> ${newVersion}`);

// Update package.json
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

// Update tauri.conf.json
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
tauriConf.version = newVersion;
fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');

// Update Cargo.toml
let cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');
cargoToml = cargoToml.replace(/^version\s*=\s*"[^"]+"/m, `version = "${newVersion}"`);
fs.writeFileSync(cargoTomlPath, cargoToml);

console.log(`Successfully bumped version to ${newVersion} across package.json, tauri.conf.json, and Cargo.toml.`);
