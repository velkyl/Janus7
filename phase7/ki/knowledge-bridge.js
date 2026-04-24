/**
 * JANUS7 — KI Knowledge Bridge V7.0
 * 
 * Provides a high-performance semantic knowledge access layer for AI agents.
 * Integrates AcademyLibraryService (Compendia) and World Data.
 * 
 * Tools:
 * - dsa_knowledge_search: Search for entities (npcs, items, spells, etc.).
 * - dsa_knowledge_retrieve: Get full details for a specific entity by UUID.
 * - foundry_action: Execute world actions (spawn, open, roll, play).
 */

export class JanusKnowledgeBridge {
  constructor({ bridge, state, logger }) {
    this.bridge = bridge; // DSA5SystemBridge
    this.state = state;
    this.logger = logger?.child?.('ki-bridge') ?? logger;
  }

  /**
   * Semantische Suche nach DSA5-Entitäten.
   * Kombiniert Welt-Daten (aktiv) und Bibliotheks-Daten (Kompendien).
   * 
   * @param {string} domain - 'magic', 'plant', 'beast', 'actor', 'item', 'location', 'all'
   * @param {string} query - Suchbegriff
   * @param {object} [opts] - { limit: 10, threshold: 0.3 }
   */
  async search(domain, query, opts = {}) {
    const limit = opts.limit ?? 10;
    const threshold = opts.threshold ?? 0.3;
    const types = this._mapDomainToTypes(domain);
    
    // 1. Search in World (Active Documents)
    const worldResults = this._searchWorld(query, types, threshold);
    
    // 2. Search in Library (Compendia)
    const libraryResults = await this.bridge?.library?.search({ 
      q: query, 
      types: types.length ? types : null,
      limit: limit * 2 // Search more to allow better merging
    }) || [];

    // 3. Merge and Normalize
    const merged = [
      ...worldResults.map(e => ({ ...e, score: e.score + 0.1 })), // Slight bonus for world items
      ...libraryResults.map(e => ({
        uuid: e.uuid,
        name: e.name,
        type: e.type,
        source: 'library',
        score: 0.5 // Library results score is handled by library service ideally, but we default here
      }))
    ];

    // Deduplicate by UUID
    const seen = new Set();
    const final = merged
      .filter(e => {
        if (seen.has(e.uuid)) return false;
        seen.add(e.uuid);
        return true;
      })
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, limit);

    return final;
  }

  /**
   * Holt die vollständigen Details einer Entität für das KI-Kontextfenster.
   * @param {string} uuid 
   * @returns {Promise<object|null>}
   */
  async retrieve(uuid) {
    if (!uuid) return null;
    
    try {
      const doc = await fromUuid(uuid);
      if (!doc) return null;

      // Extrahiere KI-relevante Daten (sauberer als raw .toObject())
      const data = {
        uuid: doc.uuid,
        name: doc.name,
        type: doc.type,
        documentName: doc.documentName
      };

      if (doc.system) {
        // Filtere System-Daten (vermeide Bloat wie Flag-Listen)
        data.details = this._sanitizeSystemData(doc.system, doc.type);
      }

      // Falls es ein JournalEntry ist, hole den Text
      if (doc.documentName === 'JournalEntryPage') {
        data.content = doc.text?.content || doc.content || '';
      } else if (doc.documentName === 'JournalEntry') {
        data.pages = doc.pages.contents.map(p => ({ title: p.name, content: p.text?.content }));
      }

      return data;
    } catch (err) {
      this.logger?.warn?.(`Retrieve failed for ${uuid}`, err);
      return null;
    }
  }

  /**
   * Führt eine Aktion in der Foundry-Welt aus.
   */
  async executeAction(type, uuid, params = {}) {
    this.logger?.info?.(`KI Action: ${type} on ${uuid}`, params);
    
    switch (type) {
      case 'spawnActor':
        return this._actionSpawnActor(uuid, params);
      case 'openDocument':
        return this._actionOpenDocument(uuid, params);
      case 'rollTable':
        return this._actionRollTable(uuid, params);
      case 'playSound':
        return this._actionPlaySound(uuid, params);
      case 'sqlQuery':
        return this._actionSqlQuery(params.db, params.query, params.params);
      case 'runScript':
        return this._actionRunScript(params.script, params.args);
      default:
        throw new Error(`Unbekannter Aktionstyp: ${type}`);
    }
  }

  // ─── External Tool Actions ───────────────────────────────────────────────

  async _actionSqlQuery(db, query, params = []) {
    const sqlite = game.janus7?.ext?.sqlite;
    if (!sqlite) throw new Error('SQLite Service nicht verfügbar.');
    return await sqlite.query(db, query, params);
  }

  async _actionRunScript(script, args = {}) {
    const python = game.janus7?.ext?.python;
    if (!python) throw new Error('Python Service nicht verfügbar.');
    return await python.execute(script, args);
  }

  // ─── Internal Search Logic ────────────────────────────────────────────────

  _searchWorld(query, types, threshold) {
    const q = String(query).toLowerCase();
    const typeSet = types.length ? new Set(types) : null;
    const results = [];

    const check = (collection) => {
      for (const doc of collection) {
        if (typeSet && !typeSet.has(doc.type)) continue;
        
        const name = doc.name.toLowerCase();
        let score = 0;
        if (name === q) score = 1.0;
        else if (name.startsWith(q)) score = 0.8;
        else if (name.includes(q)) score = 0.5;
        
        if (score >= threshold) {
          results.push({ uuid: doc.uuid, name: doc.name, type: doc.type, source: 'world', score });
        }
      }
    };

    check(game.actors.contents);
    check(game.items.contents);
    check(game.journal.contents);
    
    return results;
  }

  _sanitizeSystemData(system, type) {
    const out = {};
    const whitelist = [
      'description', 'summary', 'price', 'weight', 'rules', 'effect', 'combat', 
      'attributes', 'base', 'skill', 'level', 'aspect', 'tradition'
    ];
    
    for (const key of whitelist) {
      if (system[key] !== undefined) {
        // Deep copy only relevant bits if it's an object
        if (typeof system[key] === 'object' && system[key] !== null) {
          // Flatten if it's just { value: ... }
          if (system[key].value !== undefined && Object.keys(system[key]).length === 1) {
            out[key] = system[key].value;
          } else {
            out[key] = JSON.parse(JSON.stringify(system[key]));
          }
        } else {
          out[key] = system[key];
        }
      }
    }
    
    // Clean HTML from descriptions
    if (typeof out.description === 'string') {
      out.description = out.description.replace(/<[^>]*>?/gm, '').trim();
    }
    
    return out;
  }

  // ─── Action Implementations (Forward from original) ─────────────────────────

  async _actionSpawnActor(uuid, params) {
    const actor = await fromUuid(uuid);
    if (!actor) throw new Error(`Actor nicht gefunden: ${uuid}`);
    const scene = params.sceneId ? game.scenes.get(params.sceneId) : game.scenes.current;
    if (!scene) throw new Error('Keine aktive Szene.');
    const tokenData = await actor.getTokenDocument();
    const [token] = await scene.createEmbeddedDocuments('Token', [{
      ...tokenData.toObject(),
      x: params.x ?? 0,
      y: params.y ?? 0
    }]);
    return { ok: true, tokenId: token.id, uuid: token.uuid };
  }

  async _actionOpenDocument(uuid) {
    const doc = await fromUuid(uuid);
    if (doc?.sheet) doc.sheet.render(true);
    return { ok: !!doc };
  }

  async _actionRollTable(uuid) {
    const table = await fromUuid(uuid);
    if (table?.documentName === 'RollTable') {
      const res = await table.draw();
      return { ok: true, results: res.results.map(r => r.text) };
    }
    return { ok: false };
  }

  async _actionPlaySound(uuid, params) {
    if (uuid.includes('/') || uuid.includes('\\')) {
      AudioHelper.play({ src: uuid, volume: params.volume ?? 0.8 }, true);
      return { ok: true };
    }
    return { ok: false };
  }

  _mapDomainToTypes(domain) {
    const d = String(domain).toLowerCase();
    
    // Semantic dotted domains
    if (d.startsWith('magic.'))    return ['spell', 'ritual', 'liturgy', 'ceremony', 'blessing', 'cantrip'];
    if (d.startsWith('item.'))     return ['weapon', 'meleeweapon', 'rangeweapon', 'armor', 'equipment', 'consumable', 'item', 'ammunition', 'plant'];
    if (d.startsWith('creature.')) return ['creature', 'npc', 'animal', 'monster', 'beast'];
    if (d.startsWith('trait.'))    return ['specialability', 'advantage', 'disadvantage'];
    if (d.startsWith('journal.'))  return ['journal'];
    if (d.startsWith('scene.'))    return ['scene'];

    // Legacy/Simple domains
    switch (d) {
      case 'magic':    return ['spell', 'ritual', 'liturgy', 'ceremony', 'blessing', 'cantrip'];
      case 'plant':    return ['plant', 'herb'];
      case 'beast':    return ['beast', 'creature', 'monster'];
      case 'actor':    return ['npc', 'character', 'creature'];
      case 'item':     return ['weapon', 'armor', 'equipment', 'item', 'consumable', 'ammunition'];
      case 'location': return ['location', 'scene'];
      default:         return [];
    }
  }
}
