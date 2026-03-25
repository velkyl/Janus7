/**
 * P7_TC_05 — KI import transactional rollback
 */

export default {
  id: 'P7-TC-05',
  title: 'KI import transactional rollback',
  phases: [7],
  kind: 'automated',
  expected: 'applyImport rolls back state on failure',
  async run({ ctx }) {
    const engine = ctx?.engine;
    const api = engine?.capabilities?.ki ?? engine?.ki ?? engine?.ai ?? null;
    if (!api || typeof api.applyImport !== 'function') {
      return { ok: false, summary: 'KI apply API missing' };
    }

    await engine.core.state.transaction((s) => {
      s.set('academy.calendar.activeLocationId', 'loc_base');
      s.set('academy.calendar.activeSlot', 1);
      s.set('academy.social.relationships', { actorX: { actorY: { trust: 1 } } });
      s.set('academy.scoring.circles', { salamander: 5 });
    });

    const response = {
      version: 'JANUS_KI_RESPONSE_V1',
      sourceExportMeta: {
        moduleVersion: game?.modules?.get?.('Janus7')?.version ?? engine?.core?.state?.getPath?.('meta.version') ?? null,
      },
      changes: {
        calendarUpdates: [
          { op: 'replace', path: 'activeLocationId', value: 'loc_new' },
          { op: 'replace', path: 'activeSlot', value: 2 },
        ],
        socialAdjustments: [
          { op: 'replace', path: 'relationships.actorX.actorY.trust', value: 2 },
        ],
        scoringAdjustments: [
          { op: 'replace', path: 'circles.salamander', value: 10 },
        ],
      },
    };

    const before = JSON.stringify(engine.core.io.exportState());
    const state = engine.core.state;
    const originalSet = state.set.bind(state);
    let threwOnce = false;
    state.set = function (pth, value) {
      if (!threwOnce && pth === 'academy.calendar.activeLocationId') {
        threwOnce = true;
        throw new Error('TEST_IMPORT_ROLLBACK');
      }
      return originalSet(pth, value);
    };

    let threw = false;
    try {
      await api.applyImport(response);
    } catch (err) {
      threw = true;
      const name = err?.name || '';
      if (name !== 'JanusKiDiffConflictError') {
        state.set = originalSet;
        return { ok: false, summary: `Unexpected error type: ${name}` };
      }
    }
    state.set = originalSet;

    const after = JSON.stringify(engine.core.io.exportState());
    if (!threw) return { ok: false, summary: 'applyImport did not throw on simulated error' };
    if (before != after) return { ok: false, summary: 'State mutated despite rollback' };
    return { ok: true, summary: 'OK' };
  },
};
