/**
 * @file core/test/tests/p4/P4_TC_08__cron_period_detection.test.js
 * @description Phase 4 Auto-Test: JanusCron erkennt daily/weekly/trimester-Grenzen korrekt.
 *              Prüft _tick()-Logik isoliert (kein Foundry-Hook nötig).
 */

import { JanusCron } from '../../../../services/cron/JanusCron.js';

export default {
  id: 'P4-TC-08',
  title: 'JanusCron: Periodenauflösung daily/weekly/trimester',
  phases: [4],
  kind: 'auto',
  expected: 'Korrekte Job-Gruppen werden bei Perioden-Grenzen ausgelöst',

  run: async () => {
    const notes = [];
    let ok = true;

    // ── Setup: Cron ohne Eingebaut-Jobs, mit Test-Zählern ────────────────
    const counts = { daily: 0, weekly: 0, trimester: 0 };

    const cron = new JanusCron({
      engine:           null,
      logger:           { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
      builtinWeekly:    false,
      builtinTrimester: false,
    });

    cron.addJob('daily',     () => { counts.daily++;     return Promise.resolve(); });
    cron.addJob('weekly',    () => { counts.weekly++;    return Promise.resolve(); });
    cron.addJob('trimester', () => { counts.trimester++; return Promise.resolve(); });

    // ── Test 1: Erster Tick — setzt _lastSeen, kein Job ──────────────────
    await cron._tick({ week: 1, trimester: 1, dayIndex: 0 });
    if (counts.daily !== 0 || counts.weekly !== 0 || counts.trimester !== 0) {
      ok = false;
      notes.push(`Test 1 FAIL: Erster Tick sollte keine Jobs auslösen, got daily=${counts.daily} weekly=${counts.weekly} trimester=${counts.trimester}`);
    } else {
      notes.push('✓ Test 1: Erster Tick — keine Jobs (korrekt)');
    }

    // ── Test 2: Tagwechsel gleiche Woche ─────────────────────────────────
    await cron._tick({ week: 1, trimester: 1, dayIndex: 1 });
    if (counts.daily !== 1 || counts.weekly !== 0 || counts.trimester !== 0) {
      ok = false;
      notes.push(`Test 2 FAIL: Tagwechsel → daily=1, weekly=0, trimester=0; got ${JSON.stringify(counts)}`);
    } else {
      notes.push('✓ Test 2: Tagwechsel → daily=1 (korrekt)');
    }

    // ── Test 3: Wochenwechsel ─────────────────────────────────────────────
    await cron._tick({ week: 2, trimester: 1, dayIndex: 0 });
    if (counts.daily !== 2 || counts.weekly !== 1 || counts.trimester !== 0) {
      ok = false;
      notes.push(`Test 3 FAIL: Wochenwechsel → daily=2, weekly=1, trimester=0; got ${JSON.stringify(counts)}`);
    } else {
      notes.push('✓ Test 3: Wochenwechsel → weekly=1 (korrekt)');
    }

    // ── Test 4: Trimesterwechsel ──────────────────────────────────────────
    await cron._tick({ week: 5, trimester: 2, dayIndex: 3 });
    if (counts.daily !== 3 || counts.weekly !== 2 || counts.trimester !== 1) {
      ok = false;
      notes.push(`Test 4 FAIL: Trimesterwechsel → daily=3, weekly=2, trimester=1; got ${JSON.stringify(counts)}`);
    } else {
      notes.push('✓ Test 4: Trimesterwechsel → trimester=1 (korrekt)');
    }

    // ── Test 5: Kein Tick bei gleichem Tag ───────────────────────────────
    const prevCounts = { ...counts };
    await cron._tick({ week: 5, trimester: 2, dayIndex: 3 }); // identisch
    if (counts.daily !== prevCounts.daily || counts.weekly !== prevCounts.weekly) {
      ok = false;
      notes.push(`Test 5 FAIL: Identischer Tick sollte keine Jobs auslösen; got ${JSON.stringify(counts)}`);
    } else {
      notes.push('✓ Test 5: Identischer Tick — kein doppelter Job-Run');
    }

    // ── Test 6: addJob-Validierung ────────────────────────────────────────
    let addJobError = false;
    try {
      cron.addJob('invalid_period', () => {});
    } catch (_) {
      addJobError = true;
    }
    if (!addJobError) {
      ok = false;
      notes.push('Test 6 FAIL: addJob mit ungültiger Periode sollte werfen');
    } else {
      notes.push('✓ Test 6: addJob("invalid_period") wirft korrekt');
    }

    // ── Test 7: engine._cron ist registriert ─────────────────────────────
    const liveCron = game?.janus7?._cron;
    if (!liveCron) {
      notes.push('INFO Test 7: engine._cron nicht verfügbar (JANUS7 noch nicht gestartet oder Setting deaktiviert)');
    } else {
      const isRegistered = liveCron._registered === true && liveCron._hookId !== null;
      if (!isRegistered) {
        ok = false;
        notes.push(`Test 7 FAIL: engine._cron nicht registriert (_registered=${liveCron._registered}, hookId=${liveCron._hookId})`);
      } else {
        notes.push(`✓ Test 7: engine._cron registriert (hookId=${liveCron._hookId})`);
      }
    }

    return {
      ok,
      summary: ok ? 'JanusCron Periodenauflösung: OK' : 'JanusCron Periodenauflösung: FAIL',
      notes,
    };
  },
};
