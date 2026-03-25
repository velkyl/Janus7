export default {
  id: 'P3-TC-12',
  title: 'DSA5 library service registered and searchable',
  phases: [3],
  kind: 'auto',
  expected: 'game.janus7.bridge.dsa5.library exposes buildIndex/search/stats.',
  async run(ctx) {
    const engine = ctx?.engine ?? game?.janus7;
    const library = engine?.bridge?.dsa5?.library ?? engine?.dsa5?.library ?? null;
    const ok = !!library && ['buildIndex', 'search', 'stats'].every((fn) => typeof library?.[fn] === 'function');
    const stats = ok ? library.stats?.() : null;
    return { ok, summary: ok ? 'DSA5 library service verfügbar' : 'DSA5 library service fehlt', notes: [stats ? `stats=${JSON.stringify(stats)}` : 'stats=n/a'] };
  }
};
