/**
 * @file core/test/tests/p15/P15_TC_07__graph_hooks_dirty.test.js
 */

export default {
  id: 'P15-TC-07',
  title: 'Graph dirty flags react to canonical hooks',
  phases: [15],
  kind: 'auto',
  expected: 'academy/index hooks markieren den Graph dirty',

  run: async () => {
    const graphService = game?.janus7?.graph;
    if (!graphService) return { ok: false, summary: 'game.janus7.graph fehlt' };
    await graphService.build({ force: true });
    const before = graphService.isDirty?.();
    Hooks.callAll('janus7.academy.data.reloaded', { source: 'test' });
    const afterAcademy = graphService.isDirty?.();
    await graphService.build({ force: true });
    Hooks.callAll('janus7.dsa5.index.updated', { source: 'test' });
    const afterIndex = graphService.isDirty?.();
    return {
      ok: before === false && afterAcademy === true && afterIndex === true,
      summary: before === false && afterAcademy === true && afterIndex === true ? 'Dirty hooks OK' : 'Dirty hooks reagieren nicht korrekt',
      notes: [`before=${before}`, `afterAcademy=${afterAcademy}`, `afterIndex=${afterIndex}`]
    };
  }
};
