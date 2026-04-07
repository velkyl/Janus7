/**
 * @file academy/mechanic-gate-engine.js
 * @module janus7
 * @phase 4
 *
 * JanusMechanicGateEngine — steuert die schrittweise Freischaltung von
 * Rollenspielmechaniken über den Lehrplan.
 *
 * Jedes Gate hat einen Trigger (Lektion abgeschlossen, Prüfung, Trimester-Ende)
 * und schaltet bei Erfüllung eine Mechanik sowie optionale Event-Pools frei.
 * Freigeschaltete Gates sind idempotent (einmaliges Auslösen, dann markiert).
 *
 * Architektur:
 *  - Liest Gate-Definitionen aus AcademyDataApi (mechanic-gates.json).
 *  - Schreibt Gate-Status in state.academy.mechanicGates.{gateId} = true.
 *  - Aktivierte Pools werden in state.academy.activeEventPools[] eingetragen.
 *  - Emittiert MECHANIC_GATE_OPENED und EVENT_POOL_ACTIVATED Hooks.
 *  - Sendet eine Foundry ChatMessage an den GM und betroffene Spieler.
 */

import { emitHook } from '../core/hooks/emitter.js';
import { HOOKS } from '../core/hooks/topics.js';

export class JanusMechanicGateEngine {
  /**
   * @param {Object} deps
   * @param {import('../core/state.js').JanusStateCore} deps.state
   * @param {import('./data-api.js').AcademyDataApi} deps.academyData
   * @param {import('../core/logger.js').JanusLogger} [deps.logger]
   */
  constructor({ state, academyData, logger }) {
    this.state = state;
    this.academyData = academyData;
    this.logger = logger ?? console;
  }

  /** Pflichtmethode für safeRegister() in phase4.js. */
  register() {
    // Keine globalen Hooks hier — Hook-Listener werden in phase4.js verdrahtet.
    this.logger?.debug?.('[JANUS7] JanusMechanicGateEngine registriert.');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Prüft, ob ein Gate bereits offen ist.
   * @param {string} gateId
   * @returns {boolean}
   */
  isGateOpen(gateId) {
    return Boolean(this.state?.get?.(`academy.mechanicGates.${gateId}`));
  }

  /**
   * Wertet alle Gates mit trigger.type === 'lesson-completed' aus.
   * @param {string} lessonId
   * @returns {Promise<string[]>} Liste der neu geöffneten Gate-IDs
   */
  async evaluateGatesForLesson(lessonId) {
    if (!lessonId) return [];
    const gates = this._getGates().filter(
      (g) => g.trigger?.type === 'lesson-completed' && g.trigger?.lessonId === lessonId
    );
    return this._applyGates(gates);
  }

  /**
   * Wertet alle Gates mit trigger.type === 'exam-result' aus.
   * @param {string} examId
   * @param {string} [status] - z.B. 'passed', 'failed'
   * @returns {Promise<string[]>}
   */
  async evaluateGatesForExam(examId, status) {
    if (!examId) return [];
    const gates = this._getGates().filter((g) => {
      if (g.trigger?.type !== 'exam-result') return false;
      if (g.trigger?.examId !== examId) return false;
      if (g.trigger?.minStatus && status) {
        const order = ['failed', 'passed', 'good', 'excellent'];
        return order.indexOf(status) >= order.indexOf(g.trigger.minStatus);
      }
      return true;
    });
    return this._applyGates(gates);
  }

  /**
   * Wertet alle Gates mit trigger.type === 'trimester-completed' aus.
   * @param {number} year
   * @param {number} trimester
   * @returns {Promise<string[]>}
   */
  async evaluateGatesForTrimester(year, trimester) {
    const gates = this._getGates().filter(
      (g) =>
        g.trigger?.type === 'trimester-completed' &&
        Number(g.trigger?.year) === Number(year) &&
        Number(g.trigger?.trimester) === Number(trimester)
    );
    return this._applyGates(gates);
  }

  /**
   * Wertet alle Gates mit trigger.type === 'event-slot-reached' aus.
   * @param {string} eventId
   * @returns {Promise<string[]>}
   */
  async evaluateGatesForEventSlot(eventId) {
    if (!eventId) return [];
    const gates = this._getGates().filter(
      (g) => g.trigger?.type === 'event-slot-reached' && g.trigger?.eventId === eventId
    );
    return this._applyGates(gates);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────────────────────────────────

  /** Liefert alle Gate-Definitionen (aus SSOT). */
  _getGates() {
    try {
      return this.academyData?.getMechanicGates?.() ?? [];
    } catch {
      return [];
    }
  }

  /**
   * Wendet eine Liste von Gates an (idempotent).
   * @param {object[]} gates
   * @returns {Promise<string[]>} Neu geöffnete Gate-IDs
   */
  async _applyGates(gates) {
    const opened = [];
    for (const gate of gates) {
      if (this.isGateOpen(gate.id)) continue;
      try {
        await this._applyGate(gate);
        opened.push(gate.id);
      } catch (err) {
        this.logger?.warn?.(`[JANUS7] MechanicGateEngine: Gate ${gate.id} konnte nicht geöffnet werden.`, {
          err: err?.message ?? err,
        });
      }
    }
    return opened;
  }

  /**
   * Öffnet ein einzelnes Gate: schreibt State, aktiviert Pools, emittiert Hooks,
   * und sendet eine ChatMessage an den GM (und optional die Spieler).
   * @param {object} gate
   */
  async _applyGate(gate) {
    const { id, unlocks, playerNotification } = gate;

    // 1. State-Transaktion: Gate-Flag + Pool-Aktivierung
    await this.state?.transaction?.(async (tx) => {
      // Gate als offen markieren
      tx.set(`academy.mechanicGates.${id}`, true);

      // Event-Pools aktivieren
      const poolIds = Array.isArray(unlocks?.eventPoolIds) ? unlocks.eventPoolIds : [];
      if (poolIds.length) {
        // Initialisiere activeEventPools falls nötig
        let active = tx.get('academy.activeEventPools');
        if (!Array.isArray(active)) active = [];
        for (const poolId of poolIds) {
          if (!active.includes(poolId)) active.push(poolId);
        }
        tx.set('academy.activeEventPools', active);
      }
    });

    // 2. Hooks emittieren
    emitHook(HOOKS.MECHANIC_GATE_OPENED, { gateId: id, mechanic: unlocks?.mechanic });

    const activatedPools = Array.isArray(unlocks?.eventPoolIds) ? unlocks.eventPoolIds : [];
    for (const poolId of activatedPools) {
      emitHook(HOOKS.EVENT_POOL_ACTIVATED, { poolId, gateId: id });
    }

    // 3. Player Notification als Foundry ChatMessage
    await this._sendNotification(gate);

    this.logger?.info?.(`[JANUS7] MechanicGateEngine: Gate geöffnet — ${id} (${unlocks?.mechanic ?? ''})`);
  }

  /**
   * Sendet eine geflüsterte ChatMessage an GM + alle Spieler.
   * @param {object} gate
   */
  async _sendNotification(gate) {
    const notification = gate?.playerNotification;
    if (!notification) return;

    try {
      const teacherLabel = notification.teacher ?? 'Akademie-Kanzlei';
      const inUniverse = notification.inUniverseText ?? '';
      const mechanic = notification.mechanicText ?? '';

      const content = `
        <div style="border: 1px solid #8b6914; border-radius: 4px; padding: 8px 12px; background: #fdf6e3;">
          <p style="margin:0 0 4px 0; font-size:0.85em; color:#666; font-style:italic;">
            Akademiebericht · ${teacherLabel}
          </p>
          <p style="margin:0 0 8px 0;">${inUniverse}</p>
          <hr style="border-color:#c8a84b; margin:6px 0;">
          <p style="margin:0; font-size:0.9em; color:#444;">
            <strong>Mechanik freigeschaltet:</strong> ${mechanic}
          </p>
        </div>`;

      // Flüstere an alle Spieler + GM
      const whisperTargets = game?.users?.filter?.((u) => u?.active)?.map?.((u) => u.id) ?? [];

      await ChatMessage?.create?.({
        content,
        whisper: whisperTargets,
        speaker: { alias: teacherLabel },
        flags: { janus7: { type: 'mechanic-gate', gateId: gate.id } },
      });
    } catch (err) {
      this.logger?.warn?.('[JANUS7] MechanicGateEngine: ChatMessage konnte nicht gesendet werden.', {
        err: err?.message ?? err,
      });
    }
  }
}

export default JanusMechanicGateEngine;
