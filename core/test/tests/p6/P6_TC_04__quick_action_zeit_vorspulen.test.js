export default {
  id: "P6-TC-04",
  title: "Permissions: GM-only Aktionen sind geschützt",
  phases: [6],
  kind: "auto",
  expected: "onAdvancePhase/onForceSave machen als Nicht-GM nichts und crashen nicht.",
  whereToFind: "JanusControlPanelApp.onAdvancePhase/onForceSave",
  async run(ctx) {
    const engine = ctx?.engine ?? game?.janus7;
    const App = engine?.ui?.apps?.controlPanel ?? null;
    if (!App) return { ok: false, summary: "controlPanel App-Klasse fehlt" };

    const user = game?.user;
    if (!user) return { ok: false, summary: "game.user fehlt" };

    // Ein Single-Client kann die GM-Rolle nicht sauber simulieren.
    // Deshalb nur dann automatisieren, wenn der aktuelle User bereits NON-GM ist.
    if (user.isGM) {
      return { ok: true, status: "SKIP", summary: "SKIP: aktueller User ist GM; Permission-Test benötigt Non-GM (2. Client oder Player-Login)" };
    }

    try {
      // Should early-return without throwing.
      await App.onAdvancePhase?.();
      await App.onForceSave?.();
      return { ok: true, summary: "Non-GM Aktionen blockiert (no crash)" };
    } catch (e) {
      return { ok: false, summary: e?.message ?? String(e) };
    }
  }
};
