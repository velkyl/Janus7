export default {
  id: 'P16-TC-03',
  title: 'GM-only: Schreib-Aktionen blocken für Nicht-GM (Permissions-Matrix)',
  phases: [6],
  kind: 'auto',
  expected: 'JanusConfigPanelApp._prepareContext() gibt notGM:true wenn !game.user.isGM.',
  whereToFind: 'ui/apps/JanusConfigPanelApp.js → _prepareContext, ui/permissions.js',
  async run({ ctx }) {
    const App = ctx?.ui?.apps?.configPanel ?? game?.janus7?.ui?.apps?.configPanel;
    if (!App) throw new Error('JanusConfigPanelApp nicht registriert');

    // Instanz erstellen und _prepareContext mit gemocktem GM=false aufrufen
    const originalIsGM = game.user.isGM;
    let result;
    try {
      // Temporär isGM patchen
      Object.defineProperty(game.user, 'isGM', { configurable: true, get: () => false });
      const instance = new App();
      result = await instance._prepareContext({});
    } finally {
      Object.defineProperty(game.user, 'isGM', { configurable: true, get: () => originalIsGM });
    }

    if (!result?.notGM) {
      throw new Error('_prepareContext gibt notGM:true NICHT zurück wenn user kein GM ist');
    }

    return { ok: true, summary: 'notGM:true korrekt gesetzt für Nicht-GM' };
  }
};
