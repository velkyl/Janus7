/**
 * @file core/test/tests/p15/P15_TC_10__dsa5_index_hook_emission_smoke.test.js
 */

export default {
  id: 'P15-TC-10',
  title: 'DSA5 bridge emits canonical index update hook after library index build',
  phases: [15],
  kind: 'auto',
  expected: 'buildLibraryIndex emits janus7.dsa5.index.updated',

  run: async () => {
    const bridge = game?.janus7?.bridge?.dsa5;
    if (!bridge?.buildLibraryIndex) {
      return { ok: false, summary: 'DSA5 bridge/buildLibraryIndex fehlt' };
    }
    let fired = false;
    const handler = () => { fired = true; };
    Hooks.once('janus7.dsa5.index.updated', handler);
    await bridge.buildLibraryIndex({ documentName: 'Item' });
    return {
      ok: fired === true,
      summary: fired ? 'DSA5 index hook emitted' : 'DSA5 index hook wurde nicht emittiert',
      notes: [`fired=${fired}`]
    };
  }
};
