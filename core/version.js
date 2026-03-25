/**
 * @file core/version.js
 * @module janus7
 * @phase 1
 *
 * Single source of truth (runtime) for version + schema.
 *
 * Notes:
 * - `module.json` remains the authoritative module version (Foundry loads it).
 * - `VERSION.json` exists for humans/docs/tooling. Runtime reads from Foundry.
 */

import { MODULE_ID } from './common.js';

/** @type {const} */
export const JANUS_SCHEMA_VERSION = '7.1';

/**
 * Get the currently loaded module version from Foundry.
 * @returns {string}
 */
export function getModuleVersion() {
  try {
    return game?.modules?.get?.(MODULE_ID)?.version ?? '0.0.0';
  } catch (_e) {
    return '0.0.0';
  }
}

/**
 * Runtime version info used across UI/diagnostics/state.
 */
export function getVersionInfo() {
  const version = getModuleVersion();
  return {
    module: MODULE_ID,
    version,
    schemaVersion: JANUS_SCHEMA_VERSION,
    foundry: String(game?.version ?? ''),
  };
}
