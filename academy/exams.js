import { STATE_PATHS } from '../core/common.js';
/**
 * @file academy/exams.js
 * @module janus7
 * @phase 4
 *
 * Zweck:
 *  JanusExamsEngine: High-Level-API für Prüfungen.
 *
 * Architektur:
 *  - Nutzt AcademyDataApi (Phase 2) für Exams & Question-Sets.
 *  - Nutzt optional JanusScoringEngine (Phase 4) für Punkte.
 *  - Kann über Hooks/Events mit der DSA5-System-Bridge (Phase 3) interagieren (keine harte Abhängigkeit).
 */

import { MODULE_ABBREV } from '../core/common.js';
import { emitHook, HOOKS } from '../core/hooks/emitter.js';

/**
 * @typedef {import('../core/state.js').JanusStateCore} JanusStateCore
 * @typedef {import('./data-api.js').AcademyDataApi} AcademyDataApi
 * @typedef {import('./scoring.js').JanusScoringEngine} JanusScoringEngine
 * @typedef {import('../core/logger.js').JanusLogger} JanusLogger
 */

/**
 */

/**
 * @typedef {Object} ExamContext
 * @property {any} exam
 * @property {any|null} questionSet
 */

export class JanusExamsEngine {
  /**
   * @param {Object} deps
   * @param {JanusStateCore} deps.state
   * @param {AcademyDataApi} deps.academyData
   * @param {JanusScoringEngine} [deps.scoring]
   * @param {JanusLogger} [deps.logger]
   */
  constructor({ state, academyData, scoring, slotResolver, calendar, logger }) {
    if (!state) {
      throw new Error(`${MODULE_ABBREV}: JanusExamsEngine benötigt einen JanusStateCore (deps.state).`);
    }
    if (!academyData) {
      throw new Error(`${MODULE_ABBREV}: JanusExamsEngine benötigt AcademyDataApi (deps.academyData).`);
    }

    /** @type {JanusStateCore} */
    this.state = state;
    /** @type {AcademyDataApi} */
    this.academyData = academyData;
    /** @type {JanusScoringEngine|null} */
    this.scoring = scoring ?? null;
    
    this.slotResolver = slotResolver ?? null;
    /** @type {import('./calendar.js').JanusCalendarEngine|null} */
    this.calendar = calendar ?? null;
/** @type {JanusLogger|Console} */
    this.logger = logger ?? console;
  }

  // ---------------------------------------------------------------------------
  // Read-API
  // ---------------------------------------------------------------------------

  /**
   * Liefert ein Exam nach ID.
   * @param {string} id
   * @returns {any|null}
   */
  getExam(id) {
    if (!id) return null;
    try {
      return this.academyData.getExam(id);
    } catch (err) {
      this.logger?.error?.(`${MODULE_ABBREV} | getExam() fehlgeschlagen`, { id, error: err });
      return null;
    }
  }

  /**
   * Liefert alle Exams zu einer Lesson.
   * @param {string} lessonId
   * @returns {any[]}
   */
  listExamsByLesson(lessonId) {
    if (!lessonId) return [];
    try {
      return this.academyData.listExamsByLesson(lessonId) ?? [];
    } catch (err) {
      this.logger?.error?.(`${MODULE_ABBREV} | listExamsByLesson() fehlgeschlagen`, {
        lessonId,
        error: err
      });
      return [];
    }
  }

  /**
   * Liefert alle Exams, die im Kalender für einen Slot vorgesehen sind.
   *
   * Erwartete Struktur:
   *  - calendar.json entries mit type === 'exam' und/oder examId gesetzt.
   *
   * @param {import('./calendar.js').SlotRef} slotRef
   * @returns {ExamContext[]}
   */
  getExamsForSlot(slotRef) {
    if (!slotRef) return [];

    if (this.slotResolver?.resolveSlot) {
      const resolved = this.slotResolver.resolveSlot(slotRef);
      return resolved?.exams ?? [];
    }
    const { year, trimester, week, day, phase } = slotRef;

    try {
      const entries = this.academyData.findCalendarEntries({
        year,
        trimester,
        week,
        day
      });

      if (!Array.isArray(entries)) return [];

      return entries
        .filter((entry) => {
          const isExamType = entry.type === 'exam';
          const hasExamId = Boolean(entry.examId);
          if (!isExamType && !hasExamId) return false;
          if (entry.phase && entry.phase !== phase) return false;
          return true;
        })
        .map((entry) => {
          const exam = entry.examId ? this.academyData.getExam(entry.examId) : null;
          const questionSet = exam ? this.academyData.getQuestionSetForExam(exam.id) : null;
          return { calendarEntry: entry, exam, questionSet };
        });
    } catch (err) {
      this.logger?.error?.(`${MODULE_ABBREV} | getExamsForSlot() fehlgeschlagen`, {
        slotRef,
        error: err
      });
      return [];
    }
  }

  /**
   * Liefert alle Exams für den aktuellen Slot, wenn der Aufrufer einen Slot liefert.
   * (Die CalendarEngine kennt den Slot; diese Engine hat keinen direkten Calendar-Dependency.)
   *
   * @param {import('./calendar.js').JanusCalendarEngine} calendar
   * @returns {ExamContext[]}
   */
  getExamsForCurrentSlot(calendar = this.calendar) {
    if (!calendar) {
      this.logger?.warn?.(`${MODULE_ABBREV} | getExamsForCurrentSlot() ohne CalendarEngine aufgerufen.`);
      return [];
    }
    const slot = calendar.getCurrentSlotRef();
    return this.getExamsForSlot(slot);
  }

  /**
   * Liefert Question-Set für ein Exam (Multiple Choice).
   * @param {string} examId
   * @returns {any|null}
   */
  getQuestionSetForExam(examId) {
    try {
      return this.academyData.getQuestionSetForExam(examId);
    } catch (err) {
      this.logger?.error?.(`${MODULE_ABBREV} | getQuestionSetForExam() fehlgeschlagen`, {
        examId,
        error: err
      });
      return null;
    }
  }

  /**
   * Prüft, ob ein Exam als Multiple-Choice-Exam konfiguriert ist.
   * @param {string} examId
   * @returns {boolean}
   */
  isMultipleChoiceExam(examId) {
    try {
      return this.academyData.isMultipleChoiceExam(examId);
    } catch (err) {
      this.logger?.error?.(`${MODULE_ABBREV} | isMultipleChoiceExam() fehlgeschlagen`, {
        examId,
        error: err
      });
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Exam-Resultate & Scoring
  // ---------------------------------------------------------------------------

  /**
   * Schreibt ein Exam-Resultat in den State unter `academy.examResults`.
   *
   * Erwartetes Shape (vereinfachtes MVP, kompatibel zu DEFAULT_STATE-Kommentar):
   *
   * academy.examResults[actorUuid][examId] = {
   *   status: "not-taken" | "failed" | "passed" | "excellent",
   *   bestScore: number,
   *   maxScore: number,
   *   attempts: AttemptSummary[]
   * }
   *
   * @param {Object} args
   * @param {string} args.actorUuid
   * @param {string} args.examId
   * @param {string} args.status
   * @param {number} [args.score]
   * @param {number} [args.maxScore]
   * @param {any} [args.meta]
   */
  async recordExamResult({ actorUuid, examId, status, score, maxScore, meta }) {
    if (!actorUuid || !examId) {
      throw new Error('JanusExamsEngine.recordExamResult: actorUuid und examId sind erforderlich.');
    }

    const now = new Date().toISOString();
    const s = Number.isFinite(score) ? Number(score) : null;
    const m = Number.isFinite(maxScore) ? Number(maxScore) : null;

    await this.state.transaction((state) => {
      const root = this._ensureExamResultsRoot(state);
      const actorMap = (root[actorUuid] = root[actorUuid] ?? {});
      const existing = actorMap[examId] ?? {
        status: 'not-taken',
        bestScore: 0,
        maxScore: 0,
        attempts: []
      };

      const attempt = {
        timestamp: now,
        status,
        score: s,
        maxScore: m,
        meta: meta ?? null
      };

      const bestScore = Math.max(
        existing.bestScore ?? 0,
        s != null ? s : 0
      );
      const maxScoreFinal = Math.max(
        existing.maxScore ?? 0,
        m != null ? m : existing.maxScore ?? 0
      );

      const next = {
        status,
        bestScore,
        maxScore: maxScoreFinal,
        attempts: [...(existing.attempts ?? []), attempt]
      };

      actorMap[examId] = next;
      state.set(STATE_PATHS.ACADEMY_EXAM_RESULTS, root);
    });

    this.logger?.info?.(`${MODULE_ABBREV} | Exam-Resultat aufgezeichnet`, {
      actorUuid,
      examId,
      status,
      score: s,
      maxScore: m
    });

    // Downstream-Workflows benachrichtigen (LearningProgress, ExamConditionHooks)
    try {
      emitHook(HOOKS.EXAM_RESULT_RECORDED, {
        actorUuid,
        examId,
        status,
        score: s,
        maxScore: m,
        meta: meta ?? null
      });
    } catch (_) { /* hook emission darf nie den Caller crashen */ }
  }

  /**
   * Wendet ein Exam-Resultat auf die Scoring-Engine an, falls vorhanden.
   *
   * @param {any} examDef
   * @param {any} examResults
   */
  async applyScoringImpact(examDef, examResults = {}) {
    if (!this.scoring) {
      this.logger?.warn?.(
        `${MODULE_ABBREV} | applyScoringImpact() ohne ScoringEngine aufgerufen – keine Punkte vergeben.`
      );
      return;
    }

    try {
      await this.scoring.applyExamImpact(examDef, examResults);
    } catch (err) {
      this.logger?.error?.(`${MODULE_ABBREV} | applyScoringImpact() fehlgeschlagen`, {
        examId: examDef?.id,
        error: err
      });
    }
  }


  // ---------------------------------------------------------------------------
  // Grading & Convenience-APIs (0.4.2)
  // ---------------------------------------------------------------------------

  /**
   * Liefert das effektive Noten-/Statusschema für ein Exam.
   *
   * Priorität:
   *  1. examDef.gradingScheme (falls vorhanden)
   *  2. academyData.getDefaultExamGradingScheme() (falls implementiert)
   *  3. Fallback-Hardcode (fail/pass/excellent mit Prozent-Schwellen)
   *
   * @param {any} examDef
   * @returns {{ id: string, label: string, minPercent: number }[]}
   */
  getGradingScheme(examDef) {
    if (examDef?.gradingScheme && Array.isArray(examDef.gradingScheme)) {
      return examDef.gradingScheme;
    }

    try {
      const fromData = this.academyData.getDefaultExamGradingScheme?.();
      if (Array.isArray(fromData) && fromData.length > 0) {
        return fromData;
      }
    } catch (err) {
      this.logger?.warn?.(
        `${MODULE_ABBREV} | getGradingScheme(): getDefaultExamGradingScheme() fehlgeschlagen`,
        err
      );
    }

    // Fallback: hart kodiertes 3-stufiges Schema mit Prozentwerten
    return [
      { id: 'failed', label: 'Nicht bestanden', minPercent: 0 },
      { id: 'passed', label: 'Bestanden', minPercent: 50 },
      { id: 'excellent', label: 'Herausragend', minPercent: 80 }
    ];
  }

  /**
   * Leitet aus Score/MaxScore einen Status anhand eines Schemas ab.
   *
   * @param {Object} args
   * @param {number} args.score
   * @param {number} args.maxScore
   * @param {any} [args.examDef]
   * @returns {{ statusId: string, label: string, percent: number }}
   */
  determineStatusFromScore({ score, maxScore, examDef }) {
    const s = Number(score ?? 0);
    const m = Number(maxScore ?? 0) || 1;
    const percent = Math.max(0, Math.min(100, (s / m) * 100));

    const scheme = this.getGradingScheme(examDef);
    // Sortiert nach minPercent aufsteigend
    const sorted = [...scheme].sort((a, b) => (a.minPercent ?? 0) - (b.minPercent ?? 0));

    // Finde die höchste Stufe, deren minPercent <= percent
    let chosen = sorted[0];
    for (const entry of sorted) {
      if (percent >= (entry.minPercent ?? 0)) {
        chosen = entry;
      } else {
        break;
      }
    }

    return {
      statusId: chosen.id ?? 'unknown',
      label: chosen.label ?? chosen.id ?? 'Unbekannt',
      percent
    };
  }

  /**
   * Komfort-Methode: zeichnet Exam-Resultat auf und wendet optional Scoring an.
   *
   * @param {Object} args
   * @param {string} args.actorUuid
   * @param {string} args.examId
   * @param {number} args.score
   * @param {number} args.maxScore
   * @param {any} [args.examDef]
   * @param {boolean} [args.applyScoring=true]
   */
  async recordAndApplyResult({ actorUuid, examId, score, maxScore, examDef, applyScoring = true }) {
    const effectiveExam = examDef ?? this.getExam(examId);
    const grading = this.determineStatusFromScore({ score, maxScore, examDef: effectiveExam });

    await this.recordExamResult({
      actorUuid,
      examId,
      status: grading.statusId,
      score,
      maxScore,
      meta: { gradingLabel: grading.label, percent: grading.percent }
    });

    if (applyScoring && effectiveExam) {
      await this.applyScoringImpact(effectiveExam, {
        status: grading.statusId,
        score,
        maxScore,
        percent: grading.percent
      });
    }

    return grading;
  }


  /**
   * Intern: stellt sicher, dass academy.examResults im State vorhanden ist.
   * @private
   */
  _ensureExamResultsRoot(state) {
    const academy = state.get(STATE_PATHS.ACADEMY) ?? {};
    if (!academy.examResults || typeof academy.examResults !== 'object') {
      academy.examResults = {};
    }
    state.set(STATE_PATHS.ACADEMY, academy);
    return academy.examResults;
  }
}

export default JanusExamsEngine;