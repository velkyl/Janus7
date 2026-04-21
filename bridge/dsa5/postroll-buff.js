/**
 * @file bridge/dsa5/postroll-buff.js
 * @module janus7/bridge/dsa5
 * @phase 3
 *
 * Zweck:
 *   Erstellt und entfernt DSA5-PostRoll-Bonus-ActiveEffects für Lehrer-Boni.
 *   Ein Lehrerbonus = Temporärer ActiveEffect auf dem Schüler-Actor mit:
 *     - changes[].key   = 'system.skillModifiers.postRoll.FP' | '.QL' | '.reroll'
 *     - changes[].value = 'scope amount'  (z.B. 'Magiekunde 2', 'spell 1', 'any 1')
 *     - duration.seconds = Lektionsdauer in Sekunden
 *
 * DSA5 PostRoll-Mechanik (aus postroll-buffs.js):
 *   - FP-Bonus: Fügt FP hinzu, QS wird neu berechnet (FP/3, cap 6)
 *   - QS-Bonus: Fügt QS direkt hinzu (cap aus game.settings capQSat)
 *   - REROLL: Erlaubt Wiederholung (exklusiv, nutzt useFateOnRoll/isTalented)
 *   - Scope 'any' matcht alle skill/spell/liturgy/ritual/ceremony
 *   - Scope 'skill', 'spell' etc. matcht den Itemtyp
 *   - Scope = Talentname (Teilstring, normalisiert) matcht z.B. 'Magiekunde'
 *
 * SSOT für Bonus-Definitionen: data/academy/teacher-bonuses.json
 *
 * Architektur:
 *   - Kein direkter dsa5-Import. Nur actor.createEmbeddedDocuments() / deleteEmbeddedDocuments()
 *   - Effect-UUID wird im State gespeichert → sauberes Aufräumen möglich
 *   - Idempotent: doppeltes Anwenden prüft ob Effect schon existiert (Flags-Check)
 */

// ─── PostRoll Change Keys (aus postroll-buffs.js) ────────────────────────────

/**
 * Kanonische ActiveEffect-Change-Keys für DSA5 PostRoll-Boni.
 * @type {object}
 */
export const POST_ROLL_KEYS = Object.freeze({
  /** Füge Fertigkeitspunkte zum Würfelwurf hinzu. FP/3 → neue QS. */
  FP:     'system.skillModifiers.postRoll.FP',
  /** Füge Qualitätsstufen direkt hinzu. */
  QL:     'system.skillModifiers.postRoll.QL',
  /** Erlaube Neuauswurf (exklusiv, nutzt Schips). */
  REROLL: 'system.skillModifiers.postRoll.reroll',
});

// ─── Scope-Konstanten ─────────────────────────────────────────────────────────

/**
 * Vordefinierte Scope-Werte für PostRoll-Buffs.
 * Können als scope-Wert in TeacherBonusEffect.buffs verwendet werden.
 */
export const POST_ROLL_SCOPES = Object.freeze({
  /** Alle Skills, Zauber, Liturgien, Rituale, Zeremonien */
  ANY:       'any',
  /** Nur Fertigkeiten (Talente) */
  SKILL:     'skill',
  /** Nur Zauber */
  SPELL:     'spell',
  /** Nur Liturgien */
  LITURGY:   'liturgy',
  /** Nur Rituale */
  RITUAL:    'ritual',
  /** Nur Zeremonien */
  CEREMONY:  'ceremony',
  // Gruppen (Werte aus item.system.group.value)
  WISSEN:    'Wissenstalente',
  NATUR:     'Naturtalente',
  HANDWERK:  'Handwerkstalente',
  GESELLSCHAFT: 'Gesellschaftstalente',
  KOERPER:   'Körpertalente',
});

// ─── Zeitkonstanten ───────────────────────────────────────────────────────────

/** Sekunden pro Zeitslot (2h Unterrichtseinheit = 7200s) */
export const LESSON_SLOT_SECONDS = 7200;

function _activeEffectAddMode() {
  return globalThis.CONST?.ACTIVE_EFFECT_MODES?.ADD ?? 2;
}

// ─── Hauptklasse ─────────────────────────────────────────────────────────────

export class DSA5PostRollBuffBridge {
  /**
   * @param {object} deps
   * @param {Console} [deps.logger]
   */
  constructor({ logger } = {}) {
    this.logger = logger ?? console;
    // Flag-Namespace für JANUS7-PostRoll-Buffs
    this._flagScope = 'janus7';
    this._flagKey   = 'postRollBuff';
  }

  // ─── Öffentliche API ───────────────────────────────────────────────────────

  /**
   * Erstellt einen PostRoll-Buff-ActiveEffect auf einem Actor.
   *
   * @param {Actor}  actor
   * @param {TeacherBonusEffect} bonusDef   - Bonus-Definition (aus teacher-bonuses.json)
   * @param {object} [opts]
   * @param {number} [opts.durationSlots=1] - Lektionsdauer in Zeitslots (1 Slot = 2h)
   * @param {number} [opts.secondsOverride] - Überschreibt durationSlots
   * @returns {Promise<ActiveEffect|null>}
   *
   * @typedef {Object} TeacherBonusEffect
   * @property {string}   name          - Anzeigename (z.B. "Lehrerbonus: Magiekunde")
   * @property {string}   teacherNpcId  - NPC-ID des Lehrers
   * @property {string}   [lessonId]    - Lesson-ID (optional, für Tracking)
   * @property {BonusBuff[]} buffs      - Liste der Boni
   *
   * @typedef {Object} BonusBuff
   * @property {'FP'|'QL'|'REROLL'} type    - Art des Bonus
   * @property {string}              scope   - Talentname, Typ, Gruppe oder 'any'
   * @property {number}              amount  - Bonus-Stärke (FP/QS Menge)
   *
   * @example
   * await postRollBuff.applyTeacherBonus(actor, {
   *   name: 'Kosmaar: Magiekunde-Lektion',
   *   teacherNpcId: 'NPC_SIRDON_KOSMAAR',
   *   lessonId: 'LES_Y1_T1_ARKAN_01',
   *   buffs: [
   *     { type: 'FP', scope: 'Magiekunde', amount: 2 },
   *     { type: 'QL', scope: 'spell', amount: 1 },
   *   ]
   * }, { durationSlots: 2 });
   */
  async applyTeacherBonus(actor, bonusDef, { durationSlots = 1, secondsOverride = null } = {}) {
    this._assertActor(actor);
    this._assertBonusDef(bonusDef);

    // Idempotenz: kein doppelter Effect für selbe Lektion
    const existing = this._findExistingBuff(actor, bonusDef);
    if (existing) {
      this.logger?.debug?.(
        `JANUS7 | PostRollBuff | Effect bereits vorhanden, übersprungen`,
        { actor: actor.name, name: bonusDef.name }
      );
      return existing;
    }

    const seconds = secondsOverride ?? (durationSlots * LESSON_SLOT_SECONDS);

    // ActiveEffect-Daten aufbauen
    const effectData = this._buildEffectData(bonusDef, seconds);

    this.logger?.info?.(`JANUS7 | PostRollBuff | Erstelle Lehrerbonus`, {
      actor: actor.name,
      name: bonusDef.name,
      buffs: bonusDef.buffs,
      seconds,
    });

    try {
      const [effect] = await actor.createEmbeddedDocuments('ActiveEffect', [effectData]);
      this.logger?.info?.(
        `JANUS7 | PostRollBuff | Effect erstellt: ${effect?.uuid ?? '?'}`,
        { actor: actor.name }
      );
      return effect;
    } catch (err) {
      this.logger?.error?.('JANUS7 | PostRollBuff | createEmbeddedDocuments fehlgeschlagen', {
        actor: actor.name,
        error: err?.message,
      });
      throw err;
    }
  }

  /**
   * Entfernt alle JANUS7-PostRoll-Buffs von einem Actor.
   * Nützlich wenn eine Lektion vorzeitig endet oder ein Schüler die Klasse verlässt.
   *
   * @param {Actor}  actor
   * @param {object} [filter]
   * @param {string} [filter.teacherNpcId] - Nur Buffs dieses Lehrers entfernen
   * @param {string} [filter.lessonId]     - Nur Buffs dieser Lektion entfernen
   * @returns {Promise<number>} Anzahl entfernter Effects
   */
  async removeTeacherBuffs(actor, filter = {}) {
    this._assertActor(actor);

    const toRemove = actor.effects.filter((effect) => {
      const flags = effect.flags?.[this._flagScope]?.[this._flagKey];
      if (!flags) return false;
      if (filter.teacherNpcId && flags.teacherNpcId !== filter.teacherNpcId) return false;
      if (filter.lessonId     && flags.lessonId     !== filter.lessonId)     return false;
      return true;
    });

    if (!toRemove.length) return 0;

    const ids = toRemove.map((e) => e.id);
    await actor.deleteEmbeddedDocuments('ActiveEffect', ids);

    this.logger?.info?.(`JANUS7 | PostRollBuff | ${ids.length} Buffs entfernt`, {
      actor: actor.name,
      filter,
    });

    return ids.length;
  }

  /**
   * Liefert alle aktiven JANUS7-PostRoll-Buffs eines Actors.
   *
   * @param {Actor} actor
   * @returns {{ name: string, teacherNpcId: string, lessonId: string|null, remainingSeconds: number|null }[]}
   */
  getActiveTeacherBuffs(actor) {
    if (!actor?.effects) return [];

    const now = game.time.worldTime;

    return actor.effects
      .filter((e) => e.flags?.[this._flagScope]?.[this._flagKey])
      .map((e) => {
        const flags = e.flags[this._flagScope][this._flagKey];
        const endTime = (e.duration?.startTime ?? 0) + (e.duration?.seconds ?? 0);
        return {
          name:             e.name,
          effectId:         e.id,
          teacherNpcId:     flags.teacherNpcId ?? null,
          lessonId:         flags.lessonId ?? null,
          remainingSeconds: e.duration?.seconds ? endTime - now : null,
          buffs:            flags.buffs ?? [],
        };
      });
  }

  // ─── Batch-API ─────────────────────────────────────────────────────────────

  /**
   * Wendet Lehrerbonus auf mehrere Actors gleichzeitig an.
   *
   * @param {Actor[]}          actors
   * @param {TeacherBonusEffect} bonusDef
   * @param {object}           [opts]
   * @returns {Promise<Array<{actor: string, success: boolean, effectId?: string, error?: string}>>}
   */
  async applyToMany(actors, bonusDef, opts = {}) {
    const results = [];

    for (const actor of actors) {
      try {
        const effect = await this.applyTeacherBonus(actor, bonusDef, opts);
        results.push({ actor: actor.name, success: true, effectId: effect?.id });
      } catch (err) {
        results.push({ actor: actor.name, success: false, error: err?.message });
        this.logger?.warn?.(`JANUS7 | PostRollBuff | applyToMany: ${actor.name} fehlgeschlagen`, {
          error: err?.message,
        });
      }
    }

    const ok = results.filter((r) => r.success).length;
    this.logger?.info?.(`JANUS7 | PostRollBuff | applyToMany: ${ok}/${actors.length} erfolgreich`, {
      bonusName: bonusDef.name,
    });

    return results;
  }

  // ─── Interne Hilfsmethoden ─────────────────────────────────────────────────

  /**
   * Baut das ActiveEffect-Dateobjekt für Foundry.
   * @param {TeacherBonusEffect} bonusDef
   * @param {number} seconds
   * @returns {object}
   * @private
   */
  _buildEffectData(bonusDef, seconds) {
    // Buffs → changes-Array
    const changes = bonusDef.buffs.map((buff) => ({
      key:   POST_ROLL_KEYS[buff.type],
      mode:  _activeEffectAddMode(),
      value: `${buff.scope} ${buff.amount}`,
      // priority: 20 = Standard für add-mode
    })).filter((c) => c.key); // ungültige types herausfiltern

    if (!changes.length) {
      throw new Error(`JANUS7 PostRollBuff: bonusDef "${bonusDef.name}" hat keine gültigen buffs`);
    }

    return {
      name:     bonusDef.name,
      icon:     bonusDef.icon ?? 'icons/magic/light/orb-lightbulb-yellow.webp',
      origin:   `janus7/teacher/${bonusDef.teacherNpcId}`,
      disabled: false,
      transfer: false, // Kein Transfer auf Items

      duration: {
        startTime: game.time.worldTime,
        seconds,
      },

      changes,

      flags: {
        [this._flagScope]: {
          [this._flagKey]: {
            teacherNpcId: bonusDef.teacherNpcId,
            lessonId:     bonusDef.lessonId ?? null,
            buffs:        bonusDef.buffs,
            appliedAt:    Date.now(),
          },
        },
      },
    };
  }

  /**
   * Prüft ob ein gleichartiger Buff bereits existiert (Idempotenz).
   * @private
   */
  _findExistingBuff(actor, bonusDef) {
    return actor.effects.find((e) => {
      const flags = e.flags?.[this._flagScope]?.[this._flagKey];
      if (!flags) return false;
      if (flags.teacherNpcId !== bonusDef.teacherNpcId) return false;
      if (bonusDef.lessonId && flags.lessonId !== bonusDef.lessonId) return false;
      return true;
    }) ?? null;
  }

  /** @private */
  _assertActor(actor) {
    if (!actor?.createEmbeddedDocuments) {
      throw new Error('JANUS7 PostRollBuff: Ungültiger Actor (kein createEmbeddedDocuments)');
    }
    if (!actor.isOwner && !game.user.isGM) {
      throw new Error(`JANUS7 PostRollBuff: Keine Rechte für Actor "${actor.name}"`);
    }
  }

  /** @private */
  _assertBonusDef(bonusDef) {
    if (!bonusDef?.name || !bonusDef?.teacherNpcId || !Array.isArray(bonusDef?.buffs)) {
      throw new Error('JANUS7 PostRollBuff: Ungültige bonusDef (name, teacherNpcId, buffs erforderlich)');
    }
  }
}
