/**
 * @file scripts/integration/phase6-ui-integration.js
 * @phase 6 (UI)
 *
 * Responsibilities:
 * - Attach commands + UI registry to engine
 * - Provide basic scene controls entrypoint
 *
 * Architecture: Imports ONLY from public-api.mjs (Phase ≤1 symbols).
 * Foundry-Core-Hooks stay in scripts/janus.mjs (A3 contract).
 */

import { MODULE_ID, HOOKS, registerRuntimeHook } from '../core/public-api.mjs';
import { JanusUI } from '../../ui/index.js';
import { JanusCommands } from '../../ui/commands/index.js';

// FIX P1-01: Top-Level-Code war wirkungslos — game.janus7 ist zum Import-Zeitpunkt
// noch nicht initialisiert. Die verlässliche Attach-Logik ist im ENGINE_READY Hook.

registerRuntimeHook('janus7:ready:phase6-ui', HOOKS.ENGINE_READY, (engine) => {
  try {
    engine.commands = engine.commands ?? JanusCommands;
    engine.ui = engine.ui ?? JanusUI;
    engine?.markServiceReady?.('ui.commands', engine.commands);
    engine?.markServiceReady?.('ui.router', engine.ui);

    // Mirror to game.janus7 for safety (hot reload, partial init, etc.).
    if (game?.janus7) {
      game.janus7.commands = game.janus7.commands ?? JanusCommands;
      game.janus7.ui = game.janus7.ui ?? JanusUI;
    }
  } catch (err) {
    engine?.recordWarning?.('phase6.ui', 'attach', err);
    (engine?.core?.logger ?? console).warn?.('[JANUS7][Phase6] Failed to attach UI/Commands to engine:', err);
  }
});

// NOTE: getSceneControlButtons Hook wurde in 0.9.1 nach scripts/janus.mjs verschoben
// (Phase A3 – alle Foundry-Core-Hooks zentralisiert im Single Entry Point).
