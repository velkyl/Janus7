/**
 * @file academy/lessons.js
 * @module janus7
 * @phase 4
 *
 * Zweck:
 *  JanusLessonsEngine: High-Level-API für Unterrichtseinheiten.
 *
 * Architektur:
 *  - Nutzt ausschließlich AcademyDataApi (Phase 2) und ggf. JanusCalendarEngine (Phase 4).
 *  - Kein direkter Zugriff auf DSA5- oder Foundry-Interna.
 *  - Kein eigener Persistenzzustand (nur Read-Layer).
 */

import { MODULE_ABBREV } from '../core/common.js';
import { mapCalendarPhaseToTeachingSlotId } from './teaching-session-bridge.js';

/**
 * @typedef {import('../core/state.js').JanusStateCore} JanusStateCore
 * @typedef {import('./data-api.js').AcademyDataApi} AcademyDataApi
 * @typedef {import('./calendar.js').JanusCalendarEngine} JanusCalendarEngine
 * @typedef {import('../core/logger.js').JanusLogger} JanusLogger
 */

/**
 * @typedef {Object} LessonWithContext
 * @property {any} calendarEntry - Der zugrunde liegende Eintrag aus calendar.json
 * @property {any|null} lesson   - Die Lesson-Definition aus lessons.json (falls gefunden)
 */

/**
 * High-Level-API für Unterrichtseinheiten.
 */
export class JanusLessonsEngine {
  /**
   * @param {Object} deps
   * @param {JanusStateCore} deps.state
   * @param {AcademyDataApi} deps.academyData
   * @param {JanusCalendarEngine} [deps.calendar]
   * @param {JanusLogger} [deps.logger]
   */
  constructor({ state, academyData, calendar, slotResolver, logger }) {
    if (!state) {
      throw new Error(`${MODULE_ABBREV}: JanusLessonsEngine benötigt einen JanusStateCore (deps.state).`);
    }
    if (!academyData) {
      throw new Error(`${MODULE_ABBREV}: JanusLessonsEngine benötigt AcademyDataApi (deps.academyData).`);
    }

    /** @type {JanusStateCore} */
    this.state = state;
    /** @type {AcademyDataApi} */
    this.academyData = academyData;
    /** @type {JanusCalendarEngine|null} */
    this.calendar = calendar ?? null;
    
    this.slotResolver = slotResolver ?? null;
/** @type {JanusLogger|Console} */
    this.logger = logger ?? console;
  }

  // ---------------------------------------------------------------------------
  // Read-API (Lessons)
  // ---------------------------------------------------------------------------

  /**
   * Liefert eine Lesson nach ID.
   * @param {string} id
   * @returns {Object|null} Lektion oder null wenn nicht gefunden (kein Throw)
   */
  getLesson(id) {
    if (!id) return null;
    try {
      return this.academyData.getLesson(id);
    } catch (err) {
      this.logger?.error?.(`${MODULE_ABBREV} | getLesson() fehlgeschlagen`, { id, error: err });
      return null;
    }
  }

  /**
   * Lessons nach Tag (frei definierbar in lessons.json).
   * @param {string} tag
   * @returns {any[]}
   */
  listLessonsByTag(tag) {
    if (!tag) return [];
    try {
      return this.academyData.listLessonsByTag(tag) ?? [];
    } catch (err) {
      this.logger?.error?.(`${MODULE_ABBREV} | listLessonsByTag() fehlgeschlagen`, { tag, error: err });
      return [];
    }
  }

  /**
   * Lessons nach Lehrer-NPC.
   * @param {string} npcId
   * @returns {any[]}
   */
  listLessonsByTeacher(npcId) {
    if (!npcId) return [];
    try {
      return this.academyData.listLessonsByTeacher(npcId) ?? [];
    } catch (err) {
      this.logger?.error?.(`${MODULE_ABBREV} | listLessonsByTeacher() fehlgeschlagen`, {
        npcId,
        error: err
      });
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Kalender-Integration
  // ---------------------------------------------------------------------------

  /**
   * Liefert alle Lessons für einen konkreten Slot.
   *
   * Logik:
   *  - Sucht alle calendar.json-Einträge für den Tag.
   *  - Filtert auf Einträge mit type === 'lesson' oder lessonId gesetzt.
   *  - Resolvt die Lesson-Definition und packt beides in ein Objekt.
   *
   * @param {import('./calendar.js').SlotRef} slotRef
   * @returns {LessonWithContext[]}
   */
  getLessonsForSlot(slotRef) {
    if (!slotRef) return [];

    // Prefer SlotResolver (Phase 4) when available
    if (this.slotResolver?.resolveSlot) {
      const resolved = this.slotResolver.resolveSlot(slotRef);
      return resolved?.lessons ?? [];
    }
    const { year, trimester, week, day, phase } = slotRef;

    try {
      const dayEntries = this.academyData.findCalendarEntries({
        year,
        trimester,
        week,
        day
      });

      if (!Array.isArray(dayEntries)) return [];

      const samePhase = (entryPhase, currentPhase) => {
        const a = String(entryPhase ?? '').trim();
        const b = String(currentPhase ?? '').trim();
        if (!a || !b) return true;
        if (a === b) return true;
        const aMapped = mapCalendarPhaseToTeachingSlotId(a);
        const bMapped = mapCalendarPhaseToTeachingSlotId(b);
        return Boolean(aMapped && bMapped && aMapped === bMapped);
      };

      let matches = dayEntries
        .filter((entry) => {
          if (entry.type && entry.type !== 'lesson' && entry.type !== 'lesson-slot') return false;
          if (entry.phase && !samePhase(entry.phase, phase)) return false;
          return Boolean(entry.lessonId);
        })
        .map((entry) => {
          const lesson = entry.lessonId ? this.academyData.getLesson(entry.lessonId) : null;
          return { calendarEntry: entry, lesson, id: entry.lessonId ?? entry.id ?? null };
        });

      if (!matches.length) {
        const virtualDay = this.academyData.getVirtualCalendarEntriesForDay?.({
          year, trimester, week, day,
          slotOrder: this.calendar?.config?.slotOrder ?? null
        }) ?? [];
        matches = virtualDay
          .filter((entry) => !entry.phase || samePhase(entry.phase, phase))
          .map((entry) => ({ calendarEntry: entry, lesson: null, id: entry.lessonId ?? entry.id ?? null }));
      }

      return matches;
    } catch (err) {
      this.logger?.error?.(`${MODULE_ABBREV} | getLessonsForSlot() fehlgeschlagen`, {
        slotRef,
        error: err
      });
      return [];
    }
  }

  /**
   * Liefert alle Lessons für den aktuellen Slot (falls ein Calendar-Engine verfügbar ist).
   * @returns {LessonWithContext[]}
   */
  getLessonsForCurrentSlot() {
    if (!this.calendar) {
      this.logger?.warn?.(
        `${MODULE_ABBREV} | getLessonsForCurrentSlot() ohne CalendarEngine aufgerufen – leere Liste.`
      );
      return [];
    }
    const slot = this.calendar.getCurrentSlotRef();
    return this.getLessonsForSlot(slot);
  }

  // ---------------------------------------------------------------------------
  // Komfort-API für Lesson-„Kontexte“
  // ---------------------------------------------------------------------------

  /**
   * Baut einen einfachen Lesson-Kontext mit Teacher-/Location-Infos.
   *
   * @param {string} lessonId
   * @returns {{ lesson: any, teacher: any|null, location: any|null }|null}
   */
  getLessonContext(lessonId) {
    const lesson = this.getLesson(lessonId);
    if (!lesson) return null;

    try {
      const teacher = lesson.teacherNpcId ? this.academyData.getNpc(lesson.teacherNpcId) : null;
      const location = lesson.locationId ? this.academyData.getLocation(lesson.locationId) : null;
      return { lesson, teacher, location };
    } catch (err) {
      this.logger?.error?.(`${MODULE_ABBREV} | getLessonContext() fehlgeschlagen`, {
        lessonId,
        error: err
      });
      return { lesson, teacher: null, location: null };
    }
  }
}

export default JanusLessonsEngine;

