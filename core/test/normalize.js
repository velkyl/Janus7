// janus7/core/test/normalize.js (ESM)

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function normalizePhaseValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const match = raw.match(/(\d+)/);
  if (!match) return null;
  const num = Number(match[1]);
  return Number.isFinite(num) ? num : null;
}

export function normalizeKind(value, fallback = 'manual') {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return fallback;
  if (['auto', 'automated', 'smoke'].includes(raw)) return 'auto';
  if (['manual', 'm'].includes(raw)) return 'manual';
  if (['catalog', 'catalog-only'].includes(raw)) return 'catalog';
  if (['import-failed', 'import_failed'].includes(raw)) return 'import-failed';
  return raw;
}

export function normalizePhases(test = {}) {
  const phases = [
    ...toArray(test?.phases),
    ...toArray(test?.phase)
  ]
    .map(normalizePhaseValue)
    .filter((v) => Number.isFinite(v));

  return Array.from(new Set(phases)).sort((a, b) => a - b);
}

export function normalizeTestDefinition(test = {}, fallback = {}) {
  const id = String(test?.id ?? fallback?.id ?? '').trim();
  if (!id) throw new Error('normalizeTestDefinition: id required');

  const phases = normalizePhases({
    phases: test?.phases ?? fallback?.phases,
    phase: test?.phase ?? fallback?.phase
  });

  const inferredKind = test?.type === 'M' ? 'manual' : undefined;
  const kind = normalizeKind(test?.kind ?? fallback?.kind ?? inferredKind, 'manual');
  const suiteClass = String(
    test?.suiteClass
      ?? fallback?.suiteClass
      ?? (kind === 'manual' ? 'manual' : 'binding')
  );
  const registrationStatus = String(test?.registrationStatus ?? fallback?.registrationStatus ?? 'registered');

  return {
    ...test,
    id,
    title: String(test?.title ?? fallback?.title ?? id),
    phases,
    phaseLabels: phases.map((p) => `P${p}`),
    kind,
    suiteClass,
    registrationStatus,
    sourceFile: test?.sourceFile ?? fallback?.sourceFile ?? null,
    importError: test?.importError ?? fallback?.importError ?? null,
    whereToFind: test?.whereToFind ?? fallback?.whereToFind ?? null,
    expected: test?.expected ?? fallback?.expected ?? null
  };
}

export function buildImportFailedPlaceholder({ sourceFile, suiteClass = 'binding', error = null, phase = null } = {}) {
  const safeSource = String(sourceFile ?? 'unknown').replace(/[^a-zA-Z0-9_.-]+/g, '_');
  const phases = phase != null ? [phase] : [];
  return normalizeTestDefinition({
    id: `IMPORT-FAILED::${safeSource}`,
    title: `Import fehlgeschlagen: ${sourceFile ?? 'unknown'}`,
    kind: 'import-failed',
    suiteClass,
    phases,
    registrationStatus: 'import-failed',
    sourceFile: sourceFile ?? null,
    importError: error ? String(error) : 'Import failed',
    expected: 'Testdatei muss importierbar sein.'
  });
}
