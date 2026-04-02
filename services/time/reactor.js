/**
 * @file services/time/reactor.js
 * @module janus7
 * @phase services (nach Phase 4)
 *
 * Zweck:
 * Reaktiver, GM-only Time-Orchestrator für JANUS7.
 * Lauscht auf Zeitänderungs-Hooks und triggert Folgeaktionen sauber und entkoppelt.
 *
 * Architektur:
 * - KEIN eigener Zeitmotor, kein Polling, kein Timer-Loop.
 * - Rein reaktiv: feuert nur wenn ein Zeit-Hook eingeht.
 * - Alle weltverändernden Aktionen (State-Mutations, Save) nur als GM.
 * - Idempotenz: register() kann mehrfach aufgerufen werden ohne Doppeltrigger.
 * - Bestehender game.janus7.calendar-Proxy bleibt unberührt.
 *
 * Erweiterbarkeit:
 * - Neue Reaktionen als private Methoden hinzufügen (z. B. _onDayRollover).
 * - Kein UI-Code hier. UI-Reaktionen gehören in Phase 6.
 *
 * Verwendung (intern, nach engine.ready()):
 * ```js
 * const reactor = new JanusTimeReactor(engine);
 * reactor.register(); // einmalig aufrufen
 * ```
 */

import { HOOKS } from '../../core/hooks/emitter.js';

/**
 * Reaktiver GM-only Time-Orchestrator.
 * @class JanusTimeReactor
 */
export class JanusTimeReactor {
  /**
   * @param {import('../../core/index.js').Janus7Engine} engine
   */
  constructor(engine) {
    /** @private */
    this._engine = engine;

    /** @private – verhindert Doppelregistrierung */
    this._registered = false;

    /** @private – Foundry Hook-IDs für spätere cleanup()-Möglichkeit */
    this._hookIds = [];
  }

  /**
   * Registriert den Reactor auf Zeit-Hooks.
   * Idempotent: zweiter Aufruf hat keinen Effekt.
   * @returns {void}
   */
  register() {
    if (this._registered) {
      this._log('debug', 'already registered – skipping');
      return;
    }

    // ── Auf kanonischen janus7.date.changed lauschen ──────────────────────
    const id1 = Hooks.on(HOOKS.DATE_CHANGED, (payload) => {
      this._handleDateChanged(payload);
    });
    this._hookIds.push({ name: HOOKS.DATE_CHANGED, id: id1 });

    // ── Auf Legacy-Hook lauschen (für Listener die noch nicht migriert sind) ──
    // Nur einmal – kanonischer Hook feuert den Legacy-Alias bereits via emitter.
    // Daher KEIN zweiter Listener auf 'janus7DateChanged' nötig; wäre Doppeltrigger.

    this._registered = true;
    this._log('info', 'registered on ' + HOOKS.DATE_CHANGED);
  }

  /**
   * Deregistriert alle Reactor-Hooks.
   * Wird bei Engine-Cleanup aufgerufen (optional).
   * @returns {void}
   */
  unregister() {
    for (const entry of this._hookIds) {
      try { Hooks.off(entry.name, entry.id); } catch (_) { /* noop */ }
    }
    this._hookIds = [];
    this._registered = false;
    this._log('debug', 'unregistered');
  }

  /** Alias für konsistente Service-API. */
  /**
   * Starts the time reactor.
   *
   * @returns {void}
   */
  start() { this.register(); }

  /** Alias für konsistente Service-API. */
  /**
   * Stops the time reactor and removes registered hooks.
   *
   * @returns {void}
   */
  stop() { this.unregister(); }

  /** Öffentlicher Tick-Einstieg für Tests/Diagnostik. */
  /**
   * Executes one public reactor tick for tests and diagnostics.
   *
   * @param {{ previous?: Record<string, unknown>, current?: Record<string, unknown>, reason?: string, _meta?: Record<string, unknown> }} payload
   * @returns {Promise<void>}
   */
  async tick(payload) { return this._handleDateChanged(payload); }

  // ── Reaktionen ──────────────────────────────────────────────────────────

  /**
   * Haupt-Handler bei Datumsänderung.
   * Nur GM führt weltverändernde Aktionen aus.
   *
   * @private
   * @param {{ previous: object, current: object, reason: string, _meta?: object }} payload
   */
  async _handleDateChanged(payload) {
    // GM-Guard: Non-GMs lauschen mit, führen aber keine Weltmutationen aus.
    if (!globalThis.game?.user?.isGM) return;

    const { previous, current, reason } = payload ?? {};

    this._log('debug', `date changed: reason=${reason} | current=${JSON.stringify(current)}`);

    // ── Reaktion 1: Tagwechsel-Folgen ──────────────────────────────────────
    if (this._isDayRollover(previous, current)) {
      await this._onDayRollover(previous, current, reason);
    }

    // ── Reaktion 2: Atmosphere-Autobewertung (wenn vorhanden) ────────────
    this._triggerAtmosphereUpdate(current, reason);

    // ── Reaktion 3: Debounced Auto-Save ───────────────────────────────────
    // Nur wenn State als dirty gilt – nicht bei jedem Hook-Trigger sparen.
    this._scheduleAutoSave();
  }

  /**
   * Gibt true zurück wenn ein echter Tagwechsel stattgefunden hat.
   * @private
   */
  _isDayRollover(previous, current) {
    if (!previous || !current) return false;
    return (
      previous.dayIndex !== current.dayIndex ||
      previous.week     !== current.week     ||
      previous.trimester !== current.trimester
    );
  }

  /**
   * Tagwechsel-Folgeaktionen.
   *
   * Reihenfolge (alle Guards: nur wenn jeweilige Engine vorhanden):
   * 1. Scoring-Snapshot    — täglicher Momentaufnahme der Hauspunkte
   * 2. Quest-Fristen-Check — abgelaufene Quests auf 'expired' setzen
   * 3. Social Decay        — Extremwerte klingen täglich um 1 ab
   *
   * Fehler in einzelnen Schritten werfen den Gesamtprozess nicht ab.
   *
   * @private
   * @param {object} previous - Vorheriges SlotRef
   * @param {object} current  - Neues SlotRef
   * @param {string} reason   - Grund des Tagwechsels
   */
  async _onDayRollover(previous, current, reason) {
    this._log('info', `day rollover: week=${current?.week}, dayIndex=${current?.dayIndex}, reason=${reason ?? 'unknown'}`);

    // ── 1. Scoring-Snapshot ────────────────────────────────────────────────
    try {
      const scoring = this._engine?.academy?.scoring ?? this._engine?.simulation?.scoring;
      if (scoring?.snapshotDailyScores) {
        const result = await scoring.snapshotDailyScores(current);
        this._log('debug', `scoring snapshot #${result.totalSnapshots}`);
      }
    } catch (err) {
      this._log('warn', `scoring snapshot fehlgeschlagen: ${err?.message}`);
    }

    // ── 2. Quest-Fristen-Check ─────────────────────────────────────────────
    try {
      const quests = this._engine?.academy?.quests ?? this._engine?.simulation?.quests;
      if (quests?.checkQuestDeadlines) {
        const { expired, checked } = await quests.checkQuestDeadlines({
          currentDayAbsolute: current?.dayIndex ?? null,
        });
        if (expired > 0) {
          this._log('info', `Quest-Fristen: ${expired}/${checked} abgelaufen`);
        }
      }
    } catch (err) {
      this._log('warn', `Quest-Fristen-Check fehlgeschlagen: ${err?.message}`);
    }

    // ── 3. Social Decay ────────────────────────────────────────────────────
    try {
      const social = this._engine?.academy?.social ?? this._engine?.simulation?.social;
      if (social?.applyDailyDecay) {
        const { changed, skipped } = await social.applyDailyDecay({ rate: 1, threshold: 10 });
        if (changed > 0) {
          this._log('debug', `social decay: ${changed} Werte angepasst, ${skipped} unverändert`);
        }
      }
    } catch (err) {
      this._log('warn', `social decay fehlgeschlagen: ${err?.message}`);
    }
  }

  /**
   * Triggert Atmosphere-Autobewertung basierend auf neuem Datum.
   * Nur wenn Atmosphere-Controller vorhanden und autoFromCalendar aktiv.
   * @private
   */
  _triggerAtmosphereUpdate(current, reason) {
    try {
      const ctrl = this._engine?.atmosphere?.controller;
      if (!ctrl?.isEnabled?.()) return;

      const autoFromCal = this._engine?.core?.state?.getPath?.('atmosphere.autoFromCalendar') ?? false;
      if (!autoFromCal) return;

      // Delegate – Atmosphere-Controller entscheidet selbst über Mood-Wechsel.
      ctrl.evaluateCalendarMood?.(current, reason);
    } catch (err) {
      this._log('warn', `atmosphere update failed: ${err?.message}`);
    }
  }

  /**
   * Plant einen Auto-Save, falls State dirty ist.
   * Debounced: mehrere Events in kurzer Zeit führen nur zu einem Save.
   * @private
   */
  _scheduleAutoSave() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(async () => {
      try {
        const state = this._engine?.core?.state;
        if (state?._dirty) {
          await state.save({ autoSave: true });
          this._log('debug', 'auto-save triggered by TimeReactor');
        }
      } catch (err) {
        this._log('warn', `auto-save failed: ${err?.message}`);
      }
    }, 2000); // 2s Debounce – kein State-Spam bei schnellem Kalender-Advance
  }

  // ── Logging-Hilfsmethode ────────────────────────────────────────────────

  /** @private */
  _log(level, msg) {
    const logger = this._engine?.core?.logger;
    const fn = logger?.[level];
    if (typeof fn === 'function') {
      fn.call(logger, `[JANUS7][TimeReactor] ${msg}`);
    }
  }
}
