/**
 * P7_TC_A1 — Permission enforced (GM-only)
 *
 * Ensures that Phase 7 import/apply APIs are enforced server-side.
 * Non-GM users must not be able to apply KI/AI imports even if the UI
 * accidentally exposes a button.
 */

export default {
  id: 'P7-TC-A1',
  title: 'Phase 7 imports are GM-only (enforced in services)',
  phases: [7],
  kind: 'automated',
  expected: 'engine.ki.applyImport and engine.ai.applyImport throw a permission error for non-GM; state unchanged',
  async run({ ctx }) {
    const engine = ctx?.engine;
    if (!engine?.ki?.applyImport || !engine?.ai?.applyImport) {
      return { ok: false, summary: 'Phase 7 APIs missing' };
    }

    // Arrange: baseline state marker
    await engine.core.state.transaction((s) => {
      s.set('academy._testMarker', { v: 1 });
    });
    const before = JSON.stringify(engine.core.state.getPath('academy._testMarker'));

    // Build minimal payloads that pass version checks
    const kiResponse = {
      version: 'JANUS_KI_RESPONSE_V1',
      sourceExportMeta: {},
      changes: {}
    };
    const aiBundle = {
      version: 'JANUS_AI_BUNDLE_V1',
      snapshot: { time: { year: 999 } }
    };

    // Temporarily spoof a non-GM environment (without touching real Foundry user)
    const originalGame = globalThis.game;
    try {
      globalThis.game = { user: { isGM: false, id: 'test-non-gm' } };

      let kiOk = false;
      try {
        await engine.ki.applyImport(kiResponse);
        kiOk = true;
      } catch (_) {
        // expected
      }
      if (kiOk) return { ok: false, summary: 'KI applyImport did not enforce GM-only' };

      let aiOk = false;
      try {
        await engine.ai.applyImport(aiBundle);
        aiOk = true;
      } catch (_) {
        // expected
      }
      if (aiOk) return { ok: false, summary: 'AI applyImport did not enforce GM-only' };

    } finally {
      globalThis.game = originalGame;
    }

    const after = JSON.stringify(engine.core.state.getPath('academy._testMarker'));
    if (before != after) {
      return { ok: false, summary: 'State changed despite permission failure' };
    }
    return { ok: true, summary: 'OK' };
  }
};
