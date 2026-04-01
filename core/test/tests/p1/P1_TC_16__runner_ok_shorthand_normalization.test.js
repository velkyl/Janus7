/**
 * @file core/test/tests/p1/P1_TC_16__runner_ok_shorthand_normalization.test.js
 * @description Phase 1 auto-test: verifies JanusTestRunner result normalization
 * and ensures the runner continues after an error-path cleanup.
 *
 * This is a self-hosting runner test. It executes the runner against synthetic
 * tests and validates PASS/FAIL/ERROR normalization plus post-error continuity.
 *
 * @version 0.9.12.47
 */

import JanusTestRunner from '../../runner.js';
import JanusTestRegistry from '../../registry.js';

export default {
  id: 'P1-TC-16',
  title: 'TestRunner: ok shorthand and error path normalization',
  phases: [1],
  kind: 'auto',
  expected: '{ok:true}->PASS, {ok:false}->FAIL, {status:"FAIL"}->FAIL, no-return->PASS, after-error->PASS',

  run: async () => {
    const notes = [];
    let ok = true;

    const syntheticTests = [
      {
        id: '__runner_check_ok_true',
        title: 'ok=true',
        run: async () => ({ ok: true, summary: 'deliberate pass' }),
      },
      {
        id: '__runner_check_ok_false',
        title: 'ok=false',
        run: async () => ({ ok: false, summary: 'deliberate fail' }),
      },
      {
        id: '__runner_check_status_pass',
        title: 'status=PASS',
        run: async () => ({ status: 'PASS', summary: 'explicit pass' }),
      },
      {
        id: '__runner_check_status_fail',
        title: 'status=FAIL',
        run: async () => ({ status: 'FAIL', summary: 'explicit fail' }),
      },
      {
        id: '__runner_check_no_return',
        title: 'no return',
        run: async () => { /* intentional no return */ },
      },
      {
        id: '__runner_check_throw',
        title: 'throws',
        run: async () => { throw new Error('deliberate throw'); },
      },
      {
        id: '__runner_check_after_error',
        title: 'still runs after prior error',
        run: async () => ({ ok: true, summary: 'runner kept executing after error path' }),
      },
    ];

    const registry = new JanusTestRegistry();
    for (const test of syntheticTests) registry.register(test);

    const runner = new JanusTestRunner({ registry, logger: null });
    let results;
    try {
      results = await runner.runAll({ tests: syntheticTests, ctx: {} });
    } catch (err) {
      return {
        ok: false,
        summary: `runner.runAll() threw: ${err?.message}`,
        notes: [`Stack: ${err?.stack?.split('\n')[1] ?? ''}`],
      };
    }

    const expected = {
      '__runner_check_ok_true': 'PASS',
      '__runner_check_ok_false': 'FAIL',
      '__runner_check_status_pass': 'PASS',
      '__runner_check_status_fail': 'FAIL',
      '__runner_check_no_return': 'PASS',
      '__runner_check_throw': 'ERROR',
      '__runner_check_after_error': 'PASS',
    };

    for (const result of results) {
      const exp = expected[result.id];
      if (!exp) continue;
      if (result.status !== exp) {
        ok = false;
        notes.push(`FAIL: ${result.id} -> status=${result.status}, expected=${exp} (summary: ${result.summary})`);
      } else {
        notes.push(`OK: ${result.id}: ${result.status}`);
      }
    }

    if (results.length !== syntheticTests.length) {
      ok = false;
      notes.push(`FAIL: ${results.length}/${syntheticTests.length} results`);
    }

    return {
      ok,
      summary: ok
        ? 'Runner normalizes all 7 patterns correctly'
        : 'Runner normalization failed (see notes)',
      notes,
    };
  },
};
