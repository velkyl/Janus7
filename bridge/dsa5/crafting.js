/**
 * @file bridge/dsa5/crafting.js
 * @module janus7/bridge/dsa5
 * @phase 3
 *
 * Zweck:
 * Botanik-, Alchemie- und Handwerks-Bridge für Premium Module (Herbarium I & II).
 * Erlaubt das zufällige Ziehen und direkte Austeilen von Pflanzen/Rezepten/Giften an Actors.
 */

import { emitHook, HOOKS } from '../../core/hooks/emitter.js';

export class DSA5CraftingBridge {
  /**
   * @param {object} deps
   * @param {import('./resolver.js').DSA5Resolver} deps.resolver
   * @param {import('./library-service.js').AcademyLibraryService} deps.library
   * @param {Console} [deps.logger]
   */
  constructor({ resolver, library, logger } = {}) {
    if (!resolver) throw new Error('DSA5CraftingBridge benötigt einen Resolver.');
    if (!library) throw new Error('DSA5CraftingBridge benötigt AcademyLibraryService.');
    
    this.resolver = resolver;
    this.library = library;
    this.logger = logger ?? console;
  }

  /**
   * Zieht zufällige Items eines Typs (z.B. plant, poison, recipe) aus dem Library-Index 
   * und fügt sie dem Inventar des Actors hinzu.
   *
   * @param {Actor} actor
   * @param {string|string[]} types - z.B. 'plant', 'poison'
   * @param {number} amount - quantity/menge
   * @returns {Promise<Item[]>}
   */
  async gatherRandomItems(actor, types, amount = 1) {
    if (!actor) {
      this.logger?.warn?.('[Bridge/Crafting] gatherRandomItems abgebrochen: kein actor gefunden.');
      return [];
    }
    
    const typeArray = Array.isArray(types) ? types : [types];
    
    // Wir ignorieren hier den PackageName-Filter, solange das Item den richtigen Typ hat.
    // Herbarium / Meistertoolset oder Custom Modules greifen einwandfrei.
    const items = await this.library.search({ types: typeArray, limit: 1000 });
    
    if (!items || items.length === 0) {
      this.logger?.warn?.(`[Bridge/Crafting] Keine Items des Typs ${typeArray.join(',')} gefunden.`);
      return [];
    }

    const randomIndex = Math.floor(Math.random() * items.length);
    const entry = items[randomIndex];

    const sourceDoc = await this.library.resolve(entry.uuid);
    if (!sourceDoc) return [];

    const docData = sourceDoc.toObject();
    // Passe Stückzahl (quantity) an, falls möglich
    if (docData.system && docData.system.quantity !== undefined) {
      docData.system.quantity = amount;
    }

    const createdItems = await actor.createEmbeddedDocuments('Item', [docData]);
    
    if (createdItems.length > 0) {
      this.logger?.info?.(`[Bridge/Crafting] ${actor.name} erlangt ${amount}x ${entry.name}`);
      try {
        emitHook(HOOKS.ACTOR_LOOT_RECEIVED, { actor, items: createdItems, source: 'crafting-bridge' });
      } catch (err) {
        /* hook error ignorieren */
        this.logger?.warn?.('[Bridge/Crafting] Hook ACTOR_LOOT_RECEIVED fehlgeschlagen (non-fatal)', { err: err?.message ?? err });
      }
    }

    return createdItems;
  }

  /**
   * Holt eine spezifische Krankheit (disease) oder ein Gift (poison) aus dem Compendium 
   * und hängt es unbemerkt an den Actor (Inkubationszeit läuft nativ in dsa5 ab).
   *
   * @param {Actor} actor
   * @param {string} itemName - z.B. "Sumpffieber", "Wurzelgift"
   * @param {string} type - 'disease' oder 'poison'
   */
  async applyHazard(actor, itemName, type) {
    if (!actor) return null;
    const entry = await this.library.findByName(itemName, type, { firstOnly: true });
    
    if (!entry) {
      this.logger?.warn?.(`[Bridge/Crafting] Hazard ${itemName} (${type}) nicht gefunden.`);
      return null;
    }

    const sourceDoc = await this.library.resolve(entry.uuid);
    if (!sourceDoc) return null;

    const created = await actor.createEmbeddedDocuments('Item', [sourceDoc.toObject()]);
    this.logger?.info?.(`[Bridge/Crafting] Hazard ${itemName} auf ${actor.name} appliziert.`);
    return created;
  }
}
