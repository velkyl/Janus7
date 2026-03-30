/**
 * Phase 6: UI Integration
 *
 * Responsibilities:
 * - Register UI apps and menus
 * - Attach commands + UI registry to engine
 * - Provide basic scene controls entrypoint
 */

import { MODULE_ID } from '../../core/common.js';
import { HOOKS } from '../../core/hooks/emitter.js';
import { registerRuntimeHook } from '../../core/hooks/runtime.js';

// UI + Commands are Phase 6 deliverables.
import { JanusUI } from '../../ui/index.js';
import { JanusCommands } from '../../ui/commands/index.js';


// FIX P1-01: Der folgende Top-Level-Code war immer wirkungslos.
// game.janus7 ist zum ESModule-Import-Zeitpunkt noch nicht initialisiert.
// Die verlässliche Attach-Logik findet im ENGINE_READY Hook statt (siehe unten).

// Keep engine links consistent at the moment the engine is declared ready.
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
