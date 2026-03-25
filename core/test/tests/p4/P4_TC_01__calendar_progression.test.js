/**
 * @file core/test/tests/p4/P4_TC_01__calendar_progression.test.js
 * @description Phase 4 Baseline: Verifiziert, dass der Kalender über Slots -> Tage -> Wochen fortschreiten kann.
 *
 * WICHTIG:
 * - Der Test macht absichtlich State-Mutationen, rollt sie aber per JanusStateCore.transaction()
 *   über einen kontrollierten Test-Rollback wieder zurück (World-State bleibt sauber).
 */

export default {
  id: 'P4-TC-01',
  title: 'Calendar Progression: Slot -> Day -> Week',
  phases: [4],
  kind: 'auto',
  expected: 'advanceSlot inkrementiert SlotIndex; bei Slot-Wrap springt dayIndex; bei Day-Wrap inkrementiert week.',
  whereToFind: 'Konsole: game.janus7.simulation.calendar / game.janus7.core.state.time',

  /**
   * @returns {Promise<{ok:boolean, summary:string, notes?:string[], data?:any}>}
   */
  run: async () => {
    const engine = game?.janus7;
    const state = engine?.core?.state;
    const cal = engine?.simulation?.calendar;

    if (!engine || !state || !cal) {
      return {
        ok: false,
        summary: 'Engine/State/Calendar fehlen',
        notes: [
          'Erwartet: game.janus7.core.state und game.janus7.simulation.calendar',
          'Falls Phase 4 Integration deaktiviert ist: scripts/integration/phase4-simulation-integration.js prüfen.'
        ]
      };
    }

    const dayCount = cal?.config?.dayOrder?.length ?? 0;
    const slotCount = cal?.config?.slotOrder?.length ?? 0;
    if (!dayCount || !slotCount) {
      return { ok: false, summary: 'Calendar config ungueltig (dayOrder/slotOrder)', data: { dayCount, slotCount } };
    }

    /** @type {any} */
    let resultData = {};
    let ok = true;
    let notes = [];

    // Kontrollierter Rollback: JanusStateCore.transaction() erkennt das und verwirft Änderungen.
    const rollback = () => {
      const e = new Error('JANUS_TEST_ROLLBACK');
      e.name = 'JanusTestRollback';
      throw e;
    };

    try {
      await state.transaction(async () => {
        // --- Case A: Slot wrap -> Day increments ---
        // Setze Slot auf letzten Slot des Tages.
        const t0 = state.get('time') ?? {};
        const tA = foundry.utils.deepClone(t0);
        tA.week = Number.isFinite(tA.week) ? tA.week : 1;
        tA.trimester = Number.isFinite(tA.trimester) ? tA.trimester : 1;
        tA.year = Number.isFinite(tA.year) ? tA.year : 1;
        tA.dayIndex = 0;
        tA.slotIndex = slotCount - 1;
        state.set('time', tA);

        const beforeA = cal.getCurrentSlotRef();
        const afterA = await cal.advanceSlot({ steps: 1, reason: 'P4-TC-01-A' });

        const movedSlotToZero = (afterA?.slotIndex === 0);
        const movedDayByOne = (afterA?.dayIndex === 1);

        if (!movedSlotToZero) {
          ok = false;
          notes.push('Case A: slotIndex ist nach Wrap nicht 0.');
        }
        if (!movedDayByOne) {
          ok = false;
          notes.push('Case A: dayIndex ist nach Slot-Wrap nicht +1.');
        }

        // --- Case B: Slot wrap on last day -> Week increments ---
        const tB = foundry.utils.deepClone(state.get('time'));
        tB.week = 1;
        tB.trimester = 1;
        tB.year = 1;
        tB.dayIndex = dayCount - 1;
        tB.slotIndex = slotCount - 1;
        state.set('time', tB);

        const beforeB = cal.getCurrentSlotRef();
        const afterB = await cal.advanceSlot({ steps: 1, reason: 'P4-TC-01-B' });

        const wrappedToFirstDay = (afterB?.dayIndex === 0);
        const weekIncremented = (afterB?.week === 2);

        if (!wrappedToFirstDay) {
          ok = false;
          notes.push('Case B: dayIndex ist nach Day-Wrap nicht 0.');
        }
        if (!weekIncremented) {
          ok = false;
          notes.push('Case B: week wurde nach Day-Wrap nicht inkrementiert.');
        }

        resultData = {
          config: { dayCount, slotCount },
          caseA: { before: beforeA, after: afterA },
          caseB: { before: beforeB, after: afterB }
        };

        rollback();
      }, { silent: true });
    } catch (err) {
      // JanusStateCore.transaction behandelt den Test-Rollback als Erfolg und wirft nicht weiter.
      // Falls wir hier landen, ist es ein echter Fehler.
      ok = false;
      notes.push(`Unerwarteter Fehler: ${String(err?.message ?? err)}`);
      resultData.error = { name: err?.name, message: err?.message, stack: err?.stack };
    }

    return {
      ok,
      summary: ok ? 'Calendar progression ok (Slot->Day->Week)' : 'Calendar progression FAIL',
      notes: notes.length ? notes : undefined,
      data: resultData
    };
  }
};
