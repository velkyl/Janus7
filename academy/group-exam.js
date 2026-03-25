/**
 * @file academy/group-exam.js
 * @module janus7
 * @phase 4b
 *
 * Zweck:
 *   Erweiterung der JanusExamsEngine um DSA5-Gruppenprobe-Support.
 *   triggerGroupExam() kombiniert:
 *     1. Prüfungsdefinition aus AcademyDataApi lesen
 *     2. Bridge.conductGroupExam() starten (erzeugt GC-Chat-Message)
 *     3. Auf Ergebnisse warten
 *     4. recordAndApplyResult() pro Teilnehmer aufrufen
 *
 * Architektur:
 *   - Kein direkter dsa5-Zugriff — alles über bridge.groupCheck.*
 *   - bridge ist OPTIONAL: fehlt sie, fällt die Methode auf manuelle Erfassung zurück.
 *   - Keine UI-Logik in dieser Datei.
 *
 * Integration:
 *   Diese Datei wird von phase4.js importiert und als Mixin in JanusExamsEngine
 *   eingehängt (Object.assign auf Prototype), damit die Hauptdatei sauber bleibt.
 *
 * Verwendung:
 *   // Aus der Exam-Engine oder direkt via API:
 *   const result = await game.janus7.academy.exams.triggerGroupExam({
 *     examId: 'EXAM_MAG_BASICS_01',
 *     bridge: game.janus7.bridge.dsa5,
 *     participantActorIds: ['Actor.abc123', 'Actor.def456'],
 *     modifier: -2,
 *     timeoutMs: 600_000,
 *   });
 */

import { MODULE_ABBREV } from '../core/common.js';
import { emitHook, HOOKS } from '../core/hooks/emitter.js';

/**
 * @typedef {Object} GroupExamOptions
 * @property {string}   examId                 - ID aus exams.json
 * @property {object}   bridge                 - DSA5SystemBridge-Instanz
 * @property {string[]} [participantActorIds]  - Actor-UUIDs oder IDs; optional
 * @property {string}   [skillNameOverride]    - Überschreibt exam.skill (für adhoc-Prüfungen)
 * @property {number}   [modifierOverride]     - Überschreibt exam.modifier
 * @property {number}   [targetQsOverride]     - Überschreibt berechnetes Ziel
 * @property {number}   [timeoutMs=600000]     - Wartezeit auf alle Würfe
 * @property {boolean}  [applyScoring=true]    - Scoring-Impact anwenden
 * @property {boolean}  [recordResults=true]   - Einzelergebnisse in State speichern
 */

/**
 * @typedef {Object} GroupExamOutcome
 * @property {boolean}  targetMet    - GC-Ziel erreicht
 * @property {number}   totalQs      - Gesamt-QS
 * @property {number}   successCount
 * @property {number}   failCount
 * @property {boolean}  botched
 * @property {string}   messageId    - DSA5 Chat-Message-ID
 * @property {Array}    gradingPerActor  - Pro Actor: { actorId, statusId, label, percent }
 */

/**
 * Mixin-Methoden für JanusExamsEngine.
 * Werden via Object.assign(JanusExamsEngine.prototype, GroupExamMixin) eingehängt.
 */
export const GroupExamMixin = {

  /**
   * Startet eine DSA5-Gruppenprobe für eine Prüfung und wertet sie aus.
   *
   * @param {GroupExamOptions} opts
   * @returns {Promise<GroupExamOutcome>}
   *
   * @example
   * const outcome = await exams.triggerGroupExam({
   *   examId: 'EXAM_MAG_BASICS_01',
   *   bridge: game.janus7.bridge.dsa5,
   *   participantActorIds: students.map(s => s.foundryUuid),
   *   modifier: -2,
   * });
   * if (outcome.targetMet) {
   *   ui.notifications.info('Klasse hat die Prüfung bestanden!');
   * }
   */
  async triggerGroupExam({
    examId,
    bridge,
    participantActorIds = [],
    skillNameOverride = null,
    modifierOverride = null,
    targetQsOverride = null,
    timeoutMs = 600_000,
    applyScoring = true,
    recordResults = true,
  }) {
    const log = this.logger ?? console;

    // ── 1. Prüfungsdefinition laden ─────────────────────────────────────────
    const examDef = this.getExam(examId);
    if (!examDef) {
      log.error?.(`${MODULE_ABBREV} | GroupExam | Prüfung nicht gefunden: ${examId}`);
      throw new Error(`JANUS7 GroupExam: Unbekannte examId "${examId}"`);
    }

    // ── 2. Parameter zusammenstellen ────────────────────────────────────────
    const skillName = skillNameOverride ?? examDef.skill ?? examDef.skillName;
    if (!skillName) {
      throw new Error(`JANUS7 GroupExam: Exam "${examId}" hat kein 'skill'-Feld`);
    }

    const modifier = modifierOverride ?? examDef.modifier ?? 0;
    const maxRolls = participantActorIds.length > 0
      ? participantActorIds.length
      : (examDef.expectedParticipants ?? 6);

    // Ziel-QS: aus examDef.targetQs ODER als 2 QS pro Teilnehmer (DSA5-Daumenregel)
    const targetQs = targetQsOverride
      ?? examDef.targetQs
      ?? Math.max(1, Math.floor(maxRolls * 2));

    const label = examDef.name ?? examDef.title ?? examId;

    log.info?.(`${MODULE_ABBREV} | GroupExam | Starte Gruppenprüfung`, {
      examId,
      skillName,
      modifier,
      maxRolls,
      targetQs,
      label,
    });

    // ── 3. Bridge-Verfügbarkeit prüfen ──────────────────────────────────────
    if (!bridge?.groupCheck?.conductGroupExam) {
      log.warn?.(`${MODULE_ABBREV} | GroupExam | Bridge.groupCheck nicht verfügbar — fallback auf manuell`);
      // Graceful fallback: GC-Platzhalter-Ergebnis ohne tatsächliche Proben
      return this._buildManualFallbackOutcome(examId, participantActorIds);
    }

    // ── 4. DSA5-Gruppenprobe auslösen und warten ────────────────────────────
    let gcResult;
    try {
      gcResult = await bridge.groupCheck.conductGroupExam({
        skillName,
        modifier,
        maxRolls,
        expectedRolls: maxRolls,
        targetQs,
        label,
        timeoutMs,
      });
    } catch (err) {
      log.error?.(`${MODULE_ABBREV} | GroupExam | conductGroupExam fehlgeschlagen`, { error: err?.message });
      throw err;
    }

    log.info?.(`${MODULE_ABBREV} | GroupExam | GC abgeschlossen`, {
      totalQs: gcResult.totalQs,
      targetMet: gcResult.targetMet,
      successCount: gcResult.successCount,
      failCount: gcResult.failCount,
    });

    // ── 5. Ergebnisse pro Teilnehmer zuordnen und speichern ──────────────────
    const gradingPerActor = [];

    if (recordResults && participantActorIds.length > 0) {
      // DSA5 GC-Ergebnisse sind nach Würfel-Reihenfolge geordnet.
      // Wir ordnen sie den Teilnehmern in gleicher Reihenfolge zu.
      // Wenn mehr Würfe als IDs: überschüssige ignorieren.
      // Wenn weniger Würfe: fehlende als 'absent' werten.
      const gcEntries = gcResult.results ?? [];

      for (let i = 0; i < participantActorIds.length; i++) {
        const actorId = participantActorIds[i];
        const entry = gcEntries[i] ?? null;

        // Einzelergebnis für diesen Actor: QS aus GC-Eintrag oder 0 bei Fehlen
        const individualQs = entry?.qs ?? 0;
        const individualSuccess = entry ? (entry.success ?? 0) >= 0 : false;

        // Score: QS als Score, maxScore = targetQs / maxRolls (Anteil)
        const individualMaxScore = Math.ceil(targetQs / maxRolls);
        const score = individualSuccess ? Math.max(1, individualQs) : 0;

        const grading = this.determineStatusFromScore({
          score,
          maxScore: individualMaxScore,
          examDef,
        });

        gradingPerActor.push({
          actorId,
          statusId: grading.statusId,
          label: grading.label,
          percent: grading.percent,
          qs: individualQs,
        });

        if (recordResults) {
          try {
            await this.recordAndApplyResult({
              actorUuid: actorId,
              examId,
              score,
              maxScore: individualMaxScore,
              examDef,
              applyScoring,
            });
          } catch (err) {
            log.warn?.(`${MODULE_ABBREV} | GroupExam | recordAndApplyResult fehlgeschlagen für Actor`, {
              actorId,
              error: err?.message,
            });
          }
        }
      }
    } else if (recordResults) {
      // Keine konkreten Actor-IDs: nur Gesamt-Score loggen
      log.info?.(`${MODULE_ABBREV} | GroupExam | Keine participantActorIds — Einzel-Recording übersprungen`);
    }

    // ── 6. Hook feuern ───────────────────────────────────────────────────────
    emitHook(HOOKS.GROUP_EXAM_COMPLETED, {
      examId,
      gcResult,
      gradingPerActor,
      targetMet: gcResult.targetMet,
    });

    return {
      targetMet: gcResult.targetMet,
      totalQs: gcResult.totalQs,
      successCount: gcResult.successCount,
      failCount: gcResult.failCount,
      botched: gcResult.botched,
      messageId: gcResult.messageId,
      gradingPerActor,
    };
  },

  /**
   * Fallback wenn Bridge nicht verfügbar.
   * @private
   */
  _buildManualFallbackOutcome(examId, participantActorIds) {
    return {
      targetMet: false,
      totalQs: 0,
      successCount: 0,
      failCount: participantActorIds.length,
      botched: false,
      messageId: null,
      gradingPerActor: participantActorIds.map((id) => ({
        actorId: id,
        statusId: 'manual',
        label: 'Manuell auswerten',
        percent: 0,
        qs: 0,
      })),
      _fallback: true,
    };
  },
};
