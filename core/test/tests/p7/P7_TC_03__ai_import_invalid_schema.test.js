/**
 * P7_TC_03 — AI import rejects invalid bundle
 *
 * The import API must reject bundles that do not match the AI bundle
 * schema or contain unknown keys in strict mode. It should throw a
 * JanusAiBundleInvalidError and leave the state unchanged. This test
 * ensures that invalid input does not mutate the existing state.
 */

export default {
  id: 'P7-TC-03',
  title: 'AI import rejects invalid bundle',
  phases: [7],
  kind: 'automated',
  expected: 'Invalid bundles are rejected and the state remains unchanged',
  async run({ ctx }) {
    const engine = ctx?.engine;
    const api = engine?.capabilities?.ki ?? engine?.ki ?? engine?.ai ?? null;
    if (!api || typeof api.previewImport !== 'function') {
      return { ok: false, summary: 'KI/AI previewImport missing' };
    }
    // Capture initial state snapshot (stringified for deep comparison)
    const before = JSON.stringify(engine.core.state.get(''));
    const invalidBundle = { foo: true };
    let threw = false;
    try {
      await api.previewImport(invalidBundle);
    } catch (err) {
      threw = true;
    }
    const after = JSON.stringify(engine.core.state.get(''));
    if (!threw) {
      return { ok: false, summary: 'Invalid bundle did not throw' };
    }
    if (before !== after) {
      return { ok: false, summary: 'State mutated despite invalid bundle' };
    }
    return { ok: true, summary: 'OK' };
  },
};