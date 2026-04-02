/**
 * Gemeinsame Konstanten für JANUS7.
 */
export const MODULE_ID = 'Janus7';
/**
 * Short module label used in logs and compact UI contexts.
 *
 * @type {string}
 */
export const MODULE_ABBREV = 'JANUS7';
/**
 * Human-readable module title used in diagnostics and UI labels.
 *
 * @type {string}
 */
export const MODULE_TITLE = 'JANUS7 Engine';


/**
 * Aventurian calendar constants for the Punin Academy setting.
 * BF = Bosparanische Zeitrechnung (year 1039 BF = campaign start year).
 */
export const AVENTURIAN_CALENDAR = Object.freeze({
  /** Default campaign start year (1039 BF — Punin Academy arc). */
  DEFAULT_START_YEAR: 1039,
  TRIMESTERS_PER_YEAR: 3,
  WEEKS_PER_TRIMESTER: 4,
});

/**
 * Kanonische State-Pfade für häufig genutzte JANUS7-Subtrees.
 * Reduziert Magic Strings in Hotpaths.
 */
export const STATE_PATHS = Object.freeze({
  TIME: 'time',
  TIME_YEAR: 'time.year',
  TIME_TRIMESTER: 'time.trimester',
  TIME_WEEK: 'time.week',
  TIME_DAY_INDEX: 'time.dayIndex',
  TIME_SLOT_INDEX: 'time.slotIndex',
  TIME_DAY_NAME: 'time.dayName',
  TIME_SLOT_NAME: 'time.slotName',
  SCORING: 'academy.scoring',
  SCORING_DAILY_SNAPSHOTS: 'academy.scoring.dailySnapshots',
  ACADEMY: 'academy',
  ACADEMY_ROSTER: 'academy.roster',
  ACADEMY_SLOT_JOURNALS: 'academy.slotJournals',
  ACADEMY_QUESTS: 'academy.quests',
  ACADEMY_SOCIAL: 'academy.social',
  ACADEMY_JOURNAL_ENTRIES: 'academy.journalEntries',
  ACADEMY_EXAM_RESULTS: 'academy.examResults',
  PLAYER_STATE: 'playerState',
  QUEST_STATES: 'questStates',
  EVENT_STATES: 'eventStates'
});


import { JanusAssetResolver } from './services/asset-resolver.js';

/**
 * Resolve a module-local asset path against the currently loaded JANUS7 module id.
 * Keeps runtime paths centralized and avoids scattered hard-coded strings.
 * @param {string} relativePath
 * @returns {string}
 */
export function moduleAssetPath(relativePath = '') {
  return JanusAssetResolver.asset(relativePath);
}

/**
 * Convenience wrapper for module-local Handlebars templates.
 * @param {string} relativePath
 * @returns {string}
 */
export function moduleTemplatePath(relativePath = '') {
  return JanusAssetResolver.template(relativePath);
}

/**
 * Load a JSON file from the active JANUS7 module folder.
 * @param {string} relativePath
 * @returns {Promise<unknown>}
 */
export async function fetchModuleJson(relativePath) {
  const url = moduleAssetPath(relativePath);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch module JSON (${response.status}): ${url}`);
  }
  return response.json();
}
