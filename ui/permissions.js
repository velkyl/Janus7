/**
 * @file ui/permissions.js
 * @module janus7
 * @phase 6
 *
 * Permissions-Matrix für UI-Commands.
 *
 * Sprint-2 Ziel: MVP complete.
 * - GM darf alles.
 * - Trusted darf Debug-ReadOnly (State Export + Diagnostics).
 * - Player sieht i.d.R. nur Status (optional Diagnostics kopieren).
 */

import { MODULE_ID } from '../core/common.js';

/**
 * @typedef {'gm'|'trusted'|'player'|'none'} J7Role
 */

/**
 * @private
 * @param {User|null|undefined} user
 * @returns {J7Role}
 */
function _role(user) {
  if (!user) return 'none';
  if (user.isGM) return 'gm';
  // Foundry: trusted players have role >= CONST.USER_ROLES.TRUSTED.
  try {
    const trusted = CONST?.USER_ROLES?.TRUSTED ?? 2;
    if ((user.role ?? 0) >= trusted) return 'trusted';
  } catch {
    // ignore
  }
  return 'player';
}

/**
 * Konservative Whitelist für Nicht-GM.
 * (UI deaktiviert Tabs ohnehin, aber wir sichern serverseitig/commandseitig ab.)
 */
// Actions, die ein normaler Player ausführen darf.
const PLAYER_ALLOWED = new Set([
  // Debug/Read-only Utilities
  'copyDiagnostics',
  // Client-side UI preferences
  'toggleHighContrast'
]);

// Trusted darf zusätzlich State exportieren (für Bugreports/Backups), aber keine Mutationen.
const TRUSTED_ALLOWED = new Set([
  ...PLAYER_ALLOWED,
  'exportState'
]);

export const JanusPermissions = {
  /**
   * Prüft, ob `user` die `action` ausführen darf.
   * @param {string} action
   * @param {User} user
   */
  can(action, user) {
    const r = _role(user);
    if (r === 'gm') return true;
    if (r === 'trusted') return TRUSTED_ALLOWED.has(action);
    if (r === 'player') return PLAYER_ALLOWED.has(action);
    return false;
  },

  /**
   * Tab-Policy (UI).
   * @param {'status'|'time'|'atmo'|'debug'} tabId
   * @param {User} user
   */
  canTab(tabId, user) {
    const r = _role(user);
    if (r === 'gm') return true;
    if (tabId === 'status') return true;
    if (tabId === 'debug') return r === 'trusted' || r === 'player';
    return false;
  },

  /**
   * Für Debug/Logs.
   * @param {User} user
   */
  role(user) {
    return _role(user);
  }
};

export default JanusPermissions;
