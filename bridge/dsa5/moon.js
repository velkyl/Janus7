import { emitHook, HOOKS } from '../../core/hooks/emitter.js';
/**
 * @file bridge/dsa5/moon.js
 * @module janus7/bridge/dsa5
 * @phase 3
 *
 * Zweck:
 *   DSA5MoonBridge: Mondphasen-API für die Akademie-Simulation.
 *   Liest aktuelle Mada-Mondphase aus DSAWorldCalendar und berechnet
 *   akademisch relevante Effekte (Unterrichtsmodifikatoren, Astralenergie).
 *
 * DSA5 Mada-Mondphasen (aus DSAKalender.moon.values, Zyklus 28 Tage):
 *
 *   Index  Name                 Tage    lightAdjust  Akademisch
 *   ──────────────────────────────────────────────────────────────
 *   0      ToteMada             1       0.00         Neumond — Nachtmagierbonus
 *   1      AuffuellenderKelch   6       0.25         Zunehmend
 *   2      Kelch                1       0.50         Halbmond
 *   3      ZunehmendesRad       6       0.75         Zunehmend
 *   4      Rad                  1       1.00         Vollmond — Astralbonus
 *   5      AbnehmendesRad       6       0.75         Abnehmend
 *   6      Helm                 1       0.50         Halbmond
 *   7      AbnehmenderHelm      6       0.25         Abnehmend
 *
 *   Anker: Jahr 1040, Monat 3 (Efferd), Tag 1
 *   Zyklus: 28 Tage exakt
 *
 * Primäre API:
 *   game.time.calendar.timeToComponents(game.time.worldTime)
 *   → { moon: { phase: {name, dayStart, lightAdjust}, dayInCycle, phaseIndex, ... } }
 *
 * Architektur:
 *   - Kein Import aus dsa5-Modulen.
 *   - MOON_PHASES-Konstante ist SSOT und spiegelt DSAKalender.moon.values exakt.
 *   - Fallback wenn Kalender nicht aktiv: Null-Phase zurückgeben.
 *   - Akademische Modifikatoren kommen aus moon-modifiers.json (SSOT).
 */

// ─── Mondphasen-Konstanten (aus DSAKalender.moon.values) ────────────────────

/**
 * Alle 8 Mada-Mondphasen, exakt wie in DSAKalender.moon.values.
 * Zusätzlich: `durationDays` (Dauer) und `academicCategory` für Unterrichtslogik.
 * @type {MoonPhaseDefinition[]}
 *
 * @typedef {Object} MoonPhaseDefinition
 * @property {string} name             - DSA5-interner Name (Übersetzungskey)
 * @property {number} dayStart         - Ab Tag im Zyklus (0-27)
 * @property {number} lightAdjust      - Lichtanteil (0.0=Neumond, 1.0=Vollmond)
 * @property {number} durationDays     - Dauer dieser Phase
 * @property {string} academicCategory - Akademische Kategorie (newmoon|waxing|fullmoon|waning)
 */
export const MOON_PHASES = Object.freeze([
  { name: 'ToteMada',          dayStart: 0,  lightAdjust: 0.00, durationDays: 1, academicCategory: 'newmoon'  },
  { name: 'AuffuellenderKelch',dayStart: 1,  lightAdjust: 0.25, durationDays: 6, academicCategory: 'waxing'   },
  { name: 'Kelch',             dayStart: 7,  lightAdjust: 0.50, durationDays: 1, academicCategory: 'waxing'   },
  { name: 'ZunehmendesRad',    dayStart: 8,  lightAdjust: 0.75, durationDays: 6, academicCategory: 'waxing'   },
  { name: 'Rad',               dayStart: 14, lightAdjust: 1.00, durationDays: 1, academicCategory: 'fullmoon' },
  { name: 'AbnehmendesRad',    dayStart: 15, lightAdjust: 0.75, durationDays: 6, academicCategory: 'waning'   },
  { name: 'Helm',              dayStart: 21, lightAdjust: 0.50, durationDays: 1, academicCategory: 'waning'   },
  { name: 'AbnehmenderHelm',   dayStart: 22, lightAdjust: 0.25, durationDays: 6, academicCategory: 'waning'   },
]);

/** Vollständiger Mondphasenzyklus in Tagen */
export const MOON_CYCLE_DAYS = 28;

/** Phasenindex für Vollmond (Rad) */
export const FULL_MOON_INDEX = 4;

/** Phasenindex für Neumond (ToteMada) */
export const NEW_MOON_INDEX = 0;

// ─── Haupt-Klasse ─────────────────────────────────────────────────────────────

export class DSA5MoonBridge {
  /**
   * @param {object} [deps]
   * @param {Console} [deps.logger]
   */
  constructor({ logger } = {}) {
    this.logger = logger ?? console;
  }

  // ─── Aktuelle Phase lesen ─────────────────────────────────────────────────

  /**
   * Gibt die aktuelle Mondphase zurück.
   * Liest direkt aus `game.time.calendar.timeToComponents()`.
   *
   * @returns {MoonStatus|null}  - null wenn Kalender nicht verfügbar
   *
   * @typedef {Object} MoonStatus
   * @property {string} name              - DSA5-Name ('ToteMada', 'Rad', ...)
   * @property {number} phaseIndex        - 0-7
   * @property {number} lightAdjust       - 0.0–1.0
   * @property {number} dayInCycle        - 0–27 (Tag im Zyklus)
   * @property {number} daysUntilFullMoon - Tage bis Vollmond (0 = heute)
   * @property {number} daysUntilNewMoon  - Tage bis Neumond (0 = heute)
   * @property {string} academicCategory  - 'newmoon'|'waxing'|'fullmoon'|'waning'
   * @property {boolean} isFullMoon
   * @property {boolean} isNewMoon
   *
   * @example
   * const moon = bridge.moon.getCurrentMoonStatus();
   * if (moon?.isFullMoon) {
   *   console.log('Vollmond — Mondmagie-Unterricht erhält Bonus!');
   * }
   */
  getCurrentMoonStatus(worldTime = null) {
    const components = this._getComponents(worldTime);
    if (!components?.moon) return null;

    const { phase, phaseIndex, dayInCycle } = components.moon;
    const def = MOON_PHASES[phaseIndex] ?? MOON_PHASES[0];

    return {
      name:              phase.name ?? def.name,
      phaseIndex,
      lightAdjust:       Number(phase.lightAdjust ?? def.lightAdjust),
      dayInCycle:        Number(dayInCycle),
      academicCategory:  def.academicCategory,
      isFullMoon:        phaseIndex === FULL_MOON_INDEX,
      isNewMoon:         phaseIndex === NEW_MOON_INDEX,
      daysUntilFullMoon: this._daysUntil(dayInCycle, MOON_PHASES[FULL_MOON_INDEX].dayStart),
      daysUntilNewMoon:  this._daysUntil(dayInCycle, MOON_PHASES[NEW_MOON_INDEX].dayStart),
    };
  }

  /**
   * Gibt die aktuelle Mondphase als einfachen String zurück.
   * Nützlich für Logging und Control Panel.
   *
   * @returns {string}  - z.B. 'Rad (Vollmond)', 'ToteMada (Neumond)', 'AuffuellenderKelch'
   *
   * @example
   * console.log(bridge.moon.getMoonPhaseName());
   * // → 'Rad (Vollmond)'
   */
  getMoonPhaseName() {
    const status = this.getCurrentMoonStatus();
    if (!status) return 'unbekannt (Kalender inaktiv)';
    const suffix = status.isFullMoon ? ' (Vollmond)' : status.isNewMoon ? ' (Neumond)' : '';
    return `${status.name}${suffix}`;
  }

  // ─── Akademische Unterrichtsmodifikatoren ────────────────────────────────

  /**
   * Gibt den Mondphasen-Modifikator für eine bestimmte Unterrichtsart zurück.
   * Modifikatoren kommen aus `moon-modifiers.json` (SSOT).
   *
   * @param {string}   lessonType  - Lektionstyp aus lesson.type (z.B. 'arcanology', 'magic_practice')
   * @param {object}  [modifiers]  - Geladene moon-modifiers.json (alternativ: this._modifiers)
   * @returns {MoonModifier}
   *
   * @typedef {Object} MoonModifier
   * @property {number}  fpBonus        - FP-Bonus für Würfelwürfe dieser Lektion
   * @property {number}  qsBonus        - QS-Bonus nach bestandener Probe
   * @property {number}  scoringBonus   - Bonus-Punkte im JANUS7-Scoring
   * @property {string}  description    - Menschenlesbare Erklärung
   * @property {boolean} isActive       - true wenn Modifikator ≠ 0
   *
   * @example
   * const mod = bridge.moon.getLessonModifier('arcanology');
   * // Beim Vollmond: { fpBonus: 2, qsBonus: 1, scoringBonus: 5, isActive: true }
   */
  getLessonModifier(lessonType, modifiers) {
    const mods = modifiers ?? this._modifiers;
    const status = this.getCurrentMoonStatus();

    if (!status || !mods) {
      return { fpBonus: 0, qsBonus: 0, scoringBonus: 0, description: '', isActive: false };
    }

    const category = status.academicCategory;
    const typeEntry = mods.lessonModifiers?.[lessonType];
    const catEntry  = typeEntry?.[category] ?? typeEntry?.['default'];
    const global    = mods.globalModifiers?.[category];

    const fpBonus     = Number(catEntry?.fpBonus ?? global?.fpBonus ?? 0);
    const qsBonus     = Number(catEntry?.qsBonus ?? global?.qsBonus ?? 0);
    const scoringBonus= Number(catEntry?.scoringBonus ?? global?.scoringBonus ?? 0);
    const description = catEntry?.description ?? global?.description ?? '';

    return {
      fpBonus,
      qsBonus,
      scoringBonus,
      description,
      isActive: fpBonus !== 0 || qsBonus !== 0 || scoringBonus !== 0,
    };
  }

  /**
   * Lädt moon-modifiers.json in den internen Cache.
   * Muss einmal beim Initialisieren aufgerufen werden.
   *
   * @param {object|string} modifiers - Bereits geparste JSON oder URL-Pfad
   * @returns {Promise<void>}
   *
   * @example
   * await bridge.moon.loadModifiers(moduleAssetPath('data/academy/moon-modifiers.json'));
   */
  async loadModifiers(modifiers) {
    if (typeof modifiers === 'string') {
      try {
        const resp = await fetch(modifiers);
        this._modifiers = await resp.json();
        this.logger?.info?.(`JANUS7 | Moon | Modifikatoren geladen: ${modifiers}`);
      } catch (err) {
        this.logger?.warn?.(`JANUS7 | Moon | loadModifiers fehlgeschlagen: ${err?.message}`);
      }
    } else {
      this._modifiers = modifiers;
    }
  }

  // ─── Zukunftsplanung ─────────────────────────────────────────────────────

  /**
   * Gibt die nächsten N Mondphasen-Wechsel zurück.
   * Nützlich für Unterrichtsplanung (wann ist der nächste Vollmond?).
   *
   * @param {number} [count=4]  - Anzahl der zurückzugebenden Phasenwechsel
   * @returns {UpcomingPhase[]}
   *
   * @typedef {Object} UpcomingPhase
   * @property {string} name
   * @property {number} inDays     - Tage ab heute
   * @property {number} phaseIndex
   * @property {string} academicCategory
   * @property {number} lightAdjust
   *
   * @example
   * const upcoming = bridge.moon.getUpcomingPhases(4);
   * // → [{ name: 'ZunehmendesRad', inDays: 2, phaseIndex: 3, ... }, ...]
   */
  getUpcomingPhases(count = 4) {
    const status = this.getCurrentMoonStatus();
    if (!status) return [];

    const results = [];
    const dayInCycle = status.dayInCycle;

    // Alle 8 Phasen durchlaufen, ggf. zwei Zyklen um genug zu finden
    for (let cycle = 0; cycle <= 1 && results.length < count; cycle++) {
      for (const phase of MOON_PHASES) {
        if (results.length >= count) break;
        const phaseDay = phase.dayStart + cycle * MOON_CYCLE_DAYS;
        const inDays = phaseDay - dayInCycle;
        if (inDays <= 0) continue; // Bereits vergangen in diesem Zyklus

        results.push({
          name:             phase.name,
          inDays,
          phaseIndex:       MOON_PHASES.indexOf(phase),
          academicCategory: phase.academicCategory,
          lightAdjust:      phase.lightAdjust,
        });
      }
    }

    return results.slice(0, count);
  }

  /**
   * Gibt den nächsten Vollmond zurück.
   * @returns {{ inDays: number, dayInCycle: number }|null}
   *
   * @example
   * const { inDays } = bridge.moon.getNextFullMoon();
   * console.log(`Nächster Vollmond in ${inDays} Tagen`);
   */
  getNextFullMoon() {
    const status = this.getCurrentMoonStatus();
    if (!status) return null;
    if (status.isFullMoon) return { inDays: 0, dayInCycle: MOON_PHASES[FULL_MOON_INDEX].dayStart };
    return { inDays: status.daysUntilFullMoon, dayInCycle: MOON_PHASES[FULL_MOON_INDEX].dayStart };
  }

  /**
   * Gibt den nächsten Neumond zurück.
   * @returns {{ inDays: number }|null}
   */
  getNextNewMoon() {
    const status = this.getCurrentMoonStatus();
    if (!status) return null;
    if (status.isNewMoon) return { inDays: 0 };
    return { inDays: status.daysUntilNewMoon };
  }

  // ─── Astralenergie-Modifikator ────────────────────────────────────────────

  /**
   * Gibt den mondphasenbasierten Astralenergie-Regenerationsbonus zurück.
   * Basis: lightAdjust aus DSA5-Mondphase, skaliert auf akademischen Bonus.
   *
   * Akademische Regel (JANUS7-Hausregel):
   *   lightAdjust 1.0 (Vollmond) → +2 AsP/Schritt
   *   lightAdjust 0.75           → +1 AsP/Schritt
   *   lightAdjust 0.5            → +0
   *   lightAdjust 0.25           → -0 (neutral, nicht bestrafend)
   *   lightAdjust 0.0 (Neumond)  → +1 für Dunkelmagier (Sonderregel)
   *
   * @param {boolean} [isDarkMage=false]  - Aktiv für Tradition der Dunkelheit
   * @returns {{ aspBonus: number, description: string }}
   *
   * @example
   * const { aspBonus } = bridge.moon.getAstralEnergyModifier();
   * // Beim Vollmond: { aspBonus: 2, description: 'Vollmond steigert Astralfluss (+2 AsP)' }
   */
  getAstralEnergyModifier(isDarkMage = false) {
    const status = this.getCurrentMoonStatus();
    if (!status) return { aspBonus: 0, description: '' };

    const { lightAdjust, isFullMoon, isNewMoon } = status;

    if (isDarkMage && isNewMoon) {
      return { aspBonus: 2, description: 'Tote Mada stärkt Dunkelmagie (+2 AsP)' };
    }
    if (isFullMoon)          return { aspBonus: 2, description: 'Vollmond steigert Astralfluss (+2 AsP)' };
    if (lightAdjust >= 0.75) return { aspBonus: 1, description: 'Zunehmender Mond (+1 AsP)' };
    return { aspBonus: 0, description: '' };
  }

  // ─── Hook-Unterstützung ───────────────────────────────────────────────────

  /**
   * Registriert Hook für Mondphasenwechsel.
   * Feuert `janus7MoonPhaseChanged` wenn sich die Phase ändert.
   */
  register() {
    this._lastPhaseIndex = this.getCurrentMoonStatus()?.phaseIndex ?? -1;
    // Hook-Centralization: kein direktes Hooks.on('updateWorldTime') hier.
    // Delegation erfolgt via janus.mjs -> engine.bridge.dsa5.moon.onWorldTimeUpdated()
    this.logger?.info?.('JANUS7 | Moon | Initialisiert (Delegation via janus.mjs)');
  }

  /**
   * Wird von janus.mjs delegiert wenn updateWorldTime feuert.
   * Erkennt Mondphasenwechsel und emittiert HOOKS.MOON_PHASE_CHANGED.
   * @param {number} worldTime
   */
  onWorldTimeUpdated(worldTime) {
    const current = this.getCurrentMoonStatus(worldTime);
    if (!current) return;
    if (current.phaseIndex !== this._lastPhaseIndex) {
      this.logger?.info?.(`JANUS7 | Moon | Phasenwechsel: ${current.name}`);
      emitHook(HOOKS.MOON_PHASE_CHANGED, current);
      this._lastPhaseIndex = current.phaseIndex;
    }
  }

  unregister() {
    this._lastPhaseIndex = -1;
  }

  // ─── Diagnostik ──────────────────────────────────────────────────────────

  /**
   * Gibt den kompletten components.moon-Block zurück (für Debugging).
   * @returns {object|null}
   */
  getRawMoonData() {
    const components = this._getComponents();
    return components?.moon ?? null;
  }

  /**
   * Gibt Zusammenfassung aller Mondphasen-Daten zurück.
   * Nützlich für Control Panel und Beamer-Anzeige.
   *
   * @returns {MoonSummary|null}
   *
   * @typedef {Object} MoonSummary
   * @property {MoonStatus}       current
   * @property {UpcomingPhase[]}  upcoming
   * @property {{ aspBonus: number, description: string }} astralModifier
   * @property {MoonModifier|null} lessonModifier  - null wenn kein Typ angegeben
   *
   * @example
   * const summary = bridge.moon.getMoonSummary();
   * console.table(summary.upcoming);
   */
  getMoonSummary(lessonType = null) {
    const current = this.getCurrentMoonStatus();
    if (!current) return null;

    return {
      current,
      upcoming:        this.getUpcomingPhases(4),
      astralModifier:  this.getAstralEnergyModifier(),
      lessonModifier:  lessonType ? this.getLessonModifier(lessonType) : null,
    };
  }

  // ─── Privat ───────────────────────────────────────────────────────────────

  /**
   * Liest game.time.calendar.timeToComponents(worldTime) sicher.
   * @private
   */
  _getComponents(worldTime = null) {
    try {
      const calendar = game?.time?.calendar;
      if (!calendar?.timeToComponents) return null;
      const t = (worldTime != null) ? worldTime : game.time.worldTime;
      return calendar.timeToComponents(t);
    } catch (err) {
      this.logger?.warn?.('JANUS7 | Moon | timeToComponents fehlgeschlagen', err?.message);
      return null;
    }
  }

  /**
   * Berechnet Tage bis eine bestimmte Zyklusposition wieder erreicht wird.
   * @param {number} currentDay  - Aktueller Tag im Zyklus (0-27)
   * @param {number} targetDay   - Ziel-Tag im Zyklus (0-27)
   * @returns {number}
   * @private
   */
  _daysUntil(currentDay, targetDay) {
    if (currentDay === targetDay) return 0;
    const diff = targetDay - currentDay;
    return diff > 0 ? diff : diff + MOON_CYCLE_DAYS;
  }
}
