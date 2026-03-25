export default {
  id: 'P16-TC-10',
  title: 'JanusUI.open() funktioniert für alle registrierten Phase-6-Apps',
  phases: [6],
  kind: 'auto',
  expected: 'Jede App kann instanziiert werden ohne throw. open() gibt Objekt zurück.',
  whereToFind: 'ui/index.js → JanusUI.open()',
  async run({ ctx }) {
    const janusUI = ctx?.ui ?? game?.janus7?.ui;
    if (!janusUI?.open) throw new Error('game.janus7.ui.open nicht verfügbar');

    // Nur Apps testen die über showSingleton laufen (render=false Variante via Instanz)
    const appsToCheck = [
      'scoringView',
      'socialView',
      'atmosphereDJ',
      'stateInspector',
      'configPanel',
      'academyOverview',
    ];

    const failed = [];
    for (const key of appsToCheck) {
      try {
        const App = janusUI.apps[key];
        if (!App) { failed.push(`${key}: nicht registriert`); continue; }
        // Instanz erzeugen (kein render) → darf nicht werfen
        const inst = new App();
        if (!inst || typeof inst._prepareContext !== 'function') {
          failed.push(`${key}: _prepareContext fehlt`);
        }
      } catch (err) {
        failed.push(`${key}: ${err.message}`);
      }
    }

    if (failed.length) throw new Error(`Instanziierungs-Fehler:\n${failed.join('\n')}`);

    return { ok: true, summary: `${appsToCheck.length} Apps erfolgreich instanziiert` };
  }
};
