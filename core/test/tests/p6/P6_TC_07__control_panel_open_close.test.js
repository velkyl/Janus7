/**
 * @file P6_TC_07__control_panel_open_close.test.js
 * @phase 6
 *
 * Testet, dass das Director Panel / ControlPanel öffnet und schließt ohne Crash.
 */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default {
  id: 'P6-TC-07',
  title: 'ControlPanel öffnet und schließt',
  phases: ['P6'],
  kind: 'auto',
  expected: 'game.janus7.ui.openControlPanel() rendert ohne Exceptions; App schließt sauber',
  whereToFind: 'game.janus7.ui.openControlPanel()',
  async run(ctx) {
    const engine = ctx?.engine ?? game.janus7;
    if (!engine) throw new Error('Engine fehlt (ctx.engine oder game.janus7)');

    const uiApi = engine.ui ?? game.janus7?.ui;
    if (!uiApi || typeof uiApi.openControlPanel !== 'function') {
      throw new Error('engine.ui.openControlPanel() fehlt (Phase 6 nicht initialisiert?)');
    }

    // Open
    const app = uiApi.openControlPanel({});
    if (!app) throw new Error('openControlPanel() hat keine App-Instanz zurückgegeben');

    // Give Foundry a tick to attach DOM
    await sleep(50);

    // Best-effort: element may be null if render failed
    if (!app.element) {
      // try one more tick
      await sleep(50);
    }
    if (!app.element) {
      throw new Error('ControlPanel wurde nicht gerendert (app.element ist null)');
    }

    // Close
    try {
      app.close?.();
    } catch (err) {
      throw new Error(`ControlPanel close() failed: ${err?.message ?? err}`);
    }

    return { ok: true, summary: 'ControlPanel render/close ok' };
  }
};
