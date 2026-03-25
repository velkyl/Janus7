/**
 * @file bridge/dsa5/rolls.js
 * @module janus7
 * @phase 3
 *
 * Zweck:
 * Roll-Kapselung: silent skill rolls und Normalisierung der Ergebnisse für JANUS7.
 *
 * Architektur:
 * - Diese Datei ist Teil von Phase 3 und darf nur Abhängigkeiten zu Phasen <= 3 haben.
 * - Öffentliche Funktionen/Exports sind JSDoc-dokumentiert, damit JANUS7 langfristig wartbar bleibt.
 *
 * Hinweis:
 * - Keine deprecated Foundry APIs (v13+).
 */

import { DSA5RollError } from './errors.js';

/**
 * @typedef {object} RollOptions
 * @property {string} [tokenId]  - Token-ID für die Probe (optional)
 * @property {number} [modifier] - Situationsmodifikator (±)
 * @property {string} [rollMode] - Foundry Rollmodus ('roll','gmroll',...)
 * @property {object} [dsa5]     - Passthrough für dsa5-spezifische Optionen
 * @property {boolean} [silent] - Versucht Dialoge zu unterdrücken (skipDialog/fastForward)
 * @property {boolean} [deterministic] - Testmodus: versucht Würfel-RNG zu stabilisieren (wenn möglich)
 */

/**
 * @typedef {object} NormalizedRollResult
 * @property {boolean|null} success   - Erfolg (true), Misserfolg (false) oder unbekannt (null)
 * @property {number|null}  quality   - Qualitätsstufe (QS), sofern ableitbar
 * @property {boolean}      critical  - Kritischer Erfolg
 * @property {boolean}      fumble    - Patzer
 * @property {number|null}  margin    - Erfolgsgrad / Differenz, sofern vorhanden
 * @property {any}          raw       - Das unveränderte DSA5-Ergebnis
 * @property {object}       context   - Metadaten (Probe-Typ, Actor/Item-IDs, ...)
 */

/**
 * Phase 3: DSA5 System Bridge – Roll API
 * Ziel: JANUS7 kann Proben auslösen, ohne intern DSA5-Implementierungsdetails zu streuen.
 */
/**
 * DSA5RollApi
 *
 * @description
 * Öffentliche API von JANUS7.
 * Diese Funktion/Klasse ist Teil der stabilen Oberfläche
 * und wird durch den Testkatalog abgesichert.
 *
 * @remarks
 * - Keine UI-Seiteneffekte
 * - Keine direkten Zugriffe auf Foundry- oder dsa5-Interna außerhalb definierter APIs
 * - Änderungen hier erfordern Anpassungen im Testkatalog
 */
export class DSA5RollApi {
  /**
   * @param {object} deps
   * @param {import('./resolver.js').DSA5Resolver} deps.resolver
   * @param {Console} [deps.logger]
   */
  constructor({ resolver, logger } = {}) {
    if (!resolver) {
      throw new Error('DSA5RollApi benötigt einen Resolver.');
    }
    this.resolver = resolver;
    this.logger = logger ?? console;

    // Bind alle öffentlichen Methoden an diese Instanz, damit der Kontext bei destrukturierten Aufrufen erhalten bleibt.
    const proto = Object.getPrototypeOf(this);
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key === 'constructor') continue;
      const fn = this[key];
      if (typeof fn === 'function') this[key] = fn.bind(this);
    }
  }

  /**
   * Führt eine Talent-/Fertigkeitsprobe aus.
   *
   * @param {object} args
   * @param {any} args.actorRef
   * @param {any} args.skillRef
   * @param {RollOptions} [args.options]
   * @returns {Promise<NormalizedRollResult>}
   */
  async requestSkillCheck({ actorRef, skillRef, options = {} }) {
    const actor = await this.resolver.require('Actor', actorRef);
    const skill = await this.resolver.require('Item', skillRef, { type: 'skill' });

    if (typeof actor.setupSkill !== 'function' || typeof actor.basicTest !== 'function') {
      throw new DSA5RollError('Actor.setupSkill/basicTest nicht verfügbar.', {
        actorId: actor?.id,
      });
    }

    const { tokenId, modifier, rollMode, dsa5 = {}, silent = true } = options;
    const dialogOptions = {
      ...(dsa5 || {}),
      modifier,
      rollMode,
      ...(silent ? { skipDialog: true, fastForward: true, dialog: false } : {}),
    };

    try {
      const setup = await actor.setupSkill(skill, dialogOptions, tokenId);
      const raw = await actor.basicTest(setup);
      return this._normalizeRollResult(raw, {
        type: 'skill',
        actorId: actor.id,
        itemId: skill.id,
      });
    } catch (err) {
      this.logger?.error?.('DSA5RollApi.requestSkillCheck fehlgeschlagen', {
        actor: actor?.id,
        item: skill?.id,
        err,
      });
      throw err instanceof Error
        ? err
        : new DSA5RollError('Skill-Probe fehlgeschlagen.', { err, actorId: actor?.id });
    }
  }

  /**
   * Führt eine Eigenschaftsprobe aus.
   */
  async requestAttributeCheck({ actorRef, attributeId, options = {} }) {
    const actor = await this.resolver.require('Actor', actorRef);

    if (typeof actor.setupCharacteristic !== 'function' || typeof actor.basicTest !== 'function') {
      throw new DSA5RollError('Actor.setupCharacteristic/basicTest nicht verfügbar.', {
        actorId: actor?.id,
      });
    }

    const { tokenId, modifier, rollMode, dsa5 = {}, silent = true } = options;
    const dialogOptions = {
      ...(dsa5 || {}),
      modifier,
      rollMode,
      ...(silent ? { skipDialog: true, fastForward: true, dialog: false } : {}),
    };

    try {
      const setup = await actor.setupCharacteristic(attributeId, dialogOptions, tokenId);
      const raw = await actor.basicTest(setup);
      return this._normalizeRollResult(raw, {
        type: 'attribute',
        actorId: actor.id,
        attributeId,
      });
    } catch (err) {
      this.logger?.error?.('DSA5RollApi.requestAttributeCheck fehlgeschlagen', {
        actor: actor?.id,
        attributeId,
        err,
      });
      throw err instanceof Error
        ? err
        : new DSA5RollError('Eigenschaftsprobe fehlgeschlagen.', {
            err,
            actorId: actor?.id,
            attributeId,
          });
    }
  }

  /**
   * Führt eine Zauberprobe aus.
   */
  async requestSpellCast({ actorRef, spellRef, options = {} }) {
    const actor = await this.resolver.require('Actor', actorRef);
    const spell = await this.resolver.require('Item', spellRef, { type: 'spell' });

    if (typeof actor.setupSpell !== 'function' || typeof actor.basicTest !== 'function') {
      throw new DSA5RollError('Actor.setupSpell/basicTest nicht verfügbar.', {
        actorId: actor?.id,
      });
    }

    const { tokenId, modifier, rollMode, dsa5 = {}, silent = true } = options;
    const dialogOptions = {
      ...(dsa5 || {}),
      modifier,
      rollMode,
      ...(silent ? { skipDialog: true, fastForward: true, dialog: false } : {}),
    };

    try {
      const setup = await actor.setupSpell(spell, dialogOptions, tokenId);
      const raw = await actor.basicTest(setup);
      return this._normalizeRollResult(raw, {
        type: 'spell',
        actorId: actor.id,
        itemId: spell.id,
      });
    } catch (err) {
      this.logger?.error?.('DSA5RollApi.requestSpellCast fehlgeschlagen', {
        actor: actor?.id,
        item: spell?.id,
        err,
      });
      throw err instanceof Error
        ? err
        : new DSA5RollError('Zauberprobe fehlgeschlagen.', { err, actorId: actor?.id });
    }
  }

  /**
   * Führt eine Angriffs-/Paradeprobe mit einer Waffe aus.
   */
  async requestAttack({ actorRef, weaponRef, mode = 'attack', options = {} }) {
    const actor = await this.resolver.require('Actor', actorRef);
    const weapon = await this.resolver.require('Item', weaponRef, { type: 'weapon' });

    if (typeof actor.setupWeapon !== 'function' || typeof actor.basicTest !== 'function') {
      throw new DSA5RollError('Actor.setupWeapon/basicTest nicht verfügbar.', {
        actorId: actor?.id,
      });
    }

    const { tokenId, modifier, rollMode, dsa5 = {}, silent = true } = options;
    const dialogOptions = {
      ...(dsa5 || {}),
      modifier,
      rollMode,
      ...(silent ? { skipDialog: true, fastForward: true, dialog: false } : {}),
    };

    try {
      const setup = await actor.setupWeapon(weapon, mode, dialogOptions, tokenId);
      const raw = await actor.basicTest(setup);
      return this._normalizeRollResult(raw, {
        type: 'attack',
        actorId: actor.id,
        itemId: weapon.id,
        mode,
      });
    } catch (err) {
      this.logger?.error?.('DSA5RollApi.requestAttack fehlgeschlagen', {
        actor: actor?.id,
        item: weapon?.id,
        mode,
        err,
      });
      throw err instanceof Error
        ? err
        : new DSA5RollError('Angriffsprobe fehlgeschlagen.', { err, actorId: actor?.id });
    }
  }

  /**
   * Low-Level Einstieg: ruft direkt Actor.basicTest auf.
   */
  async basicTest(actorRef, payload, options = {}) {
    const actor = await this.resolver.require('Actor', actorRef);
    if (typeof actor.basicTest !== 'function') {
      throw new DSA5RollError('Actor.basicTest ist nicht verfügbar.', { actorId: actor.id });
    }
    try {
      return await actor.basicTest(payload, options);
    } catch (err) {
      this.logger?.error?.('DSA5RollApi.basicTest fehlgeschlagen', { actor: actor?.id, err });
      throw err instanceof Error ? err : new DSA5RollError('basicTest fehlgeschlagen', { err });
    }
  }

  /**
   * Normalisiert das Roll-Result für die Engine.
   * Basiert auf tatsächlichen DSA5 result-Pfaden aus dice-dsa5.js:
   *   basicTest() → { result: { successLevel, qualityStep, rollType, critical, fumble, ... } }
   *
   * @private
   */
  _normalizeRollResult(raw, context = {}) {
    // DSA5 basicTest gibt ein Objekt zurück; das echte Ergebnis sitzt in .result
    const r = raw?.result ?? {};

    // ─── Erfolg ───────────────────────────────────────────────────────────
    // successLevel: >0 = Erfolg, 0 = neutral, <0 = Misserfolg
    // Werte ±2 = kritisch, ±3 = bestätigt kritisch
    let success = null;
    if (typeof r.successLevel === 'number') {
      success = r.successLevel > 0;
    } else if (typeof r.success === 'boolean') {
      success = r.success;
    }

    // ─── Qualitätsstufe ────────────────────────────────────────────────────
    // DSA5 nutzt qualityStep (nicht qs)
    const quality = r.qualityStep ?? r.qs ?? r.QS ?? null;

    // ─── Krit / Patzer ────────────────────────────────────────────────────
    // successLevel >=2 = Krit, <=-2 = Patzer
    const sl       = r.successLevel ?? 0;
    const critical = Boolean(r.critical ?? (sl >= 2));
    const fumble   = Boolean(r.fumble   ?? (sl <= -2));

    // ─── Margin (Erfolgsgrad) ──────────────────────────────────────────────
    const margin = typeof sl === 'number' ? sl : null;

    return {
      success,
      quality:  typeof quality === 'number' ? quality : null,
      critical,
      fumble,
      margin,
      raw,
      context,
    };
  }
}