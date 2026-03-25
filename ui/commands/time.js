/**
 * @file ui/commands/time.js
 * @module janus7/ui/commands
 * @phase 6
 *
 * Zeit-Commands: Kalender-Fortschritt und Slot-Steuerung via Director.
 * Alle Mutationen gehen über director.time (kein direktes state.set im UI-Layer).
 * GM-only (Permission-Check via _checkPermission in _wrap).
 */
import { _checkPermission, _engine, _wrap } from './_shared.js';

function _int(v, fallback = 1) {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function _director() {
  const engine = _engine();
  const director = engine?.director;
  if (!director) throw new Error('JANUS7 director not available');
  return director;
}

async function _advanceMany(method, amount) {
  const director = _director();
  const n = Math.max(1, _int(amount, 1));
  for (let i = 0; i < n; i++) {
    // Avoid saving on every tick; we save once at the end.
    await director.time[method]({ save: false });
  }
  await director.saveState({ reason: `time.${method}` });
  const engine = _engine();
  return engine?.calendar?.getCurrentSlotRef?.() ?? null;
}

/**
 * Time / Calendar commands.
 *
 * IMPORTANT:
 * - UI must never call core.state.save() directly.
 * - Use the Director facade, which performs mutations + persistence.
 */
export const timeCommands = {
  /** Advance one or more slots. dataset.amount defaults to 1. */
  advanceSlot: (dataset = {}) => _wrap('time.advanceSlot', async () => {
    if (!_checkPermission('time.advanceSlot')) return { success: false, cancelled: true };
    const ref = await _advanceMany('advanceSlot', dataset.amount);
    return { success: true, result: ref };
  }),

  /** Advance one or more phases. dataset.amount defaults to 1. */
  advancePhase: (dataset = {}) => _wrap('time.advancePhase', async () => {
    if (!_checkPermission('time.advancePhase')) return { success: false, cancelled: true };
    const ref = await _advanceMany('advancePhase', dataset.amount);
    return { success: true, result: ref };
  }),

  /** Advance one or more days. dataset.amount defaults to 1. */
  advanceDay: (dataset = {}) => _wrap('time.advanceDay', async () => {
    if (!_checkPermission('time.advanceDay')) return { success: false, cancelled: true };
    const ref = await _advanceMany('advanceDay', dataset.amount);
    return { success: true, result: ref };
  }),

  /** Set an explicit slot (dayIndex + slotIndex). */
  setSlot: (dataset = {}) => _wrap('time.setSlot', async () => {
    if (!_checkPermission('time.setSlot')) return { success: false, cancelled: true };
    const dayIndex = _int(dataset.dayIndex, 0);
    const slotIndex = _int(dataset.slotIndex, 0);
    const offsetWorldTime = String(dataset.offsetWorldTime ?? 'false') === 'true';
    const director = _director();
    await director.time.setSlot(dayIndex, slotIndex, { offsetWorldTime, save: true });
    const engine = _engine();
    const ref = engine?.calendar?.getCurrentSlotRef?.() ?? null;
    return { success: true, result: ref };
  }),

  /** Reset calendar to defaults. */
  resetCalendar: (dataset = {}) => _wrap('time.resetCalendar', async () => {
    if (!_checkPermission('time.resetCalendar')) return { success: false, cancelled: true };
    const director = _director();
    await director.time.resetCalendar({ save: true });
    const engine = _engine();
    const ref = engine?.calendar?.getCurrentSlotRef?.() ?? null;
    return { success: true, result: ref };
  }),
  syncCalendar: (dataset = {}) => _wrap('time.syncCalendar', async () => {
    if (!_checkPermission('time.syncCalendar')) return { success: false, cancelled: true };

    const director = _director();
    // Sync: push current JANUS7 time state to Foundry worldTime via director.saveState
    // This persists the time slot so that SimpleCalendar / world-time-based modules stay aligned.
    try {
      await director.saveState({ reason: 'syncCalendar', force: true });
      ui.notifications.info('JANUS7: Kalender synchronisiert.');
      return { success: true };
    } catch (err) {
      ui.notifications.error('JANUS7: Kalender-Sync fehlgeschlagen.');
      throw err;
    }
  }),

};
