import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const profilesRoot = path.join(root, 'data', 'profiles');

const LEVEL_ORDER = {
  foundation: 0,
  'core-profile': 1,
  'full-profile': 2
};

const ALLOWED_LEVELS = new Set(Object.keys(LEVEL_ORDER));
const ALLOWED_DATA_ROOTS = new Set(['academy', 'profile-root']);
const ALLOWED_REFERENCE_ROLES = new Set([
  'primary-reference',
  'source-bound-counterprobe',
  'political-counterprobe',
  'non-reference'
]);
const ALLOWED_SEED_MODES = new Set(['derived', 'file-backed']);
const ALLOWED_TABLE_MODES = new Set(['derived', 'file-backed']);
const ALLOWED_PROVENANCE = new Set(['kanonisch', 'verdichtet', 'adaptiert', 'experimentell']);
const ALLOWED_EXPERIMENTAL_VISIBILITY = new Set(['filterable-only', 'disabled']);

let failures = 0;
let warnings = 0;

function fail(message) {
  console.error(`[PROFILE CONTRACT FAIL] ${message}`);
  failures += 1;
}

function warn(message) {
  console.warn(`[PROFILE CONTRACT WARN] ${message}`);
  warnings += 1;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function exists(profileDir, relativePath) {
  return fs.existsSync(path.join(profileDir, relativePath));
}

function hashFile(filePath) {
  return crypto.createHash('sha1').update(fs.readFileSync(filePath)).digest('hex');
}

function matchesAnyPath(profileDir, preferredDataRoot, relativePath) {
  const normalized = String(relativePath ?? '').replace(/^\/+/, '');
  const candidates = preferredDataRoot === 'academy'
    ? [path.join('academy', normalized), normalized]
    : [normalized, path.join('academy', normalized)];
  return candidates.find((candidate) => exists(profileDir, candidate)) ?? null;
}

function requireOne(profileId, profileDir, preferredDataRoot, relativePath) {
  const hit = matchesAnyPath(profileDir, preferredDataRoot, relativePath);
  if (!hit) {
    fail(`${profileId}: missing required dataset "${relativePath}"`);
  }
}

function requireCalendar(profileId, profileDir, preferredDataRoot) {
  const calendar = matchesAnyPath(profileDir, preferredDataRoot, 'calendar.json');
  const calendarTemplate = matchesAnyPath(profileDir, preferredDataRoot, 'calendar-template.json');
  const teachingSessions = matchesAnyPath(profileDir, preferredDataRoot, 'teaching-sessions.json');
  if (calendar) return;
  if (calendarTemplate && teachingSessions) return;
  fail(`${profileId}: missing calendar contract (need calendar.json or calendar-template.json plus teaching-sessions.json)`);
}

function requireFactionLayer(profileId, profileDir, preferredDataRoot) {
  const factionFile = matchesAnyPath(profileDir, preferredDataRoot, 'extensions/factions.json');
  const socialLinks = matchesAnyPath(profileDir, preferredDataRoot, 'social_links.json');
  if (factionFile || socialLinks) return;
  fail(`${profileId}: missing faction/social layer (need extensions/factions.json or social_links.json)`);
}

function validateRequirements(profileId, profileDir, manifest) {
  const level = manifest?.contract?.validatedLevel;
  const preferredDataRoot = manifest?.contract?.preferredDataRoot;

  requireOne(profileId, profileDir, preferredDataRoot, 'academy-data.json');
  requireOne(profileId, profileDir, preferredDataRoot, 'events.json');
  requireOne(profileId, profileDir, preferredDataRoot, 'locations.json');
  requireOne(profileId, profileDir, preferredDataRoot, 'npcs.json');

  if (LEVEL_ORDER[level] >= LEVEL_ORDER['core-profile']) {
    requireOne(profileId, profileDir, preferredDataRoot, 'lessons.json');
    requireCalendar(profileId, profileDir, preferredDataRoot);
  }

  if (LEVEL_ORDER[level] >= LEVEL_ORDER['full-profile']) {
    requireOne(profileId, profileDir, preferredDataRoot, 'quests/quest-index.json');
    requireOne(profileId, profileDir, preferredDataRoot, 'events/pool-index.json');
    requireFactionLayer(profileId, profileDir, preferredDataRoot);
  }
}

function validateDuplicatePolicy(profileId, profileDir, manifest) {
  const validation = manifest?.validation ?? {};
  const sensitiveFiles = Array.isArray(validation.duplicateSensitiveFiles)
    ? validation.duplicateSensitiveFiles
    : [];
  const allowedMismatches = new Set(Array.isArray(validation.allowedDuplicateMismatches)
    ? validation.allowedDuplicateMismatches
    : []);

  for (const relativePath of sensitiveFiles) {
    const rootPath = path.join(profileDir, relativePath);
    const academyPath = path.join(profileDir, 'academy', relativePath);
    if (!fs.existsSync(rootPath) || !fs.existsSync(academyPath)) continue;

    const same = hashFile(rootPath) === hashFile(academyPath);
    if (same) continue;

    if (allowedMismatches.has(relativePath)) {
      warn(`${profileId}: allowed legacy divergence for duplicated dataset "${relativePath}"`);
      continue;
    }

    fail(`${profileId}: duplicated dataset "${relativePath}" differs between profile root and academy/`);
  }
}

function validateManifest(profileId, manifest, profileDir) {
  if (manifest?.meta?.profile !== profileId) {
    fail(`${profileId}: manifest meta.profile must match directory name`);
  }

  const targetLevel = manifest?.contract?.targetLevel;
  const validatedLevel = manifest?.contract?.validatedLevel;
  if (!ALLOWED_LEVELS.has(targetLevel)) {
    fail(`${profileId}: invalid contract.targetLevel "${targetLevel}"`);
  }
  if (!ALLOWED_LEVELS.has(validatedLevel)) {
    fail(`${profileId}: invalid contract.validatedLevel "${validatedLevel}"`);
  }
  if (ALLOWED_LEVELS.has(targetLevel) && ALLOWED_LEVELS.has(validatedLevel)) {
    if (LEVEL_ORDER[validatedLevel] > LEVEL_ORDER[targetLevel]) {
      fail(`${profileId}: validatedLevel "${validatedLevel}" may not exceed targetLevel "${targetLevel}"`);
    }
  }

  const preferredDataRoot = manifest?.contract?.preferredDataRoot;
  if (!ALLOWED_DATA_ROOTS.has(preferredDataRoot)) {
    fail(`${profileId}: invalid contract.preferredDataRoot "${preferredDataRoot}"`);
  }

  if (!ALLOWED_REFERENCE_ROLES.has(manifest?.contract?.referenceRole)) {
    fail(`${profileId}: invalid contract.referenceRole "${manifest?.contract?.referenceRole}"`);
  }

  if (!ALLOWED_SEED_MODES.has(manifest?.contract?.seedMode)) {
    fail(`${profileId}: invalid contract.seedMode "${manifest?.contract?.seedMode}"`);
  }

  if (!ALLOWED_TABLE_MODES.has(manifest?.contract?.tableMode)) {
    fail(`${profileId}: invalid contract.tableMode "${manifest?.contract?.tableMode}"`);
  }

  const allowedProvenance = Array.isArray(manifest?.provenance?.allowed)
    ? manifest.provenance.allowed
    : [];
  if (!allowedProvenance.length) {
    fail(`${profileId}: provenance.allowed must not be empty`);
  }
  for (const value of allowedProvenance) {
    if (!ALLOWED_PROVENANCE.has(value)) {
      fail(`${profileId}: invalid provenance level "${value}"`);
    }
  }

  const visibility = manifest?.provenance?.experimentalVisibility;
  if (!ALLOWED_EXPERIMENTAL_VISIBILITY.has(visibility)) {
    fail(`${profileId}: invalid provenance.experimentalVisibility "${visibility}"`);
  }

  validateRequirements(profileId, profileDir, manifest);
  validateDuplicatePolicy(profileId, profileDir, manifest);
}

const manifestFiles = fs.readdirSync(profilesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => ({
    profileId: entry.name,
    profileDir: path.join(profilesRoot, entry.name),
    manifestPath: path.join(profilesRoot, entry.name, 'profile-contract.json')
  }))
  .filter((entry) => fs.existsSync(entry.manifestPath));

if (!manifestFiles.length) {
  console.log('Profile contract validation ok (manifests=0, warnings=0)');
  process.exit(0);
}

for (const entry of manifestFiles) {
  try {
    const manifest = readJson(entry.manifestPath);
    validateManifest(entry.profileId, manifest, entry.profileDir);
  } catch (error) {
    fail(`${entry.profileId}: cannot parse manifest (${error.message})`);
  }
}

if (failures) {
  console.error(`Profile contract validation failed (manifests=${manifestFiles.length}, failures=${failures}, warnings=${warnings})`);
  process.exit(1);
}

console.log(`Profile contract validation ok (manifests=${manifestFiles.length}, warnings=${warnings})`);
