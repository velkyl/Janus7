/**
 * @file core/test/tests/p15/P15_TC_05__graph_service_registered.test.js
 * @description Smoke-test: Graph service is registered and can build a non-empty graph.
 */

export default {
  id: 'P15-TC-05',
  title: 'Graph service registered and buildable',
  phases: [15],
  kind: 'auto',
  expected: 'game.janus7.graph exists and build() returns a graph with nodes',

  run: async () => {
    const graphService = game?.janus7?.graph;
    if (!graphService) {
      return { ok: false, summary: 'game.janus7.graph fehlt', notes: ['Graph-Integration nicht registriert'] };
    }

    const graph = await graphService.build({ force: true });
    const nodeCount = graph?.getAllNodes?.().length ?? 0;

    return {
      ok: nodeCount > 0,
      summary: nodeCount > 0 ? `Graph gebaut (${nodeCount} Nodes)` : 'Graph enthält keine Nodes',
      notes: [
        '✓ game.janus7.graph vorhanden',
        `nodeCount=${nodeCount}`,
        `dirty=${graphService.isDirty?.()}`
      ]
    };
  }
};
