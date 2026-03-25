/**
 * @file academy/slot-resolver.js
 * @module janus7
 * @phase 4
 *
 * Zweck:
 * SlotResolver: Brücke zwischen Kalender/TeachingSessions und konkreten Slot-Inhalten.
 *
 * Design-Prinzipien:
 * - Data-driven: nutzt nur AcademyDataApi + statische JSON-Daten.
 * - Keine DSA5-System-Logik (Phase 3 bleibt getrennt).
 * - Deterministisch: Calendar-Einträge haben Vorrang, sonst TeachingSessions/Templates.
 */

import { MODULE_ABBREV } from '../core/common.js';

/**
 * @typedef {Object} SlotRef
 * @property {number} year
 * @property {number} trimester
 * @property {number} week
 * @property {string|number} day
 * @property {string} phase
 */

/**
 * @typedef {Object} SlotResolution
 * @property {Array<Object>} lessons
 * @property {Array<Object>} exams
 * @property {Array<Object>} events
 * @property {Object} meta
 */

export class JanusSlotResolver {
  
  /**
   * @param {Object} deps
   * @param {import('./data-api.js').AcademyDataApi} [deps.academyData]
   * @param {import('./data-api.js').AcademyDataApi} [deps.dataApi] - Legacy Alias
   * @param {import('../core/logger.js').JanusLogger} [deps.logger]
   * @param {number} [deps.maxLessonsPerSlot]
   */
  constructor({ academyData, dataApi, logger, maxLessonsPerSlot = 1 } = {}) {
    // Robustheit: Akzeptiere academyData ODER dataApi
    const api = academyData || dataApi;
    
    if (!api) {
        // Fallback: Versuche Global, falls Injection fehlte (Notlösung)
        if (globalThis.game?.janus7?.academy?.data) {
            this.academyData = globalThis.game.janus7.academy.data;
        } else {
            throw new Error(`${MODULE_ABBREV}: SlotResolver requires academyData dependency.`);
        }
    } else {
        this.academyData = api;
    }

    this.logger = logger ?? console;
    this.maxLessonsPerSlot = maxLessonsPerSlot;
  }

  /**
   * Hauptmethode: Löst einen Zeitpunkt in konkrete Inhalte auf.
   * @param {SlotRef} slotRef 
   * @returns {Promise<SlotResolution>}
   */
  async resolveSlot(slotRef) {
    const { year, trimester, week, day, phase } = slotRef;
    
    // Arrays für Ergebnisse
    const lessons = [];
    const exams = [];
    const events = [];

    // 1) Kalender-Einträge (kanonisch) haben Vorrang
    try {
      const entries = this.academyData?.getCalendarEntries?.() ?? [];
      const slotEntries = entries.filter((e) => (
        e.year === year &&
        e.trimester === trimester &&
        e.week === week &&
        String(e.day) === String(day) &&
        String(e.phase ?? e.slot) === String(phase)
      ));

      for (const entry of slotEntries) {
        if (entry.type === 'lesson' && entry.lessonId) {
          const l = this.academyData.getLesson?.(entry.lessonId);
          lessons.push({
            ...(l ?? { id: entry.lessonId, title: entry.lessonId }),
            type: 'lesson',
            calendarEntryId: entry.id,
            generated: false
          });
        }
        if (entry.type === 'exam' && entry.examId) {
          const ex = this.academyData.getExam?.(entry.examId);
          exams.push({
            ...(ex ?? { id: entry.examId, title: entry.examId }),
            type: 'exam',
            calendarEntryId: entry.id,
            generated: false
          });
        }
        if (entry.type === 'event' && entry.eventId) {
          const ev = this.academyData.getEvent?.(entry.eventId);
          events.push({
            ...(ev ?? { id: entry.eventId, title: entry.eventId }),
            type: 'event',
            calendarEntryId: entry.id,
            generated: false
          });
        }
      }
    } catch (err) {
      this.logger.warn(`${MODULE_ABBREV} | Fehler beim Laden der Kalender-Einträge:`, err);
    }

    // 2) Fallback: Teaching Sessions (best-effort)
    if (!lessons.length && !exams.length && !events.length) {
      if (this.academyData && this.academyData.getTeachingSessionsForSlot) {
        try {
          const sessions = this.academyData.getTeachingSessionsForSlot({ trimester, week, day, phase });
          if (sessions && Array.isArray(sessions)) {
            for (const session of sessions) {
              lessons.push({
                id: session.id,
                title: session.topic || session.subject || "Unterricht",
                teacher: session.teacher,
                location: session.room,
                type: 'lesson',
                generated: true
              });
            }
          }
        } catch (err) {
          this.logger.warn(`${MODULE_ABBREV} | Fehler beim Laden der Teaching Sessions:`, err);
        }
      }
    }

    // Begrenzung der Lektionen pro Slot
    const maxLessons = this.maxLessonsPerSlot ?? 1;
    const templatesTruncated = lessons.length > maxLessons;
    if (templatesTruncated) {
        lessons.length = maxLessons;
    }

    // Rückgabe des Standard-Objekts
    return {
      lessons,
      exams,
      events,
      meta: { 
          reason: 'resolved', 
          year, 
          trimester, 
          week, 
          day, 
          phase, 
          templatesTruncated 
      }
    };
  }

  /**
   * Ermittelt den Inhalt des aktuellen Zeit-Slots basierend auf dem globalen State.
   * Dies wird vom Control Panel aufgerufen.
   * @returns {Promise<SlotResolution|null>} Slot-Objekt
   */
  async resolveCurrentSlot() {
    // Zugriff auf den globalen State
    const engine = globalThis.game?.janus7;
    const state = engine?.core?.state?.get();

    if (!state || !state.time) return null;

    return this.resolveSlot({
      year: state.time.year,
      trimester: state.time.trimester ?? state.time.semester ?? 1,
      week: state.time.week,
      day: state.time.day,
      phase: state.time.phase
    });
  }
}

export default JanusSlotResolver;