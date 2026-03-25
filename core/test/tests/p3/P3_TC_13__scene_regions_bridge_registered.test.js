export default {
  id: 'P3-TC-13',
  title: 'Scene regions bridge registered',
  phases: [3],
  kind: 'auto',
  expected: 'game.janus7.bridges.foundry.sceneRegions exists and exposes register/unregister.',
  async run(ctx) {
    const engine = ctx?.engine ?? game?.janus7;
    const bridge = engine?.bridges?.foundry?.sceneRegions ?? engine?.bridges?.sceneRegions ?? null;
    const ok = !!bridge && typeof bridge?.register === 'function' && typeof bridge?.unregister === 'function';
    return { ok, summary: ok ? 'SceneRegionsBridge verfügbar' : 'SceneRegionsBridge fehlt', notes: [`hasBridge=${!!bridge}`] };
  }
};
