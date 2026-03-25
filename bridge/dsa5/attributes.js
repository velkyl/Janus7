/**
 * @file bridge/dsa5/attributes.js
 * @module janus7/bridge/dsa5
 * @phase 3
 *
 * Zweck:
 * Liest DSA5 Actor-Attribute (Eigenschaften, Vitalwerte, Initiative) auf eine
 * stabile, datenversionssichere Weise aus.
 *
 * Die Pfade sind aus dem DSA5 DataModel (status.js, characteristics.js) abgeleitet
 * und in ATTR_PATHS zentralisiert – einzige Stelle, die DSA5-Schema-Wissen enthält.
 *
 * Architektur:
 * - Read-only. Keine Mutationen.
 * - Defensive: gibt null zurück statt zu werfen, wenn ein Feld fehlt.
 */

// ─── Pfad-Definitionen (einzige DSA5-Schema-Kenntnis im Bridge) ─────────────

/**
 * Kanonische DSA5-Datenpfade für Actor.system.*
 * Abgeleitet aus: modules/data/actor/templates/characteristics.js
 *                 modules/data/actor/templates/status.js
 *
 * @type {Record<string, string>}
 */
export const DSA5_ACTOR_PATHS = Object.freeze({
  // ─── Eigenschaften ───────────────────────────────────────────────────────
  MU:          'characteristics.mu.advances',   // Mut (inkl. Steigerungen)
  KL:          'characteristics.kl.advances',
  IN:          'characteristics.in.advances',
  CH:          'characteristics.ch.advances',
  FF:          'characteristics.ff.advances',
  GE:          'characteristics.ge.advances',
  KO:          'characteristics.ko.advances',
  KK:          'characteristics.kk.advances',

  // Berechnete Endwerte (nach Modifikatoren) – präpariert in prepareDerivedData
  MU_MOD:      'characteristics.mu.modifier',
  KL_MOD:      'characteristics.kl.modifier',
  IN_MOD:      'characteristics.in.modifier',
  CH_MOD:      'characteristics.ch.modifier',
  FF_MOD:      'characteristics.ff.modifier',
  GE_MOD:      'characteristics.ge.modifier',
  KO_MOD:      'characteristics.ko.modifier',
  KK_MOD:      'characteristics.kk.modifier',

  // ─── Vitalwerte ──────────────────────────────────────────────────────────
  LEP_VALUE:   'status.wounds.value',       // Aktuelle LeP
  LEP_MAX:     'status.wounds.max',         // Maximale LeP
  ASP_VALUE:   'status.astralenergy.value', // Aktuelle AsP
  ASP_MAX:     'status.astralenergy.max',   // Maximale AsP
  KAP_VALUE:   'status.karmaenergy.value',  // Aktuelle KaP
  KAP_MAX:     'status.karmaenergy.max',    // Maximale KaP

  // ─── Abgeleitete Werte ───────────────────────────────────────────────────
  SK:          'status.soulpower.value',    // Seelenkraft
  ZK:          'status.toughness.value',    // Zähigkeit
  INI_VALUE:   'status.initiative.value',   // Initiative
  INI_MOD:     'status.initiative.modifier',
  DODGE:       'status.dodge.value',        // Ausweichen

  // ─── Schicksalspunkte ────────────────────────────────────────────────────
  FATE_VALUE:  'status.fatePoints.current', // Aktuelle Schicksalspunkte
  FATE_MAX:    'status.fatePoints.value',   // Maximale Schicksalspunkte

  // ─── Regeneration ────────────────────────────────────────────────────────
  REGEN_LEP:   'status.regeneration.LePMod',
  REGEN_ASP:   'status.regeneration.AsPMod',
  REGEN_KAP:   'status.regeneration.KaPMod',
});

/**
 * DSA5AttributeReader
 *
 * @description
 * Öffentliche API von JANUS7.
 * Liest DSA5 Actor-Attribute sicher aus. Keine Mutationen.
 *
 * @remarks
 * - Read-only
 * - Gibt null zurück bei fehlenden Feldern (kein throw)
 * - Ändert keine Zustände
 */
export class DSA5AttributeReader {
  /**
   * @param {object} [deps]
   * @param {Console} [deps.logger]
   */
  constructor({ logger } = {}) {
    this.logger = logger ?? console;
  }

  // ─── Low-Level ───────────────────────────────────────────────────────────

  /**
   * Liest einen einzelnen Systempfad von einem Actor.
   * @param {Actor} actor
   * @param {string} path - relativ zu actor.system (z.B. 'characteristics.mu.advances')
   * @returns {number|string|null}
   */
  read(actor, path) {
    try {
      const v = foundry.utils.getProperty(actor?.system, path);
      return v ?? null;
    } catch (_e) {
      return null;
    }
  }

  /**
   * Liest einen Systempfad und liefert eine Zahl (oder null).
   * @param {Actor} actor
   * @param {string} path
   * @returns {number|null}
   */
  readNum(actor, path) {
    const v = this.read(actor, path);
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  // ─── Eigenschaften ───────────────────────────────────────────────────────

  /**
   * Liefert alle 8 Eigenschaften als Record.
   *
   * @param {Actor} actor
   * @returns {{ mu:number|null, kl:number|null, in:number|null, ch:number|null,
   *              ff:number|null, ge:number|null, ko:number|null, kk:number|null }}
   */
  getCharacteristics(actor) {
    const r = (key) => this._calcCharacteristic(actor, key);
    return { mu: r('mu'), kl: r('kl'), in: r('in'), ch: r('ch'),
             ff: r('ff'), ge: r('ge'), ko: r('ko'), kk: r('kk') };
  }

  /**
   * Berechnet einen Eigenschaftswert: initial + species + advances + modifier.
   * @private
   */
  _calcCharacteristic(actor, key) {
    try {
      const base = actor?.system?.characteristics?.[key];
      if (!base) return null;
      const sum = (base.initial ?? 8) + (base.species ?? 0)
                + (base.advances ?? 0) + (base.modifier ?? 0);
      return Number.isFinite(sum) ? sum : null;
    } catch (_e) {
      return null;
    }
  }

  // ─── Vitalwerte ──────────────────────────────────────────────────────────

  /**
   * Liefert die vollständigen Vitalwerte eines Actors.
   *
   * @param {Actor} actor
   * @returns {{
   *   lep: { value: number|null, max: number|null },
   *   asp: { value: number|null, max: number|null },
   *   kap: { value: number|null, max: number|null },
   *   sk:  number|null,
   *   zk:  number|null,
   * }}
   */
  getVitals(actor) {
    return {
      lep: {
        value: this.readNum(actor, DSA5_ACTOR_PATHS.LEP_VALUE),
        max:   this.readNum(actor, DSA5_ACTOR_PATHS.LEP_MAX),
      },
      asp: {
        value: this.readNum(actor, DSA5_ACTOR_PATHS.ASP_VALUE),
        max:   this.readNum(actor, DSA5_ACTOR_PATHS.ASP_MAX),
      },
      kap: {
        value: this.readNum(actor, DSA5_ACTOR_PATHS.KAP_VALUE),
        max:   this.readNum(actor, DSA5_ACTOR_PATHS.KAP_MAX),
      },
      sk:  this.readNum(actor, DSA5_ACTOR_PATHS.SK),
      zk:  this.readNum(actor, DSA5_ACTOR_PATHS.ZK),
    };
  }

  /**
   * Liefert Initiative, Ausweichen, Schicksalspunkte.
   *
   * @param {Actor} actor
   * @returns {{ ini: number|null, dodge: number|null, fate: { current: number|null, max: number|null } }}
   */
  getCombatStats(actor) {
    return {
      ini:   this.readNum(actor, DSA5_ACTOR_PATHS.INI_VALUE),
      dodge: this.readNum(actor, DSA5_ACTOR_PATHS.DODGE),
      fate: {
        current: this.readNum(actor, DSA5_ACTOR_PATHS.FATE_VALUE),
        max:     this.readNum(actor, DSA5_ACTOR_PATHS.FATE_MAX),
      },
    };
  }

  // ─── Talente / Skills ────────────────────────────────────────────────────

  /**
   * Liest den Talentwert (FW) eines Skills aus den embedded Items.
   * Dies ist verlässlicher als der system-Path, da DSA5 Skills als Items abbildet.
   *
   * @param {Actor} actor
   * @param {string} skillName  - Lokalisierter Skillname (z.B. 'Magiekunde')
   * @returns {number|null}
   */
  getSkillValue(actor, skillName) {
    if (!skillName) return null;
    const norm = (s) => String(s ?? '').trim().toLowerCase();
    const wanted = norm(skillName);

    try {
      const item = actor?.items
        ? Array.from(actor.items.values()).find(
            (i) => ['skill', 'talent', 'spell', 'liturgy', 'ritual', 'ceremony']
                     .includes(i?.type) && norm(i?.name) === wanted
          )
        : null;
      if (!item) return null;

      // DSA5 hält FW in system.talentValue oder system.value
      const sys = item.system ?? {};
      const fw  = sys.talentValue ?? sys.fw ?? sys.value;
      const n   = Number(fw);
      return Number.isFinite(n) ? n : null;
    } catch (_e) {
      return null;
    }
  }

  /**
   * Liefert alle Skills eines Actors als flaches Map.
   *
   * @param {Actor} actor
   * @param {string[]} [types] - Optional: nur diese Item-Typen ('skill', 'spell', ...)
   * @returns {Record<string, { type: string, value: number|null }>}
   */
  getAllSkills(actor, types = ['skill', 'spell', 'liturgy', 'ritual', 'ceremony']) {
    const result = {};
    const items = actor?.items ? Array.from(actor.items.values()) : [];
    for (const item of items) {
      if (!types.includes(item?.type)) continue;
      const sys = item.system ?? {};
      const fw  = sys.talentValue ?? sys.fw ?? sys.value;
      const n   = Number(fw);
      result[item.name] = {
        type:  item.type,
        value: Number.isFinite(n) ? n : null,
        uuid:  item.uuid,
      };
    }
    return result;
  }

  // ─── Snapshot (für KI-Export) ────────────────────────────────────────────

  /**
   * Vollständiger Attribut-Snapshot für KI-Export / Scoring.
   *
   * @param {Actor} actor
   * @returns {object}
   */
  getFullSnapshot(actor) {
    return {
      actorId:         actor?.id    ?? null,
      actorName:       actor?.name  ?? null,
      actorType:       actor?.type  ?? null,
      characteristics: this.getCharacteristics(actor),
      vitals:          this.getVitals(actor),
      combat:          this.getCombatStats(actor),
      skills:          this.getAllSkills(actor),
    };
  }
}
