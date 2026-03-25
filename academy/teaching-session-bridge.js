/**
 * @file academy/teaching-session-bridge.js
 * @module janus7
 * @phase 2
 *
 * Zweck:
 *  Pure Helper-Funktionen, um das JANUS Slot-/Kalendermodell mit Teaching-Sessions
 *  (calendar-template.json / teaching-sessions.json) zu verbinden.
 *
 * Wichtige Regeln:
 *  - KEINE Foundry-Dependencies
 *  - Keine Abhängigkeiten zu Phasen > 2
 */

/**
 * Normalisiert einen aventurischen Tagesnamen (oder bereits einen Wochentag)
 * auf einen TeachingSessions-Tag (MONDAY..SUNDAY).
 *
 * Akzeptiert u.a.:
 * - Praiosstag / Praios / Monday / MONDAY
 * - Rondratag / Rondra / Tuesday / TUESDAY
 * - Efferdstag / Efferd / Wednesday / WEDNESDAY
 * - Travia(tag) / Travia / Thursday / THURSDAY
 * - Boron(tag) / Boron / Friday / FRIDAY
 * - Hesindetag / Hesind(e) / Saturday / SATURDAY
 * - Firunstag / Firun / Sunday / SUNDAY
 *
 * @param {string|number} day
 * @returns {string|null}
 */
export function normalizeAventurianDayToWeekday(day) {
  if (day === undefined || day === null) return null;
  const raw = String(day).trim();
  if (!raw) return null;
  const up = raw.toUpperCase();

  // Already a weekday?
  const weekdays = new Set(['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY']);
  if (weekdays.has(up)) return up;

  // English / common aliases
  const en = {
    MON: 'MONDAY', MONDAY: 'MONDAY',
    TUE: 'TUESDAY', TUESDAY: 'TUESDAY',
    WED: 'WEDNESDAY', WEDNESDAY: 'WEDNESDAY',
    THU: 'THURSDAY', THURSDAY: 'THURSDAY',
    FRI: 'FRIDAY', FRIDAY: 'FRIDAY',
    SAT: 'SATURDAY', SATURDAY: 'SATURDAY',
    SUN: 'SUNDAY', SUNDAY: 'SUNDAY',
  };
  if (en[up]) return en[up];

  // Aventurian
  const a = raw.replace(/\s+/g, '').toLowerCase();
  const map = {
    praiosstag: 'MONDAY', praios: 'MONDAY',
    rondratag: 'TUESDAY', rondra: 'TUESDAY',
    efferdstag: 'WEDNESDAY', efferd: 'WEDNESDAY',
    traviatag: 'THURSDAY', travia: 'THURSDAY',
    boronstag: 'FRIDAY', boron: 'FRIDAY',
    hesindetag: 'SATURDAY', hesinde: 'SATURDAY',
    firunstag: 'SUNDAY', firun: 'SUNDAY',
  };
  return map[a] ?? null;
}

/**
 * Mappt einen JANUS-Kalender-Phase/Slot-Label (z.B. "Zeitslot 2")
 * auf einen TeachingSessions-SlotId (TS_0800_1000 ...).
 *
 * @param {string} phase
 * @returns {string|null}
 */
export function mapCalendarPhaseToTeachingSlotId(phase) {
  if (phase === undefined || phase === null) return null;
  const raw = String(phase).trim();
  if (!raw) return null;

  // Already a TS_* slot?
  if (/^TS_\d{4}_\d{4}$/i.test(raw)) return raw.toUpperCase();

  const norm = raw.replace(/\s+/g, '').replace(/_/g, '').toLowerCase();

  // Minimal bridge as agreed in the handover:
  // - Zeitslot 2..4 map to TS 08-16h (template has 4 slots)
  // - Mittagessen maps to TS_1200_1400 (often break)
  const map = {
    zeitslot2: 'TS_0800_1000',
    zeitslot3: 'TS_1000_1200',
    mittagessen: 'TS_1200_1400',
    mittagspause: 'TS_1200_1400',
    zeitslot4: 'TS_1400_1600',
  };
  return map[norm] ?? null;
}

/**
 * Inverse Mapping: Teaching SlotId -> bevorzugter JANUS-Phase Label.
 * @param {string} slotId
 * @returns {string|null}
 */
export function mapTeachingSlotIdToCalendarPhase(slotId) {
  if (!slotId) return null;
  const up = String(slotId).trim().toUpperCase();
  const map = {
    TS_0800_1000: 'Zeitslot 2',
    TS_1000_1200: 'Zeitslot 3',
    TS_1200_1400: 'Mittagessen',
    TS_1400_1600: 'Zeitslot 4',
  };
  return map[up] ?? null;
}

/**
 * Small helper: choose a phase string that exists in the current slotOrder.
 * @param {string[]} slotOrder
 * @param {string[]} candidates
 * @returns {string|null}
 */
export function chooseExistingPhase(slotOrder, candidates) {
  if (!Array.isArray(slotOrder) || slotOrder.length === 0) return candidates?.[0] ?? null;
  for (const c of candidates ?? []) {
    if (slotOrder.includes(c)) return c;
  }
  return candidates?.[0] ?? null;
}
