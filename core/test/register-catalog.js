// janus7/core/test/register-catalog.js (ESM)

import { normalizeTestDefinition } from './normalize.js';
import { moduleAssetPath } from '../common.js';

/**
 * Optional hook to register tests from a JSON catalog file.
 * Catalog entries are metadata only and must never break boot.
 */
export default async function registerCatalog({ registry, logger } = {}) {
  try {
    const url = moduleAssetPath('data/tests/test-catalog.json');
    const res = await fetch(url);
    if (!res.ok) {
      logger?.debug?.(`[TEST] No test-catalog.json found (${res.status}); skipping.`);
      return;
    }
    const json = await res.json();
    const list = Array.isArray(json?.tests) ? json.tests : (Array.isArray(json?.required) ? json.required : null);
    if (!Array.isArray(list)) {
      logger?.warn?.('[TEST] Catalog has no tests[]/required[]; skipping.');
      return;
    }

    let added = 0;
    for (const t of list) {
      if (!t?.id) continue;
      if (registry?.has?.(t.id) || registry?.get?.(t.id)) continue;
      registry.register(normalizeTestDefinition(t, {
        kind: 'catalog',
        suiteClass: 'catalog-only',
        registrationStatus: 'catalog-only'
      }));
      added += 1;
    }
    logger?.info?.(`[TEST] Catalog-only placeholders registered: ${added}.`);
  } catch (err) {
    logger?.warn?.('[TEST] registerCatalog failed; continuing without catalog.', err);
  }
}
