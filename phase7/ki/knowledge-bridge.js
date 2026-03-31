/**
 * JANUS7 — KI Knowledge Bridge V6.1
 * 
 * Provides a semantic/fuzzy knowledge access layer for AI agents.
 * Tools:
 * - dsa_knowledge_base: Search for entities (npcs, items, spells, etc.) by domain and name.
 * - foundry_action: Execute world actions (spawn, open, roll, play) via UUID.
 */

export class JanusKnowledgeBridge {
  constructor({ bridge, state, logger }) {
    this.bridge = bridge; // DSA5SystemBridge
    this.state = state;
    this.logger = logger?.child?.('ki-bridge') ?? logger;
    
    this._cache = new Map();
    this._lastCacheBuild = 0;
    this._CACHE_TTL = 3600000; // 1 hour
  }

  /**
   * Semantische Suche nach DSA5-Entitäten.
   * @param {string} domain - 'plant', 'beast', 'demon', 'spell', 'actor', 'item', etc.
   * @param {string} query - Suchbegriff
   * @param {object} [opts] - { limit: 10, threshold: 0.4 }
   */
  async search(domain, query, opts = {}) {
    const limit = opts.limit ?? 10;
    const threshold = opts.threshold ?? 0.4;
    
    await this._ensureIndex();
    
    const entries = this._cache.get(domain) || [];
    if (!entries.length && domain !== 'all') {
      // Fallback: search in library directly if domain cache is empty
      const libraryResults = await this.bridge?.library?.search({ 
        q: query, 
        types: this._mapDomainToTypes(domain),
        limit 
      }) || [];
      return libraryResults.map(e => ({
        uuid: e.uuid,
        name: e.name,
        type: e.type,
        source: 'library'
      }));
    }

    // Simple fuzzy match (score based on inclusion and distance)
    const normalizedQuery = String(query).toLowerCase();
    const scored = entries.map(e => {
      const name = String(e.name).toLowerCase();
      let score = 0;
      if (name === normalizedQuery) score = 1.0;
      else if (name.startsWith(normalizedQuery)) score = 0.8;
      else if (name.includes(normalizedQuery)) score = 0.6;
      // TODO: Add Levenshtein if fuse.js is not present
      return { ...e, score };
    }).filter(e => e.score >= threshold);

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  /**
   * Führt eine Aktion in der Foundry-Welt aus.
   * @param {string} type - 'spawnActor', 'openDocument', 'rollTable', 'playSound'
   * @param {string} uuid - Ziel-UUID
   * @param {object} [params] - Zusätzliche Parameter
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
      default:
        throw new Error(`Unbekannter Aktionstyp: ${type}`);
    }
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  async _actionSpawnActor(uuid, params) {
    const actor = await fromUuid(uuid);
    if (!actor) throw new Error(`Actor nicht gefunden: ${uuid}`);
    
    const { x, y, sceneId } = params;
    const scene = sceneId ? game.scenes.get(sceneId) : game.scenes.current;
    if (!scene) throw new Error('Keine aktive Szene für Spawn.');

    const tokenData = await actor.getTokenDocument();
    const position = {
      x: x ?? (window.canvas?.mouseInteractionManager?.mousePosition?.x ?? 0),
      y: y ?? (window.canvas?.mouseInteractionManager?.mousePosition?.y ?? 0)
    };

    const [token] = await scene.createEmbeddedDocuments('Token', [{
      ...tokenData.toObject(),
      x: position.x,
      y: position.y
    }]);

    return { ok: true, tokenId: token.id, actorId: actor.id, uuid: token.uuid };
  }

  async _actionOpenDocument(uuid, params) {
    const doc = await fromUuid(uuid);
    if (!doc) throw new Error(`Dokument nicht gefunden: ${uuid}`);
    
    if (typeof doc.sheet?.render === 'function') {
      doc.sheet.render(true);
      return { ok: true, uuid: doc.uuid };
    }
    return { ok: false, reason: 'No sheet available' };
  }

  async _actionRollTable(uuid, params) {
    const table = await fromUuid(uuid);
    if (!table || table.documentName !== 'RollTable') {
       throw new Error(`RollTable nicht gefunden: ${uuid}`);
    }
    const result = await table.draw();
    return { ok: true, results: result.results.map(r => r.text) };
  }

  async _actionPlaySound(uuid, params) {
    // Basic sound support via Playlist or File path
    if (uuid.startsWith('Playlist')) {
       const [plId, soundId] = uuid.split('.').slice(1);
       const playlist = game.playlists.get(plId);
       const sound = playlist?.sounds.get(soundId);
       if (sound) {
         playlist.playSound(sound);
         return { ok: true };
       }
    }
    // Fallback: treat as file path if it looks like one
    if (uuid.includes('/') || uuid.includes('\\')) {
      AudioHelper.play({ src: uuid, volume: params.volume ?? 0.8, loop: false }, true);
      return { ok: true };
    }
    throw new Error(`Sound/Playlist nicht gefunden: ${uuid}`);
  }

  // ─── Internals ─────────────────────────────────────────────────────────────

  async _ensureIndex() {
    const now = Date.now();
    if (this._cache.size > 0 && (now - this._lastCacheBuild < this._CACHE_TTL)) return;

    this.logger?.debug?.('Building KI Knowledge Index...');
    this._cache.clear();

    // 1. Library Index (Compendia)
    if (this.bridge?.library) {
      const entries = await this.bridge.library.getLibraryEntries() || [];
      for (const e of entries) {
        const domain = this._mapTypeToDomain(e.type);
        const list = this._cache.get(domain) || [];
        list.push({ uuid: e.uuid, name: e.name, type: e.type, source: 'library' });
        this._cache.set(domain, list);
        
        // Also add to 'all'
        const all = this._cache.get('all') || [];
        all.push({ uuid: e.uuid, name: e.name, type: e.type, source: 'library' });
        this._cache.set('all', all);
      }
    }

    // 2. World Index (Active Documents)
    const worldActors = game.actors.contents.map(a => ({ uuid: a.uuid, name: a.name, type: a.type, source: 'world' }));
    const worldItems = game.items.contents.map(i => ({ uuid: i.uuid, name: i.name, type: i.type, source: 'world' }));
    
    for (const e of [...worldActors, ...worldItems]) {
        const domain = this._mapTypeToDomain(e.type);
        const list = this._cache.get(domain) || [];
        list.push(e);
        this._cache.set(domain, list);
        
        const all = this._cache.get('all') || [];
        all.push(e);
        this._cache.set('all', all);
    }

    this._lastCacheBuild = now;
    this.logger?.info?.(`KI Knowledge Index built: ${this._cache.get('all')?.length || 0} entries.`);
  }

  _mapTypeToDomain(type) {
     const t = String(type).toLowerCase();
     if (['spell', 'ritual', 'liturgy'].includes(t)) return 'magic';
     if (['plant', 'herb'].includes(t)) return 'plant';
     if (['beast', 'monster', 'creature'].includes(t)) return 'beast';
     if (['npc', 'character'].includes(t)) return 'actor';
     if (['weapon', 'armor', 'equipment', 'item'].includes(t)) return 'item';
     return 'other';
  }

  _mapDomainToTypes(domain) {
     const d = String(domain).toLowerCase();
     switch (d) {
       case 'magic': return ['spell', 'ritual', 'liturgy', 'ceremony'];
       case 'plant': return ['plant'];
       case 'beast': return ['beast'];
       case 'actor': return ['npc', 'character'];
       case 'item': return ['weapon', 'armor', 'equipment', 'item', 'consumable'];
       default: return [];
     }
  }
}
