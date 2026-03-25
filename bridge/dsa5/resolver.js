import { DSA5ResolveError } from './errors.js';

/**
 * @typedef {object} ResolveOptions
 * @property {string} [pack] - Compendium-Paket-ID, z.B. "dsa5.items"
 * @property {string} [name] - Dokumentname (case-insensitive contains)
 * @property {string} [type] - Item/Document-Typ (optional Filter)
 */

/**
 * Phase 3: DSA5 System Bridge – Resolver
 * Kapselt:
 * - fromUuid
 * - Compendium Index-Suche
 * - einfache Name/ID/UUID Heuristiken
 */
/**
 * DSA5Resolver
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
export class DSA5Resolver {
  /**
   * @param {object} deps
   * @param {object} deps.logger - JanusLogger kompatibel
   */
  constructor({ logger }) {
    this.logger = logger;
    /** @type {Map<string, Array<object>>} */
    this._packIndexCache = new Map();

    // Bind öffentliche Methoden an diese Instanz, damit der Kontext bei destrukturierten Aufrufen erhalten bleibt.
    const proto = Object.getPrototypeOf(this);
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key === 'constructor') continue;
      const fn = this[key];
      if (typeof fn === 'function') this[key] = fn.bind(this);
    }
  }

  /**
   * @param {string} uuid
   * @returns {Promise<ClientDocument|null>}
   */
  async fromUuid(uuid) {
    if (!uuid) return null;
    try {
      // Foundry global
      return await globalThis.fromUuid(uuid);
    } catch (err) {
      this.logger?.warn?.('DSA5Resolver.fromUuid fehlgeschlagen', uuid, err);
      return null;
    }
  }

  /**
   * @param {string} packId
   * @returns {CompendiumCollection|null}
   */
  _getPack(packId) {
    const pack = game.packs?.get(packId) ?? null;
    if (!pack) this.logger?.warn?.('DSA5Resolver: Pack nicht gefunden', packId);
    return pack;
  }

  /**
   * Lädt (und cached) den Index eines Compendiums.
   * @param {string} packId
   * @returns {Promise<Array<object>>}
   */
  async getPackIndex(packId) {
    if (this._packIndexCache.has(packId)) return this._packIndexCache.get(packId);
    const pack = this._getPack(packId);
    if (!pack) return [];
    try {
      const idx = await pack.getIndex();
      const arr = Array.from(idx ?? []);
      this._packIndexCache.set(packId, arr);
      return arr;
    } catch (err) {
      this.logger?.warn?.('DSA5Resolver: getIndex fehlgeschlagen', packId, err);
      return [];
    }
  }

  /**
   * Findet einen Index-Eintrag per Name (contains, case-insensitive).
   * @param {ResolveOptions} opts
   * @returns {Promise<object|null>}
   */
  async findInCompendium(opts) {
    const { pack, name, type } = opts ?? {};
    if (!pack || !name) return null;
    const idx = await this.getPackIndex(pack);
    const needle = String(name).trim().toLowerCase();
    const candidates = idx.filter((e) => {
      const en = String(e.name ?? '').toLowerCase();
      if (!en.includes(needle)) return false;
      if (type && e.type && String(e.type) !== String(type)) return false;
      return true;
    });
    // Heuristik: exakter Match bevorzugt
    const exact = candidates.find((e) => String(e.name ?? '').toLowerCase() === needle);
    return exact ?? candidates[0] ?? null;
  }

  /**
   * Resolve Item per UUID oder (pack+name).
   * @param {string|object} ref - uuid oder already item document
   * @param {ResolveOptions} [opts]
   * @returns {Promise<Item|null>}
   */
  async resolveItem(ref, opts = {}) {
    if (!ref) return null;
    if (typeof ref === 'object' && ref?.documentName === 'Item') return ref;
    if (typeof ref === 'string' && ref.startsWith('Item.')) {
      return /** @type {Item|null} */ (await this.fromUuid(ref));
    }
    if (typeof ref === 'string' && ref.includes('.')) {
      // generische UUID
      const doc = await this.fromUuid(ref);
      if (doc?.documentName === 'Item') return doc;
    }

    // pack+name fallback
    const hit = await this.findInCompendium(opts);
    if (!hit) return null;
    try {
      const pack = this._getPack(opts.pack);
      if (!pack) return null;
      return /** @type {Item|null} */ (await pack.getDocument(hit._id));
    } catch (err) {
      this.logger?.warn?.('DSA5Resolver.resolveItem: pack.getDocument fehlgeschlagen', opts, err);
      return null;
    }
  }

  /**
   * Resolve Actor per UUID oder Actor-ID oder Token-ID.
   * @param {string|object} ref
   * @returns {Promise<Actor|null>}
   */
  async resolveActor(ref) {
    if (!ref) return null;
    if (typeof ref === 'object' && ref?.documentName === 'Actor') return ref;

    // UUID
    if (typeof ref === 'string' && ref.includes('.')) {
      const doc = await this.fromUuid(ref);
      if (doc?.documentName === 'Actor') return doc;
    }

    // Actor-ID
    if (typeof ref === 'string') {
      const actor = game.actors?.get(ref) ?? null;
      if (actor) return actor;
    }

    // Token-ID (Scene/Canvas)
    if (typeof ref === 'string') {
      const token = canvas?.tokens?.get(ref) ?? null;
      if (token?.actor) return token.actor;
    }

    return null;
  }

  /**
   * Convenience: hard fail, wenn nicht auflösbar.
   * @param {'Actor'|'Item'} kind
   * @param {any} ref
   * @param {ResolveOptions} [opts]
   */
  async require(kind, ref, opts) {
    const doc = kind === 'Actor' ? await this.resolveActor(ref) : await this.resolveItem(ref, opts);
    if (!doc) throw new DSA5ResolveError(`${kind} konnte nicht aufgelöst werden`, { kind, ref, opts });
    return doc;
  }

  clearCaches() {
    this._packIndexCache.clear();
  }
}