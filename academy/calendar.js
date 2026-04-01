import { STATE_PATHS } from '../core/common.js';
/**
 * @file academy/calendar.js
 * @module janus7
 * @phase 4
 *
 * Zweck:
 *  JanusCalendarEngine: zentrale Kalender- und Zeitlogik der Akademie.
 *
 * Architektur:
 *  - Mutiert ausschließlich JanusStateCore.time über dessen API.
 *  - Liest Kalender-/Eventdaten ausschließlich über AcademyDataApi.
 *  - Kein direkter Zugriff auf DSA5-Systemobjekte oder Foundry-UI.
 */

import { MODULE_ABBREV } from '../core/common.js';
import { emitHook, HOOKS } from '../core/hooks/emitter.js';

/**
 * @typedef {Object} DayRef
 * @property {number} year
 * @property {number} trimester
 * @property {number} week
 * @property {string} day
 */

/**
 * @typedef {DayRef & { phase: string }} SlotRef
 */

/**
 * @typedef {import('../core/state.js').JanusStateCore} JanusStateCore
 * @typedef {import('./data-api.js').AcademyDataApi} AcademyDataApi
 * @typedef {import('../core/logger.js').JanusLogger} JanusLogger
 */

export class JanusCalendarEngine {
  /**
   * @param {Object} deps
   * @param {JanusStateCore} deps.state
   * @param {AcademyDataApi} deps.academyData
   * @param {JanusLogger} deps.logger
   * @param {Object} [deps.config]
   * @param {string[]} [deps.config.phaseOrder] - Reihenfolge der Tagesphasen
   * @param {string[]} [deps.config.dayOrder]   - Reihenfolge der Wochentage
   */
  constructor({ state, academyData, logger, config = {} }) {
    if (!state) {
      throw new Error(`${MODULE_ABBREV}: JanusCalendarEngine benötigt einen JanusStateCore (deps.state).`);
    }
    if (!academyData) {
      throw new Error(`${MODULE_ABBREV}: JanusCalendarEngine benötigt AcademyDataApi (deps.academyData).`);
    }

    /** @type {JanusStateCore} */
    this.state = state;
    /** @type {AcademyDataApi} */
    this.academyData = academyData;
    /** @type {JanusLogger|Console} */
    this.logger = logger ?? console;

    // Kalender-Konfiguration:
    //  - Phase-/Tagesreihenfolge kann über config.* oder calendar-template.json (AcademyDataApi) kommen.
    //  - Wochen-/Trimester-/Jahresrollover wird über weeksPerTrimester / trimestersPerYear gesteuert.
    const templateConfig = this.academyData.getCalendarConfig?.() ?? {};
    const mergedConfig = { ...templateConfig, ...config };

    // Phase 6+ nutzt ein Slotmodell (10-Block-Tag). Wir halten legacy "phaseOrder" weiter,
    // aber behandeln es intern als slotOrder.
    const defaultSlotOrder = [
      'Morgens',
      'Frühstück',
      'Zeitslot 2',
      'Zeitslot 3',
      'Mittagessen',
      'Zeitslot 4',
      'Zeitslot 5',
      'Abendessen',
      'Zeitslot 6',
      'Nacht'
    ];

    this.config = {
      // legacy
      phaseOrder: mergedConfig.phaseOrder ?? mergedConfig.slotOrder ?? defaultSlotOrder,
      // canonical
      // IMPORTANT: slotOrder is the Phase-6+ SSOT. We must not silently derive it from legacy
      // phaseOrder (which in older data sets is often just a coarse 6-phase day).
      slotOrder: mergedConfig.slotOrder ?? defaultSlotOrder,
      dayOrder:
        mergedConfig.dayOrder ??
        ['Praiosstag', 'Rondra', 'Efferdstag', 'Traviatag', 'Boronstag', 'Hesindetag', 'Firunstag'],
      weeksPerTrimester: Number.isFinite(mergedConfig.weeksPerTrimester)
        ? Number(mergedConfig.weeksPerTrimester)
        : 12,
      trimestersPerYear: Number.isFinite(mergedConfig.trimestersPerYear)
        ? Number(mergedConfig.trimestersPerYear)
        : 3,
      minWeek: Number.isFinite(mergedConfig.minWeek) ? Number(mergedConfig.minWeek) : 1,
    };

    /**
     * Optional coupling to Foundry's worldTime / DSA5 calendar.
     *
     * Philosophy:
     * - The *calendar* is still JANUS' SSOT for "academic" structure (trimester/week/...)
     * - The *day model* (weekday + time-of-day) can be synced to the DSA5 world calendar.
     * - When enabled, JANUS slot/day advances will also advance game.time.worldTime.
     */
    this._worldSync = {
      enabled: false,
      // Default maps the canonical 10-slot day to 24h unless overridden.
      slotSeconds: Math.floor(86400 / this.config.slotOrder.length),
    };
  }

  /**
   * Callback für den Foundry `updateWorldTime`-Hook.
   * Wird von janus.mjs über `engine.time.onWorldTimeUpdated()` aufgerufen.
   *
   * Triggert eine nicht-erzwungene Synchronisation: worldTime + world.components
   * werden in den State geschrieben, aber dayIndex/slotIndex werden NICHT
   * überschrieben (das würde JANUS7 als Slave degradieren).
   *
   * @param {number} worldTime  - Neuer Foundry worldTime-Wert (Sekunden seit Epoch)
   * @param {number} [delta]    - Differenz zum vorherigen worldTime
   */
  onWorldTimeUpdated(worldTime, delta) {
    if (!this._worldSync.enabled) return;
    // Externe worldTime-Aenderungen muessen den JANUS-State korrigieren,
    // sonst driftet insbesondere das Jahr gegenueber DSA5/Foundry auseinander.
    this.syncFromWorldTime({ force: true }).catch((err) => {
      this.logger?.warn?.(
        `${MODULE_ABBREV} | onWorldTimeUpdated → syncFromWorldTime fehlgeschlagen`,
        { error: err, worldTime, delta }
      );
    });
  }

  // ---------------------------------------------------------------------------
  // World-Time / DSA5 Calendar Bridge
  // ---------------------------------------------------------------------------

  /**
   * Enable/disable sync with Foundry's world time.
   * Call this once during init/ready.
   * @param {Object} options
   * @param {boolean} [options.enabled=true]
   * @param {number}  [options.slotSeconds] - seconds per JANUS slot; if omitted derived from slotCount (24h/slots)
   */
  enableWorldTimeSync({ enabled = true, slotSeconds } = {}) {
    this._worldSync.enabled = Boolean(enabled);
    if (Number.isFinite(slotSeconds) && slotSeconds > 0) {
      this._worldSync.slotSeconds = Number(slotSeconds);
    } else {
      // If not provided, derive from current slot count.
      this._worldSync.slotSeconds = Math.floor(86400 / this.config.slotOrder.length);
    }
  }

  /**
   * Pull weekday + time-of-day from Foundry worldTime into JanusStateCore.time.
   * Safe no-op if calendar/time APIs are not present.
   *
   * @param {Object} [options]
   * @param {boolean} [options.force=false] - also overwrite dayIndex/slotIndex based on world time.
   */
  async syncFromWorldTime({ force = false } = {}) {
    if (!this._worldSync.enabled) return;
    const cal = game?.time?.calendar;
    const wt = game?.time?.worldTime;
    if (!cal || !Number.isFinite(wt)) return;

    let comps;
    try {
      comps = cal.timeToComponents(wt);
    } catch (err) {
      this.logger?.warn?.(`${MODULE_ABBREV} | calendar.timeToComponents() fehlgeschlagen`, { error: err });
      return;
    }

    const slotCount = this.config.slotOrder.length;
    const secOfDay = (Number(comps?.hour ?? 0) * 3600) + (Number(comps?.minute ?? 0) * 60) + Number(comps?.second ?? 0);
    const derivedSlotIndex = Math.min(slotCount - 1, Math.max(0, Math.floor(secOfDay / this._worldSync.slotSeconds)));

    const weekdayIndex = Number.isFinite(comps?.weekday)
      ? Number(comps.weekday)
      : (Number.isFinite(comps?.dayOfWeek) ? Number(comps.dayOfWeek) : null);

    await this.state.transaction((state) => {
      const time = state.get(STATE_PATHS.TIME) ?? {};
      const normalized = this._normalizeTime(time);

      // Always store the raw world-time snapshot for UI/debugging.
      normalized.worldTime = wt;
      normalized.world = {
        components: comps,
        // calendar.format is formatter-key based; 'date' exists in core.
        date: (() => {
          try { return cal.format(wt, 'date'); } catch { return null; }
        })(),
        time: (() => {
          try { return cal.format(wt, STATE_PATHS.TIME); } catch { return null; }
        })(),
      };

      if (force) {
        const worldYear = Number(comps?.year);
        if (Number.isFinite(worldYear)) {
          normalized.year = worldYear;
        }
        if (Number.isFinite(weekdayIndex)) {
          const len = this.config.dayOrder.length;
          const idx = ((weekdayIndex % len) + len) % len;
          normalized.dayIndex = idx;
        }
        normalized.slotIndex = derivedSlotIndex;
      }

      // Re-sync legacy aliases after potential index override.
      normalized.day = this.config.dayOrder[normalized.dayIndex] ?? this.config.dayOrder[0];
      normalized.phase = this.config.slotOrder[normalized.slotIndex] ?? this.config.slotOrder[0];
      normalized.dayName = normalized.day;
      normalized.slotName = normalized.phase;

      state.set(STATE_PATHS.TIME, normalized);
    });
  }

  /**
   * Advance Foundry world time by delta seconds.
   * @param {number} deltaSeconds
   */
  async _advanceWorldTime(deltaSeconds) {
    if (!this._worldSync.enabled) return;
    if (!Number.isFinite(deltaSeconds) || deltaSeconds === 0) return;
    const gt = game?.time;
    if (!gt || typeof gt.advance !== 'function') return;
    try {
      await gt.advance(deltaSeconds);
    } catch (err) {
      this.logger?.warn?.(`${MODULE_ABBREV} | game.time.advance() fehlgeschlagen`, { error: err, deltaSeconds });
    }
  }

  // ---------------------------------------------------------------------------
  // READ-APIs (Phase 6+)
  // ---------------------------------------------------------------------------

  /**
   * Liefert aktuelle Slotposition als Indizes.
   * @returns {{year:number, trimester:number, week:number, dayIndex:number, slotIndex:number}}
   */
  getCurrentSlotPosition() {
    const time = this.state.get(STATE_PATHS.TIME) ?? {};
    const normalized = this._normalizeTime(time);
    return {
      year: normalized.year,
      trimester: normalized.trimester,
      week: normalized.week,
      dayIndex: normalized.dayIndex,
      slotIndex: normalized.slotIndex
    };
  }

  /**
   * Liefert Slot-Label/Kontext fuer UI/Director.
   * @returns {{slotName:string, dayName:string}}
   */
  getCurrentSlotLabel() {
    const pos = this.getCurrentSlotPosition();
    return {
      dayName: this.config.dayOrder[pos.dayIndex] ?? this.config.dayOrder[0],
      slotName: this.config.slotOrder[pos.slotIndex] ?? this.config.slotOrder[0]
    };
  }

  // ---------------------------------------------------------------------------
  // READ-APIs
  // ---------------------------------------------------------------------------

  /**
   * Wandelt den aktuellen time-State in eine SlotRef-Struktur um.
   * @returns {SlotRef}
   */
  getCurrentSlotRef() {
    const time = this.state.get(STATE_PATHS.TIME) ?? {};
    const normalized = this._normalizeTime(time);
    return this._toSlotRef(normalized);
  }

  /**
   * Liefert alle Calendar-Entries für einen Tag (alle Phasen).
   * @param {DayRef} dayRef
   * @returns {any[]}
   */
  getCalendarEntriesForDay(dayRef) {
    if (!dayRef) return [];
    const query = {
      year: dayRef.year,
      trimester: dayRef.trimester,
      week: dayRef.week,
      day: dayRef.day,
    };

    try {
      const canonical = this.academyData.findCalendarEntries(query) ?? [];

      // Fallback: Wenn calendar.json (noch) keine passenden Einträge liefert,
      // befüllen wir aus teaching-sessions.json virtuelle Entries (read-only).
      if (Array.isArray(canonical) && canonical.length) return canonical;

      const virtual = this.academyData.getVirtualCalendarEntriesForDay?.({
        ...query,
        slotOrder: this.config?.slotOrder ?? null,
      }) ?? [];

      return Array.isArray(virtual) ? virtual : [];
    } catch (err) {
      this.logger?.error?.(`${MODULE_ABBREV} | getCalendarEntriesForDay() fehlgeschlagen`, {
        error: err,
        query,
      });
      return [];
    }
  }

  /**
   * Liefert den Calendar-Eintrag für den aktuellen Slot (Phase inkl.).
   * @returns {any|null}
   */
  getCalendarEntryForCurrentSlot() {
    const slotRef = this.getCurrentSlotRef();

    try {
      return this.academyData.getCalendarEntryByDay(slotRef) ?? null;
    } catch (err) {
      this.logger?.error?.(`${MODULE_ABBREV} | getCalendarEntryForCurrentSlot() fehlgeschlagen`, {
        error: err,
        slotRef,
      });
      return null;
    }
  }

  /**
   * Liefert alle Events (events.json) für den aktuellen Slot.
   * @returns {any[]}
   */
  getEventsForCurrentSlot() {
    const slotRef = this.getCurrentSlotRef();

    try {
      // listEventsForDay akzeptiert DayRef+phase; Phase wird in events.calendarRefs mitgeprüft.
      return this.academyData.listEventsForDay(slotRef) ?? [];
    } catch (err) {
      this.logger?.error?.(`${MODULE_ABBREV} | getEventsForCurrentSlot() fehlgeschlagen`, {
        error: err,
        slotRef,
      });
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // MUTATION-APIs (Zeitfortschritt)
  // ---------------------------------------------------------------------------

  /**
   * Fortschritt um eine oder mehrere Phasen.
   *
   * - Aktualisiert JanusStateCore.time (inkl. totalDaysPassed, isHoliday falls vorhanden).
   * - Feuert Hook `janus7DateChanged`.
   *
   * @param {Object} [options]
   * @param {number} [options.steps=1] - Anzahl der Phasen (kann negativ sein).
   * @returns {Promise<SlotRef>} - Neuer SlotRef nach dem Fortschritt.
   */
  async advancePhase({ steps = 1 } = {}) {
    // Legacy-API: "Phase" == Slot (Phase 6+).
    return await this.advanceSlot({ steps, reason: 'advancePhase' });
  }

  /**
   * Phase 6+ canonical: Fortschritt um Slots (10-Block-Tag).
   * Mutiert:
   *  - time.dayIndex/time.slotIndex (SSOT)
   *  - synchronisiert time.day/time.phase sowie dayName/slotName
   *  - pflegt totalDaysPassed/isHoliday
   *
   * @param {Object} [options]
   * @param {number} [options.steps=1]
   * @param {string} [options.reason='advanceSlot']
   */
  async advanceSlot({ steps = 1, reason = 'advanceSlot' } = {}) {
    if (!Number.isFinite(steps) || steps === 0) return this.getCurrentSlotRef();

    const previous = this.getCurrentSlotRef();
    /** @type {SlotRef} */
    let current;

    await this.state.transaction((state) => {
      const time = state.get(STATE_PATHS.TIME) ?? {};
      const normalized = this._normalizeTime(time);

      const slotCount = this.config.slotOrder.length;
      let slotIndex = Number.isFinite(normalized.slotIndex) ? normalized.slotIndex : 0;

      let flatIndex = slotIndex + steps;
      let dayDelta = 0;

      if (flatIndex >= slotCount || flatIndex < 0) {
        dayDelta = Math.trunc(flatIndex / slotCount);
        flatIndex = ((flatIndex % slotCount) + slotCount) % slotCount;
      }

      normalized.slotIndex = flatIndex;
      if (dayDelta !== 0) this._shiftDayByIndex(normalized, dayDelta);

      // Sync legacy aliases
      normalized.day = this.config.dayOrder[normalized.dayIndex] ?? this.config.dayOrder[0];
      normalized.phase = this.config.slotOrder[normalized.slotIndex] ?? this.config.slotOrder[0];
      normalized.dayName = normalized.day;
      normalized.slotName = normalized.phase;

      if (typeof normalized.totalDaysPassed === 'number') {
        normalized.totalDaysPassed += dayDelta;
        if (normalized.totalDaysPassed < 0) normalized.totalDaysPassed = 0;
      }

      normalized.isHoliday = this._computeIsHoliday({
        year: normalized.year,
        trimester: normalized.trimester,
        week: normalized.week,
        day: normalized.day,
        phase: normalized.phase
      });

      state.set(STATE_PATHS.TIME, normalized);
      current = this._toSlotRef(normalized);
    });

    // Keep Foundry world time in lockstep (optional).
    await this._advanceWorldTime(steps * this._worldSync.slotSeconds);

    this._fireDateChangedHook(previous, current, reason);
    return current;
  }

  /**
   * Fortschritt um eine oder mehrere Tage (Phase bleibt gleich).
   *
   * @param {Object} [options]
   * @param {number} [options.days=1]
   * @returns {Promise<SlotRef>}
   */
  async advanceDay({ days = 1 } = {}) {
    if (!Number.isFinite(days) || days === 0) return this.getCurrentSlotRef();

    const previous = this.getCurrentSlotRef();
    /** @type {SlotRef} */
    let current;

    await this.state.transaction((state) => {
      const time = state.get(STATE_PATHS.TIME) ?? {};
      const normalized = this._normalizeTime(time);

      this._shiftDayByIndex(normalized, days);

      // Sync legacy aliases
      normalized.day = this.config.dayOrder[normalized.dayIndex] ?? this.config.dayOrder[0];
      normalized.phase = this.config.slotOrder[normalized.slotIndex] ?? this.config.slotOrder[0];
      normalized.dayName = normalized.day;
      normalized.slotName = normalized.phase;

      if (typeof normalized.totalDaysPassed === 'number') {
        normalized.totalDaysPassed += days;
        if (normalized.totalDaysPassed < 0) normalized.totalDaysPassed = 0;
      }

      normalized.isHoliday = this._computeIsHoliday({
        year: normalized.year,
        trimester: normalized.trimester,
        week: normalized.week,
        day: normalized.day,
        phase: normalized.phase
      });

      state.set(STATE_PATHS.TIME, normalized);
      current = this._toSlotRef(normalized);
    });

    // Keep Foundry world time in lockstep (optional).
    await this._advanceWorldTime(days * 86400);

    this._fireDateChangedHook(previous, current, 'advanceDay');
    return current;
  }

  /**
   * Jump to a specific day/slot position within the current week.
   * Does NOT change year, trimester, week, or totalDaysPassed.
   *
   * @param {number} dayIndex  Index into dayOrder (0–6)
   * @param {number} slotIndex Index into slotOrder (0–9)
   * @returns {Promise<SlotRef>}
   */
  async setSlot(dayIndex, slotIndex) {
    const dayCount = this.config.dayOrder.length;
    const slotCount = this.config.slotOrder.length;
    const di = Math.max(0, Math.min(Number(dayIndex) || 0, dayCount - 1));
    const si = Math.max(0, Math.min(Number(slotIndex) || 0, slotCount - 1));

    const previous = this.getCurrentSlotRef();
    /** @type {SlotRef} */
    let current;

    await this.state.transaction((state) => {
      const time = state.get(STATE_PATHS.TIME) ?? {};
      const normalized = this._normalizeTime(time);

      normalized.dayIndex = di;
      normalized.slotIndex = si;
      normalized.day = this.config.dayOrder[di] ?? this.config.dayOrder[0];
      normalized.phase = this.config.slotOrder[si] ?? this.config.slotOrder[0];
      normalized.dayName = normalized.day;
      normalized.slotName = normalized.phase;

      normalized.isHoliday = this._computeIsHoliday({
        year: normalized.year,
        trimester: normalized.trimester,
        week: normalized.week,
        day: normalized.day,
        phase: normalized.phase
      });

      state.set(STATE_PATHS.TIME, normalized);
      current = this._toSlotRef(normalized);
    });

    this._fireDateChangedHook(previous, current, 'setSlot');
    return current;
  }


  /**
   * Simuliert einen Zeitsprung von mehreren Tagen.
   * - verschiebt die Akademiezeit um `days` Tage
   * - vergibt generische Hauspunkte (+1 pro Tag für jeden Zirkel)
   * - erzeugt einen Montage-/Downtime-Journaleintrag
   *
   * @param {number} days
   * @returns {Promise<{journalEntry:any, circleDeltas: Array<{house:string, delta:number}>, days:number, previous: SlotRef, current: SlotRef}>}
   */
  async simulateDowntime(days) {
    const numericDays = Math.max(0, Number(days) || 0);
    const roundedDays = Math.floor(numericDays);
    if (!roundedDays) {
      return { journalEntry: null, circleDeltas: [], days: 0, previous: this.getCurrentSlotRef(), current: this.getCurrentSlotRef() };
    }

    const previous = this.getCurrentSlotRef();
    let current = previous;
    let journalEntry = null;
    let circleDeltas = [];

    await this.state.transaction((state) => {
      const time = this._normalizeTime(state.get(STATE_PATHS.TIME) ?? {});
      this._shiftDayByIndex(time, roundedDays);
      time.day = this.config.dayOrder[time.dayIndex] ?? this.config.dayOrder[0];
      time.phase = this.config.slotOrder[time.slotIndex] ?? this.config.slotOrder[0];
      time.dayName = time.day;
      time.slotName = time.phase;
      if (typeof time.totalDaysPassed === 'number') time.totalDaysPassed += roundedDays;
      time.isHoliday = this._computeIsHoliday(time);
      state.set(STATE_PATHS.TIME, time);
      current = this._toSlotRef(time);

      const scoring = foundry.utils.deepClone(state.get(STATE_PATHS.SCORING) ?? {});
      scoring.circles = scoring.circles ?? {};
      const configuredCircles = this.academyData.listCircles?.() ?? [];
      const circleIds = [...new Set([
        ...Object.keys(scoring.circles ?? {}),
        ...configuredCircles.map((circle) => String(circle?.id ?? '').trim()).filter(Boolean)
      ])];
      circleDeltas = circleIds.map((house) => ({ house, delta: roundedDays }));
      for (const { house, delta } of circleDeltas) {
        const before = Number(scoring.circles?.[house] ?? 0);
        scoring.circles[house] = before + delta;
      }
      state.set(STATE_PATHS.SCORING, scoring);

      const startLabel = `${previous.day}${previous.phase ? `, ${previous.phase}` : ''}`;
      const endLabel = `${current.day}${current.phase ? `, ${current.phase}` : ''}`;
      journalEntry = {
        id: `downtime-${Date.now()}`,
        title: 'Der Lauf der Woche',
        type: 'journal',
        generatedBy: 'janus7.smartDowntimeEngine',
        days: roundedDays,
        content: `<p>Über ${roundedDays} Tage folgten die Schüler dem regulären Lehrplan. Unterricht, Studienzeiten und der gewohnte Akademiealltag liefen ohne besondere Zwischenfälle weiter.</p><p><em>Zeitraum: ${startLabel} bis ${endLabel}.</em></p>`
      };

      const existingJournalEntries = Array.isArray(state.get(STATE_PATHS.ACADEMY_JOURNAL_ENTRIES)) ? foundry.utils.deepClone(state.get(STATE_PATHS.ACADEMY_JOURNAL_ENTRIES)) : [];
      state.set(STATE_PATHS.ACADEMY_JOURNAL_ENTRIES, [journalEntry, ...existingJournalEntries]);
    });

    this._fireDateChangedHook(previous, current, 'simulateDowntime');
    return { journalEntry, circleDeltas, days: roundedDays, previous, current };
  }

  // ---------------------------------------------------------------------------
  // Private Helfer
  // ---------------------------------------------------------------------------

  /**
   * Normalisiert ein time-Objekt aus dem State.
   * @param {any} time
   * @returns {any}
   * @private
   */
  _normalizeTime(time) {
    const dayOrder = this.config.dayOrder;
    const slotOrder = this.config.slotOrder;

    // 1) Read raw values
    let dayName = String(time?.day ?? time?.dayName ?? dayOrder[0]);
    let slotName = String(time?.phase ?? time?.slotName ?? slotOrder[0]);

    // 2) Derive indices (SSOT) with tolerant fallbacks
    let dayIndex = Number.isFinite(time?.dayIndex) ? Number(time.dayIndex) : dayOrder.indexOf(dayName);
    if (dayIndex < 0) dayIndex = 0;
    if (dayIndex >= dayOrder.length) dayIndex = 0;

    let slotIndex = Number.isFinite(time?.slotIndex) ? Number(time.slotIndex) : slotOrder.indexOf(slotName);
    if (slotIndex < 0) slotIndex = 0;
    if (slotIndex >= slotOrder.length) slotIndex = 0;

    // 3) Canonicalize names from indices
    dayName = dayOrder[dayIndex] ?? dayOrder[0];
    slotName = slotOrder[slotIndex] ?? slotOrder[0];

    return {
      year: Number(time?.year ?? 1),
      trimester: Number(time?.trimester ?? 1),
      week: Number(time?.week ?? 1),
      dayIndex,
      slotIndex,
      // Legacy + convenience names
      day: dayName,
      phase: slotName,
      dayName,
      slotName,
      totalDaysPassed: Number.isFinite(time?.totalDaysPassed) ? Number(time.totalDaysPassed) : 0,
      isHoliday: Boolean(time?.isHoliday ?? false)
    };
  }

  /**
   * @param {any} time
   * @returns {SlotRef}
   * @private
   */
  _toSlotRef(time) {
    return {
      year: time.year,
      trimester: time.trimester,
      week: time.week,
      day: time.day,
      phase: time.phase,
      // Phase 6+: also expose indices so downstream systems (resolver/UI) can make unambiguous
      // decisions without having to re-derive them.
      dayIndex: time.dayIndex,
      slotIndex: time.slotIndex,
    };
  }

  /**
   * Verschiebt den Tag im Zeitmodell um delta Tage.
   * (Sehr einfache Logik: wir erhöhen/dekrementieren Woche/Trimester/Jahr,
   * detailliertere Grenzen können später über Config oder Kalenderdaten kommen.)
   *
   * @param {any} time
   * @param {number} deltaDays
   * @private
   */
  _shiftDay(time, deltaDays) {
    // Legacy helper: delegate to index-based shift if indices exist.
    // Ensures dayIndex stays consistent.
    if (!Number.isFinite(time?.dayIndex)) {
      const idx = this.config.dayOrder.indexOf(String(time?.day ?? this.config.dayOrder[0]));
      time.dayIndex = idx >= 0 ? idx : 0;
    }
    this._shiftDayByIndex(time, deltaDays);
  }

  /**
   * Verschiebt den Tag um deltaDays basierend auf dayIndex (SSOT).
   * Mutiert: dayIndex + week/trimester/year rollovers.
   * @param {any} time
   * @param {number} deltaDays
   * @private
   */
  _shiftDayByIndex(time, deltaDays) {
    const dayOrder = this.config.dayOrder;
    const len = dayOrder.length;

    let dayIndex = Number.isFinite(time?.dayIndex) ? Number(time.dayIndex) : 0;
    if (dayIndex < 0 || dayIndex >= len) dayIndex = 0;

    let flat = dayIndex + deltaDays;
    let weekDelta = 0;

    if (flat >= len || flat < 0) {
      weekDelta = Math.trunc(flat / len);
      flat = ((flat % len) + len) % len;
    }

    time.dayIndex = flat;
    time.day = dayOrder[flat] ?? dayOrder[0];
    time.dayName = time.day;

    if (weekDelta !== 0) {
      time.week = Number(time.week ?? 1) + weekDelta;

      const weeksPerTrimester = this.config.weeksPerTrimester;
      const trimestersPerYear = this.config.trimestersPerYear;
      const minWeek = this.config.minWeek;

      while (time.week > weeksPerTrimester) {
        time.week -= weeksPerTrimester;
        time.trimester = Number(time.trimester ?? 1) + 1;
      }
      while (time.week < minWeek) {
        time.week += weeksPerTrimester;
        time.trimester = Number(time.trimester ?? 1) - 1;
      }

      while (time.trimester > trimestersPerYear) {
        time.trimester -= trimestersPerYear;
        time.year = Number(time.year ?? 1) + 1;
      }
      while (time.trimester < 1) {
        time.trimester += trimestersPerYear;
        time.year = Number(time.year ?? 1) - 1;
      }
    }
  }

  /**
   * Bestimmt, ob der aktuelle Slot ein Feiertag ist.
   * Kriterien:
   *  - calendarEntry.type === 'holiday' oder holidayKey != null
   *  - oder ein Event mit type === 'holiday'
   *
   * @param {SlotRef} slotLike
   * @private
   */
  _computeIsHoliday(slotLike) {
    try {
      const entry = this.academyData.getCalendarEntryByDay(slotLike);
      if (entry) {
        if (entry.type === 'holiday') return true;
        if (entry.holidayKey != null) return true;
      }

      const events = this.academyData.listEventsForDay(slotLike) ?? [];
      return events.some((ev) => ev.type === 'holiday');
    } catch (err) {
      this.logger?.warn?.(`${MODULE_ABBREV} | _computeIsHoliday() fehlgeschlagen`, {
        error: err,
        slotLike,
      });
      return false;
    }
  }

  /**
   * @param {string} phase
   * @returns {number}
   * @private
   */
  _phaseIndex(phase) {
    return this.config.phaseOrder.indexOf(phase);
  }

  /**
   * Ruft Hook janus7DateChanged auf, falls Hooks verfügbar sind.
   * @param {SlotRef} previous
   * @param {SlotRef} current
   * @param {string} reason
   * @private
   */
  _fireDateChangedHook(previous, current, reason) {
    try {
      const Hooks = globalThis.Hooks;
      if (!Hooks?.callAll) return;

      emitHook(HOOKS.DATE_CHANGED, {
        previous,
        current,
        reason,
      });
    } catch (err) {
      this.logger?.error?.(`${MODULE_ABBREV} | Fehler beim janus7DateChanged-Hook`, err);
    }
  }
}

export default JanusCalendarEngine;
