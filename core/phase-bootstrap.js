/**
 * @file core/phase-bootstrap.js
 * @module janus7/core
 * @phase 1.5
 *
 * Phase Bootstrap (Hardening)
 * ==========================
 * Goal:
 * - Keep Phase 1 (core/index.js) free from static imports to higher phases.
 * - Load phase integration modules during init via dynamic imports.
 *
 * Hardening rule:
 * - Never fail the core boot because a higher phase fails to load.
 */

import { JanusConfig } from './config.js';

let _bootstrapped = false;

/**
 * Dynamically loads phase integration modules.
 *
 * @param {object} [opts]
 * @param {import('./logger.js').JanusLogger} [opts.logger]
 * @returns {Promise<void>}
 */
export async function bootstrapJanusIntegrations({ logger } = {}) {
  if (_bootstrapped) return;
  _bootstrapped = true;

  const enabled = {
    simulation: JanusConfig.get('enableSimulation') !== false,
    // Backwards-compat: older builds used enableQuest; canonical setting is enableQuestSystem.
    quest: JanusConfig.get('enableQuestSystem') !== false,
    atmosphere: JanusConfig.get('enableAtmosphere') !== false,
    ui: JanusConfig.get('enableUI') !== false
  };

  // Phase 4 must load before Quest/Event integration (it provides calendar hooks).
  const integrations = [];
  if (enabled.simulation) integrations.push('../scripts/integration/phase4-simulation-integration.js');
  if (enabled.quest) integrations.push('../scripts/integration/quest-system-integration.js');
  if (enabled.atmosphere) integrations.push('../scripts/integration/phase5-atmosphere-integration.js');
  if (enabled.ui) integrations.push('../scripts/integration/phase6-ui-integration.js');

  // Test runner integration (always loads — lightweight, just attaches API surface)
  integrations.push('../scripts/integration/test-runner-integration.js');

  logger?.info?.('Phase integrations: gating by settings', enabled);

  for (const path of integrations) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await import(path);
      logger?.debug?.(`Phase integration loaded: ${path}`);
    } catch (err) {
      logger?.warn?.(`Phase integration failed to load: ${path}`,
        err
      );
    }
  }
}
