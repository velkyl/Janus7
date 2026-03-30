import { STATE_PATHS } from '../core/common.js';
/**
 * @file academy/scoring.js
 * @module janus7
 * @phase 4
 *
 * Zweck:
 *  JanusScoringEngine: verwaltet Haus-/Zirkelpunkte und individuelle Schülerpunkte.
 *
 * Architektur:
 *  - Einzige Instanz, die JanusStateCore.scoring mutiert.
 *  - Führt eine Historie unter scoring.lastAwarded[].
 *  - Liefert Leaderboards für UI & Narration.
 */

import { MODULE_ABBREV } from '../core/common.js';
import { emitHook, HOOKS } from '../core/hooks/emitter.js';

/**
 * @typedef {import('../core/state.js').JanusStateCore} JanusStateCore
 * @typedef {import('../core/logger.js').JanusLogger} JanusLogger
 */

/**
 * @typedef {Object} AwardOptions
 * @property {string} [source] - "lesson" | "exam" | "event" | "manual" | string
 * @property {any} [meta]      - Beliebige Zusatzinfos (z.B. examId, lessonId)
 */
export class JanusScoringEngine {
  /**
   * @param {Object} deps
   * @param {JanusStateCore} deps.state
   * @param {JanusLogger} deps.logger
   */
  constructor({ state, logger }) {
    if (!state) {
      throw new Error(`${MODULE_ABBREV}: JanusScoringEngine benötigt einen JanusStateCore (deps.state).`);
    }

    /** @type {JanusStateCore} */
    this.state = state;
    /** @type {JanusLogger|Console} */
    this.logger = logger ?? console;

    /**
     * Maximale Anzahl an Einträgen in scoring.lastAwarded.
     * Ältere Einträge werden abgeschnitten, um unendliches Wachstum zu vermeiden.
     * Kann in zukünftigen Versionen konfigurierbar gemacht werden.
     * @type {number}
     */
    this.maxHistoryEntries = 200;
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API – Mutationen
  // ---------------------------------------------------------------------------

  /**
   * Legt einen Zirkel/Haus im Scoring-State an (idempotent).
   *
   * Motivation:
   * - In der UI sollen GMs Zirkel/Häuser selbst anlegen können.
   * - Der kanonische State speichert Kreise aktuell als Map { [circleId]: number }.
   *   Deshalb ist "circleId" zugleich Identifier und (Default-)Name.
   *
   * @param {string} circleId
   * @param {number} [initialScore]
   * @param {{source?:string}} [options]
   * @returns {Promise<{created:boolean, circleId:string, score:number}>}
   */
  async ensureCircle(circleId, initialScore = 0, options = {}) {
    const normalizedId = this._normalizeId(circleId);
    const init = Number(initialScore ?? 0);
    if (!normalizedId) throw new Error('JanusScoringEngine.ensureCircle: circleId ist erforderlich.');
    if (!Number.isFinite(init)) throw new Error('JanusScoringEngine.ensureCircle: initialScore muss eine Zahl sein.');

    let created = false;
    let score = 0;
    const now = new Date().toISOString();
    const source = options.source ?? 'manual';

    await this.state.transaction((state) => {
      const scoring = this._ensureScoringRoot(state);
      const circles = scoring.circles;
      if (circles[normalizedId] === undefined || circles[normalizedId] === null) {
        circles[normalizedId] = init;
        created = true;
        scoring.updatedAt = now;
        state.set(STATE_PATHS.SCORING, scoring);
      }
      score = Number(circles[normalizedId] ?? 0);
    });

    if (created) {
      this._fireScoreChangedHook({
        op: 'create',
        targetType: 'circle',
        targetId: normalizedId,
        amount: 0,
        reason: 'created',
        newScore: score,
        source,
      });
      this.logger?.info?.(`${MODULE_ABBREV} | Circle angelegt`, { circleId: normalizedId, score });
    }

    return { created, circleId: normalizedId, score };
  }

  /**
   * Entfernt einen Zirkel/Haus aus scoring.circles.
   * @param {string} circleId
   * @param {{source?:string}} [options]
   * @returns {Promise<boolean>} true wenn gelöscht
   */
  async deleteCircle(circleId, options = {}) {
    const normalizedId = this._normalizeId(circleId);
    if (!normalizedId) throw new Error('JanusScoringEngine.deleteCircle: circleId ist erforderlich.');
    let removed = false;
    const source = options.source ?? 'manual';

    await this.state.transaction((state) => {
      const scoring = this._ensureScoringRoot(state);
      const circles = scoring.circles;
      if (Object.prototype.hasOwnProperty.call(circles, normalizedId)) {
        delete circles[normalizedId];
        removed = true;
        state.set(STATE_PATHS.SCORING, scoring);
      }
    });

    if (removed) {
      this._fireScoreChangedHook({
        op: 'delete',
        targetType: 'circle',
        targetId: normalizedId,
        amount: 0,
        reason: 'deleted',
        newScore: 0,
        source,
      });
      this.logger?.info?.(`${MODULE_ABBREV} | Circle gelöscht`, { circleId: normalizedId });
    }
    return removed;
  }

  /**
   * Fügt einem Zirkel/Haus Punkte hinzu.
   *
   * @param {string} circleId
   * @param {number} amount
   * @param {string} reason
   * @param {AwardOptions} [options]
   * @returns {Promise<number>} Neuer Punktestand des Zirkels.
   * @throws {Error} Wenn circleId fehlt (Validierungsfehler)
   */
  async addCirclePoints(circleId, amount, reason, options = {}) {
    const normalizedId = this._normalizeId(circleId);
    const delta = Number(amount ?? 0);

    if (!normalizedId) {
      throw new Error('JanusScoringEngine.addCirclePoints: circleId ist erforderlich.');
    }
    if (!Number.isFinite(delta) || delta === 0) {
      this.logger?.debug?.(
        `${MODULE_ABBREV} | addCirclePoints: amount ist 0 oder keine Zahl, keine Änderung vorgenommen.`,
        { circleId, amount },
      );
      return this.getCircleScore(normalizedId);
    }

    const now = new Date().toISOString();
    const source = options.source ?? 'manual';
    const meta = options.meta ?? null;

    let newScore = 0;

    try {
      await this.state.transaction((state) => {
        const scoring = this._ensureScoringRoot(state);
        const circles = scoring.circles;

        const prev = Number(circles[normalizedId] ?? 0);
        newScore = prev + delta;
        circles[normalizedId] = newScore;

        const history = scoring.lastAwarded ?? [];
        history.push({
          timestamp: now,
          source,
          amount: delta,
          targetType: 'circle',
          targetId: normalizedId,
          reason: reason ?? '',
          meta,
        });
        this._trimHistory(history);
        scoring.lastAwarded = history;

        state.set(STATE_PATHS.SCORING, scoring);
      });
    } catch (err) {
      this.logger?.error?.('[JANUS7] addCirclePoints-Transaktion fehlgeschlagen', { circleId: normalizedId, amount: delta, err: err?.message });
      throw err;
    }

    this._fireScoreChangedHook({
      targetType: 'circle',
      targetId: normalizedId,
      amount: delta,
      reason,
      newScore,
      source,
    });

    this.logger?.info?.(`${MODULE_ABBREV} | Circle-Punkte geändert`, {
      circleId: normalizedId,
      delta,
      newScore,
      reason,
      source,
      meta,
    });

    return newScore;
  }

  /**
   * Fügt einem Schüler Punkte hinzu.
   *
   * @param {string} studentId
   * @param {number} amount
   * @param {string} reason
   * @param {AwardOptions} [options]
   * @returns {Promise<number>} Neuer Punktestand des Schülers.
   */
  async addStudentPoints(studentId, amount, reason, options = {}) {
    const normalizedId = this._normalizeId(studentId);
    const delta = Number(amount ?? 0);

    if (!normalizedId) {
      throw new Error('JanusScoringEngine.addStudentPoints: studentId ist erforderlich.');
    }
    if (!Number.isFinite(delta) || delta === 0) {
      this.logger?.warn?.(
        `${MODULE_ABBREV} | addStudentPoints: amount ist 0 oder keine Zahl, keine Änderung vorgenommen.`,
        { studentId, amount },
      );
      return this.getStudentScore(normalizedId);
    }

    const now = new Date().toISOString();
    const source = options.source ?? 'manual';
    const meta = options.meta ?? null;

    let newScore = 0;

    try {
      await this.state.transaction((state) => {
        const scoring = this._ensureScoringRoot(state);
        const students = scoring.students;

        const prev = Number(students[normalizedId] ?? 0);
        newScore = prev + delta;
        students[normalizedId] = newScore;

        const history = scoring.lastAwarded ?? [];
        history.push({
          timestamp: now,
          source,
          amount: delta,
          targetType: 'student',
          targetId: normalizedId,
          reason: reason ?? '',
          meta,
        });
        this._trimHistory(history);
        scoring.lastAwarded = history;

        state.set(STATE_PATHS.SCORING, scoring);
      });
    } catch (err) {
      this.logger?.error?.('[JANUS7] addStudentPoints-Transaktion fehlgeschlagen', { studentId: normalizedId, amount: delta, err: err?.message });
      throw err;
    }

    this._fireScoreChangedHook({
      targetType: 'student',
      targetId: normalizedId,
      amount: delta,
      reason,
      newScore,
      source,
    });

    this.logger?.info?.(`${MODULE_ABBREV} | Student-Punkte geändert`, {
      studentId: normalizedId,
      delta,
      newScore,
      reason,
      source,
      meta,
    });

    return newScore;
  }

  /**
   * Wendet die Scoring-Auswirkungen einer Prüfung an.
   *
   * Erwartete Struktur (simpel, erweiterbar):
   *  - examDef.scoringImpact?.circles?: { [circleId]: number }
   *  - examDef.scoringImpact?.students?: { [studentId]: number }
   *  - examResults.circles?: { [circleId]: number }  (z.B. tatsächliche erreichte Punkte)
   *  - examResults.students?: { [studentId]: number }
   *
   * examResults überschreibt ggf. Werte aus examDef.scoringImpact.
   *
   * @param {any} examDef
   * @param {any} examResults
   */
  async applyExamImpact(examDef, examResults = {}) {
    const defImpact = examDef?.scoringImpact ?? {};
    const resultImpact = examResults ?? {};

    const circleImpact = {
      ...(defImpact.circles ?? {}),
      ...(resultImpact.circles ?? {}),
    };
    const studentImpact = {
      ...(defImpact.students ?? {}),
      ...(resultImpact.students ?? {}),
    };

    const reason =
      examResults.reason ??
      examDef?.name ??
      `Prüfung ${examDef?.id ?? 'unbekannt'}`;
    const source = examResults.source ?? 'exam';

    for (const [circleId, amount] of Object.entries(circleImpact)) {
      if (!Number.isFinite(Number(amount))) {
        this.logger?.warn?.(`[JANUS7] applyExamImpact: Nicht-numerischer Wert für Circle '${circleId}': ${amount} — übersprungen`);
        continue;
      }
      await this.addCirclePoints(circleId, amount, reason, {
        source,
        meta: { examId: examDef?.id ?? null },
      });
    }

    for (const [studentId, amount] of Object.entries(studentImpact)) {
      if (!Number.isFinite(Number(amount))) {
        this.logger?.warn?.(`[JANUS7] applyExamImpact: Nicht-numerischer Wert für Student '${studentId}': ${amount} — übersprungen`);
        continue;
      }
      await this.addStudentPoints(studentId, amount, reason, {
        source,
        meta: { examId: examDef?.id ?? null },
      });
    }
  }


  /**
   * Schneidet scoring.lastAwarded auf maxHistoryEntries Einträge zu.
   * @param {any[]} history
   * @returns {any[]}
   * @private
   */
  _trimHistory(history) {
    if (!Array.isArray(history)) return [];
    const max = Number(this.maxHistoryEntries ?? 0);
    if (!max || history.length <= max) return history;
    const excess = history.length - max;
    history.splice(0, excess);
    return history;
  }

  /**
   * Liefert die Historie der letzten vergebenen Punkte.
   * @returns {any[]}
   */
  getLastAwards() {
    const scoring = this.state.get(STATE_PATHS.SCORING) ?? {};
    return scoring.lastAwarded ?? [];
  }

  // ---------------------------------------------------------------------------
  // Compatibility shims for JanusScoringViewApp and external consumers
  // ---------------------------------------------------------------------------

  /**
   * Returns all circle scores as [{circleId, score}] array.
   * Alias for getLeaderboard({type:'circle'}).
   * @returns {{ circleId: string, score: number }[]}
   */
  getCircleScores() {
    return this.getLeaderboard({ type: 'circle' })
      .map(({ id, score }) => ({ circleId: id, score }));
  }

  /**
   * Returns all student scores as [{studentId, score}] array.
   * @param {{ topN?: number }} [opts]
   * @returns {{ studentId: string, score: number }[]}
   */
  getStudentScores({ topN } = {}) {
    return this.getLeaderboard({ type: 'student', topN })
      .map(({ id, score }) => ({ studentId: id, score }));
  }

  /**
   * Returns the award log as a normalized array.
   * Alias / shim for getLastAwards() with field normalization.
   * View expects: { type, target, amount, reason, ts }
   * State stores: { targetType, targetId, amount, reason, timestamp }
   * @param {{ limit?: number }} [opts]
   * @returns {object[]}
   */
  getAwardLog({ limit = 50 } = {}) {
    const raw = this.getLastAwards();
    const entries = Array.isArray(raw) ? raw : [];
    return entries.slice(-limit).reverse().map((e) => ({
      type:     e.type     ?? e.targetType ?? 'unknown',
      target:   e.target   ?? e.targetId   ?? '',
      amount:   Number(e.amount ?? 0),
      reason:   e.reason   ?? '',
      ts:       e.ts       ?? e.timestamp  ?? new Date().toISOString(),
      source:   e.source   ?? 'manual',
    }));
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API – Read / Leaderboards
  // ---------------------------------------------------------------------------

  /**
   * Liefert den aktuellen Punktestand eines Zirkels.
   * @param {string} circleId
   * @returns {number}
   */
  getCircleScore(circleId) {
    const normalizedId = this._normalizeId(circleId);
    const scoring = this._ensureScoringRoot(this.state);
    const circles = scoring.circles ?? {};
    return Number(circles[normalizedId] ?? 0);
  }

  /**
   * Liefert den aktuellen Punktestand eines Schülers.
   * @param {string} studentId
   * @returns {number}
   */
  getStudentScore(studentId) {
    const normalizedId = this._normalizeId(studentId);
    const scoring = this._ensureScoringRoot(this.state);
    const students = scoring.students ?? {};
    return Number(students[normalizedId] ?? 0);
  }

  /**
   * Liefert ein Leaderboard für Zirkel oder Schüler.
   *
   * @param {Object} [options]
   * @param {'circle'|'student'} [options.type='circle']
   * @param {number} [options.topN] - optional: beschränkt die Anzahl der Einträge
   * @returns {{ id: string, score: number }[]}
   */
  getLeaderboard({ type = 'circle', topN } = {}) {
    const scoring = this._ensureScoringRoot(this.state);
    const data =
      type === 'student' ? scoring.students ?? {} : scoring.circles ?? {};

    const entries = Object.entries(data).map(([id, value]) => ({
      id,
      score: Number(value ?? 0),
    }));

    entries.sort((a, b) => b.score - a.score);

    if (Number.isFinite(topN) && topN > 0) {
      return entries.slice(0, topN);
    }

    return entries;
  }

  // ---------------------------------------------------------------------------
  // Private Helfer
  // ---------------------------------------------------------------------------

  /**
   * Stellt sicher, dass scoring-Root im State existiert.
   * @param {JanusStateCore} state
   * @returns {{ circles: Record<string, number>, students: Record<string, number>, lastAwarded: any[] }}
   * @private
   */
  _ensureScoringRoot(state) {
    const scoring = state.get(STATE_PATHS.SCORING) ?? {};

    if (!scoring.circles || typeof scoring.circles !== 'object') {
      scoring.circles = {};
    }
    if (!scoring.students || typeof scoring.students !== 'object') {
      scoring.students = {};
    }
    if (!Array.isArray(scoring.lastAwarded)) {
      scoring.lastAwarded = [];
    }

    // Welle 3 Hardening + v0.9.12.28 Persistenz-Fix:
    // Einige ältere States / KI-Patches schreiben Kreise oder Studenten als Objekte
    // (z.B. { score: 10 } oder { value: 3 }). Die Runtime erwartet jedoch Zahlen.
    // Normalisierung hier UND Rückschreiben in den State wenn ein Objekt-Wert gefunden wurde,
    // damit der nächste Reload nicht wieder den nicht-normalisierten Wert liest.
    let circlesDirty = false;
    for (const [id, value] of Object.entries(scoring.circles)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const normalized = Number(value.score ?? value.value ?? value.points ?? 0);
        scoring.circles[id] = Number.isFinite(normalized) ? normalized : 0;
        circlesDirty = true;
      } else {
        const normalized = Number(value ?? 0);
        if (scoring.circles[id] !== normalized) {
          scoring.circles[id] = normalized;
          circlesDirty = true;
        }
      }
    }

    let studentsDirty = false;
    for (const [id, value] of Object.entries(scoring.students)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const normalized = Number(value.score ?? value.value ?? value.points ?? 0);
        scoring.students[id] = Number.isFinite(normalized) ? normalized : 0;
        studentsDirty = true;
      } else {
        const normalized = Number(value ?? 0);
        if (scoring.students[id] !== normalized) {
          scoring.students[id] = normalized;
          studentsDirty = true;
        }
      }
    }

    // Wenn Objekt-Werte normalisiert wurden: zurückschreiben.
    // Innerhalb einer Transaktion (state = tx-Proxy) werden Writes gebatcht und
    // feuern keine Hooks sofort — kein gesonderter Guard notwendig.
    if ((circlesDirty || studentsDirty) && typeof state.set === 'function') {
      try { state.set(STATE_PATHS.SCORING, scoring); } catch (_) { /* best-effort */ }
    }

    return scoring;
  }

  /**
   * Normalisiert IDs (klein, getrimmt).
   * @param {string} id
   * @returns {string}
   * @private
   */
  _normalizeId(id) {
    return String(id ?? '')
      .trim()
      .toLowerCase();
  }

  /**
   * Hook-Wrapper für janus7ScoreChanged.
   * @param {Object} payload
   * @private
   */
  _fireScoreChangedHook(payload) {
    try {
      const Hooks = globalThis.Hooks;
      if (!Hooks?.callAll) return;

      emitHook(HOOKS.SCORE_CHANGED, payload);
    } catch (err) {
      this.logger?.error?.(`${MODULE_ABBREV} | Fehler beim janus7ScoreChanged-Hook`, err);
    }
  }

  /**
   * Sichert einen täglichen Scoring-Snapshot.
   * Speichert das aktuelle Zirkel-Leaderboard in `scoring.dailySnapshots` (Array, FIFO, max 30 Einträge).
   *
   * Motivation:
   * - Ermöglicht Trendanalysen (z.B. wer hat über 7 Tage am meisten zugelegt).
   * - KI-Export kann Snapshot-History referenzieren.
   * - Bewusst kein Hardcap-Reset: Hauspunkte akkumulieren, Snapshots dokumentieren den Verlauf.
   *
   * @param {object} [slotRef] - Aktuelles Datum aus calendar.getCurrentSlotRef()
   * @param {object} [opts]
   * @param {number} [opts.maxSnapshots=30] - Maximale Anzahl gespeicherter Snapshots
   * @returns {Promise<{snapshot: object, totalSnapshots: number}>}
   */
  async snapshotDailyScores(slotRef, { maxSnapshots = 30 } = {}) {
    const circleScores = this.getCircleScores();
    const studentScores = this.getStudentScores({ topN: 20 });

    const circleSnapshot = Object.fromEntries(
      circleScores.map((entry) => [entry.circleId, Number(entry.score ?? 0)])
    );

    const snapshot = {
      ts: new Date().toISOString(),
      slotRef: slotRef ?? null,
      circles: circleSnapshot,
      topStudents: studentScores,
    };

    try {
      const existing = Array.isArray(
        this.state.getPath?.(STATE_PATHS.SCORING_DAILY_SNAPSHOTS) ?? this.state.get?.(STATE_PATHS.SCORING_DAILY_SNAPSHOTS)
      ) ? (this.state.getPath?.(STATE_PATHS.SCORING_DAILY_SNAPSHOTS) ?? this.state.get(STATE_PATHS.SCORING_DAILY_SNAPSHOTS)) : [];

      const updated = [...existing, snapshot].slice(-maxSnapshots);
      this.state.set(STATE_PATHS.SCORING_DAILY_SNAPSHOTS, updated);

      this.logger?.debug?.(`${MODULE_ABBREV} | snapshotDailyScores: ${Object.keys(circleScores).length} circles, snapshot #${updated.length}`);
      return { snapshot, totalSnapshots: updated.length };
    } catch (err) {
      this.logger?.warn?.(`${MODULE_ABBREV} | snapshotDailyScores fehlgeschlagen`, err);
      return { snapshot, totalSnapshots: 0 };
    }
  }
}

export default JanusScoringEngine;