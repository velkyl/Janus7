import fs from 'fs';
import path from 'path';

const root = process.cwd();
const builtinsFile = path.join(root, 'core/test/register-builtins.js');
const txt = fs.readFileSync(builtinsFile, 'utf8');
const relPaths = Array.from(txt.matchAll(/'\.\/tests\/[^']+\.test\.js'/g)).map((m) => m[0].slice(1, -1));
const errors = [];
const ids = new Map();

for (const rel of relPaths) {
  const file = path.join(root, 'core/test', rel.replace(/^\.\//, ''));
  if (!fs.existsSync(file)) {
    errors.push(`Built-in test file missing: ${rel}`);
    continue;
  }
  const src = fs.readFileSync(file, 'utf8');
  const m = src.match(/id:\s*['\"]([^'\"]+)['\"]/);
  if (!m) {
    errors.push(`Built-in test missing id: ${rel}`);
    continue;
  }
  const id = m[1];
  if (ids.has(id)) errors.push(`Duplicate built-in test id ${id}: ${ids.get(id)} and ${rel}`);
  ids.set(id, rel);
}

if (errors.length) {
  console.error('validate-test-registry failed:');
  for (const err of errors) console.error(` - ${err}`);
  process.exit(1);
}

console.log(`validate-test-registry: OK (${relPaths.length} built-in imports, ${ids.size} unique ids)`);
