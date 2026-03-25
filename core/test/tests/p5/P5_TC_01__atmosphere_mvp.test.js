/**
 * @file P5_TC_01__atmosphere_mvp.test.js
 * @phase 5
 *
 * Testet, dass die Phase-5-Atmosphere-Schicht am Engine-Objekt hängt.
 *
 * Hinweis:
 * - Keine echte Wiedergabe/Playlist-Steuerung im Test (Side-Effects vermeiden).
 */

export default {
  id: 'P5-TC-01',
  title: 'Atmosphere (MVP) registriert',
  phases: ['P5'],
  kind: 'auto',
  expected: 'game.janus7.atmosphere.controller ist vorhanden; status()/init()/stopAll() sind aufrufbar',
  whereToFind: 'game.janus7.atmosphere.controller',
  async run(ctx) {
    const engine = ctx?.engine ?? game.janus7;
    if (!engine) throw new Error('Engine fehlt (ctx.engine oder game.janus7)');

    const controller = engine?.atmosphere?.controller;
    if (!controller) {
      throw new Error('engine.atmosphere.controller fehlt (Phase 5 nicht initialisiert?)');
    }

    // Minimal API surface
    for (const fn of ['status', 'init', 'stopAll']) {
      if (typeof controller[fn] !== 'function') {
        throw new Error(`controller.${fn}() fehlt`);
      }
    }

    // status() soll ohne Side-Effects funktionieren
    const st = controller.status();
    if (st == null || typeof st !== 'object') {
      throw new Error('controller.status() liefert kein Objekt');
    }

    // Optional: applyMood ist nice-to-have, aber nicht zwingend
    const hasApplyMood = typeof controller.applyMood === 'function';

    return {
      ok: true,
      summary: hasApplyMood
        ? 'Atmosphere-Controller vorhanden (inkl. applyMood)'
        : 'Atmosphere-Controller vorhanden (ohne applyMood)'
    };
  }
};
