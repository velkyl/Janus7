import { emitHook, HOOKS } from '../../core/hooks/emitter.js';
/**
 * @file bridge/dsa5/hooks-bridge.js
 * @module janus7/bridge/dsa5
 * @phase 3
 *
 * Zweck:
 * Lauscht auf DSA5-spezifische Hooks und leitet relevante Ereignisse
 * an die JANUS7-Engine weiter (als interne Hooks: janus7RollCompleted etc.).
 *
 * Registrierte DSA5-Hooks (Quellen: modules/dsa5.js, modules/system/rolls/dice-dsa5.js):
 *   - 'DSA5ready'             → DSA5-API bereit (fires game.dsa5)
 *   - 'postProcessDSARoll'    → Nach jeder beendeten Probe (Ergebnis + Actor)
 *   - 'finishOpposedTest'     → Nach Vergleichsprobe
 *   - 'modifyTokenAttribute'  → Attribut-Änderung an Token (Schaden, Heilung)
 *   - 'dsa5.calendarWidgetDataReady' → Kalender-Daten aktualisiert
 *
 * Architektur:
 * - Kein direkter Import von dsa5-Interna.
 * - Eigene Hooks feuern intern mit Präfix 'janus7' (kein Namespace-Konflikt).
 * - Kann mehrfach-registriert werden: onInit() / onTeardown() sind idempotent.
 */

/**
 * @typedef {object} JanusRollEvent
 * @property {string} actorId
 * @property {string} actorName
 * @property {string} rollType    - 'skill' | 'spell' | 'attribute' | 'weapon' | 'other'
 * @property {string} itemName    - Name des Items/Talents/Zaubers
 * @property {boolean} success
 * @property {number|null} qualityStep
 * @property {boolean} critical
 * @property {boolean} fumble
 * @property {number} successLevel  - Raw successLevel aus DSA5
 * @property {object} raw           - Originale DSA5-Daten
 */

export class DSA5HooksBridge {
  /**
   * @param {object} [deps]
   * @param {Console} [deps.logger]
   * @param {Function} [deps.onRollCompleted]  - Callback: (JanusRollEvent) => void
   */
  constructor({ logger, onRollCompleted } = {}) {
    this.logger           = logger ?? console;
    this.onRollCompleted  = onRollCompleted ?? null;

    /** @private Hook-Handle-IDs für sauberes Teardown */
    this._hookIds = {};
    this._registered = false;
  }

  /**
   * Registriert alle DSA5-Hooks.
   * Idempotent: mehrfacher Aufruf hat keine Wirkung.
   */
  register() {
    if (this._registered) return;
    this._registered = true;

    // ─── postProcessDSARoll ──────────────────────────────────────────────
    // Wird nach JEDER DSA5-Probe gefeuert (skill, spell, weapon, attribute).
    // Nutzlast: { result, source (actor), testData, cardOptions }
    this._hookIds.postProcess = Hooks.on('postProcessDSARoll', (result, source) => {
      try {
        this._onPostProcessRoll(result, source);
      } catch (err) {
        this.logger?.warn?.('[HooksBridge] postProcessDSARoll Handler fehlgeschlagen', { err });
      }
    });

    // ─── finishOpposedTest ────────────────────────────────────────────────
    this._hookIds.finishOpposed = Hooks.on('finishOpposedTest', (attackMessage, defenseMessage, result) => {
      try {
        this._onFinishOpposedTest(attackMessage, defenseMessage, result);
      } catch (err) {
        this.logger?.warn?.('[HooksBridge] finishOpposedTest Handler fehlgeschlagen', { err });
      }
    });

    // NOTE (Architekturvertrag): Foundry-Core-Hooks werden zentral in scripts/janus.mjs registriert.
    // modifyTokenAttribute wird daher NICHT mehr hier registriert.

    // ─── DSA5 Kalender-Update ────────────────────────────────────────────
    this._hookIds.calendar = Hooks.on('dsa5.calendarWidgetDataReady', (data) => {
      try {
        emitHook(HOOKS.DSA_CALENDAR_UPDATED, data);
      } catch (_e) { this.logger?.debug?.('[HooksBridge] janus7DSACalendarUpdated listener error', _e); }
    });

    this.logger?.info?.('[HooksBridge] DSA5-Hooks registriert (postProcessDSARoll, finishOpposedTest).');
  }

  /**
   * Deregistriert alle Hooks.
   */
  teardown() {
    for (const [name, id] of Object.entries(this._hookIds)) {
      try {
        Hooks.off(name === 'postProcess' ? 'postProcessDSARoll'
                : name === 'finishOpposed' ? 'finishOpposedTest'
                : name === 'calendar' ? 'dsa5.calendarWidgetDataReady'
                : name, id);
      } catch (_e) { this.logger?.debug?.('[HooksBridge] Hooks.off failed during teardown', { name, id }); }
    }
    this._hookIds    = {};
    this._registered = false;
  }

  /**
   * Public entry for Foundry-core hook delegation (registered in scripts/janus.mjs).
   * @param {any} data
   * @param {any} updates
   */
  handleModifyTokenAttribute(data, updates) {
    try {
      this._onModifyTokenAttribute(data, updates);
    } catch (err) {
      this.logger?.warn?.('[HooksBridge] modifyTokenAttribute Handler fehlgeschlagen', { err });
    }
  }

  // ─── Private Handler ─────────────────────────────────────────────────────

  /**
   * @private
   * postProcessDSARoll:
   * result = { result: { successLevel, qualityStep, rollType, ... }, ... }
   * source = Actordsa5 instance
   */
  _onPostProcessRoll(rawResult, source) {
    // DSA5 liefert result.result als flaches Objekt
    const r = rawResult?.result ?? rawResult ?? {};

    const event = /** @type {JanusRollEvent} */ ({
      actorId:      source?.id   ?? null,
      actorName:    source?.name ?? null,
      rollType:     this._mapRollType(r.rollType),
      itemName:     r.skill?.name ?? r.spell?.name ?? r.weapon?.name ?? r.source?.name ?? r.source ?? '?',
      success:      typeof r.successLevel === 'number' ? r.successLevel > 0 : null,
      qualityStep:  r.qualityStep   ?? null,
      critical:     Boolean(r.critical ?? (Math.abs(r.successLevel ?? 0) > 1)),
      fumble:       Boolean(r.fumble   ?? (r.successLevel < -1)),
      successLevel: r.successLevel   ?? 0,
      raw:          rawResult,
    });

    this.logger?.debug?.('[HooksBridge] postProcessDSARoll', {
      actor: event.actorName, type: event.rollType, success: event.success, qs: event.qualityStep
    });

    // Intern weiterleiten
    emitHook(HOOKS.ROLL_COMPLETED, event);

    // Direkter Callback (z.B. für Academy-Scoring)
    if (typeof this.onRollCompleted === 'function') {
      this.onRollCompleted(event);
    }
  }

  /**
   * @private
   * finishOpposedTest: attack + defense Messages + result
   */
  _onFinishOpposedTest(attackMessage, defenseMessage, result) {
    const attackActor  = this._actorFromMessage(attackMessage);
    const defenseActor = this._actorFromMessage(defenseMessage);

    const event = {
      type:          'opposed',
      attackActorId:  attackActor?.id   ?? null,
      defenseActorId: defenseActor?.id  ?? null,
      raw:            result,
    };

    emitHook(HOOKS.OPPOSED_TEST_FINISHED, event);
  }

  /**
   * @private
   * modifyTokenAttribute: z.B. { attribute: 'system.status.wounds', value: -3, isDelta: true }
   */
  _onModifyTokenAttribute(data, updates) {
    const attr = data?.attribute ?? '';
    if (!attr.includes('status')) return; // Nur Statuswerte interessant

    const event = {
      attribute: attr,
      delta:     data?.isDelta ? (data?.value ?? 0) : null,
      absolute:  !data?.isDelta ? (data?.value ?? null) : null,
      updates,
    };

    emitHook(HOOKS.TOKEN_ATTRIBUTE_MODIFIED, event);
  }

  /** @private */
  _mapRollType(rawType) {
    if (!rawType) return 'other';
    const t = String(rawType).toLowerCase();
    if (t.includes('skill') || t.includes('talent')) return 'skill';
    if (t.includes('spell') || t.includes('ceremony') || t.includes('liturgy')) return 'spell';
    if (t.includes('attack') || t.includes('weapon') || t.includes('melee')) return 'weapon';
    if (t.includes('attribute') || t.includes('characteristic')) return 'attribute';
    return 'other';
  }

  /** @private */
  _actorFromMessage(message) {
    try {
      const speakerData = message?.flags?.dsa5 ?? message?.speaker;
      const actorId = speakerData?.actorId ?? speakerData?.actor;
      return actorId ? game.actors?.get(actorId) : null;
    } catch (_e) {
      return null;
    }
  }
}
