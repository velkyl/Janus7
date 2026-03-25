import { moduleAssetPath } from '../../../common.js';
/**
 * P7_TC_01 — KI Export Bundle validates against schema (AI = legacy alias)
 *
 * This test exercises the Phase 7 export API. It ensures that the
 * engine exposes an `ai.exportBundle()` function which returns a
 * structured object. The returned bundle must validate against the
 * published schema located at `modules/Janus7/phase7/contract/JanusKiBundle.schema.json`.
 */

export default {
  id: 'P7-TC-01',
  title: 'KI Export Bundle validates against schema (AI = legacy alias)',
  phases: [7],
  kind: 'automated',
  expected: 'exportBundle returns a valid bundle matching the AI bundle schema',
  async run({ ctx }) {
    const engine = ctx?.engine;
    const api = engine?.capabilities?.ki ?? engine?.ki ?? engine?.ai ?? null;
    if (!api || typeof api.exportBundle !== 'function') {
      return { ok: false, summary: 'KI/AI exportBundle API missing' };
    }
    let bundle;
    try {
      bundle = await api.exportBundle();
    } catch (err) {
      return { ok: false, summary: `exportBundle threw: ${err?.message || err}` };
    }
    if (!bundle || typeof bundle !== 'object') {
      return { ok: false, summary: 'exportBundle did not return an object' };
    }
    // Load the schema via fetch. This mirrors how register-catalog fetches
    // JSON files in the test harness. Do not use import with assert for
    // compatibility with older bundlers.
    let schema;
    try {
      const url = moduleAssetPath('phase7/contract/JanusKiBundle.schema.json');
      const res = await fetch(url);
      schema = await res.json();
    } catch (err) {
      return { ok: false, summary: `failed to load schema: ${err?.message || err}` };
    }
    const validator = engine.core?.validator;
    if (!validator || typeof validator.validateSchema !== 'function') {
      return { ok: false, summary: 'validator API missing on engine.core' };
    }
    const result = validator.validateSchema(bundle, schema, 'ai bundle');
    if (!result || result.valid !== true) {
      const errs = Array.isArray(result?.errors) ? result.errors.join('; ') : 'unknown';
      return { ok: false, summary: `bundle invalid: ${errs}` };
    }
    return { ok: true, summary: 'OK' };
  },
};