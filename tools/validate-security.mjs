import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const allowedNewFunction = new Set([
  path.join('docs', 'TESTRUNNER_FULLCATALOG_ManualFirst.js'),
  path.join('macros', 'JANUS7_TestRunner_FullCatalog_v1.6_macro.js')
]);

const findings = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile() && full.endsWith('.js')) files.push(full);
  }
  return files;
}

for (const file of walk(root)) {
  const rel = path.relative(root, file);
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('new Function') && !allowedNewFunction.has(rel)) {
    findings.push(`[SECURITY] disallowed new Function in ${rel}`);
  }
}

if (findings.length) {
  for (const finding of findings) console.error(finding);
  process.exit(1);
}
console.log('Security validation ok');
