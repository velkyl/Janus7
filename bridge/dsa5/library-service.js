/**
 * @file bridge/dsa5/library-service.js
 * @module janus7/bridge/dsa5
 * @phase 3
 *
 * Zweck:
 *  AcademyLibraryService — DSA5-Kompendien als durchsuchbare "Bibliothek".
 *
 * Prinzip:
 *  - Nur `game.packs` + `pack.getIndex()` — keine Vollladung.
 *  - Respektiert DSA5-Setting `libraryModulsFilter`.
 *  - Nur bei Bedarf: `fromUuid()` (lazy Materialisierung).
 *  - Keine internen DSA5-Imports.
 *
 * Öffentliche API:
 *  buildIndex()           — Index aufbauen (alle aktiven DSA5-Packs)
 *  refresh()              — Force-Rebuild (Button im UI)
 *  search({q,types,limit}) — Cross-Pack Suche
 *  resolve(uuid)          — Lazy: lädt genau 1 Dokument
 *  listPacks({documentName,source,includeDisabled}) — Pack-Inventar
 *  stats()                — {packs, entries, lastBuildMs, staleMs}
 */

const DSA5_SETTING_LIBRARY_FILTER = 'libraryModulsFilter';

/**
 * @typedef {object} LibraryEntry
 * @property {string}  uuid
 * @property {string}  pack
 * @property {string}  packLabel
 * @property {string}  packageName
 * @property {string}  name
 * @property {string}  type
 * @property {string}  [img]
 * @property {string}  [_id]
 */

/**
 * @typedef {object} LibraryStats
 * @property {number}  packs
 * @property {number}  entries
 * @property {number|null} lastBuildMs  - Unix-ms des letzten Builds
 * @property {number|null} staleMs      - Alter des Index in ms (null = nie gebaut)
 * @property {boolean} built
 */

export class AcademyLibraryService {
  /**
   * @param {object} deps
   * @param {Console} [deps.logger]
   * @param {string}  [deps.systemId='dsa5']
   */
  constructor({ logger, systemId = 'dsa5' } = {}) {
    this.logger   = logger ?? console;
    this.systemId = systemId;

    /** @type {Map<string, LibraryEntry>} uuid → entry */
    this._byUuid = new Map();

    /** @type {Map<string, string[]>} "type::normalizedName" → uuid[] */
    this._byKey = new Map();

    /** @type {boolean} */
    this._built = false;

    /** @type {number|null} */
    this._lastBuildMs = null;

    /** @type {boolean} */
    this._building = false;
  }

  // ─── Pack Inventar ────────────────────────────────────────────────────────

  /**
   * Liefert alle aktiven Packs die DSA5-Inhalt haben.
   *
   * @param {object} [opts]
   * @param {string}  [opts.documentName]  z.B. 'Item', 'Actor', 'JournalEntry'
   * @param {'system'|'module'|'world'|null} [opts.source]  Quelle filtern
   * @param {boolean} [opts.includeDisabled=false]  deaktivierte Module einschließen
   * @param {boolean} [opts.respectDSAFilter=true]  DSA5 libraryModulsFilter beachten
   * @returns {CompendiumCollection[]}
   */
  listPacks({
    documentName   = null,
    documentNames  = null,
    source         = null,
    includeDisabled = false,
    respectDSAFilter = true,
  } = {}) {
    if (!game?.packs) return [];

    const rejected = this._getLibraryModulsFilter(respectDSAFilter);

    return [...game.packs.values()].filter((pack) => {
      const meta       = pack.metadata ?? {};
      const packSource = meta.packageType ?? meta.type ?? null;
      const packName   = meta.packageName ?? meta.name ?? '';
      const packDoc    = pack.documentName ?? meta.entity ?? '';
      const packSys    = meta.system ?? meta.systemId ?? '';

      // 1) Muss DSA5-System-Pack ODER ein Modul-Pack sein, das explizit DSA5-Inhalt trägt.
      //    WICHTIG: Keine "alle Module"-Indexierung – sonst Noise/Perf-Probleme.
      const isDsa5System = (packSource === 'system' && packName === this.systemId) || packSys === this.systemId;
      const isDsa5Module = (packSource === 'module' && packSys === this.systemId);
      if (!isDsa5System && !isDsa5Module) return false;

      // 2) Nur erlaubte Pack-Typen (Item, Actor, Scene etc.)
      if (documentName && packDoc !== documentName) return false;
      if (documentNames && !documentNames.includes(packDoc)) return false;

      // 3) Quelle filtern (system / module / world)
      if (source && packSource !== source) return false;

      // 4) Deaktivierte Module ausschließen (wenn nicht explizit erwünscht)
      if (!includeDisabled && packSource === 'module') {
        const mod = game.modules?.get?.(packName);
        if (mod && !mod.active) return false;
      }

      // 5) DSA5 Bibliotheksfilter
      if (rejected.has(packName)) return false;

      return true;
    });
  }

  // ─── Index bauen ─────────────────────────────────────────────────────────

  /**
   * Baut den Cross-Pack-Index auf.
   * Lädt NUR Indizes (`pack.getIndex`), keine vollständigen Dokumente.
   *
   * @param {object} [opts]
   * @param {string}  [opts.documentName='Item']
   * @param {string[]} [opts.documentNames]
   * @param {boolean} [opts.force=false]  erzwingt Rebuild
   * @returns {Promise<void>}
   */
  async buildIndex({ documentName = 'Item', documentNames = null, force = false } = {}) {
    if (this._building) {
      this.logger?.debug?.('[Library] buildIndex bereits aktiv – skip');
      return;
    }
    if (this._built && !force) return;

    this._building = true;
    this._byUuid.clear();
    this._byKey.clear();

    const namesToLoad = documentNames || [documentName];
    const packs = this.listPacks({ documentNames: namesToLoad, respectDSAFilter: true });
    const start = Date.now();
    let total   = 0;

    this.logger?.info?.(`[Library] Indexierung: ${packs.length} Packs (${namesToLoad.join(', ')})`);

    let currentPack = 0;

    for (const pack of packs) {
      const progress = Math.round((currentPack / packs.length) * 100);
      Hooks.callAll('janusLibraryProgress', progress);
      
      try {
        const index = await pack.getIndex({
          fields: ['name', 'type', 'img', 'system.type', 'system.price.value'],
        });

        const packMeta  = pack.metadata ?? {};
        const packLabel = packMeta.label ?? pack.collection;
        const pkgName   = packMeta.packageName ?? packMeta.name ?? '';

        for (const entry of index) {
          const uuid = `Compendium.${pack.collection}.${entry._id}`;
          // Fallback if type is missing (like for Scenes)
          const type = entry.type || (pack.documentName === 'Scene' ? 'scene' : '');

          /** @type {LibraryEntry} */
          const item = {
            uuid,
            pack:        pack.collection,
            packLabel,
            packageName: pkgName,
            name:        entry.name ?? '',
            type,
            documentName: pack.documentName,
            price:       entry.system?.price?.value || 0,
            img:         entry.img ?? null,
            _id:         entry._id,
          };

          this._byUuid.set(uuid, item);

          const key = this._makeKey(type, entry.name);
          const existing = this._byKey.get(key);
          if (existing) {
            existing.push(uuid);
          } else {
            this._byKey.set(key, [uuid]);
          }
          total++;
        }
      } catch (err) {
        this.logger?.warn?.(`[Library] Pack ${pack.collection} konnte nicht indiziert werden`, { err });
      }

      // UI-yield: verhindert spürbare Freezes bei vielen Packs.
      await new Promise((r) => setTimeout(r, 0));
      currentPack++;
    }

    this._built       = true;
    this._lastBuildMs = Date.now();
    this._building    = false;
    
    Hooks.callAll('janusLibraryProgress', 100);

    this.logger?.info?.(`[Library] Index fertig: ${total} Einträge aus ${packs.length} Packs (${Date.now() - start}ms)`);
  }

  /**
   * Stellt sicher, dass ein Index besteht.
   * @param {object} [opts]
   */
  async ensureIndex(opts) {
    if (!this._built) await this.buildIndex(opts);
  }

  /**
   * Force-Rebuild des Index (z.B. nach Modul-Aktivierung).
   * @param {object} [opts]
   */
  async refresh(opts) {
    await this.buildIndex({ ...(opts ?? {}), force: true });
  }

  // ─── Suche ───────────────────────────────────────────────────────────────

  /**
   * Cross-Pack Suche über alle indizierten Einträge.
   * Rein auf Indizes — keine Vollladung.
   *
   * @param {object} opts
   * @param {string}   opts.q                - Suchtext (Substring, case-insensitive)
   * @param {string[]} [opts.types]           - z.B. ['spell', 'skill']
   * @param {string[]} [opts.packs]           - nur diese Collections durchsuchen
   * @param {string}   [opts.packageName]     - nur dieses Modul
   * @param {number}   [opts.limit=50]        - max. Treffer
   * @param {'name'|'pack'|'type'} [opts.sortBy='name'] - Sortierung
   * @returns {Promise<LibraryEntry[]>}
   */
  async search({ q = '', types = null, packs = null, packageName = null, limit = 50, sortBy = 'name' } = {}) {
    await this.ensureIndex();

    const query      = String(q).toLowerCase().trim();
    const typeSet    = types?.length ? new Set(types.map((t) => t.toLowerCase())) : null;
    const packSet    = packs?.length ? new Set(packs) : null;
    const results    = [];

    for (const [, entry] of this._byUuid) {
      // Typ-Filter
      if (typeSet && !typeSet.has(entry.type.toLowerCase())) continue;

      // Pack-Filter
      if (packSet && !packSet.has(entry.pack)) continue;

      // Modul-Filter
      if (packageName && entry.packageName !== packageName) continue;

      // Text-Filter (leer = alle)
      if (query && !entry.name.toLowerCase().includes(query)) continue;

      results.push(entry);
      if (results.length >= limit) break;
    }

    // Sortieren
    if (sortBy === 'name') {
      results.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    } else if (sortBy === 'pack') {
      results.sort((a, b) => a.pack.localeCompare(b.pack));
    } else if (sortBy === 'type') {
      results.sort((a, b) => a.type.localeCompare(b.type));
    }

    return results;
  }

  /**
   * Exakts Lookup nach Name + Typ (wie `findByName` in packs.js, aber cross-pack).
   *
   * @param {string}  name
   * @param {string}  [type]
   * @param {object}  [opts]
   * @param {boolean} [opts.firstOnly=true]
   * @returns {Promise<LibraryEntry|LibraryEntry[]|null>}
   */
  async findByName(name, type, { firstOnly = true } = {}) {
    await this.ensureIndex();
    const key   = this._makeKey(type ?? null, name);
    const uuids = this._byKey.get(key) ?? [];

    let entries = uuids.map((u) => this._byUuid.get(u)).filter(Boolean);

    // Prioritize non-core modules (like dsa5-magic-1) over dsa5-core
    const sortEntries = (list) => {
      list.sort((a, b) => {
        const aCore = (a.packageName || '').includes('core');
        const bCore = (b.packageName || '').includes('core');
        if (aCore && !bCore) return 1;
        if (!aCore && bCore) return -1;
        return 0;
      });
      return list;
    };

    if (!entries.length) {
      // Fallback: case-insensitive substring
      const backup = await this.search({ q: name, types: type ? [type] : null, limit: firstOnly ? 1 : 10 });
      sortEntries(backup);
      return firstOnly ? (backup[0] ?? null) : backup;
    }

    sortEntries(entries);
    return firstOnly ? (entries[0] ?? null) : entries;
  }

  // ─── Lazy Resolve ─────────────────────────────────────────────────────────

  /**
   * Materialisiert genau 1 Dokument per UUID.
   * Erst aufrufen wenn wirklich nötig (Klick auf "Import").
   *
   * @param {string} uuid
   * @returns {Promise<Document|null>}
   */
  async resolve(uuid) {
    if (!uuid) return null;
    try {
      const doc = await fromUuid?.(uuid);
      return doc ?? null;
    } catch (err) {
      this.logger?.warn?.(`[Library] resolve(${uuid}) fehlgeschlagen`, { err });
      return null;
    }
  }


  /**
   * Liefert leichte Snapshot-Einträge aus dem aufgebauten Index.
   * Nützlich für Read-Modelle wie den JANUS-Graph, ohne die interne Map direkt zu kennen.
   *
   * @param {object} [opts]
   * @param {string[]} [opts.types]
   * @param {string[]} [opts.packs]
   * @param {string} [opts.packageName]
   * @param {number} [opts.limit=2000]
   * @returns {Promise<LibraryEntry[]>}
   */
  async entries({ types = null, packs = null, packageName = null, limit = 2000 } = {}) {
    await this.ensureIndex();
    const typeSet = Array.isArray(types) && types.length ? new Set(types.map((t) => String(t).toLowerCase())) : null;
    const packSet = Array.isArray(packs) && packs.length ? new Set(packs) : null;
    const out = [];
    for (const [, entry] of this._byUuid) {
      if (typeSet && !typeSet.has(String(entry?.type ?? '').toLowerCase())) continue;
      if (packSet && !packSet.has(entry?.pack)) continue;
      if (packageName && entry?.packageName !== packageName) continue;
      out.push(entry);
      if (out.length >= limit) break;
    }
    return out;
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  /**
   * @returns {LibraryStats}
   */
  stats() {
    return {
      packs:       this._built ? this.listPacks().length : 0,
      entries:     this._byUuid.size,
      lastBuildMs: this._lastBuildMs,
      staleMs:     this._lastBuildMs ? Date.now() - this._lastBuildMs : null,
      built:       this._built,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * DSA5 libraryModulsFilter-Setting lesen.
   * @private
   * @param {boolean} respect
   * @returns {Set<string>}
   */
  _getLibraryModulsFilter(respect) {
    if (!respect) return new Set();
    try {
      const raw = game?.settings?.get?.('dsa5', DSA5_SETTING_LIBRARY_FILTER);
      if (Array.isArray(raw)) return new Set(raw);
      return new Set();
    } catch {
      return new Set();
    }
  }

  /**
   * @private
   */
  _makeKey(type, name) {
    const t = (type || '*').toLowerCase();
    const n = String(name || '').toLowerCase().trim();
    return `${t}::${n}`;
  }

  /**
   * Index leeren.
   */
  clear() {
    this._byUuid.clear();
    this._byKey.clear();
    this._built       = false;
    this._lastBuildMs = null;
    this._building    = false;
  }
}
