import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const testsRoot = path.join(root, 'core', 'test', 'tests');
const builtinsFile = path.join(root, 'core', 'test', 'register-builtins.js');
const manifestFile = path.join(root, 'data', 'tests', 'extended-test-manifest.json');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith('.test.js')) files.push(full);
  }
  return files.sort();
}

function extractBuiltinImportPaths(source) {
  return Array.from(source.matchAll(/'\.\/tests\/[^']+\.test\.js'/g)).map((m) => m[0].slice(1, -1));
}

function extractScalar(source, key) {
  const rx = new RegExp(`${key}\\s*:\\s*['"]([^'"]+)['"]`);
  return source.match(rx)?.[1] ?? null;
}

function extractPhases(source) {
  const phasesMatch = source.match(/phases\s*:\s*\[([^\]]*)\]/);
  if (phasesMatch) {
    return phasesMatch[1]
      .split(',')
      .map((v) => Number(String(v).trim()))
      .filter((v) => Number.isFinite(v));
  }
  const phaseMatch = source.match(/phase\s*:\s*(\d+)/);
  return phaseMatch ? [Number(phaseMatch[1])] : [];
}

const failures = [];
const filePaths = walk(testsRoot).map((full) => './' + path.relative(path.join(root, 'core', 'test'), full).replace(/\\/g, '/'));
const builtinSource = fs.readFileSync(builtinsFile, 'utf8');
const builtinPaths = extractBuiltinImportPaths(builtinSource);
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const entries = Array.isArray(manifest?.tests) ? manifest.tests : [];

for (const [idx, entry] of entries.entries()) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    failures.push(`[TEST-MANIFEST] entry #${idx} is not an object`);
    continue;
  }
  if (!entry.id) failures.push(`[TEST-MANIFEST] entry #${idx} missing id`);
  if (!entry.importPath) failures.push(`[TEST-MANIFEST] entry ${entry.id ?? '#'+idx} missing importPath`);
}

const manifestPaths = entries.filter((e) => e && typeof e === 'object' && !Array.isArray(e)).map((e) => e.importPath);
const duplicateManifestPaths = manifestPaths.filter((p, i) => p && manifestPaths.indexOf(p) !== i);
for (const p of new Set(duplicateManifestPaths)) failures.push(`[TEST-MANIFEST] duplicate importPath ${p}`);

for (const rel of filePaths) {
  if (!builtinPaths.includes(rel) && !manifestPaths.includes(rel)) {
    failures.push(`[TEST-COVERAGE] unregistered test file ${rel}`);
  }
}
for (const rel of builtinPaths) {
  if (!filePaths.includes(rel)) failures.push(`[TEST-BUILTIN] missing file ${rel}`);
}
for (const rel of manifestPaths) {
  if (!filePaths.includes(rel)) failures.push(`[TEST-MANIFEST] importPath does not exist ${rel}`);
}

for (const rel of manifestPaths) {
  const abs = path.join(root, 'core', 'test', rel.replace(/^\.\//, ''));
  if (!fs.existsSync(abs)) continue;
  const src = fs.readFileSync(abs, 'utf8');
  const fileId = extractScalar(src, 'id');
  const entry = entries.find((e) => e?.importPath === rel);
  if (entry?.id && fileId && entry.id !== fileId) failures.push(`[TEST-ID-DRIFT] ${rel}: manifest=${entry.id} file=${fileId}`);
}

if (failures.length) {
  for (const msg of failures) console.error(msg);
  process.exit(1);
}
console.log(`Test validation ok (${filePaths.length} files, ${builtinPaths.length} builtins, ${entries.length} manifest entries)`);
