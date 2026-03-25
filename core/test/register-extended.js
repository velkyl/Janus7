// janus7/core/test/register-extended.js (ESM)

import { buildImportFailedPlaceholder, normalizeTestDefinition } from './normalize.js';
import { moduleAssetPath } from '../common.js';

/**
 * Registers all shipped tests outside the binding baseline.
 * Source of truth is the generated manifest under data/tests/extended-test-manifest.json.
 */
export default async function registerExtended({ registry, logger } = {}) {
  if (!registry?.register) return;

  const url = moduleAssetPath('data/tests/extended-test-manifest.json');
  let manifest = null;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      logger?.warn?.(`[TEST] Extended test manifest missing (${res.status}); skipping extended registration.`);
      return;
    }
    manifest = await res.json();
  } catch (err) {
    logger?.warn?.('[TEST] Extended test manifest could not be loaded; skipping.', err);
    return;
  }

  const entries = Array.isArray(manifest?.tests) ? manifest.tests : [];
  let ok = 0;
  let failed = 0;
  let skipped = 0;

  for (const entry of entries) {
    if (!entry?.id || !entry?.importPath) continue;
    if (registry.has(entry.id)) {
      skipped += 1;
      continue;
    }

    try {
      const mod = await import(entry.importPath);
      const test = normalizeTestDefinition(mod?.default ?? {}, {
        suiteClass: entry?.suiteClass ?? 'extended-auto',
        sourceFile: entry.importPath,
        registrationStatus: 'registered',
        phase: entry?.phase ?? null,
        kind: entry?.kind ?? null,
        title: entry?.title ?? entry.id
      });
      if (!registry.has(test.id)) {
        registry.register(test);
        ok += 1;
      } else {
        skipped += 1;
      }
    } catch (err) {
      failed += 1;
      logger?.warn?.(`[TEST] extended import failed: ${entry.importPath}`, { message: err?.message });
      const placeholder = buildImportFailedPlaceholder({
        sourceFile: entry.importPath,
        suiteClass: entry?.suiteClass ?? 'extended-auto',
        error: err?.message ?? String(err),
        phase: entry?.phase ?? null
      });
      if (!registry.has(placeholder.id)) {
        registry.register(placeholder);
      }
    }
  }

  logger?.info?.(`[TEST] Extended tests registered: ${ok}; skipped duplicates: ${skipped}; import failed placeholders: ${failed}.`);
}
