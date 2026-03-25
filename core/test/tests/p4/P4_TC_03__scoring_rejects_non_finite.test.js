/**
 * @file core/test/tests/p4/P4_TC_03__scoring_rejects_non_finite.test.js
 * @description Phase 4 Edge: Scoring must ignore non-finite inputs (NaN/Infinity).
 */

export default {
  id: 'P4-TC-03',
  title: 'Scoring bounds: ignore NaN/Infinity',
  phases: [4],
  kind: 'auto',
  expected: 'addCirclePoints does not mutate score for NaN/Infinity.',

  run: async () => {
    const engine = game?.janus7;
    const state = engine?.core?.state;
    const scoring = engine?.academy?.scoring;

    if (!engine || !state || !scoring) {
      return {
        ok: false,
        summary: 'Engine/State/Scoring fehlen',
        notes: ['Erwartet: game.janus7.core.state und game.janus7.academy.scoring']
      };
    }

    let ok = true;
    const notes = [];
    const circleId = 'salamander';

    const rollback = () => {
      const e = new Error('JANUS_TEST_ROLLBACK');
      e.name = 'JanusTestRollback';
      throw e;
    };

    try {
      await state.transaction(async () => {
        // establish baseline
        await scoring.addCirclePoints(circleId, 10, 'baseline', { source: 'test' });
        const base = scoring.getCircleScore(circleId);

        await scoring.addCirclePoints(circleId, Number.NaN, 'nan', { source: 'test' });
        const afterNaN = scoring.getCircleScore(circleId);
        if (afterNaN !== base) {
          ok = false;
          notes.push('NaN changed score (should be ignored).');
        }

        await scoring.addCirclePoints(circleId, Number.POSITIVE_INFINITY, 'inf', { source: 'test' });
        const afterInf = scoring.getCircleScore(circleId);
        if (afterInf !== base) {
          ok = false;
          notes.push('Infinity changed score (should be ignored).');
        }

        rollback();
      }, { silent: true });
    } catch (err) {
      ok = false;
      notes.push(`Unerwarteter Fehler: ${String(err?.message ?? err)}`);
    }

    return {
      ok,
      summary: ok ? 'Scoring edge cases ok' : 'Scoring edge cases FAIL',
      notes: notes.length ? notes : undefined
    };
  }
};
