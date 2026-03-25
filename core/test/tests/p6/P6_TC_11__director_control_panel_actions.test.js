export default {
  id: 'P6-TC-11',
  title: 'ControlPanel Director-Aktionen sind registriert',
  phases: [6],
  kind: 'auto',
  expected: 'DEFAULT_OPTIONS.actions enthält die Director-Frontdoor-Aktionen.',
  async run({ engine }) {
    const App = engine?.ui?.apps?.controlPanel;
    if (!App?.DEFAULT_OPTIONS?.actions) throw new Error('controlPanel actions fehlen');
    const actions = App.DEFAULT_OPTIONS.actions;
    const required = ['startDirectorDay', 'directorRunLesson', 'directorProcessQueue', 'directorGenerateQuests', 'directorEvaluateSocial'];
    const missing = required.filter((key) => typeof actions[key] !== 'function');
    return {
      ok: missing.length === 0,
      summary: missing.length ? `fehlen: ${missing.join(', ')}` : 'alle Director-Aktionen vorhanden'
    };
  }
};
