/**
 * JANUS7 Control Panel Open Macro
 *
 * Öffnet das JANUS7 Control Panel. Standardmäßig wird der 'status'-Tab aktiv.
 * Übergeben Sie optional den Namen eines Tabs als erstes Argument (status, atmo, time, debug).
 *
 * Anti-Pattern:
 * - Kein Import möglich in Makros → Fallback über globalThis nutzen.
 * - Nicht als Spieler ausführen, da UI nur für den Spielleiter sichtbar ist.
 */

(async () => {
  try {
    // Nur GMs dürfen das Control Panel öffnen
    if (!game?.user?.isGM) {
      ui?.notifications?.warn?.('Control Panel kann nur durch GMs geöffnet werden.');
      return;
    }

    // Setze optionalen Tab, Standard: 'status'
    const tabArg = (typeof args !== 'undefined' && args.length > 0) ? String(args[0]) : 'status';
    const opts = { activeTab: tabArg };

    // Bevorzugter Weg über die Engine-UI-API (verfügbar nach janus7Ready)
    if (game?.janus7?.ui?.openControlPanel) {
      game.janus7.ui.openControlPanel(opts);
      return;
    }

    // Fallback: globale Klasse verwenden (falls Panel vor janus7Ready geöffnet wird)
    if (globalThis?.JanusControlPanelApp) {
      const app = new globalThis.JanusControlPanelApp({ engine: game?.janus7 ?? null, ...opts });
      app.render({ force: true });
      return;
    }

    ui?.notifications?.warn?.('JANUS7 Control Panel ist noch nicht verfügbar. Warten Sie auf janus7Ready.');
  } catch (err) {
    console.error('JANUS7 Control Panel Macro error', err);
    ui?.notifications?.error?.('Fehler beim Öffnen des Control Panels. Siehe Konsole für Details.');
  }
})();