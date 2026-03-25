/**
 * @file core/guards/ui-write-guard.js
 * @module janus7/core/guards/ui-write-guard
 *
 * Dev-Guard: Warns when JanusStateCore write APIs are called *directly* from UI code.
 * This is NOT a security boundary; it is a developer safety net to prevent architecture drift.
 *
 * Strategy:
 * - Wrap a set of JanusStateCore mutating methods.
 * - Inspect the stack and warn only if the first external caller frame is inside `/ui/`.
 *
 * Note:
 * - Calls that originate in UI but go through engine APIs (academy/director/etc.) are OK.
 *   The guard tries to avoid false positives by only looking at the FIRST external caller.
 */

import { MODULE_ID } from '../common.js';

/**
 * Install a developer guard that warns when UI code calls mutating State methods directly.
 *
 * @param {object} params
 * @param {object} params.state - JanusStateCore instance
 * @param {object} params.logger - JanusLogger (optional; falls back to console)
 * @param {boolean} params.enabled - whether to install
 */
export function installUiWriteGuard({ state, logger = null, enabled = false } = {}) {
  if (!enabled) return;
  if (!state) return;

  const log = logger ?? console;
  const mutators = ['set', 'update', 'save', 'transaction', 'reset', 'importSnapshot'];

  const wrap = (methodName) => {
    const original = state[methodName];
    if (typeof original !== 'function') return;

    // Avoid double-wrapping
    if (original.__j7Wrapped) return;

    const wrapped = function (...args) {
      try {
        const stack = new Error().stack ?? '';
        const firstExternal = _firstExternalFrame(stack);
        if (firstExternal && firstExternal.includes('/ui/')) {
          log.warn?.(
            `${MODULE_ID}: UI write-guard tripped: core.state.${methodName} called from UI. ` +
            `Move this call behind an engine API (academy/director/etc.).`,
            { method: methodName, caller: firstExternal }
          );
        }
      } catch (_err) {
        // do not break gameplay due to guard issues
      }
      return original.apply(this, args);
    };

    wrapped.__j7Wrapped = true;
    state[methodName] = wrapped;
  };

  for (const m of mutators) wrap(m);
}

/**
 * Returns the first stack frame that is not inside core/state or the guard itself.
 * @param {string} stack
 * @returns {string|null}
 */
function _firstExternalFrame(stack) {
  const lines = String(stack).split('\n').map(l => l.trim()).filter(Boolean);

  // Typical format:
  // Error
  // at JanusStateCore.set (<janus7>/core/state.js:123:4)
  // at someCaller (<janus7>/ui/apps/...)
  for (const line of lines) {
    if (!line.startsWith('at ')) continue;

    const lower = line.toLowerCase();
    // ignore frames from state core and this guard
    if (lower.includes('/core/state') || lower.includes('/core/guards/ui-write-guard')) continue;
    return line;
  }
  return null;
}
