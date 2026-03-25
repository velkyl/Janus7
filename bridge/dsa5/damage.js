/**
 * @file bridge/dsa5/damage.js
 * @module janus7/bridge/dsa5
 * @phase 3
 *
 * Zweck:
 * Kapselt DSA5 Schadensanwendung und Regeneration für Akademie-Simulation.
 * Delegiert vollständig an Actor-Methoden (kein direkter State-Zugriff).
 *
 * Akademie-Nutzung:
 *   - Übungsunfälle → applyDamage
 *   - Nacht-Regeneration → applyRegeneration
 *   - Magieübung AsP-Kosten → applyMana (type='astralenergy')
 *   - Liturgie KaP-Kosten → applyMana (type='karmaenergy')
 */

import { DSA5ResolveError } from './errors.js';

export class DSA5DamageBridge {
  /**
   * @param {object} [deps]
   * @param {Console} [deps.logger]
   */
  constructor({ logger } = {}) {
    this.logger = logger ?? console;
  }

  /**
   * Fügt einem Actor Schaden zu (LeP).
   * Nutzt DSA5 actor.applyDamage (inkl. Rüstung, Schmerz-Tracking).
   *
   * @param {Actor} actor
   * @param {string|number} amount  - DSA5-Würfelformel oder Zahl (z.B. '2d6', 3)
   * @param {object} [opts]
   * @param {boolean} [opts.ignoreArmor=false]  - Rüstung ignorieren
   * @returns {Promise<void>}
   */
  async applyDamage(actor, amount, opts = {}) {
    this._assertHasMethod(actor, 'applyDamage');
    try {
      const formula = typeof amount === 'number' ? String(amount) : amount;
      await actor.applyDamage(formula, opts);
      this.logger?.debug?.(`[Damage] Schaden ${formula} → ${actor.name}`);
    } catch (err) {
      this.logger?.warn?.('[Damage] applyDamage fehlgeschlagen', { actor: actor?.name, err });
      throw err;
    }
  }

  /**
   * Wendet Regeneration an (LeP, AsP, KaP).
   * Nutzt DSA5 actor.applyRegeneration.
   *
   * @param {Actor} actor
   * @param {number} lep
   * @param {number} asp
   * @param {number} kap
   * @returns {Promise<void>}
   */
  async applyRegeneration(actor, lep = 0, asp = 0, kap = 0) {
    this._assertHasMethod(actor, 'applyRegeneration');
    try {
      await actor.applyRegeneration(lep, asp, kap);
      this.logger?.debug?.(`[Damage] Regeneration LeP+${lep} AsP+${asp} KaP+${kap} → ${actor.name}`);
    } catch (err) {
      this.logger?.warn?.('[Damage] applyRegeneration fehlgeschlagen', { actor: actor?.name, err });
      throw err;
    }
  }

  /**
   * Wendet Mana-Kosten/Gewinn auf AsP oder KaP an.
   *
   * @param {Actor} actor
   * @param {string|number} amount  - Formel oder Zahl (negativ = Kosten)
   * @param {'astralenergy'|'karmaenergy'} type
   * @returns {Promise<void>}
   */
  async applyMana(actor, amount, type = 'astralenergy') {
    this._assertHasMethod(actor, 'applyMana');
    try {
      const formula = typeof amount === 'number' ? String(amount) : amount;
      await actor.applyMana(formula, type);
      this.logger?.debug?.(`[Damage] Mana ${formula} (${type}) → ${actor.name}`);
    } catch (err) {
      this.logger?.warn?.('[Damage] applyMana fehlgeschlagen', { actor: actor?.name, err });
      throw err;
    }
  }

  /** @private */
  _assertHasMethod(actor, method) {
    if (!actor) throw new DSA5ResolveError('Actor ist null.', {});
    if (typeof actor[method] !== 'function') {
      throw new Error(`DSA5DamageBridge: Actor.${method} nicht verfügbar. DSA5 geladen?`);
    }
  }
}
