export default {
  id: 'P6-TC-10',
  title: 'ControlPanel liefert Director Runtime Context',
  phases: [6],
  kind: 'auto',
  expected: 'directorRuntime und directorSummary stehen im Template-Context bereit.',
  async run({ engine }) {
    const App = engine?.ui?.apps?.controlPanel;
    if (!App) throw new Error('controlPanel App-Klasse fehlt');
    const app = new App({});
    try {
      const ctx = await app._prepareContext({});
      const ok = !!ctx?.directorRuntime && typeof ctx?.directorRuntime?.lessonCount === 'number' && !!ctx?.directorSummary;
      return { ok, summary: `queued=${ctx?.directorRuntime?.queuedEventCount ?? 'n/a'} quests=${ctx?.directorRuntime?.activeQuestCount ?? 'n/a'}` };
    } finally {
      try { await app.close?.({ force: true }); } catch (_e) {}
    }
  }
};
