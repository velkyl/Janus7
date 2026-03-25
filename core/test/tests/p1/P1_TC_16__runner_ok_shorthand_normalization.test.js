/**
 * @file core/test/tests/p1/P1_TC_16__runner_ok_shorthand_normalization.test.js
 * @description Phase 1 Auto-Test: JanusTestRunner normalisiert das {ok, summary}-Rückgabemuster
 *              korrekt zu PASS/FAIL. Ohne diesen Fix würde jeder Test mit {ok: false} als PASS
 *              gemeldet werden (silent-PASS-Bug, entdeckt v0.9.9.38).
 *
 * Dieser Test ist sein eigener Integrations-Beweis: Er läuft selbst über den Runner und liefert
 * {ok: true/false}. Wenn er PASS zurückgibt, beweist das, dass der Runner das Muster versteht.
 *
 * Zusätzlich führt er eine interne Whitebox-Verifikation durch, indem er den Runner direkt
 * mit synthetischen Tests aufruft und die Ergebnisse prüft.
 *
 * @version 0.9.9.39
 */

import JanusTestRunner from '../../runner.js';
import JanusTestRegistry from '../../registry.js';

export default {
  id: 'P1-TC-16',
  title: 'TestRunner: ok-Shorthand korrekt zu PASS/FAIL normalisiert',
  phases: [1],
  kind: 'auto',
  expected: '{ok:true}→PASS, {ok:false}→FAIL, {status:\'FAIL\'}→FAIL, no-return→PASS',

  run: async () => {
    const notes = [];
    let ok = true;

    // ── Synthetische Tests für den Runner ────────────────────────────────
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
    ];

    const registry = new JanusTestRegistry();
    for (const t of syntheticTests) registry.register(t);

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

    // ── Erwartete Status je synthetischem Test ────────────────────────────
    const expected = {
      '__runner_check_ok_true':     'PASS',
      '__runner_check_ok_false':    'FAIL',
      '__runner_check_status_pass': 'PASS',
      '__runner_check_status_fail': 'FAIL',
      '__runner_check_no_return':   'PASS',
      '__runner_check_throw':       'ERROR',
    };

    for (const res of results) {
      const exp = expected[res.id];
      if (!exp) continue;
      if (res.status !== exp) {
        ok = false;
        notes.push(`FAIL: ${res.id} → status=${res.status}, erwartet=${exp} (summary: ${res.summary})`);
      } else {
        notes.push(`✓ ${res.id}: ${res.status}`);
      }
    }

    // ── Vollständigkeit ───────────────────────────────────────────────────
    if (results.length !== syntheticTests.length) {
      ok = false;
      notes.push(`FAIL: ${results.length}/${syntheticTests.length} Ergebnisse`);
    }

    return {
      ok,
      summary: ok
        ? 'Runner normalisiert alle 6 Muster korrekt'
        : 'Runner-Normalisierung fehlerhaft (Details in notes)',
      notes,
    };
  },
};
