/**
 * P15_TC_04 — Manual Store Roundtrip
 *
 * Smoke test for the persistent guided-manual result store.
 */
import {
  readManualTestResults,
  readManualTestResult,
  writeManualTestResult,
  clearManualTestResult,
  resetManualTestResults,
  MANUAL_TEST_HOOK
} from '../../manual-store.js';

function randId() {
  return `manual_${Math.random().toString(16).slice(2, 10)}_${Date.now()}`;
}

export default {
  id: 'P15-TC-04',
  title: 'Manual Store persistiert Ergebnisse und emittiert Hooks',
  phases: [15],
  kind: 'auto',
  expected: 'write/read/clear/reset funktionieren; Hook wird bei Änderungen emittiert.',
  whereToFind: 'core/test/manual-store.js',
  async run() {
    const original = await readManualTestResults();
    const testId = randId();
    let hookCount = 0;
    const hookId = Hooks.on(MANUAL_TEST_HOOK, () => { hookCount += 1; });
    try {
      const written = await writeManualTestResult(testId, { status: 'PASS', notes: 'smoke-note' }, { id: testId, title: 'Smoke Manual Test' });
      if (written?.status !== 'PASS') return { ok: false, summary: 'writeManualTestResult setzte keinen PASS-Status' };

      const one = await readManualTestResult(testId);
      if (!one || one.status !== 'PASS' || one.notes !== 'smoke-note') {
        return { ok: false, summary: 'readManualTestResult liefert unerwarteten Inhalt' };
      }

      const all = await readManualTestResults();
      if (!all?.[testId]) return { ok: false, summary: 'readManualTestResults enthält Testeintrag nicht' };

      const cleared = await clearManualTestResult(testId);
      if (!cleared) return { ok: false, summary: 'clearManualTestResult meldet false' };
      const afterClear = await readManualTestResult(testId);
      if (afterClear) return { ok: false, summary: 'Testeintrag nach clearManualTestResult weiterhin vorhanden' };

      await writeManualTestResult(testId, { status: 'FAIL', notes: 'to-reset' }, { id: testId, title: 'Smoke Manual Test' });
      await resetManualTestResults();
      const afterReset = await readManualTestResults();
      if (Object.keys(afterReset ?? {}).length !== 0) return { ok: false, summary: 'resetManualTestResults hat Store nicht geleert' };
      if (hookCount < 3) return { ok: false, summary: `Manual Store Hook zu selten emittiert (${hookCount})` };

      return { ok: true, summary: 'Manual Store Roundtrip erfolgreich' };
    } finally {
      try { Hooks.off(MANUAL_TEST_HOOK, hookId); } catch (_) {}
      try { await game.settings.set('janus7', 'manualTestResults', original ?? {}); } catch (_) {}
    }
  }
};
