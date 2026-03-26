import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

// ─── Whitelist-Konfiguration ──────────────────────────────────────────────────

const allowedNewFunction = new Set([
  path.join('docs', 'TESTRUNNER_FULLCATALOG_ManualFirst.js'),
  path.join('macros', 'JANUS7_TestRunner_FullCatalog_v1.6_macro.js')
]);

// eval() ist generell verboten. Keine Whitelist.
const allowedEval = new Set([]);

// innerHTML-Zuweisungen: Whitelist für Foundry-Core-Interop wo geprüft sicher.
// Neue Einträge erfordern eine explizite Begründung.
// Alle bisherigen Einträge wurden auf createElement/textContent migriert (2026-03-26).
const allowedInnerHTML = new Set([]);

// ─── Datei-Scan ───────────────────────────────────────────────────────────────

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

// Verzeichnisse die gescannt werden
const scanDirs = [
  path.join(root, 'academy'),
  path.join(root, 'atmosphere'),
  path.join(root, 'bridge'),
  path.join(root, 'core'),
  path.join(root, 'phase7'),
  path.join(root, 'scripts'),
  path.join(root, 'ui'),
];

// Verzeichnisse die ausgenommen sind (Macros, Docs, Tools enthalten absichtlich unsichere Patterns)
const excludeDirs = new Set([
  path.join(root, 'macros'),
  path.join(root, 'docs'),
  path.join(root, 'tools'),
]);

const allFiles = [];
for (const dir of scanDirs) {
  allFiles.push(...walk(dir));
}

for (const file of allFiles) {
  const rel = path.relative(root, file);

  // Verzeichnis-Ausnahme prüfen
  const isExcluded = [...excludeDirs].some(ex => file.startsWith(ex));
  if (isExcluded) continue;

  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNo = idx + 1;
    const trimmed = line.trim();

    // Kommentare überspringen (rudimentär – kein AST-Parsing)
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;

    // ── new Function(...) ──────────────────────────────────────────────────────
    if (/new\s+Function\s*\(/.test(line) && !allowedNewFunction.has(rel)) {
      findings.push(`[SECURITY] new Function in ${rel}:${lineNo}`);
    }

    // ── eval(...) ─────────────────────────────────────────────────────────────
    // Regex: eval( am Anfang oder nach Whitespace/Semikolon/Zuweisung
    // Ausnahme: "// eval" (bereits gefiltert oben), "evalFoo" (kein direktes eval)
    if (/(?:^|[\s;=(,!])eval\s*\(/.test(line) && !allowedEval.has(rel)) {
      findings.push(`[SECURITY] eval() in ${rel}:${lineNo}`);
    }

    // ── innerHTML-Zuweisung ───────────────────────────────────────────────────
    // Sucht: .innerHTML = oder .innerHTML+= (direktes Schreiben, nicht nur Lesen)
    if (/\.innerHTML\s*[+]?=/.test(line) && !allowedInnerHTML.has(rel)) {
      findings.push(`[SECURITY] innerHTML-Zuweisung in ${rel}:${lineNo} (XSS-Risiko – TextContent oder sanitize() verwenden)`);
    }
  });
}

if (findings.length) {
  for (const finding of findings) console.error(finding);
  process.exit(1);
}
console.log('Security validation ok');
