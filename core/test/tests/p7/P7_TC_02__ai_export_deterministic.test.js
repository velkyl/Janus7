/**
 * P7_TC_02 — AI Export Bundle deterministic
 *
 * Repeated calls to api.exportBundle() without changing the state
 * should produce exactly the same bundle. Deterministic behaviour is
 * critical for reproducible hashes and diff generation in later phases.
 */

export default {
  id: 'P7-TC-02',
  title: 'AI Export Bundle deterministic',
  phases: [7],
  kind: 'automated',
  expected: 'Repeated calls to exportBundle return identical data when state is unchanged',
  async run({ ctx }) {
    const engine = ctx?.engine;
    const api = engine?.capabilities?.ki ?? engine?.ki ?? engine?.ai ?? null;
    if (!api || typeof api.exportBundle !== 'function') {
      return { ok: false, summary: 'KI/AI exportBundle API missing' };
    }
    let b1;
    let b2;
    try {
      b1 = await api.exportBundle();
      b2 = await api.exportBundle();
    } catch (err) {
      return { ok: false, summary: `exportBundle threw: ${err?.message || err}` };
    }
    try {
      const s1 = JSON.stringify(b1);
      const s2 = JSON.stringify(b2);
      if (s1 !== s2) {
        return { ok: false, summary: 'Bundles differ across calls' };
      }
    } catch (err) {
      return { ok: false, summary: `failed to stringify bundles: ${err?.message || err}` };
    }
    return { ok: true, summary: 'OK' };
  },
};