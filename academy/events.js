/**
 * @file academy/events.js
 * @module janus7
 * @phase 4
 *
 * Zweck:
 *  JanusEventsEngine: High-Level-API für Akademie-Events.
 *
 * Architektur:
 *  - Dünne Wrapper-Schicht um AcademyDataApi.
 *  - Keine eigene Persistenz, kein direkter DSA5-Zugriff.
 */

import { MODULE_ABBREV } from '../core/common.js';

/**
 * @typedef {import('./data-api.js').AcademyDataApi} AcademyDataApi
 * @typedef {import('./calendar.js').JanusCalendarEngine} JanusCalendarEngine
 * @typedef {import('../core/logger.js').JanusLogger} JanusLogger
 */

export class JanusEventsEngine {
  /**
   * @param {Object} deps
   * @param {AcademyDataApi} deps.academyData
   * @param {JanusCalendarEngine} [deps.calendar]
   * @param {JanusLogger} [deps.logger]
   * @param {any} [deps.slotResolver] - Optionaler SlotContentResolver (Phase 4).
   */
  constructor({ academyData, calendar, slotResolver, logger }) {
    if (!academyData) {
      throw new Error(`${MODULE_ABBREV}: JanusEventsEngine benötigt AcademyDataApi (deps.academyData).`);
    }

    /** @type {AcademyDataApi} */
    this.academyData = academyData;
    /** @type {JanusCalendarEngine|null} */
    this.calendar = calendar ?? null;
    
    /** @type {any|null} */
    this.slotResolver = slotResolver ?? null;
    /** @type {JanusLogger|Console} */
    this.logger = logger ?? console;
  }

  /**
   * Liefert ein Event nach ID.
   * @param {string} id
   * @returns {any|null}
   */
  getEvent(id) {
    if (!id) return null;
    try {
      return this.academyData.getEvent(id);
    } catch (err) {
      this.logger?.error?.(`${MODULE_ABBREV} | getEvent() fehlgeschlagen`, { id, error: err });
      return null;
    }
  }

  /**
   * Liefert alle Events für einen Day/Slot (DayRef + optional Phase).
   * @param {import('./calendar.js').SlotRef} slotRef
   * @returns {any[]}
   */
  listEventsForSlot(slotRef) {
    if (!slotRef) return [];

    const resolvedEvents = this.slotResolver?.resolveSlot ? (this.slotResolver.resolveSlot(slotRef)?.events ?? []) : [];

    try {
      const legacy = this.academyData.listEventsForDay(slotRef) ?? [];
      return [...resolvedEvents, ...legacy];
    } catch (err) {
      this.logger?.error?.(`${MODULE_ABBREV} | listEventsForSlot() fehlgeschlagen`, {
        slotRef,
        error: err
      });
      return resolvedEvents;
    }
  }

  /**
   * Liefert alle Events für den aktuellen Slot (falls CalendarEngine bekannt).
   * @returns {any[]}
   */
  listEventsForCurrentSlot() {
    if (!this.calendar) {
      this.logger?.warn?.(
        `${MODULE_ABBREV} | listEventsForCurrentSlot() ohne CalendarEngine aufgerufen – leere Liste.`
      );
      return [];
    }
    const slot = this.calendar.getCurrentSlotRef();
    return this.listEventsForSlot(slot);
  }
}

export default JanusEventsEngine;