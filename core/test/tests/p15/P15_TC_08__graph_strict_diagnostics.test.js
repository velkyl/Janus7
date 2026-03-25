/**
 * @file core/test/tests/p15/P15_TC_08__graph_strict_diagnostics.test.js
 */

export default {
  id: 'P15-TC-08',
  title: 'Graph strict diagnostics produce semantic summary',
  phases: [15],
  kind: 'auto',
  expected: 'strict diagnostics liefern Summary-Felder und crashen nicht',

  run: async () => {
    const graphService = game?.janus7?.graph;
    if (!graphService) return { ok: false, summary: 'game.janus7.graph fehlt' };
    await graphService.build({ force: true });
    const diag = graphService.diagnostics?.run?.({ mode: 'strict' }) ?? null;
    const ok = Number.isFinite(diag?.summary?.brokenEdgeCount) && Number.isFinite(diag?.summary?.semanticIssueCount);
    return {
      ok,
      summary: ok ? 'Strict diagnostics OK' : 'Strict diagnostics unvollständig',
      notes: [JSON.stringify(diag?.summary ?? null)]
    };
  }
};
