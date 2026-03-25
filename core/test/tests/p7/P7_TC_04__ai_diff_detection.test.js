/**
 * P7_TC_04 — KI diff detection
 *
 * previewImport() should summarize KI response patches against the current state.
 */

export default {
  id: 'P7-TC-04',
  title: 'KI diff detection',
  phases: [7],
  kind: 'automated',
  expected: 'previewImport returns summary entries for calendar/scoring/social patches',
  async run({ ctx }) {
    const engine = ctx?.engine;
    const api = engine?.capabilities?.ki ?? engine?.ki ?? engine?.ai ?? null;
    if (!api || typeof api.previewImport !== 'function') {
      return { ok: false, summary: 'KI preview API missing' };
    }

    await engine.core.state.transaction((s) => {
      s.set('academy.calendar.activeLocationId', 'loc_old');
      s.set('academy.calendar.activeSlot', 1);
      s.set('academy.social.relationships', { actor1: { actor2: { trust: 1 } } });
      s.set('academy.scoring.circles', { salamander: 3 });
    });

    const response = {
      version: 'JANUS_KI_RESPONSE_V1',
      sourceExportMeta: {
        moduleVersion: game?.modules?.get?.('janus7')?.version ?? engine?.core?.state?.getPath?.('meta.version') ?? null,
      },
      changes: {
        calendarUpdates: [
          { op: 'replace', path: 'activeLocationId', value: 'loc_new' },
          { op: 'replace', path: 'activeSlot', value: 2 },
        ],
        socialAdjustments: [
          { op: 'replace', path: 'relationships.actor1.actor2.trust', value: 2 },
        ],
        scoringAdjustments: [
          { op: 'replace', path: 'circles.salamander', value: 10 },
        ],
      },
    };

    let diffs;
    try {
      diffs = await api.previewImport(response);
    } catch (err) {
      return { ok: false, summary: `previewImport threw: ${err?.message || err}` };
    }
    if (!Array.isArray(diffs)) return { ok: false, summary: 'previewImport did not return an array' };

    const hasLocation = diffs.some((d) => d?.path === 'academy.calendar.activeLocationId' && d?.after === 'loc_new');
    const hasSlot = diffs.some((d) => d?.path === 'academy.calendar.activeSlot' && d?.after === 2);
    const hasSocial = diffs.some((d) => d?.path === 'academy.social.relationships.actor1.actor2.trust' && d?.after === 2);
    const hasScoring = diffs.some((d) => d?.path === 'academy.scoring.circles.salamander' && d?.after === 10);

    if (!hasLocation || !hasSlot || !hasSocial || !hasScoring) {
      return { ok: false, summary: 'Diff summary missing one or more expected patch entries' };
    }

    return { ok: true, summary: 'OK' };
  },
};
