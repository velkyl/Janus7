import { DSA5_SYSTEM_ID } from './constants.js';

/**
 * Phase 3: DSA5 System Bridge – Packs / Indexer
 *
 * Baut einen leichten Index über DSA5-Compendia auf (vor allem Items),
 * ohne die eigentlichen Daten in JANUS7 zu duplizieren.
 */

/**
 * DSA5PacksIndex
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
export class DSA5PacksIndex {
  /**
   * @param {object} deps
   * @param {Console} [deps.logger]
   */
  constructor({ logger } = {}) {
    this.logger = logger ?? console;
    /** @type {Map<string, object>} */
    this._byUuid = new Map();
    /** @type {Map<string, string>} */
    this._byTypeAndName = new Map();
    this._built = false;
  }

  /**
   * Liefert alle DSA5-Packs aus game.packs.
   * @param {string} [documentName] optionaler Filter (z.B. 'Item')
   * @returns {CompendiumCollection[]}
   */
  getDsa5Packs(documentName) {
    if (!game?.packs) return [];
    return game.packs.filter((p) => {
      const sys = p.metadata?.system ?? p.metadata?.systemId;
      const docName = p.documentName ?? p.metadata?.entity;
      if (sys !== DSA5_SYSTEM_ID) return false;
      if (documentName && docName !== documentName) return false;
      return true;
    });
  }

  /**
   * Erstellt oder aktualisiert den Index.
   *
   * @param {object} [opts]
   * @param {string} [opts.documentName='Item']
   */
  async buildIndex({ documentName = 'Item' } = {}) {
    this._byUuid.clear();
    this._byTypeAndName.clear();

    const packs = this.getDsa5Packs(documentName);
    for (const pack of packs) {
      try {
        const index = await pack.getIndex({ fields: ['name', 'type'] });
        for (const entry of index) {
          const uuid = `Compendium.${pack.collection}.${entry._id}`;
          this._byUuid.set(uuid, {
            uuid,
            pack: pack.collection,
            name: entry.name,
            type: entry.type,
          });

          const key = this._makeTypeNameKey(entry.type, entry.name);
          if (!this._byTypeAndName.has(key)) {
            this._byTypeAndName.set(key, uuid);
          }
        }
      } catch (err) {
        this.logger?.warn?.('DSA5PacksIndex: Pack konnte nicht indiziert werden.', {
          pack: pack.collection,
          err,
        });
      }
    }

    this._built = true;
  }

  /**
   * Stellt sicher, dass ein Index vorhanden ist.
   */
  async ensureIndex(opts) {
    if (!this._built) {
      await this.buildIndex(opts);
    }
  }

  /**
   * Findet das erste Item mit Namen (case-insensitive) und optionalem Typ.
   *
   * @param {string} name
   * @param {object} [opts]
   * @param {string} [opts.type]
   * @returns {Promise<object|null>}
   */
  async findByName(name, { type } = {}) {
    await this.ensureIndex();
    const key = this._makeTypeNameKey(type, name);
    const uuid = this._byTypeAndName.get(key);
    if (!uuid) return null;
    return this._byUuid.get(uuid) ?? null;
  }

  /**
   * Liefert Metadaten zu einer UUID aus dem Index (falls vorhanden).
   *
   * @param {string} uuid
   * @returns {Promise<object|null>}
   */
  async getByUuid(uuid) {
    await this.ensureIndex();
    return this._byUuid.get(uuid) ?? null;
  }


  /**
   * Sucht Einträge in einem konkreten Compendium-Pack (Collection-Id),
   * z.B. "dsa5.spells", nach einem Namens-Substring (case-insensitive).
   *
   * @param {string} packCollection - z.B. "dsa5.spells"
   * @param {string} query - Suchtext, z.B. "Blitz"
   * @param {object} [opts]
   * @param {string} [opts.type] - optionaler Item-Typ (z.B. "spell")
   * @param {string[]} [opts.fields] - zusätzliche Index-Felder
   * @param {number} [opts.limit=50] - maximal zurückgegebene Treffer
   * @returns {Promise<object[]>} Trefferliste mit {uuid, pack, name, type, _id}
   */
  async searchPack(packCollection, query, { type, fields = [], limit = 50 } = {}) {
    if (!packCollection) return [];
    const pack =
      game?.packs?.get?.(packCollection) ??
      game?.packs?.find?.((p) => p?.collection === packCollection);

    if (!pack) return [];

    // Guard: nur DSA5 Packs
    const sys = pack.metadata?.system ?? pack.metadata?.systemId;
    if (sys !== DSA5_SYSTEM_ID) return [];

    const q = String(query ?? '').toLowerCase().trim();
    if (!q) return [];

    const baseFields = ['name', 'type'];
    const wantedFields = Array.from(new Set([...baseFields, ...fields]));

    const index = await pack.getIndex({ fields: wantedFields });
    const out = [];
    for (const entry of index) {
      const n = String(entry?.name ?? '').toLowerCase();
      if (!n.includes(q)) continue;
      if (type && String(entry?.type ?? '').toLowerCase() !== String(type).toLowerCase()) continue;

      const uuid = `Compendium.${pack.collection}.${entry._id}`;
      out.push({
        uuid,
        pack: pack.collection,
        name: entry.name,
        type: entry.type,
        _id: entry._id,
      });

      if (out.length >= limit) break;
    }
    return out;
  }

  /**
   * Löscht den Index.
   */
  clear() {
    this._byUuid.clear();
    this._byTypeAndName.clear();
    this._built = false;
  }

  /**
   * Hilfsfunktion für Schlüsselaufbau.
   * @private
   */
  _makeTypeNameKey(type, name) {
    const t = (type || '*').toLowerCase();
    const n = String(name || '').toLowerCase();
    return `${t}::${n}`;
  }
}