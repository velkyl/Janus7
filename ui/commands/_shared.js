/**
 * @file ui/commands/_shared.js
 * @module janus7/ui/commands
 * @phase 6
 *
 * Shared helpers used by all command domain modules.
 */

import { MODULE_ID } from '../../core/common.js';
import { JanusUI } from '../helpers.js';
import { JanusPermissions } from '../permissions.js';

/** @returns {any} JANUS7 engine */
export function _engine() {
  return game?.janus7 ?? null;
}

/** @returns {import('../../core/logger.js').JanusLogger|Console} */
export function _log() {
  return _engine()?.core?.logger ?? console;
}

/** @param {any} v @param {number} fallback @returns {number} */
export function _toInt(v, fallback = 0) {
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : fallback;
}

/** @param {any} v @param {number} fallback @returns {number} */
export function _toNum(v, fallback = 0) {
  const n = Number(String(v));
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Confirmation dialog for time changes.
 * @param {string} message
 * @returns {Promise<boolean>}
 */
export async function _confirmTimeChange(message) {
  try {
    const result = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n?.localize?.('JANUS7.UI.TimeConfirm.Title') ?? 'Zeitänderung bestätigen' },
      content: `<p>${JanusUI.escape(message)}</p>`,
      yes: { label: game.i18n?.localize?.('Yes') ?? 'Ja' },
      no:  { label: game.i18n?.localize?.('No')  ?? 'Nein' },
      rejectClose: false,
    });
    return result === true;
  } catch {
    return false;
  }
}

/**
 * Standard error-catching wrapper for commands.
 * @param {string} label
 * @param {() => Promise<any>} fn
 * @returns {Promise<import('../commands.js').CommandResult>}
 */
export async function _wrap(label, fn) {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (err) {
    _log().error?.(`JANUS7 Command [${label}]`, err);
    ui.notifications?.error?.(
      game.i18n?.format?.('JANUS7.UI.CommandError', { label, error: err.message })
      ?? `JANUS7 [${label}]: ${err.message}`
    );
    return { success: false, error: err.message };
  }
}

/**
 * Permission check for a command action.
 * @param {string} action
 * @returns {boolean}
 */
export function _checkPermission(action) {
  if (!JanusPermissions.can(action, game.user)) {
    ui.notifications.error(
      game.i18n?.localize?.('JANUS7.UI.NoPermission.Action')
      ?? 'JANUS7: Keine Berechtigung für diese Aktion.'
    );
    return false;
  }
  return true;
}

export { JanusUI };
