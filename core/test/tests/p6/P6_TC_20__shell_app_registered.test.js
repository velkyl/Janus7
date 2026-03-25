
export default {
  id: 'P6-TC-20',
  title: 'Shell app is registered in the JANUS UI registry',
  phases: [6],
  kind: 'auto',
  expected: 'game.janus7.ui.apps.shell exists and opens a modular shell layer',
  run: async () => {
    const ui = game?.janus7?.ui;
    const App = ui?.apps?.shell ?? null;
    const ok = !!App && typeof App.showSingleton === 'function';
    return { ok, summary: ok ? 'Shell app registered.' : 'Shell app missing from UI registry.' };
  }
};
