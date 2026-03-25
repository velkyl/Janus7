/**
 * @file bridge/dsa5/conditions.js
 * @module janus7/bridge/dsa5
 * @phase 3
 *
 * Zweck:
 * Kapselt DSA5 Condition-/Statuseffekt-Verwaltung für die Akademie-Simulation.
 * Mappt JANUS7-Akademiezustände (Stress, Übermüdung etc.) auf echte DSA5-Conditions.
 *
 * Architektur:
 * - Keine direkten Imports in dsa5-Interna (nur game.dsa5 + Actor-Methoden).
 * - Alle Mutations gehen über actor.addCondition / actor.removeCondition.
 * - Lesevorgänge lesen actor.effects (read-only, sicher).
 */

import { DSA5ResolveError } from './errors.js';

// ─── Condition-ID-Konstanten (aus DSA5 config-dsa5.js) ─────────────────────
// Einzige Stelle im Code, die DSA5-IDs kennt.
export const DSA5_CONDITION_IDS = Object.freeze({
  // Kampf/Körper
  DEAD:         'dead',
  INPAIN:       'inpain',       // Stufen 1–4
  PRONE:        'prone',
  UNCONSCIOUS:  'unconscious',
  STUNNED:      'stunned',       // Stufen 1–4
  ENCUMBERED:   'encumbered',    // Stufen 1–4
  INCAPACITATED:'incapacitated',
  PARALYSED:    'paralysed',     // Stufen 1–4
  POISONED:     'poisoned',
  SICK:         'sick',
  BURNING:      'burning',       // Stufen 1–3
  BLIND:        'blind',
  DEAF:         'deaf',
  MUTE:         'mute',
  INVISIBLE:    'invisible',
  ROOTED:       'rooted',
  FIXATED:      'fixated',
  CONSTRICTED:  'constricted',
  SURPRISED:    'surprised',
  // Magie/Geist
  FEARED:       'feared',        // Stufen 1–4
  RAPTURED:     'raptured',      // Stufen 1–4 (Entrückung)
  CONFUSED:     'confused',      // Stufen 1–4
  BLOODRUSH:    'bloodrush',
  MINOR_SPIRITS:'minorSpirits',
  // Akademie-relevant: über services-Flag
  SERVICES:     'services',       // Gefälligkeit/Dienst (1–500)
});

/**
 * JANUS7-interne Zustände → DSA5 Condition-Mapping.
 * Erweiterbar ohne Bridge-Code-Änderung.
 *
 * @type {Record<string, { conditionId: string, defaultValue?: number, description?: string }>}
 */
export const JANUS_TO_DSA5_CONDITION_MAP = Object.freeze({
  /** Lernstress durch zu viele Prüfungen/Lektionen */
  stress:      { conditionId: DSA5_CONDITION_IDS.MINOR_SPIRITS, defaultValue: 1,
                 description: 'Akademie: Lernstress' },
  /** Übermüdung durch Schlafmangel/Nachtaktivitäten */
  tired:       { conditionId: DSA5_CONDITION_IDS.INPAIN, defaultValue: 1,
                 description: 'Akademie: Übermüdung' },
  /** Prüfungspanik: Angst/Anspannung vor Prüfungen */
  exam_panic:  { conditionId: DSA5_CONDITION_IDS.FEARED, defaultValue: 1,
                 description: 'Akademie: Prüfungspanik' },
  /** Überarbeitung: Erschöpfung durch extreme Lernbelastung */
  overworked:  { conditionId: DSA5_CONDITION_IDS.ENCUMBERED, defaultValue: 2,
                 description: 'Akademie: Überarbeitung' },
  /** Krank durch Vernachlässigung der Gesundheit */
  sick:        { conditionId: DSA5_CONDITION_IDS.SICK, defaultValue: 1,
                 description: 'Akademie: Erkrankt' },
  /** Verletzt (z.B. Übungsunfall) */
  injured:     { conditionId: DSA5_CONDITION_IDS.INPAIN, defaultValue: 2,
                 description: 'Akademie: Verletzt' },
  /** Magieschaden durch missglückte Zauberübung */
  magic_shock: { conditionId: DSA5_CONDITION_IDS.STUNNED, defaultValue: 1,
                 description: 'Akademie: Magieschock' },
  /** Unter Beobachtung / Dienst leisten */
  detention:   { conditionId: DSA5_CONDITION_IDS.SERVICES, defaultValue: 5,
                 description: 'Akademie: Strafaufgabe' },
});

/**
 * DSA5ConditionBridge
 *
 * @description
 * Öffentliche API von JANUS7.
 * Verwaltet DSA5 Conditions auf Academy-Actors.
 *
 * @remarks
 * - Keine UI-Seiteneffekte
 * - Nur actor.addCondition / actor.removeCondition (DSA5-public API)
 * - Änderungen hier erfordern Anpassungen im Testkatalog
 */
export class DSA5ConditionBridge {
  /**
   * @param {object} deps
   * @param {import('./resolver.js').DSA5Resolver} deps.resolver
   * @param {Console} [deps.logger]
   */
  constructor({ resolver, logger } = {}) {
    if (!resolver) throw new Error('DSA5ConditionBridge benötigt einen Resolver.');
    this.resolver = resolver;
    this.logger   = logger ?? console;
  }

  // ─── Public: Lesen ───────────────────────────────────────────────────────

  /**
   * Liefert alle aktiven DSA5-Conditions eines Actors.
   *
   * @param {Actor} actor
   * @returns {{ id: string, name: string, value: number|null }[]}
   */
  getActiveConditions(actor) {
    if (!actor) throw new DSA5ResolveError('Actor ist erforderlich', { actor });

    const effects = actor.effects ? Array.from(actor.effects.values()) : [];
    const result = [];

    for (const effect of effects) {
      try {
        const id  = effect.statuses?.values().next().value  // Foundry v12+ Set
                 ?? effect.getFlag?.('core', 'statusId')      // Foundry v11 compat
                 ?? null;
        if (!id) continue;

        const dsaFlags = effect.getFlag?.('dsa5', 'value');
        const value    = typeof dsaFlags === 'number' ? dsaFlags : null;

        result.push({
          id,
          name:  effect.name ?? id,
          value,
          uuid:  effect.uuid,
        });
      } catch (_e) { /* skip bad effect */ }
    }

    return result;
  }

  /**
   * Prüft ob eine Condition (per ID) aktiv ist.
   *
   * @param {Actor} actor
   * @param {string} conditionId
   * @returns {boolean}
   */
  hasCondition(actor, conditionId) {
    return this.getActiveConditions(actor).some((c) => c.id === conditionId);
  }

  /**
   * Liefert den Stufenwert einer stufigen Condition (z.B. inpain Stufe 2).
   *
   * @param {Actor} actor
   * @param {string} conditionId
   * @returns {number} 0 wenn nicht aktiv
   */
  getConditionValue(actor, conditionId) {
    const found = this.getActiveConditions(actor).find((c) => c.id === conditionId);
    return found?.value ?? 0;
  }

  // ─── Public: Setzen ──────────────────────────────────────────────────────

  /**
   * Fügt eine DSA5-Condition per ID hinzu.
   *
   * @param {Actor} actor
   * @param {string} conditionId   - DSA5 Condition-ID (aus DSA5_CONDITION_IDS)
   * @param {number} [value=1]     - Stufenwert für stufige Conditions
   * @param {boolean} [absolute=false] - true = Stufe absolut setzen, false = addieren
   * @returns {Promise<void>}
   */
  async addCondition(actor, conditionId, value = 1, absolute = false) {
    this._assertActorHasConditionApi(actor, conditionId);
    try {
      await actor.addCondition(conditionId, value, absolute, true);
      this.logger?.debug?.(`[Bridge/Conditions] +${conditionId}(${value}) → ${actor.name}`);
    } catch (err) {
      this.logger?.warn?.(`[Bridge/Conditions] addCondition fehlgeschlagen`, { conditionId, err });
      throw err;
    }
  }

  /**
   * Entfernt eine DSA5-Condition per ID.
   *
   * @param {Actor} actor
   * @param {string} conditionId
   * @param {number} [value=1]
   * @param {boolean} [absolute=false]
   * @returns {Promise<void>}
   */
  async removeCondition(actor, conditionId, value = 1, absolute = false) {
    this._assertActorHasConditionApi(actor, conditionId);
    try {
      await actor.removeCondition(conditionId, value, true, absolute);
      this.logger?.debug?.(`[Bridge/Conditions] -${conditionId}(${value}) → ${actor.name}`);
    } catch (err) {
      this.logger?.warn?.(`[Bridge/Conditions] removeCondition fehlgeschlagen`, { conditionId, err });
      throw err;
    }
  }

  /**
   * Setzt eine Condition auf einen konkreten Stufenwert.
   * Wenn value=0: Condition wird vollständig entfernt.
   *
   * @param {Actor} actor
   * @param {string} conditionId
   * @param {number} value
   * @returns {Promise<void>}
   */
  async setConditionValue(actor, conditionId, value) {
    if (value === 0) {
      return this.removeCondition(actor, conditionId, 1, true);
    }
    return this.addCondition(actor, conditionId, value, true);
  }

  // ─── Akademie-Mapping ────────────────────────────────────────────────────

  /**
   * Fügt einen JANUS7-Akademiezustand (z.B. 'stress') als DSA5-Condition hinzu.
   * Nutzt das JANUS_TO_DSA5_CONDITION_MAP.
   *
   * @param {Actor} actor
   * @param {string} janusCondition    - JANUS7-Key (z.B. 'stress', 'tired')
   * @param {number} [valueOverride]   - Optional: überschreibt den Default-Wert
   * @returns {Promise<void>}
   */
  async applyAcademyCondition(actor, janusCondition, valueOverride) {
    const mapping = JANUS_TO_DSA5_CONDITION_MAP[janusCondition];
    if (!mapping) {
      this.logger?.warn?.(`[Bridge/Conditions] Unbekannter Akademiezustand: ${janusCondition}`);
      return;
    }
    const value = valueOverride ?? mapping.defaultValue ?? 1;
    return this.addCondition(actor, mapping.conditionId, value);
  }

  /**
   * Entfernt einen JANUS7-Akademiezustand.
   *
   * @param {Actor} actor
   * @param {string} janusCondition
   * @returns {Promise<void>}
   */
  async clearAcademyCondition(actor, janusCondition) {
    const mapping = JANUS_TO_DSA5_CONDITION_MAP[janusCondition];
    if (!mapping) return;
    return this.removeCondition(actor, mapping.conditionId, 1, true);
  }

  /**
   * Liefert eine Übersicht aller JANUS7-Akademiezustände eines Actors.
   *
   * @param {Actor} actor
   * @returns {Record<string, { active: boolean, dsaConditionId: string, value: number }>}
   */
  getAcademyConditionSnapshot(actor) {
    const snapshot = {};
    for (const [key, mapping] of Object.entries(JANUS_TO_DSA5_CONDITION_MAP)) {
      const value = this.getConditionValue(actor, mapping.conditionId);
      snapshot[key] = {
        active:         value > 0,
        dsaConditionId: mapping.conditionId,
        value,
      };
    }
    return snapshot;
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  /**
   * @private
   */
  _assertActorHasConditionApi(actor, conditionId) {
    if (!actor) throw new DSA5ResolveError('Actor ist null.', { conditionId });
    if (typeof actor.addCondition !== 'function' || typeof actor.removeCondition !== 'function') {
      throw new Error(
        `DSA5ConditionBridge: Actor "${actor?.name}" hat keine addCondition/removeCondition API. ` +
        `Ist das DSA5-System geladen?`
      );
    }
  }
}
