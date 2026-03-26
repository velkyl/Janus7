import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const moduleJsonPath = path.join(root, 'module.json');
const moduleVersion = JSON.parse(fs.readFileSync(moduleJsonPath, 'utf8')).version;

// ─── BOM-Detection Helper ─────────────────────────────────────────────────────
// UTF-8-BOM (EF BB BF) verhindert dass Regex-Marker am Dateianfang erkannt werden.
// Alle geprüften Dateien müssen BOM-frei sein.

function hasBOM(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    return buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF;
  } catch (_) {
    return false;
  }
}

const checks = [
  { file: 'package.json', regex: /"version":\s*"([^"]+)"/, label: 'package.json version' },
  { file: 'VERSION.json', regex: /"version":\s*"([^"]+)"/, label: 'VERSION.json version' },
  { file: 'README.md', regex: /\*\*Version:\*\*\s*([0-9.]+)/, label: 'README version' },
  { file: path.join('docs', 'INDEX.md'), regex: /\*\*Modul-Version \(SSOT: `module\.json`\):\*\*\s*([0-9.]+)/, label: 'docs/INDEX.md version' },
  { file: path.join('docs', 'STATUS.md'), regex: /^# STATUS .+v([0-9.]+)/m, label: 'docs/STATUS.md version' },
  { file: path.join('docs', 'MODULE_STATUS.md'), regex: /^# Update ([0-9.]+)/m, label: 'docs/MODULE_STATUS.md version' },
  { file: path.join('docs', 'INSTALLATION.md'), regex: /\*\*Modul-Version:\*\*\s*([0-9.]+)/, label: 'docs/INSTALLATION.md version' },
  { file: path.join('docs', 'KI_STABILITY.md'), regex: /Stand:\s+\*\*v([0-9.]+)\*\*/, label: 'docs/KI_STABILITY.md version' },
  { file: path.join('docs', 'KI_HANDOVER.md'), regex: /\*\*Modul-Version:\*\*\s*([0-9.]+)/, label: 'docs/KI_HANDOVER.md version' },
  { file: path.join('docs', 'KI_INTEGRATION_GUIDE.md'), regex: /\*\*Modul-Version:\*\*\s*([0-9.]+)/, label: 'docs/KI_INTEGRATION_GUIDE.md version' },
  { file: path.join('docs', 'EXPORT_FORMAT_V2.md'), regex: /\*\*Modul-Version:\*\*\s*([0-9.]+)/, label: 'docs/EXPORT_FORMAT_V2.md version' },
  { file: path.join('docs', 'USER_MANUAL.md'), regex: /^# JANUS7 .+\(v([0-9.]+)\)/m, label: 'docs/USER_MANUAL.md version' },
  { file: path.join('docs', 'UI_SHELL_LAYER.md'), regex: /Stand:\s*v([0-9.]+)/, label: 'docs/UI_SHELL_LAYER.md version' },
  { file: path.join('docs', 'RELEASE.md'), regex: /Aktuelle Version:\s+\*\*([0-9.]+)\*\*/, label: 'docs/RELEASE.md version' },
  { file: 'CHANGELOG.md', regex: /^## v([0-9.]+)\s/m, label: 'CHANGELOG.md top version' },
];

const findings = [];

for (const check of checks) {
  const filePath = path.join(root, check.file);
  if (!fs.existsSync(filePath)) {
    findings.push(`[VERSION] missing file: ${check.file}`);
    continue;
  }

  // BOM-Check: BOM zerstört Regex-Marker am Dateianfang → Frühwarnung statt silent miss
  if (hasBOM(filePath)) {
    findings.push(`[VERSION] UTF-8-BOM in ${check.file} entfernen – verhindert Versions-Marker-Erkennung`);
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(check.regex);
  if (!match) {
    findings.push(`[VERSION] missing version marker for ${check.label}`);
    continue;
  }

  const actual = String(match[1] ?? '').trim();
  if (actual !== moduleVersion) {
    findings.push(`[VERSION] ${check.label}: expected ${moduleVersion}, found ${actual}`);
  }
}

if (findings.length) {
  for (const finding of findings) console.error(finding);
  process.exit(1);
}

console.log(`Version sync ok (${moduleVersion})`);
