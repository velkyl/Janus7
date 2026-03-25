export default {
  id: 'P6-TC-14',
  title: 'ControlPanel liefert Director Runbook Context',
  phases: [6],
  kind: 'auto',
  expected: 'directorRunbook mit steps und suggestedAction steht im Template-Context bereit.',
  async run({ engine }) {
    const App = engine?.ui?.apps?.controlPanel;
    if (!App) throw new Error('controlPanel App-Klasse fehlt');
    const app = new App({});
    try {
      const ctx = await app._prepareContext({});
      const ok = !!ctx?.directorRunbook && Array.isArray(ctx?.directorRunbook?.steps) && !!ctx?.directorRunbook?.suggestedAction;
      return { ok, summary: `steps=${ctx?.directorRunbook?.steps?.length ?? 0} suggested=${ctx?.directorRunbook?.suggestedAction?.label ?? 'n/a'}` };
    } finally {
      try { await app.close?.({ force: true }); } catch (_e) {}
    }
  }
};
