/**
 * @file ui/commands.js
 * @module janus7/ui
 * @phase 6
 *
 * REFACTORED: Commands have been split into domain modules under ui/commands/.
 * This file is a backward-compatible re-export facade.
 *
 * Domain modules:
 *  - ui/commands/time.js       (advanceSlot, advancePhase, advanceDay, ...)
 *  - ui/commands/state.js      (saveState, exportState, importState, ...)
 *  - ui/commands/atmosphere.js (applyMood, setAtmosphereVolume, ...)
 *  - ui/commands/quest.js      (startQuest, completeQuest, ...)
 *  - ui/commands/academy.js    (browseLessons, browseNPCs, ...)
 *  - ui/commands/system.js     (copyDiagnostics, runHealthCheck, ...)
 */

export { JanusCommands } from './commands/index.js';

// Re-export default via import-then-export (max browser compat)
import { default as _JanusCommandsDefault } from './commands/index.js';
export default _JanusCommandsDefault;
export {
  timeCommands,
  stateCommands,
  atmosphereCommands,
  questCommands,
  academyCommands,
  systemCommands
} from './commands/index.js';
