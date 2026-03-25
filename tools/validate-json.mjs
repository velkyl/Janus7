import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targets = [path.join(root, 'data'), path.join(root, 'phase7', 'contract')];
let checked = 0;
let failed = 0;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith('.json')) files.push(full);
  }
  return files;
}

for (const target of targets) {
  for (const file of walk(target)) {
    checked += 1;
    try {
      JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
      failed += 1;
      console.error(`[JSON INVALID] ${path.relative(root, file)} :: ${err.message}`);
    }
  }
}

if (failed) {
  console.error(`JSON validation failed (${failed}/${checked})`);
  process.exit(1);
}
console.log(`JSON validation ok (${checked} files)`);
