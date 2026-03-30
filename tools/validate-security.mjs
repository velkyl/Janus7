import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const allowedNewFunction = new Set([
  path.join('docs', 'TESTRUNNER_FULLCATALOG_ManualFirst.js'),
  path.join('macros', 'JANUS7_TestRunner_FullCatalog_v1.6_macro.js')
]);

const allowedEval = new Set([
  path.join('macros', 'JANUS7_Manual_Test_Full_Run_macro.js')
]);

const allowedInnerHTML = new Set([]);
const findings = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile() && (full.endsWith('.js') || full.endsWith('.mjs'))) files.push(full);
  }
  return files;
}

const scanDirs = [
  path.join(root, 'academy'),
  path.join(root, 'atmosphere'),
  path.join(root, 'bridge'),
  path.join(root, 'core'),
  path.join(root, 'macros'),
  path.join(root, 'phase7'),
  path.join(root, 'scripts'),
  path.join(root, 'ui'),
];

const excludeDirs = new Set([
  path.join(root, 'docs'),
  path.join(root, 'tools'),
]);

const allFiles = [];
for (const dir of scanDirs) allFiles.push(...walk(dir));

for (const file of allFiles) {
  const rel = path.relative(root, file);
  const isExcluded = [...excludeDirs].some((ex) => file.startsWith(ex));
  if (isExcluded) continue;

  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNo = idx + 1;
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;

    if (/new\s+Function\s*\(/.test(line) && !allowedNewFunction.has(rel)) {
      findings.push(`[SECURITY] new Function in ${rel}:${lineNo}`);
    }

    if (/(?:^|[\s;=(,!])eval\s*\(/.test(line) && !allowedEval.has(rel)) {
      findings.push(`[SECURITY] eval() in ${rel}:${lineNo}`);
    }

    if (/\.innerHTML\s*[+]?=/.test(line) && !allowedInnerHTML.has(rel)) {
      findings.push(`[SECURITY] innerHTML-Zuweisung in ${rel}:${lineNo} (XSS-Risiko - TextContent oder sanitize() verwenden)`);
    }
  });
}

if (findings.length) {
  for (const finding of findings) console.error(finding);
  process.exit(1);
}
console.log('Security validation ok');
