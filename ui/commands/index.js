/**
 * @file ui/commands/index.js
 * @module janus7/ui/commands
 * @phase 6
 *
 * Aggregates all domain command modules into a single JanusCommands object.
 * This is the canonical import point for the Command Center.
 */

import { timeCommands } from './time.js';
import { stateCommands } from './state.js';
import { atmosphereCommands } from './atmosphere.js';
import { questCommands } from './quest.js';
import { academyCommands } from './academy.js';
import { systemCommands } from './system.js';
import { phase7Commands } from './phase7.js';
import { lessonCommands } from './lesson.js';
import { kiCommands } from './ki.js';

/**
 * Unified command registry – spread from domain modules.
 * @type {Record<string, (dataset?: object) => Promise<import('../commands.js').CommandResult>>}
 */
export const JanusCommands = {
  ...timeCommands,
  ...stateCommands,
  ...atmosphereCommands,
  ...questCommands,
  ...academyCommands,
  ...systemCommands,
  ...phase7Commands,
  ...lessonCommands,
  ...kiCommands,

  // Domain groups
  timeCommands,
  stateCommands,
  atmosphereCommands,
  questCommands,
  academyCommands,
  systemCommands,
  phase7Commands,
  lessonCommands,
  kiCommands,
};

export default JanusCommands;

// Re-export domain modules for selective imports
export { timeCommands } from './time.js';
export { stateCommands } from './state.js';
export { atmosphereCommands } from './atmosphere.js';
export { questCommands } from './quest.js';
export { academyCommands } from './academy.js';
export { systemCommands } from './system.js';
export { phase7Commands } from './phase7.js';
