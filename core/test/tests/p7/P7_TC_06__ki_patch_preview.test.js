/**
 * P7_TC_06 — KI patch preview
 *
 * The previewImport API for KI responses should produce a detailed
 * list of patch operations, including full paths and operations.
 * This test sets up a baseline state, constructs a KI response with
 * replace and append patches, and verifies that the preview output
 * contains the expected diffs.
 */

export default {
  id: 'P7-TC-06',
  title: 'KI patch preview generates detailed diff objects',
  phases: [7],
  kind: 'automated',
  expected: 'previewImport returns diff objects with path and op for each patch',
  async run({ ctx }) {
    const engine = ctx?.engine;
    const ki = engine?.capabilities?.ki ?? engine?.ki ?? null;
    if (!ki || typeof ki.previewImport !== 'function') {
      return { ok: false, summary: 'KI API missing' };
    }
    // Arrange: baseline state
    await engine.core.state.transaction((s) => {
      s.set('academy.calendar.nextHoliday', 'Praiosfest');
      s.set('academy.scoring', { circles: { circleA: { score: 10 } } });
      s.set('academy.journalEntries', []);
    });
    const response = {
      version: 'JANUS_KI_RESPONSE_V1',
      sourceExportMeta: {},
      changes: {
        calendarUpdates: [
          { path: 'nextHoliday', op: 'replace', value: 'Sommersonnenwende' }
        ],
        scoringAdjustments: [
          { path: 'circles.circleA.score', op: 'replace', value: 20 }
        ],
        journalEntries: [
          { text: 'Neue Eintragung' }
        ]
      }
    };
    let diffs;
    try {
      diffs = await ki.previewImport(response);
    } catch (err) {
      return { ok: false, summary: `previewImport threw: ${err?.message || err}` };
    }
    if (!Array.isArray(diffs)) {
      return { ok: false, summary: 'previewImport did not return array' };
    }
    // Expect three domains: calendar, scoring, journal
    const paths = diffs.map((d) => d.path);
    if (!paths.includes('academy.calendar.nextHoliday')) {
      return { ok: false, summary: `Missing diff for academy.calendar.nextHoliday` };
    }
    if (!paths.includes('academy.scoring.circles.circleA.score')) {
      return { ok: false, summary: `Missing diff for academy.scoring.circles.circleA.score` };
    }
    if (!paths.includes('academy.journalEntries')) {
      return { ok: false, summary: `Missing diff for academy.journalEntries` };
    }
    // Check operations
    const calOp = diffs.find((d) => d.path === 'academy.calendar.nextHoliday')?.op;
    const scoreOp = diffs.find((d) => d.path === 'academy.scoring.circles.circleA.score')?.op;
    const journalOp = diffs.find((d) => d.path === 'academy.journalEntries')?.op;
    if (calOp !== 'replace' || scoreOp !== 'replace' || journalOp !== 'append') {
      return { ok: false, summary: `Unexpected operations: calendar=${calOp}, scoring=${scoreOp}, journal=${journalOp}` };
    }
    return { ok: true, summary: 'OK' };
  }
};