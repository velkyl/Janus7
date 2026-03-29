/**
 * @file bridge/dsa5/item-factory.js
 * @module janus7/bridge/dsa5
 * @phase 3
 *
 * Zweck:
 * Kapselt game.dsa5.entities.ItemFactory für die Akademie-Simulation.
 *
 * Einsatz:
 *   - Stelle sicher, dass ein Schüler-Actor die für eine Lektion nötigen
 *     Skills/Zauber als Items hat (ensureItemOnActor).
 *   - Erzeuge DSA5-konforme Items aus JANUS7 systemSkillId-Definitionen,
 *     ohne selbst den system-Payload zu kennen.
 *
 * Architektur:
 * - Nutzt nur game.dsa5.entities.ItemFactory (public API).
 * - Fallback: compendium-Suche über DSA5PacksIndex.
 * - Kein direkter Zugriff auf DSA5-Interna.
 *
 * JANUS7 systemSkillId-Schema:
 *   TALENT_*   → type 'skill'
 *   SPELL_*    → type 'spell'
 *   LITURGY_*  → type 'liturgy'
 *   RITUAL_*   → type 'ritual'
 *   CEREMONY_* → type 'ceremony'
 *   ATTRIBUTE_* → kein Item (Eigenschaft, direkt am Actor)
 */

import { DSA5ResolveError } from './errors.js';

// ─── systemSkillId → DSA5 Item-Type Mapping ──────────────────────────────────

/** @type {Record<string, string>} */
const SKILL_ID_PREFIX_TO_TYPE = Object.freeze({
  TALENT_:   'skill',
  SPELL_:    'spell',
  LITURGY_:  'liturgy',
  RITUAL_:   'ritual',
  CEREMONY_: 'ceremony',
  BLESSING_: 'blessing',
  TRICK_:    'magictrick',
});

/**
 * Leitet den DSA5 Item-Typ aus einer JANUS7 systemSkillId ab.
 * @param {string} systemSkillId
 * @returns {string|null}  null für ATTRIBUTE_*
 */
export function itemTypeFromSystemSkillId(systemSkillId) {
  if (!systemSkillId) return null;
  for (const [prefix, type] of Object.entries(SKILL_ID_PREFIX_TO_TYPE)) {
    if (systemSkillId.startsWith(prefix)) return type;
  }
  if (systemSkillId.startsWith('ATTRIBUTE_')) return null;
  return 'skill'; // Fallback
}

/**
 * Extrahiert den lesbaren Namen aus einer systemSkillId.
 * Beispiele:
 *   TALENT_MAGIEKUNDE        → 'Magiekunde'
 *   SPELL_CORPOFRIGO         → 'Corpofrigo'
 *   ATTRIBUTE_KLUGHEIT       → 'Klugheit'
 *
 * @param {string} systemSkillId
 * @returns {string}
 */
export function nameFromSystemSkillId(systemSkillId) {
  if (!systemSkillId) return systemSkillId ?? '';
  // Präfix entfernen, Unterstriche → Leerzeichen, Title-Case
  const raw = systemSkillId
    .replace(/^(TALENT|SPELL|LITURGY|RITUAL|CEREMONY|BLESSING|TRICK|ATTRIBUTE)_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  // Spezial-Korrekturen für bekannte Namen
  return KNOWN_NAMES[systemSkillId] ?? raw;
}

/**
 * Explizite Namens-Korrekturen (DSA5-Lokalisierung).
 * Erweiterbar ohne Bridge-API-Änderung.
 */
const KNOWN_NAMES = Object.freeze({
  TALENT_SINNESSCHAERFE:   'Sinnesschärfe',
  TALENT_MAGIEKUNDE:       'Magiekunde',
  TALENT_SELBSBEHERRSCHUNG:'Selbstbeherrschung',
  TALENT_MALEN_ZEICHNEN:   'Malen & Zeichnen',
  TALENT_GESCHICHTSWISSEN: 'Geschichtswissen',
  TALENT_RECHNEN:          'Rechnen',
  TALENT_WILLENSKRAFT:     'Willenskraft',
  TALENT_SCHREIBEN:        'Schreiben',
  TALENT_SPRACHEN:         'Sprachen kennen',
  SPELL_CORPOFRIGO:        'Corpofrigo',
  SPELL_IGNIFAXIUS:        'Ignifaxius',
  SPELL_ANALYS:            'Analys',
  ATTRIBUTE_KLUGHEIT:      'Klugheit',
  ATTRIBUTE_FINGERFERTIGKEIT: 'Fingerfertigkeit',
});

// ─── ItemFactory Bridge ───────────────────────────────────────────────────────

/**
 * DSA5ItemFactoryBridge
 *
 * @description
 * Öffentliche API von JANUS7.
 * Erstellt und verifiziert DSA5-Items auf Actors für Lehrplan-Inhalte.
 *
 * @remarks
 * - Nur über game.dsa5.entities.ItemFactory + Compendium-Suche
 * - GM-only für Item-Erstellung
 * - Read-only Checks für alle User
 */
export class DSA5ItemFactoryBridge {
  /**
   * @param {object} deps
   * @param {import('./packs.js').DSA5PacksIndex} [deps.packs]
   * @param {import('./library-service.js').AcademyLibraryService} [deps.library]
   * @param {Console} [deps.logger]
   */
  constructor({ packs, library, logger } = {}) {
    this.packs   = packs   ?? null;
    this.library = library ?? null;
    this.logger  = logger  ?? console;
  }

  // ─── Lesen ───────────────────────────────────────────────────────────────

  /**
   * Prüft ob ein Actor ein Item für eine systemSkillId hat (als embedded Item).
   *
   * @param {Actor} actor
   * @param {string} systemSkillId  - z.B. 'TALENT_MAGIEKUNDE', 'SPELL_CORPOFRIGO'
   * @returns {Item|null}
   */
  findItemOnActor(actor, systemSkillId) {
    const type   = itemTypeFromSystemSkillId(systemSkillId);
    const wanted = nameFromSystemSkillId(systemSkillId).toLowerCase();

    if (!actor?.items || type === null) return null;

    const norm = (s) => String(s ?? '').trim().toLowerCase();

    return Array.from(actor.items.values()).find((i) => {
      if (type && i.type !== type) return false;
      return norm(i.name) === wanted;
    }) ?? null;
  }

  /**
   * Prüft ob ein Actor alle für eine Lektion nötigen Items hat.
   *
   * @param {Actor} actor
   * @param {object[]} mechanics  - lesson.mechanics.skills Array
   * @returns {{ missing: string[], present: string[] }}
   */
  checkLessonItems(actor, mechanics) {
    const missing  = [];
    const present  = [];

    for (const entry of mechanics ?? []) {
      const id = entry?.systemSkillId;
      if (!id) continue;
      if (itemTypeFromSystemSkillId(id) === null) {
        present.push(id); // Attribute brauchen kein Item
        continue;
      }
      if (this.findItemOnActor(actor, id)) {
        present.push(id);
      } else {
        missing.push(id);
      }
    }
    return { missing, present };
  }

  // ─── Erstellen ───────────────────────────────────────────────────────────

  /**
   * Stellt sicher, dass ein Actor ein Item für eine systemSkillId hat.
   * Erstellt das Item wenn nötig (GM-only) über ItemFactory oder Compendium-Import.
   *
   * @param {Actor} actor
   * @param {string} systemSkillId
   * @returns {Promise<{ item: Item|null, created: boolean, skipped: boolean }>}
   */
  async ensureItemOnActor(actor, systemSkillId) {
    if (!actor) throw new DSA5ResolveError('Actor ist null.', { systemSkillId });

    // ATTRIBUTE_* brauchen kein Item
    if (itemTypeFromSystemSkillId(systemSkillId) === null) {
      return { item: null, created: false, skipped: true };
    }

    // Schon vorhanden?
    const existing = this.findItemOnActor(actor, systemSkillId);
    if (existing) {
      this.logger?.debug?.(`[ItemFactory] bereits vorhanden: ${systemSkillId} → ${actor.name}`);
      return { item: existing, created: false, skipped: false };
    }

    if (!game.user?.isGM) {
      this.logger?.debug?.(`[ItemFactory] nicht GM, skip: ${systemSkillId}`);
      return { item: null, created: false, skipped: true };
    }

    // 1) Versuch: ItemFactory
    const itemViaFactory = await this._createViaFactory(actor, systemSkillId);
    if (itemViaFactory) {
      return { item: itemViaFactory, created: true, skipped: false };
    }

    // 2) Fallback: Compendium-Import
    const itemViaPack = await this._importFromCompendium(actor, systemSkillId);
    if (itemViaPack) {
      return { item: itemViaPack, created: true, skipped: false };
    }

    this.logger?.warn?.(`[ItemFactory] Item konnte nicht erstellt werden: ${systemSkillId}`);
    return { item: null, created: false, skipped: false };
  }

  /**
   * Stellt alle Lehrplan-Items einer Lektion auf einem Actor sicher.
   *
   * @param {Actor} actor
   * @param {object} lessonDef  - lesson-Objekt aus lessons.json
   * @returns {Promise<{ ensured: string[], failed: string[] }>}
   */
  async ensureLessonItemsOnActor(actor, lessonDef) {
    const skills  = lessonDef?.mechanics?.skills ?? [];
    const ensured = [];
    const failed  = [];

    for (const entry of skills) {
      const id = entry?.systemSkillId;
      if (!id) continue;
      try {
        const result = await this.ensureItemOnActor(actor, id);
        if (result.item || result.skipped) {
          ensured.push(id);
        } else {
          failed.push(id);
        }
      } catch (err) {
        this.logger?.warn?.(`[ItemFactory] ensureLessonItemsOnActor fehlgeschlagen für ${id}`, { err });
        failed.push(id);
      }
    }

    return { ensured, failed };
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  /**
   * @private — Item via game.dsa5.entities.ItemFactory erstellen
   */
  async _createViaFactory(actor, systemSkillId) {
    try {
      const ItemFactory = game.dsa5?.entities?.ItemFactory;
      if (!ItemFactory) return null;

      const type = itemTypeFromSystemSkillId(systemSkillId);
      const name = nameFromSystemSkillId(systemSkillId);

      // ItemFactory.createItem(type, { name }) → gibt ein Item-Objekt zurück
      // das dann dem Actor hinzugefügt wird
      let item = null;
      if (typeof ItemFactory.createItem === 'function') {
        item = await ItemFactory.createItem(type, { name });
      }

      if (!item) return null;

      // Item dem Actor hinzufügen (Foundry standard)
      const created = await actor.createEmbeddedDocuments('Item', [item.toObject?.() ?? item]);
      const result  = created?.[0] ?? null;

      if (result) {
        this.logger?.info?.(`[ItemFactory] via Factory erstellt: ${name} (${type}) → ${actor.name}`);
        // JANUS7-Flag setzen für Rückverfolgung
        await result.setFlag?.('janus7', 'systemSkillId', systemSkillId);
      }

      return result;
    } catch (err) {
      this.logger?.debug?.(`[ItemFactory] Factory-Weg fehlgeschlagen für ${systemSkillId}`, { err });
      return null;
    }
  }

  /**
   * @private — Item via Compendium importieren
   */
  async _importFromCompendium(actor, systemSkillId) {
    if (!this.packs && !this.library) return null;

    try {
      const type = itemTypeFromSystemSkillId(systemSkillId);
      const name = nameFromSystemSkillId(systemSkillId);

      let hit = null;
      if (this.library) {
        hit = await this.library.findByName(name, type, { firstOnly: true });
      } else if (this.packs) {
        await this.packs.ensureIndex({ documentName: 'Item' });
        hit = await this.packs.findByName(name, { type });
      }

      if (!hit?.uuid) {
        this.logger?.debug?.(`[ItemFactory] nicht im Compendium gefunden: ${name} (${type})`);
        return null;
      }

      // fromUuid → Item-Dokument holen
      const sourceItem = await fromUuid?.(hit.uuid);
      if (!sourceItem) return null;

      // Dem Actor hinzufügen
      const data    = sourceItem.toObject?.() ?? {};
      const created = await actor.createEmbeddedDocuments('Item', [data]);
      const result  = created?.[0] ?? null;

      if (result) {
        this.logger?.info?.(`[ItemFactory] via Compendium importiert: ${name} → ${actor.name}`);
        await result.setFlag?.('janus7', 'systemSkillId', systemSkillId);
        await result.setFlag?.('janus7', 'compendiumUuid', hit.uuid);
      }

      return result;
    } catch (err) {
      this.logger?.debug?.(`[ItemFactory] Compendium-Weg fehlgeschlagen für ${systemSkillId}`, { err });
      return null;
    }
  }
}
