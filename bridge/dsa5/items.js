import { DSA5ResolveError } from './errors.js';

/**
 * Phase 3: DSA5 System Bridge – Item-Hilfen
 *
 * Kapselt Item-Resolution und einfaches Zuweisen von Items (z.B. Zauber) zu Actors.
 */

/**
 * DSA5ItemBridge
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
export class DSA5ItemBridge {
  /**
   * @param {object} deps
   * @param {import('./resolver.js').DSA5Resolver} deps.resolver
   * @param {import('./packs.js').DSA5PacksIndex} [deps.packs]
   * @param {Console} [deps.logger]
   */
  constructor({ resolver, packs, logger } = {}) {
    if (!resolver) {
      throw new Error('DSA5ItemBridge benötigt einen Resolver.');
    }
    this.resolver = resolver;
    this.packs = packs ?? null;
    this.logger = logger ?? console;

    // Bind alle Funktionen an diese Instanz, damit "this" erhalten bleibt bei destrukturierten Aufrufen.
    const proto = Object.getPrototypeOf(this);
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key === 'constructor') continue;
      const fn = this[key];
      if (typeof fn === 'function') this[key] = fn.bind(this);
    }
  }

  /**
   * Wrapper um den Resolver – existiert primär für konsistente API.
   *
   * @param {any} ref
   * @param {import('./resolver.js').ResolveOptions} [opts]
   * @returns {Promise<Item|null>}
   */
  async resolveItem(ref, opts) {
    return this.resolver.resolveItem(ref, opts);
  }

  /**
   * Sucht ein Item via UUID (fromUuid) und verifiziert den Typ.
   *
   * @param {string} uuid
   * @param {string} [expectedType]
   * @returns {Promise<Item>}
   */
  async requireItemByUuid(uuid, expectedType) {
    const doc = await fromUuid(uuid);
    if (!(doc instanceof Item)) {
      throw new DSA5ResolveError('UUID verweist nicht auf ein Item.', { uuid });
    }
    if (expectedType && doc.type !== expectedType) {
      throw new DSA5ResolveError('Item hat unerwarteten Typ.', {
        uuid,
        expectedType,
        actualType: doc.type,
      });
    }
    return doc;
  }

  /**
   * Stellt sicher, dass ein Item auf einem Actor vorhanden ist.
   *
   * - Falls das Item bereits vorhanden ist, wird es zurückgegeben.
   * - Falls nicht und createIfMissing === true, wird eine Kopie angelegt.
   *
   * @param {object} params
   * @param {any}    params.actorRef
   * @param {any}    params.itemRef
   * @param {boolean} [params.createIfMissing=false]
   * @returns {Promise<Item|null>}
   */
  async ensureItemOnActor({ actorRef, itemRef, createIfMissing = false }) {
    const actor = await this.resolver.require('Actor', actorRef);
    const item = await this.resolver.require('Item', itemRef);

    const existing =
      actor.items?.get(item.id) ??
      actor.items?.find?.((i) => i.name === item.name && i.type === item.type);

    if (existing) return existing;

    if (!createIfMissing) {
      return null;
    }

    const data = item.toObject();
    delete data._id;

    const created = await actor.createEmbeddedDocuments('Item', [data]);
    const createdItem = Array.isArray(created) ? created[0] : created;
    return createdItem ?? null;
  }

  /**
   * Convenience für Zauberformeln.
   *
   * @param {object} params
   * @param {any} params.actorRef
   * @param {any} params.spellRef
   * @param {boolean} [params.createIfMissing=true]
   * @returns {Promise<Item|null>}
   */
  /**
   * Convenience für Zauberformeln.
   *
   * @param {object} params
   * @param {any} params.actorRef
   * @param {any} params.spellRef
   * @param {boolean} [params.createIfMissing=true]
   * @returns {Promise<Item|null>}
   */
  async ensureSpellOnActor({ actorRef, spellRef, createIfMissing = true }) {
    const actor = await this.resolver.require('Actor', actorRef);

    let spell = null;

    // 1) Bereits ein Item-Dokument?
    if (spellRef && typeof spellRef === 'object' && spellRef.documentName === 'Item') {
      spell = spellRef;
    }

    // 2) UUID-String (Actor- oder Compendium-UUID)?
    if (!spell && typeof spellRef === 'string' &&
      (spellRef.startsWith('Item.') || spellRef.startsWith('Compendium.'))) {
      spell = await this.resolver.require('Item', spellRef, { type: 'spell' });
    }

    // 3) Reiner Name (z.B. "Ignifaxius") → über Packs-Index auflösen
    if (!spell && typeof spellRef === 'string' && this.packs) {
      try {
        const meta = await this.packs.findByName(spellRef, { type: 'spell' });
        if (meta?.uuid) {
          spell = await this.resolver.require('Item', meta.uuid, { type: 'spell' });
        }
      } catch (e) {
        this.logger?.warn?.('[JANUS7][DSA5][items] ensureSpellOnActor packs lookup failed', { spellRef, error: e });
      }
    }

    // 4) Fallback: direkter Resolver-Aufruf (für zukünftige Erweiterungen)
    if (!spell) {
      spell = await this.resolver.require('Item', spellRef, { type: 'spell' });
    }

    const existing =
      actor.items?.get(spell.id) ??
      actor.items?.find?.((i) => i.name === spell.name && i.type === spell.type);

    if (existing) return existing;
    if (!createIfMissing) return null;

    const data = spell.toObject();
    delete data._id;

    const created = await actor.createEmbeddedDocuments('Item', [data]);
    return Array.isArray(created) ? created[0] : created;
  }
}