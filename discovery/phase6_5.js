/**
 * @file discovery/phase6_5.js
 * @module janus7
 * @phase 6.5
 *
 * Bootstraps the Content Discovery Bridge after JANUS7 is ready.
 */

import JanusContentDiscoveryBridge from './index.js';

Hooks.once('janus7Ready', async (engine) => {
  try {
    const logger = engine?.diagnostics?.getLogger?.('discovery') ?? console;
    const bridge = new JanusContentDiscoveryBridge({ engine, logger });
    await bridge.init();

    // Attach to engine + public facade
    engine.discovery = bridge;
    game.janus7.discovery = bridge;

    logger?.info?.('JANUS7 Phase 6.5 | Content Discovery Bridge online.');
  } catch (err) {
    (engine?.core?.logger ?? console).error?.('JANUS7 Phase 6.5 failed to init discovery bridge', err);
  }
});
