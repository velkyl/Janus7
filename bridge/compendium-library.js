/**
 * @file bridge/compendium-library.js
 * @module janus7/bridge
 * @phase 3
 *
 * CompendiumLibrary
 *
 * Kapselt alle Zugriffe auf Foundry-Compendien ("Bibliothek") für JANUS7.
 *
 * Verantwortlichkeiten:
 *   1. Suche nach Dokumenten in ALLEN geladenen Modulen (game.packs)
 *      — nicht nur DSA5-eigene Packs, sondern auch Community-Module, Addons etc.
 *   2. Import eines Compendium-Dokuments in die aktive Welt (Foundry: importFromCompendium)
 *   3. Lazy-Index pro documentName: wird erst beim ersten Aufruf gebaut, dann gecacht
 *
 * Suchstrategie (Priorität):
 *   1. Exakter Name-Match (case-insensitive) im DSA5-eigenen Pack-System
 *   2. Exakter Name-Match in ALLEN anderen aktivierten Modulen
 *   3. Enthält-Suche als Fallback (nur wenn allowFuzzy=true)
 *
 * Import-Strategie:
 *   - Foundry v13: game.collections.get(docType).importFromCompendium(pack, docId, updateData, options)
 *   - Gibt das neu erstellte World-Dokument zurück
 *   - Bei Actors wird type:'character' → type:'npc' angepasst falls gewünscht
 *
 * @architecture
 *   - Keine UI-Seiteneffekte
 *   - Kein direkter Zugriff auf JANUS7-State
 *   - Kein Schreiben in game.settings (das macht SyncEngine)
 */

/** Foundry documentName → Kurzname für Logging */
const DOC_LABELS = {
  Actor:        'NSC',
  Scene:        'Szene',
  Item:         'Item',
  JournalEntry: 'Journal',
  Playlist:     'Playlist',
  RollTable:    'Tabelle',
  Macro:        'Makro',
};

/**
 * @typedef {object} CompendiumHit
 * @property {string}  uuid         Compendium-UUID  "Compendium.pack.collection.Type.id"
 * @property {string}  packId       z.B. "dsa5.npcs"
 * @property {string}  packLabel    Anzeigename des Packs
 * @property {string}  packModule   Modul-ID des Packs
 * @property {string}  docId        _id des Eintrags
 * @property {string}  name         Eintrags-Name
 * @property {string}  docType      Actor / Item / JournalEntry etc.
 * @property {string}  [itemType]   DSA5-Typ bei Items (z.B. "npc", "spell", "alchemica")
 * @property {boolean} isDsa5       Kommt aus dem dsa5 System-Pack
 * @property {boolean} isExact      Exakter Name-Match
 * @property {string}  [source]     "world" | "compendium"
 */

export class CompendiumLibrary {
  /**
   * @param {object} [deps]
   * @param {object} [deps.logger]
   */
  constructor({ logger } = {}) {
    this._logger = logger ?? console;
    /** @type {Map<string, CompendiumHit[]>} docType → alle indizierten Einträge */
    this._indexCache = new Map();
    /** @type {Set<string>} Welche docTypes wurden bereits indiziert */
    this._indexed = new Set();
  }

  // ─── Index ────────────────────────────────────────────────────────────────

  /**
   * Baut (oder liefert gecachten) Index für einen Dokumenttyp.
   * Durchsucht ALLE geladenen Packs, DSA5-eigene zuerst.
   *
   * @param {string} docType  "Actor" | "Item" | "JournalEntry" | "Scene" | "Playlist"
   * @param {{ force?: boolean }} [opts]
   * @returns {Promise<CompendiumHit[]>}
   */
  async buildIndex(docType, { force = false } = {}) {
    if (!force && this._indexed.has(docType)) {
      return this._indexCache.get(docType) ?? [];
    }

    // Guard: packs sind nur nach dem Foundry 'ready' Hook verfügbar.
    // Wenn buildIndex zu früh aufgerufen wird, ist game.packs leer oder undefined.
    // In diesem Fall wird NICHT gecacht, damit spätere Aufrufe den echten Index aufbauen.
    if (!game?.packs?.size) {
      this._logger.warn?.(
        `[CompLib] buildIndex(${docType}) zu früh aufgerufen – game.packs noch nicht verfügbar. Ergebnis wird nicht gecacht.`
      );
      return [];
    }

    const hits = [];
    const packs = Array.from(game?.packs ?? []);

    // DSA5-eigene Packs zuerst (höhere Priorität bei Duplikaten)
    const dsa5Packs   = packs.filter(p => this._getPackSystem(p) === 'dsa5');
    const otherPacks  = packs.filter(p => this._getPackSystem(p) !== 'dsa5');
    const orderedPacks = [...dsa5Packs, ...otherPacks];

    for (const pack of orderedPacks) {
      const packDocType = pack.documentName ?? pack.metadata?.entity;
      if (packDocType !== docType) continue;

      const packId     = pack.collection;
      const packLabel  = pack.metadata?.label ?? packId;
      const packModule = pack.metadata?.package ?? pack.metadata?.module ?? packId.split('.')[0];
      const isDsa5     = this._getPackSystem(pack) === 'dsa5';

      try {
        const index = await pack.getIndex({ fields: ['name', 'type', 'img'] });
        for (const entry of index) {
          hits.push({
            uuid:       `Compendium.${packId}.${docType}.${entry._id}`,
            packId,
            packLabel,
            packModule,
            docId:      entry._id,
            name:       entry.name ?? '(unbenannt)',
            docType,
            itemType:   entry.type ?? null,
            isDsa5,
            isExact:    false,   // wird in find() gesetzt
            source:     'compendium',
          });
        }
      } catch (err) {
        this._logger.warn?.(`[CompLib] Pack nicht indiziert: ${packId}`, err?.message);
      }
    }

    this._indexCache.set(docType, hits);
    this._indexed.add(docType);
    this._logger.info?.(`[CompLib] Index gebaut: ${docType} → ${hits.length} Einträge`);
    return hits;
  }

  /**
   * Invalidiert den Cache für einen oder alle Typen.
   * @param {string} [docType]  Wenn leer, kompletter Reset.
   */
  clearCache(docType) {
    if (docType) {
      this._indexCache.delete(docType);
      this._indexed.delete(docType);
    } else {
      this._indexCache.clear();
      this._indexed.clear();
    }
  }

  // ─── Suche ────────────────────────────────────────────────────────────────

  /**
   * Sucht nach einem Dokument in den Compendien (Bibliothek).
   *
   * Priorität:
   *   1. Exakter Name in DSA5-Pack
   *   2. Exakter Name in beliebigem Pack
   *   3. (optional) Fuzzy-Match
   *
   * @param {string} name
   * @param {string} docType   "Actor" | "Item" | "JournalEntry" | "Scene" | "Playlist"
   * @param {object} [opts]
   * @param {string}  [opts.itemType]    Nur bei Items: DSA5-type (z.B. "npc", "spell")
   * @param {boolean} [opts.allowFuzzy]  Enthält-Suche als Fallback (Default: false)
   * @param {string}  [opts.preferPack] bevorzugte Pack-ID bei mehreren Treffern
   * @returns {Promise<CompendiumHit|null>}
   */
  async findInCompendium(name, docType, opts = {}) {
    const { itemType, allowFuzzy = false, preferPack } = opts;
    const needle = String(name ?? '').trim().toLowerCase();
    if (!needle || !docType) return null;

    const index = await this.buildIndex(docType);

    // Filter nach itemType
    const filtered = itemType
      ? index.filter(h => !h.itemType || h.itemType === itemType)
      : index;

    // 1. Exakter Match in DSA5-Pack
    let hit = filtered.find(h => h.isDsa5 && h.name.toLowerCase() === needle);

    // 2. Exakter Match in beliebigem Pack
    if (!hit) hit = filtered.find(h => h.name.toLowerCase() === needle);

    // 3. Bevorzugtes Pack anwenden wenn mehrere Treffer
    if (!hit && preferPack) {
      hit = filtered.find(h => h.packId === preferPack &&
        h.name.toLowerCase().includes(needle));
    }

    // 4. Fuzzy (contains)
    if (!hit && allowFuzzy) {
      hit = filtered.find(h => h.name.toLowerCase().includes(needle));
    }

    if (hit) hit = { ...hit, isExact: hit.name.toLowerCase() === needle };
    return hit ?? null;
  }

  /**
   * Sucht mehrere Namen auf einmal (Batch-Lookup).
   * Gibt Map<name, CompendiumHit|null> zurück.
   *
   * @param {string[]} names
   * @param {string}   docType
   * @param {object}   [opts]  Gleiche Optionen wie findInCompendium()
   * @returns {Promise<Map<string, CompendiumHit|null>>}
   */
  async findBatch(names, docType, opts = {}) {
    const { itemType, allowFuzzy = false, preferPack } = opts;

    // Index einmal bauen, dann alle lokal auflösen
    const index = await this.buildIndex(docType);

    // 1. Vorab filtern
    const filtered = itemType
      ? index.filter(h => !h.itemType || h.itemType === itemType)
      : index;

    // 2. Schnelle Lookup-Maps für exakte Treffer aufbauen
    // Wir iterieren rückwärts, damit die früher im Index stehenden (höhere Priorität)
    // die späteren überschreiben und am Ende im Map gewinnen, WENN wir Map.set normal nutzen?
    // Besser: Wir iterieren vorwärts und setzen nur, wenn noch nicht vorhanden.
    const exactDsa5 = new Map();
    const exactAny = new Map();

    for (const h of filtered) {
      const lowerName = h.name.toLowerCase();

      // DSA5 Packs
      if (h.isDsa5 && !exactDsa5.has(lowerName)) {
        exactDsa5.set(lowerName, h);
      }

      // Alle Packs
      if (!exactAny.has(lowerName)) {
        exactAny.set(lowerName, h);
      }
    }

    const result = new Map();
    for (const name of names) {
      const needle = String(name ?? '').trim().toLowerCase();
      if (!needle || !docType) {
        result.set(name, null);
        continue;
      }

      // 1. Exakter Match in DSA5-Pack (O(1))
      let hit = exactDsa5.get(needle);

      // 2. Exakter Match in beliebigem Pack (O(1))
      if (!hit) hit = exactAny.get(needle);

      // 3. Bevorzugtes Pack anwenden wenn mehrere Treffer (O(N) Fallback)
      if (!hit && preferPack) {
        hit = filtered.find(h => h.packId === preferPack &&
          h.name.toLowerCase().includes(needle));
      }

      // 4. Fuzzy (contains) (O(N) Fallback)
      if (!hit && allowFuzzy) {
        hit = filtered.find(h => h.name.toLowerCase().includes(needle));
      }

      if (hit) {
        hit = { ...hit, isExact: hit.name.toLowerCase() === needle };
      }

      result.set(name, hit ?? null);
    }
    return result;
  }

  /**
   * Prüft ob ein Dokument in der Welt ODER im Compendium existiert.
   * Gibt Status zurück: 'world' | 'compendium' | 'missing'
   *
   * @param {string} name
   * @param {string} docType
   * @param {object} [opts]
   * @returns {Promise<{status: string, worldDoc?: object, compHit?: CompendiumHit}>}
   */
  async checkExistence(name, docType, opts = {}) {
    // Welt-Check
    const worldDoc = this._findInWorld(name, docType);
    if (worldDoc) return { status: 'world', worldDoc };

    // Compendium-Check
    const compHit = await this.findInCompendium(name, docType, opts);
    if (compHit) return { status: 'compendium', compHit };

    return { status: 'missing' };
  }

  // ─── Import ───────────────────────────────────────────────────────────────

  /**
   * Importiert ein Dokument aus dem Compendium in die aktive Welt.
   *
   * In Foundry v13:
   *   game.collections.get(docType).importFromCompendium(pack, id, updateData, options)
   *   → gibt das neue World-Dokument zurück
   *
   * @param {CompendiumHit} hit          Ergebnis von findInCompendium()
   * @param {object}        [updateData] Überschreibungen für das importierte Dokument
   * @param {object}        [opts]
   * @param {string}  [opts.folderId]   Ordner-ID in der Welt
   * @param {boolean} [opts.keepId]     _id aus Compendium behalten (Default: false)
   * @returns {Promise<foundry.abstract.Document>} Das importierte World-Dokument
   */
  async importToWorld(hit, updateData = {}, opts = {}) {
    if (!game.user?.isGM) throw new Error('Nur GM darf Compendium-Dokumente importieren.');
    if (!hit?.packId || !hit?.docId) throw new Error('Ungültiger CompendiumHit.');

    const pack = game.packs?.get(hit.packId);
    if (!pack) throw new Error(`Pack nicht gefunden: ${hit.packId}`);

    // Ordner-Zuweisung
    const mergedUpdate = {
      ...updateData,
      ...(opts.folderId ? { folder: opts.folderId } : {}),
    };

    // Foundry v13 API: DocumentCollection.importFromCompendium
    const collection = game.collections?.get(hit.docType)
                    ?? game[hit.docType.toLowerCase() + 's']; // Fallback: game.actors etc.

    if (!collection) throw new Error(`Keine World-Collection für: ${hit.docType}`);

    const imported = await collection.importFromCompendium(
      pack,
      hit.docId,
      mergedUpdate,
      {
        keepId:           opts.keepId ?? false,
        keepEmbeddedIds:  false,
        renderSheet:      false,
      }
    );

    if (!imported) throw new Error(`Import fehlgeschlagen: ${hit.name}`);

    this._logger.info?.(
      `[CompLib] Importiert: ${hit.name} (${hit.packId}) → Welt (${imported.uuid})`
    );
    return imported;
  }

  /**
   * Shortcut: Suchen + Importieren in einem Schritt.
   *
   * @param {string} name
   * @param {string} docType
   * @param {object} [opts]   Alle Optionen von findInCompendium() + importToWorld()
   * @returns {Promise<{doc: foundry.abstract.Document, hit: CompendiumHit, source: string}|null>}
   */
  async findAndImport(name, docType, opts = {}) {
    // 1. Bereits in Welt?
    const worldDoc = this._findInWorld(name, docType);
    if (worldDoc) {
      return { doc: worldDoc, hit: null, source: 'world' };
    }

    // 2. In Compendium?
    const hit = await this.findInCompendium(name, docType, opts);
    if (!hit) return null;

    // 3. Importieren
    const doc = await this.importToWorld(hit, opts.updateData ?? {}, opts);
    return { doc, hit, source: 'compendium' };
  }

  // ─── Hilfsmethoden ────────────────────────────────────────────────────────

  /**
   * Sucht Dokument nach Name in der World-Collection.
   * @private
   */
  _findInWorld(name, docType) {
    const needle = String(name ?? '').trim().toLowerCase();
    const collectionMap = {
      Actor:        game.actors,
      Scene:        game.scenes,
      Item:         game.items,
      JournalEntry: game.journal,
      Playlist:     game.playlists,
      RollTable:    game.tables,
      Macro:        game.macros,
    };
    const col = collectionMap[docType];
    return col?.contents.find(d => d.name?.trim().toLowerCase() === needle) ?? null;
  }

  /**
   * Liest die Systemzugehörigkeit eines Packs robust aus.
   * @private
   */
  _getPackSystem(pack) {
    return pack.metadata?.system
        ?? pack.metadata?.systemId
        ?? pack.metadata?.packageType === 'system' ? pack.metadata?.name : null
        ?? null;
  }

  /**
   * Gibt Statusinfo über alle geladenen Packs zurück (für Debug/UI).
   * @returns {object[]}
   */
  getPacksSummary() {
    return Array.from(game?.packs ?? []).map(p => ({
      id:      p.collection,
      label:   p.metadata?.label ?? p.collection,
      module:  p.metadata?.package ?? p.metadata?.module ?? '?',
      docType: p.documentName ?? p.metadata?.entity ?? '?',
      isDsa5:  this._getPackSystem(p) === 'dsa5',
      count:   p.index?.size ?? p.index?.length ?? null,
    }));
  }
}

export default CompendiumLibrary;
