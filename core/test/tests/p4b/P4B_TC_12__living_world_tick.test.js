export default {
  id: 'P4B-TC-12',
  title: 'Living World reagiert auf Tageswechsel',
  phases: [4,4.5],
  kind: 'auto',
  expected: 'Nach einem Tageswechsel wird academy.livingWorld.lastTick gesetzt',
  whereToFind: 'game.janus7.core.state.get("academy.livingWorld.lastTick")',
  run: async () => {
    const engine = game?.janus7;
    const scheduler = engine?.academy?.livingWorld?.scheduler;
    const state = engine?.core?.state;
    if (!scheduler || !state) return { ok: false, summary: 'Scheduler oder State fehlt' };

    const rollback = () => { const e = new Error('JANUS_TEST_ROLLBACK'); e.name = 'JanusTestRollback'; throw e; };
    let ok = true;
    let summary = 'Tick gesetzt';
    try {
      await state.transaction(async () => {
        await scheduler.onDateChanged({
          previous: { year: 1039, trimester: 1, week: 1, dayIndex: 0, slotIndex: 9 },
          current: { year: 1039, trimester: 1, week: 1, dayIndex: 1, slotIndex: 0 },
          reason: 'test',
        });
        const tick = state.get('academy.livingWorld.lastTick');
        if (!tick?.dayChanged) {
          ok = false;
          summary = 'lastTick wurde nicht gesetzt';
        }
        rollback();
      }, { silent: true });
    } catch (err) {
      ok = false;
      summary = String(err?.message ?? err);
    }
    return { ok, summary };
  }
};
