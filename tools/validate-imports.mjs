import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { pathToFileURL } from 'url';

const root = process.cwd();
const includeRoots = ['academy', 'atmosphere', 'bridge', 'bridges', 'core', 'phase7', 'scripts', 'ui', 'services', 'discovery', 'extensions'];
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

function stripComments(source = '') {
  return String(source)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function assertJanusChatContract() {
  const rel = path.join('scripts', 'janus.mjs');
  const file = path.join(root, rel);
  const txt = stripComments(fs.readFileSync(file, 'utf8'));
  const referencesChatHandler = /\bhandleChatMessage\s*\(/.test(txt);
  const importsChatHandler = /import\s*\{\s*handleChatMessage\s*\}\s*from\s*['"]\.\.\/services\/chat\/cli\.js['"]/.test(txt);
  if (referencesChatHandler && !importsChatHandler) {
    errors.push({ file: rel, stderr: 'handleChatMessage() wird verwendet, aber nicht aus ../services/chat/cli.js importiert.' });
  }
}

function assertNoInternalPhaseBootstrapImports() {
  for (const file of files) {
    const rel = path.relative(root, file);
    if (rel === path.join('core', 'phase-bootstrap.js')) continue;
    const txt = stripComments(fs.readFileSync(file, 'utf8'));
    if (/from\s*['"].*phase-bootstrap\.js['"]/.test(txt) || /import\s*\(['"].*phase-bootstrap\.js['"]\)/.test(txt)) {
      errors.push({ file: rel, stderr: 'Interner Import von core/phase-bootstrap.js gefunden. Phase-Loading muss ueber scripts/janus.mjs laufen.' });
    }
  }
}

async function assertCanonicalStateContract() {
  const validatorMod = await import(pathToFileURL(path.join(root, 'core', 'validator', 'index.js')).href);
  const { JanusValidator } = validatorMod;
  const validator = new JanusValidator();
  const canonicalState = {
    meta: {
      version: '0.0.0-test',
      schemaVersion: '7.1',
      createdAt: '2026-03-30T00:00:00.000Z',
      updatedAt: '2026-03-30T00:00:00.000Z'
    },
    features: {
      social: true,
      scoring: true,
      atmosphere: {
        enabled: true
      }
    },
    atmosphere: {
      activeMoodId: 'neutral'
    },
    time: {
      year: 1039,
      trimester: 1,
      week: 1,
      dayIndex: 0,
      slotIndex: 0,
      month: 1,
      day: 1,
      hour: 8,
      totalDaysPassed: 0,
      isHoliday: false
    },
    academy: {
      examResults: {},
      social: {
        relationships: {},
        livingEvents: { history: [], lastProcessedWeekKey: '1039-1-1' },
        storyHooks: { records: {}, history: [] }
      },
      scoring: {
        circles: {},
        students: {},
        lastAwarded: [],
        dailySnapshots: []
      }
    },
    actors: {
      pcs: {},
      npcs: {}
    },
    foundryLinks: {
      npcs: {},
      pcs: {},
      locations: {},
      scenes: {},
      playlists: {},
      items: {},
      journals: {},
      rollTables: {},
      macros: {}
    },
    questStates: {},
    display: {
      beamerMode: false
    }
  };

  const res = validator.validateState(canonicalState);
  if (!res?.valid) {
    errors.push({
      file: 'core/validator/schemas-state.js',
      stderr: `Kanonischer State verletzt Validator-Vertrag: ${(res?.errors ?? []).join(' | ')}`
    });
  }
}

assertJanusChatContract();
assertNoInternalPhaseBootstrapImports();
await assertCanonicalStateContract();

if (errors.length) {
  console.error('validate-imports failed:');
  for (const err of errors) {
    console.error(` - ${err.file}`);
    console.error(String(err.stderr).split('\n').slice(0, 6).join('\n'));
  }
  process.exit(1);
}

console.log(`validate-imports: OK (${files.length} files parsed + contracts)`);
