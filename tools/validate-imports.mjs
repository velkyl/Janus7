import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const root = process.cwd();
const includeRoots = ['academy', 'atmosphere', 'bridge', 'bridges', 'core', 'phase7', 'scripts', 'ui'];
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|mjs)$/.test(entry.name)) files.push(full);
  }
}

for (const rel of includeRoots) {
  const full = path.join(root, rel);
  if (fs.existsSync(full)) walk(full);
}

const errors = [];
for (const file of files) {
  const res = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (res.status !== 0) {
    errors.push({
      file: path.relative(root, file),
      stderr: (res.stderr || res.stdout || '').trim()
    });
  }
}

if (errors.length) {
  console.error('validate-imports failed:');
  for (const err of errors) {
    console.error(` - ${err.file}`);
    console.error(err.stderr.split('\n').slice(0, 6).join('\n'));
  }
  process.exit(1);
}

console.log(`validate-imports: OK (${files.length} files parsed)`);
