export default {
  id: 'P6-TC-12',
  title: 'ControlPanel liefert Director Workflow Context',
  phases: [6],
  kind: 'auto',
  expected: 'directorWorkflow mit nextAction, history und Ergebnislisten steht im Template-Context bereit.',
  async run({ engine }) {
    const App = engine?.ui?.apps?.controlPanel;
    if (!App) throw new Error('controlPanel App-Klasse fehlt');
    const app = new App({});
    try {
      app._rememberDirectorWorkflow?.('directorGenerateQuests', {
        suggestions: [{ quest: { title: 'Probequest' }, score: 0.7, reason: 'context' }]
      });
      const ctx = await app._prepareContext({});
      const ok = !!ctx?.directorWorkflow
        && typeof ctx?.directorWorkflow?.nextAction?.label === 'string'
        && Array.isArray(ctx?.directorWorkflow?.history)
        && Array.isArray(ctx?.directorWorkflow?.questSuggestions);
      return { ok, summary: `next=${ctx?.directorWorkflow?.nextAction?.label ?? 'n/a'} questSuggestions=${ctx?.directorWorkflow?.questSuggestions?.length ?? 'n/a'}` };
    } finally {
      try { await app.close?.({ force: true }); } catch (_e) {}
    }
  }
};
