/**
 * @file academy/fate-tracker.js
 * @module janus7
 * @phase 4
 *
 * Zweck:
 *   JanusFateTracker: Verbindet Schips-Verbrauch (DSA5) mit dem JANUS7-Scoring.
 *   Reagiert auf `janus7SchipUsed` und wertet akademischen Einsatz aus.
 *
 * Anwendungsfälle:
 *   1. Schip im Prüfungswürfelwurf eingesetzt → Bonus-Punkte im Scoring
 *      (zeigt "Einsatzbereitschaft", wertet Examensleistung auf)
 *   2. GM vergibt Schip als Akademie-Belohnung → FateBridge.awardFatePoint()
 *   3. Übersicht: Wie viele Schips hat jeder Student noch?
 *
 * Integration:
 *   - Hook-Eingang: `janus7SchipUsed` (gefeuert von DSA5FateBridge)
 *   - Scoring-Ausgang: JanusScoringEngine.addStudentPoints()
 *   - State-Logging: JanusStateCore.story.chronicle (Schips-Ereignisse)
 *
 * Designprinzip:
 *   Der FateTracker ist PASSIV. Er reagiert nur auf Events, schreibt nie aktiv
 *   in DSA5-Daten. Alle Mutations laufen über FateBridge.
 *
 * Schips-Scoring-Tabelle (konfigurierbar via fate-scoring.json):
 *   Personal-Schip im Examen: +5 Punkte (zeigt Einsatz)
 *   Gruppen-Schip im Examen:  +2 Punkte (kollektiver Einsatz)
 *   Schip außerhalb Examen:   +0 Punkte (nur geloggt)
 */

import { MODULE_ABBREV } from '../core/common.js';
import { emitHook, HOOKS } from '../core/hooks/emitter.js';

export class JanusFateTracker {
  /**
   * @param {object} deps
   * @param {import('../bridge/dsa5/index.js').DSA5SystemBridge} deps.bridge
   * @param {import('./scoring.js').JanusScoringEngine} [deps.scoring]
   * @param {import('./data-api.js').AcademyDataApi} [deps.academyData]
   * @param {Console} [deps.logger]
   */
  constructor({ bridge, scoring, academyData, logger }) {
    if (!bridge) throw new Error(`${MODULE_ABBREV}: JanusFateTracker benötigt bridge`);
    this.bridge      = bridge;
    this.scoring     = scoring ?? null;
    this.academyData = academyData ?? null;
    this.logger      = logger ?? console;

    this._hookId = null;

    // Scoring-Regeln (überschreibbar via loadConfig)
    this._scoringRules = {
      personalSchipDuringExam: 5,
      groupSchipDuringExam:    2,
      personalSchipOther:      0,
      groupSchipOther:         0,
    };

    // Session-Event-Log (RAM, nicht persistent)
    this._sessionEvents = [];
  }

  // ─── Setup ────────────────────────────────────────────────────────────────

  /**
   * Überschreibt Scoring-Regeln aus fate-scoring.json.
   * @param {object} config
   */
  loadConfig(config) {
    if (config?.schipScoring) {
      this._scoringRules = { ...this._scoringRules, ...config.schipScoring };
    }
  }

  register() {
    this._hookId = Hooks.on('janus7SchipUsed', (data) => {
      this._onSchipUsed(data).catch((err) => {
        this.logger?.error?.(`${MODULE_ABBREV} | FateTracker | Hook fehlgeschlagen`, err);
      });
    });
    this.logger?.info?.(`${MODULE_ABBREV} | FateTracker | Hook registriert`);
  }

  unregister() {
    if (this._hookId != null) {
      Hooks.off('janus7SchipUsed', this._hookId);
      this._hookId = null;
    }
  }

  // ─── Direkte API ─────────────────────────────────────────────────────────

  /**
   * Gibt alle Schips-Ereignisse dieser Session zurück.
   * @returns {SchipEvent[]}
   *
   * @typedef {Object} SchipEvent
   * @property {number}      worldTime
   * @property {string|null} actorId
   * @property {string|null} actorName
   * @property {'personal'|'group'} source
   * @property {number}      used
   * @property {number}      remaining
   * @property {boolean}     duringExam
   * @property {number}      scoringPoints
   */
  getSessionEvents() {
    return [...this._sessionEvents];
  }

  /**
   * Gibt den aktuellen Schips-Status aller bekannten Studenten zurück.
   * Nützlich für Control-Panel-Übersicht.
   *
   * @returns {Array<{npcId: string, actorName: string, personal: object, group: object}>}
   */
  getStudentFateStatus() {
    const students = this.academyData?.listNpcs?.()?.filter((n) => n.role === 'student') ?? [];
    const results  = [];

    for (const student of students) {
      const actorUuid = student.foundry?.actorUuid;
      if (!actorUuid) continue;

      // Actor aus game.actors suchen (best-effort)
      const actorId = actorUuid.includes('.') ? actorUuid.split('.')[1] : actorUuid;
      const actor   = game.actors?.get(actorId);

      if (!actor) continue;

      results.push({
        npcId:     student.id,
        actorName: actor.name,
        personal:  this.bridge.fate.getPersonalSchips(actor),
        group:     this.bridge.fate.getGroupSchips(),
      });
    }

    return results;
  }

  /**
   * Vergabe-Workflow: GM belohnt Schüler nach herausragender Leistung.
   * Vergibt persönliche Schips und loggt das Ereignis.
   *
   * @param {Actor|string} actorRef
   * @param {number}       [amount=1]
   * @param {string}       [reason]
   * @returns {Promise<{previous: number, next: number}>}
   *
   * @example
   * // Nach passed_with_distinction: 1 Schip als Sonderbelohnung
   * await fateTracker.awardSchip(actor, 1, 'Auszeichnung in Arkanologie-Prüfung');
   */
  async awardSchip(actorRef, amount = 1, reason = '') {
    const actor = await this._resolveActor(actorRef);
    if (!actor) throw new Error(`${MODULE_ABBREV}: Actor nicht gefunden: ${actorRef}`);

    const result = await this.bridge.fate.awardFatePoint(actor, amount);
    this.logger?.info?.(
      `${MODULE_ABBREV} | FateTracker | ${amount} Schip(s) vergeben → ${actor.name}: ${reason}`
    );
    return result;
  }

  // ─── Hook-Handler ─────────────────────────────────────────────────────────

  /**
   * Verarbeitet janus7SchipUsed-Ereignis.
   * @private
   */
  async _onSchipUsed({ actorId, actorName, source, used, previous, next, remaining, worldTime }) {
    const isPersonal  = source === 0; // SCHIP_SOURCE.PERSONAL
    const duringExam  = this._isExamActive();

    // Scoring-Punkte ermitteln
    let scoringPoints = 0;
    if (isPersonal && duringExam)  scoringPoints = this._scoringRules.personalSchipDuringExam;
    if (!isPersonal && duringExam) scoringPoints = this._scoringRules.groupSchipDuringExam;

    // Session-Log
    const event = {
      worldTime:    worldTime ?? game.time?.worldTime ?? 0,
      actorId,
      actorName:    actorName ?? actorId,
      source:       isPersonal ? 'personal' : 'group',
      used,
      previous,
      next:         remaining,
      remaining,
      duringExam,
      scoringPoints,
    };
    this._sessionEvents.push(event);

    this.logger?.info?.(
      `${MODULE_ABBREV} | FateTracker | Schip: ${actorName ?? 'Gruppe'} [${event.source}], -${used}, verbleibend: ${remaining}, Examen: ${duringExam}`
    );

    // Scoring (nur bei Prüfungs-Einsatz mit aktivem Scoring-Engine)
    if (scoringPoints > 0 && this.scoring && actorId) {
      // Studenten-ID aus actorId ableiten (via academyData-Lookup)
      const studentId = this._resolveStudentId(actorId);
      if (studentId) {
        await this.scoring.addStudentPoints(
          studentId,
          scoringPoints,
          `Schips-Einsatz (${event.source}) in Prüfung`,
          { source: 'fate', meta: { actorId, schipSource: event.source } }
        );
      }
    }

    // State-Chronicle-Eintrag (best-effort)
    emitHook(HOOKS.FATE_EVENT_TRACKED, event);
  }

  // ─── Privat ───────────────────────────────────────────────────────────────

  /**
   * Prüft ob gerade ein Examen aktiv ist.
   * Nutzt game.janus7.academy.exams falls verfügbar.
   * @private
   */
  _isExamActive() {
    try {
      const exams = game.janus7?.academy?.exams;
      if (!exams) return false;
      // JanusExamEngine.activeExam / currentExamRun
      return Boolean(exams.activeExam ?? exams.currentExamRun ?? exams.isActive?.());
    } catch {
      return false;
    }
  }

  /**
   * Löst actorId → studentId auf (JANUS7-NPC-ID).
   * @private
   */
  _resolveStudentId(actorId) {
    if (!this.academyData?.listNpcs) return null;
    const npc = this.academyData.listNpcs().find((n) => {
      const uuid = n.foundry?.actorUuid ?? '';
      const id   = uuid.includes('.') ? uuid.split('.')[1] : uuid;
      return id === actorId;
    });
    return npc?.id ?? null;
  }

  /** @private */
  async _resolveActor(actorRef) {
    if (!actorRef) return null;
    if (typeof actorRef === 'object' && actorRef.update) return actorRef;
    if (typeof actorRef === 'string' && actorRef.includes('.')) return await fromUuid(actorRef);
    return game.actors?.get(actorRef) ?? null;
  }
}
