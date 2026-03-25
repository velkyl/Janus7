/**
 * @file core/test/tests/p1/P1_TC_15__capabilities_healthcheck_smoke.test.js
 * @description Phase 1 Smoke-Test: capabilities.state.runHealthCheck() liefert
 *              ein strukturell valides Report-Objekt und crasht nicht.
 *
 *              Dieser Test prüft NICHT den Inhalt des Reports (der variiert je nach
 *              installiertem System/Packs). Er stellt sicher, dass:
 *              1. runHealthCheck() aufrufbar ist
 *              2. Das Ergebnis { ok, checks } enthält
 *              3. ok ein boolean ist
 *              4. checks ein Array ist
 *              5. Kein unhandled Rejection entsteht
 *
 * @version 0.9.9.37
 */

export default {
  id: 'P1-TC-15',
  title: 'capabilities.state.runHealthCheck() — Smoke-Test',
  phases: [1],
  kind: 'auto',
  expected: 'runHealthCheck() liefert { ok: boolean, checks: Array } ohne Exception',

  run: async () => {
    const notes = [];
    let ok = true;

    const caps = game?.janus7?.capabilities;

    // ── 1. capabilities.state existiert ──────────────────────────────────
    if (!caps?.state) {
      return {
        ok: false,
        summary: 'capabilities.state nicht verfügbar — P1-TC-14 zuerst prüfen',
        notes: ['game.janus7.capabilities.state ist null/undefined'],
      };
    }
    notes.push('✓ capabilities.state vorhanden');

    // ── 2. runHealthCheck ist Funktion ────────────────────────────────────
    if (typeof caps.state.runHealthCheck !== 'function') {
      return {
        ok: false,
        summary: 'capabilities.state.runHealthCheck ist keine Funktion',
        notes: [`Typ: ${typeof caps.state.runHealthCheck}`],
      };
    }
    notes.push('✓ runHealthCheck ist function');

    // ── 3. Aufruf ohne Exception ──────────────────────────────────────────
    let report;
    try {
      report = await caps.state.runHealthCheck();
    } catch (err) {
      return {
        ok: false,
        summary: `runHealthCheck() hat eine Exception geworfen: ${err?.message}`,
        notes: [`Error: ${err?.message}`, `Stack: ${err?.stack?.split('\n')[1] ?? ''}`],
      };
    }
    notes.push('✓ runHealthCheck() ohne Exception ausgeführt');

    // ── 4. Ergebnis-Struktur ──────────────────────────────────────────────
    if (report === null || report === undefined) {
      ok = false;
      notes.push('FAIL: runHealthCheck() hat null/undefined zurückgegeben');
    } else if (typeof report !== 'object') {
      ok = false;
      notes.push(`FAIL: Ergebnis ist kein Objekt (Typ: ${typeof report})`);
    } else {
      notes.push('✓ Ergebnis ist ein Objekt');

      // ok-Flag
      if (typeof report.ok !== 'boolean') {
        ok = false;
        notes.push(`FAIL: report.ok ist kein boolean (Typ: ${typeof report.ok})`);
      } else {
        notes.push(`✓ report.ok = ${report.ok} (boolean)`);
      }

      // checks-Array
      if (!Array.isArray(report.checks)) {
        ok = false;
        notes.push(`FAIL: report.checks ist kein Array (Typ: ${typeof report.checks})`);
      } else {
        notes.push(`✓ report.checks ist Array (${report.checks.length} Einträge)`);
      }

      // warnings optional, aber wenn vorhanden muss es Array sein
      if ('warnings' in report && !Array.isArray(report.warnings)) {
        ok = false;
        notes.push(`FAIL: report.warnings vorhanden aber kein Array (Typ: ${typeof report.warnings})`);
      } else if (Array.isArray(report.warnings)) {
        notes.push(`✓ report.warnings ist Array (${report.warnings.length} Einträge)`);
      }

      // Inhaltliche Info (kein FAIL, nur logging)
      if (!report.ok && Array.isArray(report.warnings) && report.warnings.length > 0) {
        notes.push(`INFO: Health-Report nicht OK — Warnungen: ${report.warnings.join('; ')}`);
      }
    }

    return {
      ok,
      summary: ok
        ? 'runHealthCheck() liefert valides Report-Objekt'
        : 'runHealthCheck() Report-Struktur ungültig (Details in notes)',
      notes,
    };
  },
};
