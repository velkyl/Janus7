/**
 * @file core/test/tests/p15/P15_TC_06__graph_diagnostics_and_query_smoke.test.js
 * @description Smoke-test: Graph diagnostics run on live graph and quest query tolerates empty context.
 */

export default {
  id: 'P15-TC-06',
  title: 'Graph diagnostics and query smoke',
  phases: [15],
  kind: 'auto',
  expected: 'diagnostics.run() returns summary and suggestQuests({}) does not crash',

  run: async () => {
    const graphService = game?.janus7?.graph;
    if (!graphService) {
      return { ok: false, summary: 'game.janus7.graph fehlt', notes: ['Graph-Integration nicht registriert'] };
    }

    await graphService.build({ force: true });
    const diag = graphService.diagnostics?.run?.({ mode: 'basic' }) ?? null;
    const suggestions = graphService.query?.suggestQuests?.({}) ?? [];

    const ok = !!diag?.summary && Array.isArray(suggestions);
    return {
      ok,
      summary: ok ? 'Diagnostics + Query Smoke OK' : 'Diagnostics oder Query Smoke fehlgeschlagen',
      notes: [
        `summary=${JSON.stringify(diag?.summary ?? null)}`,
        `suggestions=${Array.isArray(suggestions) ? suggestions.length : 'not-array'}`
      ]
    };
  }
};
