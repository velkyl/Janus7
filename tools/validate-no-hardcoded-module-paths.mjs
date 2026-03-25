import fs from 'fs';
import path from 'path';

const root = process.cwd();
const exts = new Set(['.js', '.mjs', '.hbs']);
const allowed = [
  'README', 'docs/', 'CHANGELOG.md', 'macros/', '.github/', 'data/tests/', 'core/test/tests/', 'tools/validate-no-hardcoded-module-paths.mjs'
];
const errors = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).replace(/\\/g, '/');
    if (allowed.some((a) => rel === a || rel.startsWith(a))) continue;
    if (entry.isDirectory()) walk(full);
    else if (exts.has(path.extname(entry.name))) {
      const txt = fs.readFileSync(full, 'utf8');
      if (txt.includes('modules/Janus7/')) errors.push(rel);
    }
  }
}

walk(root);
if (errors.length) {
  console.error('validate-no-hardcoded-module-paths failed:');
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}
console.log('validate-no-hardcoded-module-paths: OK');
