/**
 * @file academy/learning-progress.js
 * @module janus7
 * @phase 4
 *
 * Zweck:
 *   JanusLearningProgress: Verbindet Prüfungs-/Lektionsergebnisse mit
 *   DSA5-Skill-Steigerung und AP-Vergabe.
 *
 * Lernfortschritts-Workflow:
 *   1. Prüfung abgeschlossen → Hook 'janus7ExamResultRecorded'
 *   2. LearningProgress wertet Status + QS aus
 *   3. Bei Bestehen: awardXp() für alle Teilnehmer
 *   4. Bei Auszeichnung: advanceLessonSkills() für die Hauptskills der Lektion
 *   5. APTracker-Journal-Einträge werden automatisch geschrieben
 *
 * AP-Vergabe-Tabelle (akademiespezifisch, aus Lore abgeleitet):
 *   passed_with_distinction  → 10 AP + Talent steigern
 *   passed                   →  5 AP
 *   marginal_fail            →  2 AP (Versuch zählt)
 *   failed                   →  0 AP
 *   catastrophic_fail        →  0 AP (Nachprüfung erforderlich)
 *
 * Architektur:
 *   - Thin Coordinator: bridge.advancement → DSA5 API
 *   - Keine eigene Persistenz: nutzt JanusStateCore über bridge.state
 *   - Konfigurierbar über ap-awards.json (SSOT)
 */

import { MODULE_ABBREV } from '../core/common.js';
import { emitHook, HOOKS } from '../core/hooks/emitter.js';

export class JanusLearningProgress {
  /**
   * @param {object} deps
   * @param {import('../bridge/dsa5/index.js').DSA5SystemBridge} deps.bridge
   * @param {import('./data-api.js').AcademyDataApi} [deps.academyData]
   * @param {Console} [deps.logger]
   */
  constructor({ bridge, academyData, logger }) {
    if (!bridge) throw new Error(`${MODULE_ABBREV}: JanusLearningProgress benötigt bridge`);
    this.bridge      = bridge;
    this.academyData = academyData ?? null;
    this.logger      = logger ?? console;
    this.enabled     = true;
    this._hookId     = null;

    // AP-Vergabe-Regeln (überschreibbar via loadConfig)
    this._apAwards = {
      passed_with_distinction: { xp: 10, advanceSkills: true },
      passed:                  { xp: 5,  advanceSkills: false },
      marginal_fail:           { xp: 2,  advanceSkills: false },
      failed:                  { xp: 0,  advanceSkills: false },
      catastrophic_fail:       { xp: 0,  advanceSkills: false },
    };
  }

  // ─── Setup ────────────────────────────────────────────────────────────────

  /**
   * Überschreibt die AP-Vergabe-Regeln (aus ap-awards.json).
   * @param {object} config  - Gleiches Format wie this._apAwards
   */
  loadConfig(config) {
    if (config) {
      this._apAwards = { ...this._apAwards, ...config };
      this.logger?.info?.(`${MODULE_ABBREV} | LearningProgress | AP-Konfiguration geladen`);
    }
  }

  /**
   * Registriert Hook 'janus7ExamResultRecorded'.
   */
  register() {
    this._hookId = Hooks.on('janus7ExamResultRecorded', (data) => {
      if (!this.enabled) return;
      this._onExamResultRecorded(data).catch((err) => {
        this.logger?.error?.(`${MODULE_ABBREV} | LearningProgress | Hook fehlgeschlagen`, err);
      });
    });
    this.logger?.info?.(`${MODULE_ABBREV} | LearningProgress | Hook registriert`);
  }

  unregister() {
    if (this._hookId != null) {
      Hooks.off('janus7ExamResultRecorded', this._hookId);
      this._hookId = null;
    }
  }

  // ─── Direkte API ─────────────────────────────────────────────────────────

  /**
   * Verarbeitet ein einzelnes Prüfungsergebnis.
   * Vergibt AP und steigert ggf. Skills.
   *
   * @param {object} opts
   * @param {string}  opts.actorRef        - Actor-UUID oder ID
   * @param {string}  opts.examId
   * @param {string}  opts.status          - 'passed_with_distinction'|'passed'|...|'failed'
   * @param {number}  [opts.qualityStep]   - QS aus der Prüfung (0-6)
   * @param {object}  [opts.examDef]       - Exam-Definition aus exams.json
   * @returns {Promise<LearningResult>}
   *
   * @typedef {Object} LearningResult
   * @property {boolean} success
   * @property {string}  actorName
   * @property {number}  xpAwarded
   * @property {string[]} skillsAdvanced
   * @property {string}  status
   *
   * @example
   * const result = await learningProgress.processExamResult({
   *   actorRef: actor.uuid,
   *   examId: 'EXAM_Y1_T1_ARKANOLOGIE',
   *   status: 'passed_with_distinction',
   *   qualityStep: 5,
   * });
   */
  async processExamResult({ actorRef, examId, status, qualityStep = 0, examDef = null }) {
    const actor = await this._resolveActor(actorRef);
    if (!actor) {
      return { success: false, reason: `Actor nicht gefunden: ${actorRef}`, xpAwarded: 0, skillsAdvanced: [], status };
    }

    // AP-Regel für diesen Status
    const rule = this._apAwards[status] ?? { xp: 0, advanceSkills: false };

    // QS-Bonus: bei hoher QS extra AP
    const qsBonus = this._calculateQsBonus(qualityStep);
    const totalXp = rule.xp + qsBonus;

    let xpAwarded = 0;
    const skillsAdvanced = [];

    // AP vergeben
    if (totalXp > 0) {
      await this.bridge.advancement.awardXp(
        actor,
        totalXp,
        `Prüfung ${examId}: ${status} (QS ${qualityStep})`
      );
      xpAwarded = totalXp;
    }

    // Skills steigern (nur bei Auszeichnung)
    if (rule.advanceSkills) {
      const lessonId = examDef?.linkedLessonId ?? examDef?.lessonId ?? null;
      const lesson   = lessonId ? (this.academyData?.getLesson?.(lessonId) ?? null) : null;

      if (lesson) {
        const { advanced } = await this.bridge.advancement.advanceLessonSkills(actor, lesson, {
          weightThreshold: 0.8,
          force: false,
        });
        skillsAdvanced.push(...advanced);
      }
    }

    this.logger?.info?.(
      `${MODULE_ABBREV} | LearningProgress | ${actor.name}: ${status} → +${xpAwarded} AP, Skills: [${skillsAdvanced.join(', ')}]`
    );

    emitHook(HOOKS.LEARNING_PROGRESS_APPLIED, {
      actorUuid: actor.uuid,
      examId,
      status,
      xpAwarded,
      skillsAdvanced,
    });

    return { success: true, actorName: actor.name, xpAwarded, skillsAdvanced, status };
  }

  /**
   * Batch-Verarbeitung für eine gesamte Klasse nach einer Gruppenprüfung.
   *
   * @param {Array<{actorRef: string, status: string, qualityStep?: number}>} results
   * @param {string}  examId
   * @param {object}  [examDef]
   * @returns {Promise<LearningResult[]>}
   */
  async processBatchExamResults(results, examId, examDef = null) {
    const outcomes = [];
    for (const r of results) {
      const outcome = await this.processExamResult({
        actorRef:     r.actorRef,
        examId,
        status:       r.status,
        qualityStep:  r.qualityStep ?? 0,
        examDef,
      });
      outcomes.push(outcome);
    }

    const totalXp    = outcomes.reduce((s, r) => s + r.xpAwarded, 0);
    const succeeded  = outcomes.filter((r) => r.success).length;
    this.logger?.info?.(
      `${MODULE_ABBREV} | LearningProgress | Batch ${examId}: ${succeeded}/${results.length}, ${totalXp} AP gesamt`
    );
    return outcomes;
  }

  /**
   * Vergibt AP für regulären Unterrichtsbesuch (ohne Prüfung).
   * Kleiner Bonus für Anwesenheit.
   *
   * @param {Actor|string} actorRef
   * @param {object}       lessonDef  - Lektion aus lessons.json
   * @returns {Promise<{xpAwarded: number}>}
   */
  async processLessonAttendance(actorRef, lessonDef) {
    const actor = await this._resolveActor(actorRef);
    if (!actor) return { xpAwarded: 0 };

    // Anwesenheits-AP: 1 pro Zeitslot (durationSlots), max 3
    const slots = Math.min(3, Math.max(1, lessonDef?.durationSlots ?? 1));
    const xp    = slots;

    await this.bridge.advancement.awardXp(
      actor,
      xp,
      `Unterricht: ${lessonDef?.name ?? lessonDef?.id ?? '?'}`
    );

    return { xpAwarded: xp };
  }

  // ─── Hook-Handler ─────────────────────────────────────────────────────────

  /** @private */
  async _onExamResultRecorded({ actorUuid, examId, status, score, maxScore, examDef }) {
    const qualityStep = maxScore > 0 ? Math.min(6, Math.round((score / maxScore) * 6)) : 0;
    await this.processExamResult({ actorRef: actorUuid, examId, status, qualityStep, examDef });
  }

  // ─── Privat ───────────────────────────────────────────────────────────────

  /**
   * QS-Bonus: Extra AP für herausragende Ergebnisse.
   * QS 4 → +1, QS 5 → +2, QS 6 → +3.
   * @private
   */
  _calculateQsBonus(qualityStep) {
    const qs = Number(qualityStep) || 0;
    if (qs >= 6) return 3;
    if (qs >= 5) return 2;
    if (qs >= 4) return 1;
    return 0;
  }

  /** @private */
  async _resolveActor(actorRef) {
    if (!actorRef) return null;
    try {
      if (typeof actorRef === 'object' && actorRef.update) return actorRef;
      if (typeof actorRef === 'string' && actorRef.includes('.')) return await fromUuid(actorRef);
      return game.actors?.get(actorRef) ?? null;
    } catch {
      return null;
    }
  }
}
