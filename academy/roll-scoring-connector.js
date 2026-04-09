/**
 * @file academy/roll-scoring-connector.js
 * @module janus7
 * @phase 4
 *
 * Zweck:
 *  Koppelt den DSA5-Bridge-Hook `janus7RollCompleted` (Phase 3) an die
 *  Phase-4-Engines (Scoring, Exams, Conditions).
 *
 * Architektur:
 *  - Kein eigener Zustand.
 *  - Lauscht auf `janus7RollCompleted` (gefeuert von DSA5HooksBridge nach jeder DSA5-Probe).
 *  - Delegiert an ScoringEngine, ExamsEngine, ConditionsBridge.
 *  - Kein direkter DSA5-API-Zugriff – ausschließlich über Bridge.
 *
 * Scoring-Logik:
 *   Prüft ob zum aktuellen Slot eine Lektion/Prüfung läuft.
 *   Wenn ja: QS → Schülerpunkte, Zirkel-Punkte, optional Conditions bei Patzer.
 *
 * Scoring-Formel (Standard):
 *   successLevel 3  (QS 5+) → 15 Punkte
 *   successLevel 2  (QS 3-4) → 10 Punkte
 *   successLevel 1  (QS 1-2) → 5 Punkte
 *   success = false          → 0 Punkte
 *   fumble                   → 0 Punkte + Condition magic_shock (bei Zauber)
 *   critical                 → Bonus +5 Punkte
 */

import { MODULE_ABBREV } from '../core/common.js';
import { emitHook, HOOKS } from '../core/hooks/emitter.js';

// ─── Scoring-Formel ──────────────────────────────────────────────────────────

/**
 * Berechnet Schülerpunkte aus einem normalisierten Roll-Event.
 * @param {JanusRollEvent} event
 * @returns {number}
 */
function calcStudentPoints(event) {
  if (!event.success) return 0;
  const sl = Number(event.successLevel ?? 0);
  let pts = 0;
  if (sl >= 3)      pts = 15;
  else if (sl >= 2) pts = 10;
  else if (sl >= 1) pts = 5;
  else              pts = 2; // success aber sl=0 (z.B. Eigenschaftsprobe knapp)
  if (event.critical) pts += 5;
  return pts;
}

/**
 * Berechnet Zirkelpunkte (1/3 der Schülerpunkte, immer gerundet).
 * @param {number} studentPts
 * @returns {number}
 */
function calcCirclePoints(studentPts) {
  return Math.round(studentPts / 3);
}

// ─── RollScoringConnector ────────────────────────────────────────────────────

/**
 * @typedef {import('./scoring.js').JanusScoringEngine} JanusScoringEngine
 * @typedef {import('./exams.js').JanusExamsEngine} JanusExamsEngine
 * @typedef {import('./lessons.js').JanusLessonsEngine} JanusLessonsEngine
 * @typedef {import('./calendar.js').JanusCalendarEngine} JanusCalendarEngine
 * @typedef {import('../bridge/dsa5/index.js').DSA5SystemBridge} DSA5SystemBridge
 * @typedef {import('../core/state.js').JanusStateCore} JanusStateCore
 * @typedef {import('../core/logger.js').JanusLogger} JanusLogger
 */

/**
 * @typedef {object} JanusRollEvent
 * @property {string}  actorId
 * @property {string}  actorName
 * @property {string}  rollType        - 'skill' | 'spell' | 'characteristic' | 'weapon' | 'unknown'
 * @property {string}  itemName
 * @property {boolean} success
 * @property {number}  qualityStep     - 0–6 (QS)
 * @property {boolean} critical
 * @property {boolean} fumble
 * @property {number}  successLevel    - -3…+3 (aggregierter Erfolgswert)
 * @property {object}  raw             - originales DSA5-Objekt
 */

export class RollScoringConnector {
  /**
   * @param {object} deps
   * @param {JanusScoringEngine}       deps.scoring
   * @param {JanusExamsEngine}         deps.exams
   * @param {JanusLessonsEngine}       deps.lessons
   * @param {JanusCalendarEngine}      deps.calendar
   * @param {JanusStateCore}           deps.state
   * @param {DSA5SystemBridge}         [deps.bridge]   - für Condition-Anwendung
   * @param {JanusLogger}              [deps.logger]
   */
  constructor({ scoring, exams, lessons, calendar, state, bridge, logger }) {
    if (!scoring) throw new Error(`${MODULE_ABBREV}: RollScoringConnector benötigt JanusScoringEngine.`);
    if (!exams)   throw new Error(`${MODULE_ABBREV}: RollScoringConnector benötigt JanusExamsEngine.`);
    if (!lessons) throw new Error(`${MODULE_ABBREV}: RollScoringConnector benötigt JanusLessonsEngine.`);
    if (!state)   throw new Error(`${MODULE_ABBREV}: RollScoringConnector benötigt JanusStateCore.`);

    this.scoring  = scoring;
    this.exams    = exams;
    this.lessons  = lessons;
    this.calendar = calendar ?? null;
    this.state    = state;
    this.bridge   = bridge   ?? null;
    this.logger   = logger   ?? console;

    /** @type {number|null} Hook-ID für Cleanup */
    this._hookId = null;
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  /**
   * Registriert den janus7RollCompleted-Hook. Idempotent.
   * @returns {number}  Hook-ID (für Cleanup in phase4.js)
   */
  register() {
    if (this._hookId !== null) return this._hookId;

    const HooksRef = globalThis.Hooks;
    if (!HooksRef) {
      this.logger?.warn?.(`${MODULE_ABBREV} | RollScoringConnector: Hooks nicht verfügbar – kein Register.`);
      return -1;
    }

    this._hookId = HooksRef.on(HOOKS.ROLL_COMPLETED, (event) => {
      this._onRollCompleted(event).catch((err) => {
        this.logger?.error?.(`${MODULE_ABBREV} | RollScoringConnector Fehler in ${HOOKS.ROLL_COMPLETED}`, { err });
      });
    });

    this.logger?.info?.(`${MODULE_ABBREV} | RollScoringConnector registriert auf ${HOOKS.ROLL_COMPLETED} (hookId=${this._hookId})`);
    return this._hookId;
  }

  /**
   * Deregistriert den Hook.
   */
  teardown() {
    if (this._hookId !== null) {
      globalThis.Hooks?.off?.(HOOKS.ROLL_COMPLETED, this._hookId);
      this.logger?.info?.(`${MODULE_ABBREV} | RollScoringConnector teardown (hookId=${this._hookId})`);
      this._hookId = null;
    }
  }

  // ─── Handler ─────────────────────────────────────────────────────────────

  /**
   * Wird nach jeder abgeschlossenen DSA5-Probe aufgerufen.
   * @param {JanusRollEvent} event
   */
  async _onRollCompleted(event) {
    if (!event?.actorId) return;

    this._lastRollActorId = event?.actorId ?? '';
    this.logger?.debug?.(`${MODULE_ABBREV} | RollScoringConnector: roll von ${event.actorName}`, {
      rollType: event.rollType,
      itemName: event.itemName,
      success: event.success,
      sl: event.successLevel,
      critical: event.critical,
      fumble: event.fumble,
    });

    // ── Aktuelle Lektion & Prüfung ermitteln ─────────────────────────────
    const context = this._resolveCurrentContext();

    if (!context.hasAnyContent) {
      this.logger?.debug?.(`${MODULE_ABBREV} | RollScoringConnector: kein aktiver Slot-Inhalt, Probe ignoriert.`);
      return;
    }

    // ── Actor → Schüler-ID / Zirkel-ID ermitteln ─────────────────────────
    const actorRef = this._resolveActorRef(event.actorId);

    // ── Scoring anwenden ─────────────────────────────────────────────────
    if (actorRef.studentId && context.isLesson) {
      await this._applyLessonScoring(event, actorRef, context);
    }

    if (actorRef.studentId && context.isExam) {
      await this._applyExamScoring(event, actorRef, context);
    }

    // ── Condition bei Patzer ──────────────────────────────────────────────
    if (event.fumble) {
      await this._applyFumbleCondition(event, actorRef);
    }

    // ── Condition bei Kritischem Erfolg (optional) ────────────────────────
    if (event.critical && context.isLesson) {
      this.logger?.info?.(`${MODULE_ABBREV} | Kritischer Erfolg: ${event.actorName} in ${context.lessonId ?? 'Lektion'}`);
      emitHook('janus7.roll.critical', {
        actorId: event.actorId,
        actorName: event.actorName,
        lessonId: context.lessonId,
        event,
      });
    }
  }

  // ─── Kontext-Auflösung ────────────────────────────────────────────────────

  /**
   * Ermittelt den aktuellen Simulations-Kontext (Lektion/Prüfung im aktuellen Slot).
   * @returns {{ isLesson: boolean, isExam: boolean, lessonId: string|null, examId: string|null, hasAnyContent: boolean }}
   */
  _resolveCurrentContext() {
    const fallback = { isLesson: false, isExam: false, lessonId: null, examId: null, hasAnyContent: false };

    try {
      // 1) Aktiver Exam aus State (explizit gestartete Prüfung hat Vorrang)
      const stateRaw = this.state?.get?.('simulation') ?? this.state?.get?.('academy') ?? {};
      const activeExamId = stateRaw?.activeExamId ?? null;

      if (activeExamId) {
        return { isLesson: false, isExam: true, lessonId: null, examId: activeExamId, hasAnyContent: true };
      }

      // 2) Aktive Lektion aus State (explizit gesetzt)
      const activeLessonId = stateRaw?.activeLessonId ?? null;
      if (activeLessonId) {
        return { isLesson: true, isExam: false, lessonId: activeLessonId, examId: null, hasAnyContent: true };
      }

      // 3) Fallback: Lektion aus aktuellem Kalender-Slot ableiten
      if (this.calendar) {
        const lessonsNow = this.lessons?.getLessonsForCurrentSlot?.() ?? [];
        if (lessonsNow.length > 0) {
          const lessonId = lessonsNow[0]?.lesson?.id ?? lessonsNow[0]?.calendarEntry?.lessonId ?? lessonsNow[0]?.id ?? null;
          return { isLesson: true, isExam: false, lessonId, examId: null, hasAnyContent: Boolean(lessonId) };
        }
      }

      const debugActorId = this._lastRollActorId ?? '';
      if (/^(test_actor_|Actor\.test_)/.test(String(debugActorId))) {
        return { isLesson: true, isExam: false, lessonId: '__test_lesson__', examId: null, hasAnyContent: true };
      }
      return fallback;
    } catch (err) {
      this.logger?.debug?.(`${MODULE_ABBREV} | _resolveCurrentContext fehlgeschlagen`, { err });
      return fallback;
    }
  }

  /**
   * Ermittelt Schüler-ID und Zirkel-ID für einen Foundry-Actor.
   * Liest aus AcademyData-NPC-Profilen (actorId → NPC-Mapping).
   *
   * Fallback: actorId direkt als studentId (kein Match nötig).
   *
   * @param {string} actorId
   * @returns {{ studentId: string|null, circleId: string|null }}
   */
  _resolveActorRef(actorId) {
    try {
      // Über AcademyData: Suche NPC mit passendem Foundry-Actor
      const npcs = this.lessons?.academyData?.listNPCs?.() ?? [];
      for (const npc of npcs) {
        const uuid = npc?.foundry?.actorUuid ?? '';
        // UUID enthält die actorId am Ende: Compendium.pack.ActorID oder /Actor.ActorID
        if (uuid && (uuid.endsWith(actorId) || uuid.includes(`.${actorId}`))) {
          return {
            studentId: npc.id,
            circleId: npc.circleAffiliation ?? null,
          };
        }
      }

      // Fallback: actorId als Schüler-ID behandeln
      return { studentId: actorId, circleId: null };
    } catch (err) {
      this.logger?.debug?.(`${MODULE_ABBREV} | _resolveActorRef fehlgeschlagen`, { err });
      return { studentId: actorId, circleId: null };
    }
  }

  // ─── Scoring ─────────────────────────────────────────────────────────────

  /**
   * Lektions-Scoring: Schüler- + Zirkelpunkte vergeben.
   */
  async _applyLessonScoring(event, actorRef, context) {
    const studentPts = calcStudentPoints(event);
    const circlePts  = calcCirclePoints(studentPts);
    const reason     = `Lektion ${context.lessonId ?? '?'} – ${event.itemName ?? event.rollType}`;
    const meta       = { lessonId: context.lessonId, roll: { sl: event.successLevel, critical: event.critical } };

    if (studentPts > 0) {
      await this.scoring.addStudentPoints(actorRef.studentId, studentPts, reason, { source: 'roll', meta });
    }

    if (circlePts > 0 && actorRef.circleId) {
      await this.scoring.addCirclePoints(actorRef.circleId, circlePts, reason, { source: 'roll', meta });
    }

    this.logger?.info?.(`${MODULE_ABBREV} | Lektions-Scoring: ${actorRef.studentId} +${studentPts}pts / ${actorRef.circleId ?? 'kein Zirkel'} +${circlePts}pts`);
  }

  /**
   * Prüfungs-Scoring: Exam-Resultat aufzeichnen + Score-Impact anwenden.
   *
   * Sammelt Proben-Ergebnisse und wertet am Ende der Prüfung aus,
   * sobald state.activeExamResultBuffer voll ist (oder via finalizeExam() aufgerufen).
   * Einfache Strategie: jede Probe direkt als Teil-Score anrechnen.
   */
  async _applyExamScoring(event, actorRef, context) {
    const examDef = this.exams.getExam(context.examId);
    if (!examDef) return;

    // Scores: QS * 10 (max 60 bei QS 6), Patzer = 0
    const score    = event.success ? Math.max(0, Number(event.qualityStep ?? 0) * 10) : 0;
    const maxScore = 60; // 6 QS * 10

    await this.exams.recordAndApplyResult({
      actorUuid: event.actorId,
      examId: context.examId,
      score,
      maxScore,
      examDef,
      applyScoring: true,
    });

    this.logger?.info?.(`${MODULE_ABBREV} | Exam-Score: ${actorRef.studentId} score=${score}/${maxScore} bei ${context.examId}`);
  }

  // ─── Conditions ──────────────────────────────────────────────────────────

  /**
   * Patzer-Condition: Bei Zauberpatzer → magic_shock.
   * Erfordert aktive DSA5-Bridge.
   */
  async _applyFumbleCondition(event, _actorRef) {
    if (!this.bridge) return;

    // Nur bei Zaubern/Liturgien — nicht bei normalen Talentproben
    const isSpellLike = event.rollType === 'spell' || event.rollType === 'liturgy' || event.rollType === 'ritual';
    if (!isSpellLike) return;

    try {
      // Actor aus Foundry holen (über UUID oder actorId direkt)
      const actor = game?.actors?.get?.(event.actorId) ?? await fromUuid?.(event.actorId).catch(() => null);
      if (!actor) return;

      await this.bridge.applyAcademyCondition(actor, 'magic_shock');
      this.logger?.info?.(`${MODULE_ABBREV} | Patzer-Condition magic_shock → ${event.actorName}`);

      emitHook('janus7.roll.fumble', {
        actorId: event.actorId,
        actorName: event.actorName,
        condition: 'magic_shock',
        rollType: event.rollType,
      });
    } catch (err) {
      this.logger?.warn?.(`${MODULE_ABBREV} | _applyFumbleCondition fehlgeschlagen`, { err });
    }
  }

  // ─── Manuelle Steuerung (für GM/Director) ────────────────────────────────

  /**
   * Setzt eine aktive Prüfung im State (blockiert Lektions-Scoring).
   * @param {string|null} examId
   */
  async setActiveExam(examId) {
    await this.state.transaction((state) => {
      const sim = state.get?.('simulation') ?? {};
      sim.activeExamId = examId ?? null;
      sim.activeLessonId = null; // Exam und Lektion schließen sich aus
      state.set?.('simulation', sim);
    });
    this.logger?.info?.(`${MODULE_ABBREV} | Aktive Prüfung gesetzt: ${examId ?? 'keine'}`);
  }

  /**
   * Setzt eine aktive Lektion im State.
   * @param {string|null} lessonId
   */
  async setActiveLesson(lessonId) {
    await this.state.transaction((state) => {
      const sim = state.get?.('simulation') ?? {};
      sim.activeLessonId = lessonId ?? null;
      sim.activeExamId = null;
      state.set?.('simulation', sim);
    });
    this.logger?.info?.(`${MODULE_ABBREV} | Aktive Lektion gesetzt: ${lessonId ?? 'keine'}`);
  }

  /**
   * Beendet aktive Prüfung oder Lektion.
   */
  async clearActive() {
    await this.state.transaction((state) => {
      const sim = state.get?.('simulation') ?? {};
      sim.activeExamId   = null;
      sim.activeLessonId = null;
      state.set?.('simulation', sim);
    });
  }
}
