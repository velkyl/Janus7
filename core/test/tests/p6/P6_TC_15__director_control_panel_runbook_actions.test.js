export default {
  id: 'P6-TC-15',
  title: 'ControlPanel Runbook-Aktionen sind registriert',
  phases: [6],
  kind: 'auto',
  expected: 'DEFAULT_OPTIONS.actions enthält directorRunbookNext und directorApplyMood.',
  async run({ engine }) {
    const App = engine?.ui?.apps?.controlPanel;
    if (!App?.DEFAULT_OPTIONS?.actions) throw new Error('controlPanel actions fehlen');
    const actions = App.DEFAULT_OPTIONS.actions;
    const required = ['directorRunbookNext', 'directorApplyMood'];
    const missing = required.filter((key) => typeof actions[key] !== 'function');
    return { ok: missing.length === 0, summary: missing.length ? `fehlen: ${missing.join(', ')}` : 'Runbook-Aktionen vorhanden' };
  }
};
