/**
 * @file bridge/dsa5/advancement.js
 * @module janus7/bridge/dsa5
 * @phase 3
 *
 * Zweck:
 *   DSA5AdvancementBridge: Talent/Zauber-Steigerung und AP-Verwaltung
 *   für den Akademie-Lernfortschritt.
 *
 * Abgebildete DSA5-Mechaniken (aus item-sheet.js / config-dsa5.js):
 *
 *   Steigerungs-Pipeline für Talente (skill):
 *     1. cost = DSA5._calculateAdvCost(item.system.talentValue.value, item.system.StF.value, 1)
 *     2. actor.checkEnoughXP(cost)  → boolean
 *     3. item.update({ 'system.talentValue.value': value + 1 })
 *     4. actor._updateAPs(cost)    → system.details.experience.spent += cost
 *     5. APTracker.track(actor, { type:'item', item, previous, next }, cost)
 *
 *   Steigerungs-Pipeline für Zauber/Liturgien (step-basiert):
 *     1. cost = DSA5._calculateAdvCost(item.system.step.value, item.system.StF.value, 1)
 *     2. Gleiche Schritte 2-5 wie oben, aber `system.step.value` statt `talentValue`
 *
 *   Steigerungskostentabelle DSA5.advancementCosts:
 *     { A:[1,1,1,...,14], B:[2,...,28], C:[3,...,42], D:[4,...,56], E:[15,...,180] }
 *     Index = currentValue + modifier (1 = Steigerung, 0 = Rückerstattung)
 *
 *   AP-Felder am Actor:
 *     system.details.experience.total   = Gesamt-AP
 *     system.details.experience.spent   = Ausgegebene AP
 *     Frei = total - spent
 *
 * Architektur:
 *   - Kein direkter Import von dsa5-Modulen.
 *   - Alle DSA5-Operationen über actor.* / item.* — Foundry-Standard.
 *   - JANUS7 verwendet `APTracker`-ähnliche Logik direkt (kein Import nötig),
 *     da APTracker nur ein Wrapper für page.update ist (schon in journal.js).
 *   - GM-only für Mutations.
 */

// ─── Steigerungskostentabelle (aus DSA5.advancementCosts) ─────────────────────
// Eingebettet um Runtime-Import zu vermeiden; spiegelt exakt die DSA5-Quelle.

/**
 * Steigerungskosten-Tabelle (Kopie aus DSA5.advancementCosts).
 * Index = Talentstufe (0-25). Kategorie A-E.
 * @type {Record<string, number[]>}
 */
export const ADVANCEMENT_COSTS = Object.freeze({
  A: [1,1,1,1,1,1,1,1,1,1,1,1,1,2,3,4,5,6,7,8,9,10,11,12,13,14],
  B: [2,2,2,2,2,2,2,2,2,2,2,2,2,4,6,8,10,12,14,16,18,20,22,24,26,28],
  C: [3,3,3,3,3,3,3,3,3,3,3,3,3,6,9,12,15,18,21,24,27,30,33,36,39,42],
  D: [4,4,4,4,4,4,4,4,4,4,4,4,4,8,12,16,20,24,28,32,36,40,44,48,52,56],
  E: [15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,30,45,60,75,90,105,120,135,150,165,180],
});

/** Item-Typen die `system.talentValue.value` verwenden (Talent-basiert) */
const TALENT_VALUE_TYPES = new Set(['skill', 'combatskill']);

/** Item-Typen die `system.step.value` verwenden (Stufen-basiert) */
const STEP_VALUE_TYPES = new Set(['spell', 'liturgy', 'ritual', 'ceremony', 'blessing', 'specialability', 'advantage', 'disadvantage']);

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

/**
 * Berechnet den AP-Kostenbetrag für eine Steigerung.
 * Entspricht DSA5_Utility._calculateAdvCost(currentAdvances, type, modifier).
 *
 * @param {number} currentValue  - Aktueller Talentgrad (0-25)
 * @param {string} category      - Steigerungskategorie (A-E)
 * @param {number} [modifier=1]  - 1 = Steigerung, 0 = Rückerstattung
 * @returns {number|null}  - Kosten in AP oder null bei ungültigem Input
 */
export function calculateAdvancementCost(currentValue, category, modifier = 1) {
  const costs = ADVANCEMENT_COSTS[category];
  if (!costs) return null;
  const idx = Math.round(Number(currentValue) + modifier);
  if (idx < 0 || idx >= costs.length) return null;
  return costs[idx];
}

/**
 * Liest den aktuellen Talent-/Zauberwert eines Items.
 * Unterstützt sowohl `talentValue.value` als auch `step.value`.
 *
 * @param {Item} item
 * @returns {number|null}
 */
export function readItemValue(item) {
  if (!item?.system) return null;
  if (item.system.talentValue?.value != null) return Number(item.system.talentValue.value);
  if (item.system.step?.value       != null) return Number(item.system.step.value);
  return null;
}

/**
 * Liest die Steigerungskategorie (StF) eines Items.
 * Fallback auf 'B' (Standard für die meisten Talente).
 *
 * @param {Item} item
 * @returns {string}  - 'A'|'B'|'C'|'D'|'E'
 */
export function readItemCategory(item) {
  return item?.system?.StF?.value ?? 'B';
}

// ─── Hauptklasse ─────────────────────────────────────────────────────────────

export class DSA5AdvancementBridge {
  /**
   * @param {object} [deps]
   * @param {Console} [deps.logger]
   */
  constructor({ logger } = {}) {
    this.logger = logger ?? console;
  }

  // ─── XP-Status ─────────────────────────────────────────────────────────────

  /**
   * Liest den XP-Status eines Actors.
   *
   * @param {Actor} actor
   * @returns {{ total: number, spent: number, free: number }}
   */
  getXpStatus(actor) {
    const exp = actor?.system?.details?.experience ?? {};
    const total = Number(exp.total ?? 0);
    const spent = Number(exp.spent ?? 0);
    return { total, spent, free: total - spent };
  }

  /**
   * Vergibt AP an einen Actor (erhöht system.details.experience.total).
   * Entspricht dem GM-Award-XP-Mechanismus.
   *
   * @param {Actor} actor
   * @param {number} amount   - Zu vergebende AP (positiv)
   * @param {string} [reason] - Wird im APTracker-Journal vermerkt
   * @returns {Promise<{previous: number, next: number}>}
   *
   * @example
   * await advancement.awardXp(actor, 50, 'Akademieprüfung bestanden');
   */
  async awardXp(actor, amount, reason = '') {
    this._assertGm();
    this._assertActor(actor);
    const prev = Number(actor.system.details.experience.total ?? 0);
    const next = prev + Math.max(0, Math.round(amount));
    await actor.update({ 'system.details.experience.total': next });

    // APTracker-Journal-Eintrag (best-effort)
    await this._trackApEntry(actor, {
      type: 'sum',
      attr: reason || 'Akademie-Lernfortschritt',
      previous: prev,
      next,
    }, amount);

    this.logger?.info?.(`JANUS7 | Advancement | ${amount} AP vergeben → ${actor.name} (${prev}→${next})`);
    return { previous: prev, next };
  }

  // ─── Steigerungskosten berechnen ───────────────────────────────────────────

  /**
   * Berechnet die AP-Kosten für eine Steigerung eines bestimmten Items.
   * Liest Steigerungskategorie und aktuellen Wert direkt vom Item.
   *
   * @param {Item} item
   * @returns {{ cost: number, currentValue: number, nextValue: number, category: string }|null}
   *
   * @example
   * const info = bridge.advancement.getAdvanceCost(magiekundeItem);
   * // → { cost: 12, currentValue: 14, nextValue: 15, category: 'B' }
   */
  getAdvanceCost(item) {
    const currentValue = readItemValue(item);
    if (currentValue == null) return null;
    const category = readItemCategory(item);
    const cost = calculateAdvancementCost(currentValue, category, 1);
    if (cost == null) return null;
    return { cost, currentValue, nextValue: currentValue + 1, category };
  }

  /**
   * Berechnet die AP-Rückerstattung beim Rückentwickeln eines Items.
   *
   * @param {Item} item
   * @returns {{ refund: number, currentValue: number, category: string }|null}
   */
  getRefundCost(item) {
    const currentValue = readItemValue(item);
    if (currentValue == null || currentValue <= 0) return null;
    const category = readItemCategory(item);
    const refund = calculateAdvancementCost(currentValue, category, 0);
    if (refund == null) return null;
    return { refund, currentValue, nextValue: currentValue - 1, category };
  }

  /**
   * Prüft ob ein Actor genug freie AP hat für eine Steigerung.
   *
   * @param {Actor} actor
   * @param {Item}  item
   * @returns {{ canAfford: boolean, cost: number, free: number }}
   */
  canAffordAdvancement(actor, item) {
    this._assertActor(actor);
    const advInfo = this.getAdvanceCost(item);
    if (!advInfo) return { canAfford: false, cost: 0, free: this.getXpStatus(actor).free };
    const { free } = this.getXpStatus(actor);
    return { canAfford: free >= advInfo.cost, cost: advInfo.cost, free };
  }

  // ─── Steigerung durchführen ────────────────────────────────────────────────

  /**
   * Steigert ein Talent/Zauber um eine Stufe.
   * GM-only. Prüft AP-Verfügbarkeit vor der Steigerung.
   *
   * @param {Actor} actor
   * @param {Item}  item   - Das zu steigernde Item (muss auf dem Actor liegen)
   * @param {object} [opts]
   * @param {boolean} [opts.force=false]    - AP-Check überspringen (für NPC-Fortschritt)
   * @param {boolean} [opts.trackAp=true]   - APTracker-Journal-Eintrag schreiben
   * @returns {Promise<AdvancementResult>}
   *
   * @typedef {Object} AdvancementResult
   * @property {boolean} success
   * @property {number}  previousValue
   * @property {number}  nextValue
   * @property {number}  cost
   * @property {string}  [reason]   - Fehlermeldung wenn !success
   *
   * @example
   * const result = await bridge.advanceItem(actor, magiekundeItem);
   * if (result.success) {
   *   console.log(`Magiekunde: ${result.previousValue} → ${result.nextValue} (${result.cost} AP)`);
   * }
   */
  async advanceItem(actor, item, { force = false, trackAp = true } = {}) {
    this._assertGm();
    this._assertActor(actor);
    this._assertItem(item, actor);

    const advInfo = this.getAdvanceCost(item);
    if (!advInfo) {
      return { success: false, reason: `Kein gültiger Steigerungswert für ${item.name} (${item.type})` };
    }

    const { cost, currentValue, nextValue, category } = advInfo;

    // AP-Check (außer bei force oder NPCs)
    if (!force) {
      const { free } = this.getXpStatus(actor);
      if (free < cost) {
        return {
          success: false,
          reason: `Nicht genug AP: ${free} frei, ${cost} benötigt für ${item.name}`,
          cost, previousValue: currentValue, nextValue,
        };
      }
    }

    // Welches Feld wird gesetzt?
    const valueField = TALENT_VALUE_TYPES.has(item.type)
      ? 'system.talentValue.value'
      : 'system.step.value';

    try {
      // 1. Item-Wert erhöhen
      await item.update({ [valueField]: nextValue });

      // 2. Actor-AP abziehen
      const currentSpent = Number(actor.system.details.experience.spent ?? 0);
      await actor.update({ 'system.details.experience.spent': currentSpent + cost });

      // 3. APTracker-Eintrag (best-effort)
      if (trackAp) {
        await this._trackApEntry(actor, {
          type: 'item',
          item,
          previous: currentValue,
          next: nextValue,
        }, cost);
      }

      this.logger?.info?.(
        `JANUS7 | Advancement | ${actor.name}: ${item.name} (${category}) ${currentValue}→${nextValue} [${cost} AP]`
      );

      return { success: true, previousValue: currentValue, nextValue, cost };

    } catch (err) {
      this.logger?.error?.('JANUS7 | Advancement | advanceItem fehlgeschlagen', {
        actor: actor.name, item: item.name, error: err?.message,
      });
      return { success: false, reason: err?.message, cost, previousValue: currentValue, nextValue };
    }
  }

  /**
   * Steigert mehrere Items auf einmal (Batch-Steigerung nach Lektionszyklus).
   *
   * @param {Actor}  actor
   * @param {Item[]} items
   * @param {object} [opts]
   * @returns {Promise<{ results: AdvancementResult[], succeeded: number, failed: number }>}
   *
   * @example
   * // Nach einer Lektion: alle Lehrplan-Talents steigern
   * const items = lesson.mechanics.skills.map(s => bridge.itemFactory.findItemOnActor(actor, s.systemSkillId));
   * const { results } = await bridge.batchAdvanceItems(actor, items.filter(Boolean));
   */
  async batchAdvanceItems(actor, items, opts = {}) {
    const results = [];
    let succeeded = 0;
    let failed = 0;

    for (const item of items) {
      const result = await this.advanceItem(actor, item, opts);
      results.push({ item: item.name, ...result });
      if (result.success) succeeded++;
      else failed++;
    }

    this.logger?.info?.(
      `JANUS7 | Advancement | Batch für ${actor.name}: ${succeeded} ✓, ${failed} ✗`
    );
    return { results, succeeded, failed };
  }

  /**
   * Sucht ein Item auf einem Actor anhand des Namens oder der systemSkillId
   * und gibt Steigerungsinfo zurück — ohne zu steigern.
   * Nützlich für UI-Vorschau.
   *
   * @param {Actor}  actor
   * @param {string} skillNameOrId  - Itemname oder systemSkillId-Mapping
   * @returns {{ item: Item, advanceCost: object, xpStatus: object }|null}
   */
  previewAdvancement(actor, skillNameOrId) {
    this._assertActor(actor);
    const item = actor.items.find(
      (i) => i.name === skillNameOrId || i.flags?.janus7?.systemSkillId === skillNameOrId
    );
    if (!item) return null;
    return {
      item,
      advanceCost: this.getAdvanceCost(item),
      xpStatus:    this.getXpStatus(actor),
    };
  }

  // ─── Lesson-Outcome Integration ───────────────────────────────────────────

  /**
   * Wendet den Lernfortschritt nach einer Lektion an.
   * Steigert genau die Talente aus lesson.mechanics.skills (gewichtet nach weight ≥ threshold).
   *
   * @param {Actor}  actor
   * @param {object} lessonDef    - Lektion aus lessons.json
   * @param {object} [opts]
   * @param {number} [opts.weightThreshold=0.7]  - Nur skills mit weight ≥ threshold steigern
   * @param {boolean}[opts.force=false]           - AP-Check überspringen
   * @returns {Promise<{advanced: string[], skipped: string[], failed: string[]}>}
   *
   * @example
   * const lesson = game.janus7.academy.data.getLesson('LES_Y1_T1_ARITH_01');
   * await bridge.advanceLessonSkills(actor, lesson, { weightThreshold: 0.8 });
   */
  async advanceLessonSkills(actor, lessonDef, { weightThreshold = 0.7, force = false } = {}) {
    this._assertActor(actor);
    const skills = lessonDef?.mechanics?.skills ?? [];
    const advanced = [];
    const skipped  = [];
    const failed   = [];

    for (const skillSpec of skills) {
      // weight-Filter: nur hochgewichtete Skills steigern
      if ((skillSpec.weight ?? 1) < weightThreshold) {
        skipped.push(skillSpec.systemSkillId);
        continue;
      }

      // Item auf Actor suchen
      const item = actor.items.find(
        (i) => i.flags?.janus7?.systemSkillId === skillSpec.systemSkillId
          ||   i.name === skillSpec.systemSkillId
      );

      if (!item) {
        this.logger?.debug?.(`JANUS7 | Advancement | Item nicht gefunden: ${skillSpec.systemSkillId}`);
        skipped.push(skillSpec.systemSkillId);
        continue;
      }

      const result = await this.advanceItem(actor, item, { force });
      if (result.success) advanced.push(item.name);
      else failed.push(`${item.name}: ${result.reason}`);
    }

    return { advanced, skipped, failed };
  }

  // ─── Interne Hilfsmethoden ────────────────────────────────────────────────

  /**
   * Schreibt einen AP-Eintrag ins APTracker-Journal (best-effort).
   * Entspricht APTracker.track() ohne statischen Import.
   * @private
   */
  async _trackApEntry(actor, description, cost) {
    try {
      // DSA5 APTracker nur wenn Einstellung aktiv
      if (!game.settings.get('dsa5', 'enableAPTracking')) return;

      // Journal via DSA5 flag finden (wie JournalTracker.track)
      const journal = game.journal?.find(
        (j) => foundry.utils.getProperty(j.flags, 'dsa5.apTrackerId') === actor.id
      );
      if (!journal) return;

      const page = journal.pages?.find((p) => p.type === 'dsaaptracker');
      if (!page) return;

      const key = `janus_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`;
      const existing = page.system?.entries ?? {};

      const entry = {
        created:  Date.now(),
        type:     description.type ?? 'item',
        itemUuid: description.item?.uuid ?? null,
        itemType: description.item?.type ?? null,
        itemName: description.item?.name ?? description.attr ?? '—',
        attr:     description.attr ?? '',
        state:    0,
        previous: description.previous ?? 0,
        next:     description.next ?? 0,
        cost:     cost ?? 0,
        total: `${actor.system.details.experience.spent}/${actor.system.details.experience.total}`,
      };

      await page.update({ 'system.entries': { ...existing, [key]: entry } });
    } catch (err) {
      // APTracker ist nicht kritisch — immer best-effort
      this.logger?.debug?.('JANUS7 | Advancement | APTracker-Eintrag fehlgeschlagen (ignoriert)', err?.message);
    }
  }

  /** @private */
  _assertGm() {
    if (!game.user?.isGM) throw new Error('JANUS7 Advancement: GM-Rechte erforderlich');
  }

  /** @private */
  _assertActor(actor) {
    if (!actor?.update || !actor?.items) {
      throw new Error('JANUS7 Advancement: Ungültiger Actor');
    }
  }

  /** @private */
  _assertItem(item, actor) {
    if (!item?.update || !item?.system) {
      throw new Error(`JANUS7 Advancement: Ungültiges Item`);
    }
    // Item muss zum Actor gehören (parent-Check)
    if (item.parent?.id !== actor.id) {
      throw new Error(`JANUS7 Advancement: Item "${item.name}" gehört nicht zu Actor "${actor.name}"`);
    }
  }
}
