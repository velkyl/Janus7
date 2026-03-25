export default {
  id: 'P6-TC-13',
  title: 'ControlPanel merkt sich Director-Läufe sitzungsweit',
  phases: [6],
  kind: 'auto',
  expected: '_rememberDirectorWorkflow schreibt lastAction, history und lastError konsistent fort.',
  async run({ engine }) {
    const App = engine?.ui?.apps?.controlPanel;
    if (!App) throw new Error('controlPanel App-Klasse fehlt');
    const app = new App({});
    try {
      app._rememberDirectorWorkflow?.('directorProcessQueue', { processed: [{ id: 'EVT_1' }] });
      app._rememberDirectorWorkflow?.('directorEvaluateSocial', null, { error: new Error('boom') });
      const wf = app._directorWorkflow ?? {};
      const ok = wf?.lastAction === 'directorEvaluateSocial'
        && typeof wf?.lastError === 'string'
        && Array.isArray(wf?.history)
        && wf.history.length >= 2;
      return { ok, summary: `last=${wf?.lastAction ?? 'n/a'} history=${wf?.history?.length ?? 0}` };
    } finally {
      try { await app.close?.({ force: true }); } catch (_e) {}
    }
  }
};
