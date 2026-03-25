/**
 * @file services/cron/JanusCron.js
 * @module janus7/services/cron
 * @phase 4 / services
 *
 * Zweck:
 *   Taktgesteuerter Mini-Scheduler für periodische Akademie-Aufgaben.
 *   Kein setInterval – ausschließlich eventgetrieben via `janus7.date.changed`.
 *
 * Registrierte Jobs (konfigurierbar):
 *   - weekly:    Wird einmal pro Wochenwechsel ausgeführt.
 *   - trimester: Wird einmal pro Trimesterwechsel ausgeführt.
 *   - daily:     Wird bei jedem Tagwechsel ausgeführt (leicht gewichtete Tasks).
 *
 * Architektur:
 *   - Kein eigener Zustand. Liest Woche/Trimester aus Date-Event-Payload.
 *   - Jobs sind Funktionen (engine) => Promise<void>, registriert über `addJob()`.
 *   - GM-only: Alle Jobs werden nur auf dem GM-Client ausgeführt.
 *   - Fehler in einzelnen Jobs unterbrechen nicht die restliche Job-Kette.
 *
 * Eingebaut-Jobs (aktivierbar via Optionen):
 *   weekly:
 *     - `housePointsWeeklyReset`: setzt Wochenpunkte-Buffer in scoring zurück (opt-in)
 *   trimester:
 *     - `trimesterReport`:        feuert `janus7.trimester.completed` Hook mit Snapshot
 *
 * Verwendung:
 *   const cron = new JanusCron({ engine, logger });
 *   cron.addJob('weekly', async (engine) => { ... });
 *   cron.register();
 */

import { emitHook, HOOKS } from '../../core/hooks/emitter.js';

const MODULE = 'JanusCron';

export class JanusCron {
  /**
   * @param {object}  opts
   * @param {any}     opts.engine               - game.janus7 Referenz
   * @param {object}  [opts.logger]             - JanusLogger
   * @param {boolean} [opts.builtinWeekly=true]    - Eingebaut-Jobs für weekly
   * @param {boolean} [opts.builtinTrimester=true] - Eingebaut-Jobs für trimester
   */
  constructor({ engine, logger, builtinWeekly = true, builtinTrimester = true } = {}) {
    this._engine  = engine  ?? null;
    this._log     = logger  ?? console;
    this._hookId  = null;
    this._registered = false;

    /** @type {{ daily: Function[], weekly: Function[], trimester: Function[] }} */
    this._jobs = { daily: [], weekly: [], trimester: [] };

    /** Letzter bekannter Zustand um Duplikat-Trigger zu vermeiden */
    this._lastSeen = { week: null, trimester: null, dayIndex: null };

    if (builtinWeekly)    this._registerBuiltinWeekly();
    if (builtinTrimester) this._registerBuiltinTrimester();
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Registriert einen Job für eine bestimmte Periode.
   * @param {'daily'|'weekly'|'trimester'} period
   * @param {(engine: any) => Promise<void>} fn
   * @returns {this}
   */
  addJob(period, fn) {
    if (!this._jobs[period]) throw new Error(`${MODULE}: Unbekannte Periode: "${period}". Erlaubt: daily, weekly, trimester.`);
    if (typeof fn !== 'function') throw new Error(`${MODULE}: Job muss eine Funktion sein.`);
    this._jobs[period].push(fn);
    return this;
  }

  /**
   * Registriert den DATE_CHANGED-Hook. Idempotent.
   */
  register() {
    if (this._registered) return;
    this._registered = true;

    const HooksRef = globalThis.Hooks;
    if (!HooksRef) {
      this._log?.warn?.(`[${MODULE}] Hooks nicht verfügbar – kein Register.`);
      return;
    }

    this._hookId = HooksRef.on(HOOKS.DATE_CHANGED, (event) => {
      // Nur GM führt Welt-Mutationen durch
      if (!game?.user?.isGM) return;

      const current = event?.current ?? event;
      this._tick(current).catch((err) => {
        this._log?.error?.(`[${MODULE}] _tick fehlgeschlagen`, err);
      });
    });

    this._log?.info?.(`[${MODULE}] registriert auf ${HOOKS.DATE_CHANGED} (hookId=${this._hookId})`);
  }

  /**
   * Deregistriert den Hook.
   */
  teardown() {
    if (this._hookId !== null) {
      globalThis.Hooks?.off?.(HOOKS.DATE_CHANGED, this._hookId);
      this._hookId = null;
    }
    this._registered = false;
    this._log?.info?.(`[${MODULE}] teardown.`);
  }

  /** Alias für Tests / ältere Aufrufer. */
  unregister() {
    return this.teardown();
  }

  // ─── Tick-Logik ───────────────────────────────────────────────────────────

  /**
   * @private
   * Wird bei jedem DATE_CHANGED aufgerufen.
   * Entscheidet welche Job-Gruppen laufen.
   */
  async _tick(current) {
    if (!current) return;

    const { week, trimester, dayIndex } = current;
    const last = this._lastSeen;

    const isDayNew       = dayIndex   !== last.dayIndex;
    const isWeekNew      = week       !== last.week;
    const isTrimesterNew = trimester  !== last.trimester;

    // Zustand sofort updaten (verhindert Doppel-Run bei Re-Entrant-Hooks)
    this._lastSeen = { week, trimester, dayIndex };

    // Reihenfolge: trimester → weekly → daily (grob → fein)
    // null-Guard auf allen drei: erster Tick ist reiner Sync-Tick, kein Job-Run.
    if (isTrimesterNew && last.trimester !== null) {
      await this._runJobs('trimester', current);
    }
    if (isWeekNew && last.week !== null) {
      await this._runJobs('weekly', current);
    }
    if (isDayNew && last.dayIndex !== null) {
      await this._runJobs('daily', current);
    }
  }

  /**
   * @private
   * Führt alle Jobs einer Periode aus.
   */
  async _runJobs(period, current) {
    const jobs = this._jobs[period];
    if (!jobs.length) return;

    this._log?.debug?.(`[${MODULE}] period="${period}" | ${jobs.length} job(s) @ week=${current?.week} trimester=${current?.trimester}`);

    const engine = this._engine ?? game?.janus7;

    for (let i = 0; i < jobs.length; i++) {
      try {
        await jobs[i](engine, current);
      } catch (err) {
        this._log?.warn?.(`[${MODULE}] Job[${period}][${i}] fehlgeschlagen: ${err?.message}`);
      }
    }
  }

  // ─── Eingebaut-Jobs ───────────────────────────────────────────────────────

  /** @private */
  _registerBuiltinWeekly() {
    this.addJob('weekly', async (engine, current) => {
      // Wochenpunkte-Buffer reset (opt-in via state flag)
      try {
        const scoring = engine?.academy?.scoring ?? engine?.simulation?.scoring;
        if (!scoring) return;

        // Nur wenn weeklyBuffer-Feature aktiviert (konfigurierbar)
        const useWeeklyBuffer = engine?.core?.state?.getPath?.('scoring.useWeeklyBuffer') ?? false;
        if (!useWeeklyBuffer) return;

        await scoring.resetWeeklyBuffer?.({ week: current?.week });
        this._log?.info?.(`[${MODULE}] housePointsWeeklyReset @ Woche ${current?.week}`);
      } catch (err) {
        this._log?.warn?.(`[${MODULE}] housePointsWeeklyReset fehlgeschlagen: ${err?.message}`);
      }
    });
  }

  /** @private */
  _registerBuiltinTrimester() {
    this.addJob('trimester', async (engine, current) => {
      // Trimester-Abschluss: Snapshot + Hook feuern
      try {
        const scoring = engine?.academy?.scoring ?? engine?.simulation?.scoring;
        const snapshot = scoring?.getCircleScores?.() ?? [];
        const topStudents = scoring?.getStudentScores?.({ topN: 5 }) ?? [];

        emitHook('janus7.trimester.completed', {
          trimester: current?.trimester,
          week:      current?.week,
          circles:   snapshot,
          topStudents,
        });

        this._log?.info?.(`[${MODULE}] trimesterReport: Trimester ${current?.trimester} abgeschlossen.`);
      } catch (err) {
        this._log?.warn?.(`[${MODULE}] trimesterReport fehlgeschlagen: ${err?.message}`);
      }
    });
  }
}

export default JanusCron;
