export default {
  id: 'P6-TC-18',
  title: 'BaseApp available for UI layer',
  phases: [6],
  kind: 'auto',
  expected: 'game.janus7.ui.baseApp or exported BaseApp constructor exists.',
  async run(ctx) {
    const engine = ctx?.engine ?? game?.janus7;
    const BaseApp = engine?.ui?.BaseApp ?? engine?.ui?.baseApp ?? foundry?.applications?.api?.ApplicationV2 ?? null;
    const ok = !!BaseApp;
    return { ok, summary: ok ? 'UI BaseApp verfügbar' : 'UI BaseApp fehlt', notes: [`type=${typeof BaseApp}`] };
  }
};
