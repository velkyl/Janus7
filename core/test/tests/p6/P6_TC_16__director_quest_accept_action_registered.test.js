export default {
  id: 'P6-TC-16',
  title: 'ControlPanel Quest-Übernahme Aktion ist registriert',
  phases: [6],
  kind: 'auto',
  expected: 'DEFAULT_OPTIONS.actions enthält directorAcceptQuestSuggestion als Funktion.',
  async run({ engine }) {
    const App = engine?.ui?.apps?.controlPanel;
    if (!App?.DEFAULT_OPTIONS?.actions) throw new Error('controlPanel actions fehlen');
    const fn = App.DEFAULT_OPTIONS.actions.directorAcceptQuestSuggestion;
    return {
      ok: typeof fn === 'function',
      summary: typeof fn === 'function' ? 'directorAcceptQuestSuggestion vorhanden' : 'Aktion fehlt'
    };
  }
};
