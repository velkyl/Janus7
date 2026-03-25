/**
 * P7_TC_07 — KI patch apply
 *
 * The applyImport API for KI responses should apply patch operations
 * transactionally. This test sets up a baseline state, constructs a
 * response with replace, append and delete operations, applies the
 * response and verifies that the state has been modified accordingly
 * and that the returned diffs array length matches the number of
 * individual patch operations.
 */

export default {
  id: 'P7-TC-07',
  title: 'KI patch apply updates state and logs history',
  phases: [7],
  kind: 'automated',
  expected: 'applyImport applies patches and returns diff array; state reflects changes',
  async run({ ctx }) {
    const engine = ctx?.engine;
    const ki = engine?.capabilities?.ki ?? engine?.ki ?? null;
    if (!ki || typeof ki.applyImport !== 'function') {
      return { ok: false, summary: 'KI API missing' };
    }
    // Arrange baseline state
    await engine.core.state.transaction((s) => {
      s.set('academy.social', { relationships: { actor1: { actor2: { trust: 1 } } } });
      s.set('academy.calendar', { holidays: ['Hol1'] });
    });
    const response = {
      version: 'JANUS_KI_RESPONSE_V1',
      sourceExportMeta: {},
      changes: {
        socialAdjustments: [
          { path: 'relationships.actor1.actor2.trust', op: 'replace', value: 2 }
        ],
        calendarUpdates: [
          { path: 'holidays', op: 'append', value: 'Hol2' },
          { path: 'holidays', op: 'delete' }
        ],
        journalEntries: [ { msg: 'Test' } ]
      }
    };
    let preview;
    try {
      preview = await ki.previewImport(response);
    } catch (err) {
      return { ok: false, summary: `previewImport threw: ${err?.message || err}` };
    }
    if (!Array.isArray(preview)) {
      return { ok: false, summary: 'previewImport did not return array' };
    }
    // Expect four diffs (three patches + one journal entry)
    if (preview.length !== 4) {
      return { ok: false, summary: `Unexpected preview length: ${preview.length}` };
    }
    let applied;
    try {
      applied = await ki.applyImport(response);
    } catch (err) {
      return { ok: false, summary: `applyImport threw: ${err?.message || err}` };
    }
    if (!Array.isArray(applied) || applied.length !== 4) {
      return { ok: false, summary: `Unexpected applyImport result length: ${applied?.length}` };
    }
    // Verify state updates
    const trust = engine.core.state.getPath('academy.social.relationships.actor1.actor2.trust');
    const holidays = engine.core.state.getPath('academy.calendar.holidays');
    if (trust !== 2) {
      return { ok: false, summary: `trust not updated: ${trust}` };
    }
    if (typeof holidays !== 'undefined') {
      return { ok: false, summary: 'holidays not deleted' };
    }
    // History should record the import with applied=true
    const history = ki.getImportHistory();
    const last = history[history.length - 1];
    if (!last || !last.applied) {
      return { ok: false, summary: 'History entry missing or not marked as applied' };
    }
    return { ok: true, summary: 'OK' };
  }
};