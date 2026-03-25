/**
 * @file core/test/tests/p4/P4_TC_04__social_attitude_clamped.test.js
 * @description Phase 4 Edge: Social attitude is clamped to [-100..100].
 */

export default {
  id: 'P4-TC-04',
  title: 'Social stress: attitude clamped [-100..100]',
  phases: [4],
  kind: 'auto',
  expected: 'adjustAttitude clamps values to [-100..100].',

  run: async () => {
    const engine = game?.janus7;
    const state = engine?.core?.state;
    const social = engine?.academy?.social;

    if (!engine || !state || !social) {
      return {
        ok: false,
        summary: 'Engine/State/Social fehlen',
        notes: ['Erwartet: game.janus7.core.state und game.janus7.academy.social']
      };
    }

    let ok = true;
    const notes = [];
    const a = 'pc_test_a';
    const b = 'npc_test_b';

    const rollback = () => {
      const e = new Error('JANUS_TEST_ROLLBACK');
      e.name = 'JanusTestRollback';
      throw e;
    };

    try {
      await state.transaction(async () => {
        await social.setAttitude(a, b, 0, { tags: ['test'] });
        const v1 = await social.adjustAttitude(a, b, 999, {});
        if (v1 !== 100) {
          ok = false;
          notes.push(`Expected clamp to 100, got ${v1}`);
        }

        const v2 = await social.adjustAttitude(a, b, -999, {});
        if (v2 !== -100) {
          ok = false;
          notes.push(`Expected clamp to -100, got ${v2}`);
        }

        rollback();
      }, { silent: true });
    } catch (err) {
      ok = false;
      notes.push(`Unerwarteter Fehler: ${String(err?.message ?? err)}`);
    }

    return {
      ok,
      summary: ok ? 'Social clamp ok' : 'Social clamp FAIL',
      notes: notes.length ? notes : undefined
    };
  }
};
