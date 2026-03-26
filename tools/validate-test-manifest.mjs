import fs from 'fs';
import path from 'path';
import { normalizeKind } from '../core/test/normalize.js';

const root = process.cwd();
const manifestPath = path.join(root, 'data/tests/extended-test-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const entries = Array.isArray(manifest?.tests) ? manifest.tests : [];
const errors = [];
const manifestIds = new Set();
const manifestPaths = new Set();
const manifestById = new Map();

for (const entry of entries) {
  if (!entry?.id) errors.push('Manifest entry without id');
  if (!entry?.title) errors.push(`Manifest entry ${entry?.id ?? '(unknown)'} missing title`);
  if (!entry?.kind) errors.push(`Manifest entry ${entry?.id ?? '(unknown)'} missing kind`);
  if (!entry?.suiteClass) errors.push(`Manifest entry ${entry?.id ?? '(unknown)'} missing suiteClass`);
  if (!entry?.importPath) errors.push(`Manifest entry ${entry?.id ?? '(unknown)'} missing importPath`);
  if (entry?.id && manifestIds.has(entry.id)) errors.push(`Duplicate manifest id: ${entry.id}`);
  if (entry?.id) manifestIds.add(entry.id);
  if (entry?.id) manifestById.set(entry.id, entry);
  if (entry?.importPath) {
    manifestPaths.add(entry.importPath);
    const filePath = path.join(root, 'core/test', entry.importPath.replace(/^\.\//, ''));
    if (!fs.existsSync(filePath)) errors.push(`Missing test file for manifest entry ${entry.id}: ${entry.importPath}`);
  }
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.test.js')) out.push(full);
  }
  return out;
}

for (const file of walk(path.join(root, 'core/test/tests'))) {
  const txt = fs.readFileSync(file, 'utf8');
  const m = txt.match(/id:\s*['\"]([^'\"]+)['\"]/);
  if (!m) {
    errors.push(`Test file without id: ${path.relative(root, file)}`);
    continue;
  }
  const id = m[1];
  const rel = './' + path.relative(path.join(root, 'core/test'), file).replace(/\\/g, '/');
  if (!manifestIds.has(id) && !manifestPaths.has(rel)) {
    errors.push(`Test not represented in manifest/baseline: ${id} (${rel})`);
    continue;
  }

  const entry = manifestById.get(id);
  if (!entry) continue;

  const kindMatch = txt.match(/kind:\s*['\"]([^'\"]+)['\"]/);
  if (kindMatch && entry.kind) {
    const manifestKind = normalizeKind(entry.kind, 'manual');
    const fileKind = normalizeKind(kindMatch[1], 'manual');
    if (manifestKind !== fileKind) {
      errors.push(`Manifest kind drift for ${id}: manifest=${entry.kind}, file=${kindMatch[1]}`);
    }
  }
}

if (errors.length) {
  console.error('validate-test-manifest failed:');
  for (const err of errors) console.error(` - ${err}`);
  process.exit(1);
}

console.log(`validate-test-manifest: OK (${entries.length} manifest entries)`);
