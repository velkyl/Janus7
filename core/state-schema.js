/**
 * @file core/state-schema.js
 * @description Decoupled state structure and migration logic for Janus7.
 * Part of the "God Object" refactoring to clear up JanusStateCore.
 */

import { JANUS_SCHEMA_VERSION, getModuleVersion } from './version.js';

/**
 * Default world state for JANUS7.
 */
export const DEFAULT_STATE = Object.freeze({
  meta: {
    version: getModuleVersion(),
    schemaVersion: JANUS_SCHEMA_VERSION,
    createdAt: null,
    updatedAt: null,
  },
  features: {
    atmosphere: { enabled: true }
  },
  atmosphere: {
    masterClientUserId: null,
    activeMoodId: 'neutral',
    activePlaylistRef: null,
    autoFromCalendar: false,
    masterVolume: 1.0,
    paused: { isPaused: false, moodId: null, playlistRef: null },
    lastAppliedAt: null
  },
  time: {
    year: 1039,
    trimester: 1,
    week: 1,
    dayIndex: 0,
    slotIndex: 0,
    dayName: "Praiosstag",
    slotName: "Morgens",
    totalDaysPassed: 0,
    isHoliday: false,
  },
  academy: {
    currentLocationId: null,
    runtimeQueuedEvents: [],
    scoring: {
      circles: {},
      students: {},
      dailySnapshots: []
    },
    social: {
      relationships: {},
      livingEvents: { history: [], lastProcessedWeekKey: null },
      storyHooks: { records: {}, history: [] }
    },
    examResults: {},
    alumni: { records: {}, history: [] },
  },
  actors: { pcs: {}, npcs: {} },
  questStates: {},
  foundryLinks: {
    npcs: {}, pcs: {}, locations: {}, scenes: {}, playlists: {},
    items: {}, journals: {}, rollTables: {}, macros: {},
  },
  display: {
    beamerMode: false,
  },
});

/**
 * Format: [legacyPath, canonicalPath]
 * Used by JanusStateCore to redirect reads/writes during transition periods.
 */
export const LEGACY_PATH_ALIASES = Object.freeze([
  ['academy.quests', 'questStates'],
  ['scoring', 'academy.scoring'],
]);

/**
 * Internal helper to check for plain objects.
 */
function isPlainMap(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Migrates a state object to the current schema.
 * Note: Mutation is in-place, but deep clones are used where appropriate.
 * 
 * @param {Object} stateObj - The state data to normalize.
 * @param {Object} options - Migration options.
 * @returns {{changed: boolean, state: Object}}
 */
export function migrateStateSchema(stateObj) {
  if (!stateObj) return { changed: false, state: stateObj };
  let changed = false;

  const nowIso = () => new Date().toISOString();

  // 1. Cleanup transport wrappers
  for (const k of ['version', 'state', 'ui', 'changed', 'simulation']) {
    if (Object.prototype.hasOwnProperty.call(stateObj, k)) {
      delete stateObj[k];
      changed = true;
    }
  }

  // 2. Ensure base structure via non-destructive defaults
  const ensure = (path, defaultValue) => {
    const val = foundry.utils.getProperty(stateObj, path);
    if (val === undefined || val === null) {
      foundry.utils.setProperty(stateObj, path, foundry.utils.deepClone(defaultValue));
      changed = true;
    }
  };

  ensure('meta', DEFAULT_STATE.meta);
  ensure('time', DEFAULT_STATE.time);
  ensure('academy', DEFAULT_STATE.academy);
  ensure('questStates', {});

  // 3. Link legacy quest root if needed
  if (stateObj.academy?.quests && !Object.keys(stateObj.questStates).length) {
    stateObj.questStates = foundry.utils.deepClone(stateObj.academy.quests);
    delete stateObj.academy.quests;
    changed = true;
  }

  // 4. Version Alignment
  const currentVer = stateObj.meta.version;
  const targetVer = getModuleVersion();
  if (currentVer !== targetVer) {
    stateObj.meta.prevVersion = currentVer;
    stateObj.meta.version = targetVer;
    stateObj.meta.updatedAt = nowIso();
    changed = true;
  }

  return { changed, state: stateObj };
}
