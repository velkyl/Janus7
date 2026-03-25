/**
 * Integration module for the JANUS knowledge graph service.  This
 * module registers a hook on janus7.ready to initialize and attach
 * the graph to the engine.  It defers loading of the graph code
 * until needed to avoid increasing the initial bundle size.
 */
import { HOOKS } from '../../core/hooks/topics.js';
import { registerRuntimeHook } from '../../core/hooks/runtime.js';

registerRuntimeHook('janus7:ready:graph-service', HOOKS.ENGINE_READY, async (engine) => {
  const logger = engine?.core?.logger ?? console;
  try {
    const { registerGraphService } = await import('../graph/index.js');
    await registerGraphService({
      engine,
      core: engine?.core,
      academyData: engine?.academy?.data ?? engine?.academy?.dataApi,
      dsa5Index: engine?.bridge?.dsa5?.library ?? engine?.bridge?.dsa5?.packs ?? engine?.bridge?.dsa5?.index,
      logger
    });
    await engine?.graph?.build?.({ force: true });
    logger?.debug?.('[JANUS7] Graph service integration completed');
  } catch (err) {
    logger?.warn?.('[JANUS7] Graph service integration failed', { message: err?.message });
  }
});
