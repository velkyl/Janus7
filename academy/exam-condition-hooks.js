/**
 * @file academy/exam-condition-hooks.js
 * @module janus7
 * @phase 4
 *
 * Zweck:
 *   Verknüpft Prüfungsergebnisse mit zeitlich begrenzten DSA5-Conditions.
 *
 *   Nach jeder Prüfung:
 *   - Bestanden mit Glanz → euphoria (2h)
 *   - Bestanden           → (keine Condition)
 *   - Knapp nicht bestanden → post_exam_fatigue (1 Tag)
 *   - Durchgefallen        → exam_panic + stress (1 Tag + 1 Woche)
 *   - Patzer/Katastrophe   → magic_shock + exam_panic
 *
 *   Regeln sind in EXAM_OUTCOME_CONDITIONS konfiguriert (data-driven).
 *   Können per examDef.conditionRules überschrieben werden.
 *
 * Architektur:
 *   - Registriert sich auf Hook 'janus7GroupExamCompleted' (aus group-exam.js)
 *   - Registriert sich auf Hook 'janus7ExamResultRecorded' (aus exams.js)
 *   - Kein direkter dsa5-Zugriff — alles über bridge.applyTimedAcademyCondition()
 *   - Kann deaktiviert werden: JanusExamConditionHooks.enabled = false
 */

import { MODULE_ABBREV } from '../core/common.js';

// ─── Konfiguration: Outcome → Conditions ─────────────────────────────────────

/**
 * Mapping: Prüfungs-StatusId → Liste von Akademie-Zuständen die angewendet werden.
 *
 * Format: statusId → [{ janusCondition, secondsOverride? }]
 *
 * Passt zu den typischen gradingScheme-IDs aus exams.json:
 *   'passed_with_distinction', 'passed', 'marginal_fail', 'failed', 'catastrophic_fail'
 *
 * Kann per examDef.conditionRules vollständig überschrieben werden.
 *
 * @type {Record<string, Array<{janusCondition: string, secondsOverride?: number}>>}
 */
export const EXAM_OUTCOME_CONDITIONS = Object.freeze({
  // Ausgezeichnet bestanden → kurzer Euphorie-Flash
  passed_with_distinction: [
    { janusCondition: 'euphoria' },
  ],

  // Normal bestanden → keine Condition
  passed: [],

  // Knapp nicht bestanden → 1 Tag Erschöpfung
  marginal_fail: [
    { janusCondition: 'post_exam_fatigue' },
  ],

  // Durchgefallen → Panik + Stress
  failed: [
    { janusCondition: 'exam_panic' },
    { janusCondition: 'stress' },
  ],

  // Katastrophales Versagen → Magieschock + Panik
  catastrophic_fail: [
    { janusCondition: 'magic_shock' },
    { janusCondition: 'exam_panic' },
    { janusCondition: 'stress' },
  ],
});

// ─── Hook-Manager ─────────────────────────────────────────────────────────────

export class JanusExamConditionHooks {
  /**
   * @param {object} deps
   * @param {import('../bridge/dsa5/index.js').DSA5SystemBridge} deps.bridge
   * @param {Console} [deps.logger]
   */
  constructor({ bridge, logger }) {
    if (!bridge) throw new Error(`${MODULE_ABBREV}: JanusExamConditionHooks benötigt bridge`);
    this.bridge  = bridge;
    this.logger  = logger ?? console;
    this.enabled = true;
    this._hookIds = [];
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Hooks registrieren. Sollte einmal beim Bootstrap aufgerufen werden.
   */
  register() {
    // Hook von group-exam.js: Gruppenprüfung abgeschlossen
    const gcHookId = Hooks.on('janus7GroupExamCompleted', (data) => {
      if (!this.enabled) return;
      this._onGroupExamCompleted(data).catch((err) => {
        this.logger?.error?.(`${MODULE_ABBREV} | ExamConditionHooks | janus7GroupExamCompleted fehlgeschlagen`, err);
      });
    });
    this._hookIds.push({ name: 'janus7GroupExamCompleted', id: gcHookId });

    // Hook von exams.js: Einzelergebnis aufgezeichnet
    const examHookId = Hooks.on('janus7ExamResultRecorded', (data) => {
      if (!this.enabled) return;
      this._onExamResultRecorded(data).catch((err) => {
        this.logger?.error?.(`${MODULE_ABBREV} | ExamConditionHooks | janus7ExamResultRecorded fehlgeschlagen`, err);
      });
    });
    this._hookIds.push({ name: 'janus7ExamResultRecorded', id: examHookId });

    this.logger?.info?.(`${MODULE_ABBREV} | ExamConditionHooks | Hooks registriert`);
  }

  /**
   * Hooks deregistrieren (z.B. beim Teardown).
   */
  unregister() {
    for (const { name, id } of this._hookIds) {
      Hooks.off(name, id);
    }
    this._hookIds = [];
  }

  // ─── Handler ───────────────────────────────────────────────────────────────

  /**
   * Verarbeitet Gruppenprüfungs-Ergebnis.
   * Wendet Conditions auf alle gradingPerActor-Einträge an.
   *
   * @param {import('./group-exam.js').GroupExamOutcome} data
   * @private
   */
  async _onGroupExamCompleted({ examId, gradingPerActor, gcResult: _gcResult }) {
    if (!gradingPerActor?.length) return;

    this.logger?.info?.(`${MODULE_ABBREV} | ExamConditionHooks | GC abgeschlossen`, {
      examId,
      participants: gradingPerActor.length,
    });

    for (const grading of gradingPerActor) {
      const actorId = grading.actorId;
      if (!actorId) continue;

      await this._applyConditionsForStatus(actorId, grading.statusId, examId);
    }
  }

  /**
   * Verarbeitet einzelnes Prüfungsergebnis (von exams.recordExamResult).
   *
   * Erwartetes Event-Format:
   * { actorUuid, examId, status, examDef? }
   *
   * @private
   */
  async _onExamResultRecorded({ actorUuid, examId, status, examDef }) {
    if (!actorUuid || !status) return;
    await this._applyConditionsForStatus(actorUuid, status, examId, examDef);
  }

  /**
   * Kernlogik: wendet Conditions für einen statusId an.
   *
   * @param {string} actorRef
   * @param {string} statusId
   * @param {string} [examId]
   * @param {object} [examDef]
   * @private
   */
  async _applyConditionsForStatus(actorRef, statusId, examId, examDef = null) {
    if (!statusId) {
      this.logger?.warn?.(`${MODULE_ABBREV} | ExamConditionHooks | Kein statusId übergeben`, { actorRef, examId });
      return;
    }

    // examDef kann eigene conditionRules definieren → überschreibt EXAM_OUTCOME_CONDITIONS
    const rules = examDef?.conditionRules ?? EXAM_OUTCOME_CONDITIONS;

    // Explizit prüfen ob der statusId überhaupt bekannt ist – verhindert TypeError bei .forEach
    if (!(statusId in rules)) {
      this.logger?.warn?.(
        `${MODULE_ABBREV} | ExamConditionHooks | Unbekannte statusId – kein Condition-Mapping vorhanden`,
        { statusId, examId, actorRef, knownIds: Object.keys(rules) }
      );
      return;
    }

    const conditions = rules[statusId] ?? [];

    if (!conditions.length) {
      this.logger?.debug?.(`${MODULE_ABBREV} | ExamConditionHooks | Keine Conditions für ${statusId}`);
      return;
    }

    this.logger?.info?.(`${MODULE_ABBREV} | ExamConditionHooks | Conditions für ${statusId}`, {
      actorRef,
      conditions: conditions.map((c) => c.janusCondition),
    });

    for (const condConfig of conditions) {
      try {
        await this.bridge.applyTimedAcademyCondition(actorRef, condConfig.janusCondition, {
          secondsOverride: condConfig.secondsOverride,
        });
      } catch (err) {
        this.logger?.warn?.(
          `${MODULE_ABBREV} | ExamConditionHooks | Condition fehlgeschlagen`,
          { actorRef, janusCondition: condConfig.janusCondition, error: err?.message }
        );
        // Nicht weiter werfen — ein fehlgeschlagener Condition-Apply stoppt nicht die anderen
      }
    }
  }
}

