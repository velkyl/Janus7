export default {
  id: 'P16-TC-01',
  title: 'Alle Phase-6-Apps sind über game.janus7.ui.apps registriert',
  phases: [6],
  kind: 'auto',
  expected: 'game.janus7.ui.apps enthält: controlPanel, academyOverview, scoringView, socialView, atmosphereDJ, stateInspector, configPanel',
  whereToFind: 'ui/index.js → JanusUI.apps',
  async run({ ctx }) {
    const ui = ctx?.ui ?? game?.janus7?.ui;
    if (!ui?.apps) throw new Error('game.janus7.ui.apps nicht verfügbar');

    const required = [
      'controlPanel',
      'academyOverview',
      'scoringView',
      'socialView',
      'atmosphereDJ',
      'stateInspector',
      'configPanel',
    ];

    const missing = required.filter(k => !ui.apps[k]);
    if (missing.length) throw new Error(`Fehlende Apps: ${missing.join(', ')}`);

    // Alle müssen über open() erreichbar sein
    for (const key of required) {
      const App = ui.apps[key];
      if (typeof App !== 'function') throw new Error(`${key} ist keine Klasse`);
    }

    return { ok: true, summary: `Alle ${required.length} Apps registriert` };
  }
};
