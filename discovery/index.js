/**
 * @file discovery/index.js
 * @module janus7/discovery
 * @phase 6.5
 *
 * Content Discovery Bridge
 *
 * Goal:
 * - Provide a semantic search facade over DSA5 content (items / actors) for use by tools and (later) KI.
 * - Optimized to use AcademyLibraryService as its single source of truth.
 */

import { JanusSearchEngine } from './search-engine.js';
import { SEMANTIC_DOMAINS } from './semantic-domains.js';
import { requestGMApproval } from './approval.js';

function _norm(str) {
  return String(str ?? '').toLowerCase().normalize('NFKD');
}

/**
 * @typedef {object} DiscoveryResult
 * @property {string} name
 * @property {string} uuid
 * @property {string} [type]
 * @property {string} [domain]
 * @property {number} [score]
 */

export class JanusContentDiscoveryBridge {
  /**
   * @param {object} opts
   * @param {any} opts.engine
   * @param {any} [opts.logger]
   */
  constructor({ engine, logger } = {}) {
    this.engine = engine;
    this.logger = logger ?? engine?.diagnostics?.getLogger?.('discovery') ?? console;
    this.search = new JanusSearchEngine();
    this._ready = false;
  }

  async init() {
    if (this._ready) return;
    this.logger?.info?.('Discovery: linking to LibraryService ...');
    await this._buildIndexes();
    this._ready = true;
    this.logger?.info?.('Discovery: ready.');
  }

  /**
   * @returns {string[]}
   */
  listDomains() {
    return Object.keys(SEMANTIC_DOMAINS);
  }

  /**
   * Search for content in a semantic domain.
   * @param {string} domain
   * @param {string} query
   * @param {object} [opts]
   * @param {number} [opts.limit]
   * @returns {Promise<DiscoveryResult[]>}
   */
  async find(domain, query, { limit = 10 } = {}) {
    if (!this._ready) await this.init();
    const hits = this.search.search(domain, query, { limit });
    return hits.map((h) => ({
      name: h.doc.name,
      uuid: h.doc.uuid,
      type: h.doc.type,
      domain,
      score: h.score
    }));
  }

  /**
   * Example world-changing action: spawn an actor from a search result.
   */
  async spawnActor(actorUuid, { name } = {}) {
    const ok = await requestGMApproval({
      title: 'JANUS7 – GM Approval',
      html: `<p>Spawn actor from UUID?</p><p><code>${actorUuid}</code></p>`
    });
    if (!ok) return null;

    const doc = await (globalThis.fromUuid ?? fromUuid)(actorUuid);
    if (!doc) throw new Error(`Actor not found for UUID: ${actorUuid}`);
    if (!(doc instanceof Actor)) throw new Error(`UUID is not an Actor: ${actorUuid}`);

    const created = await Actor.create(doc.toObject(), {
      renderSheet: false,
      ownership: { default: 0 }
    });
    if (name && created) await created.update({ name });
    return created;
  }

  // ---------------------------------------------------------------------------
  // Internal indexing (Optimized)
  // ---------------------------------------------------------------------------

  async _buildIndexes() {
    const library = this.engine?.bridge?.dsa5?.library;
    if (!library) {
      this.logger?.warn?.('Discovery: LibraryService not available. Skipping indexing.');
      return;
    }

    // Ensure library index is ready
    await library.ensureIndex();

    // Group SEMANTIC_DOMAINS by documentName for batch processing
    const domainsByDoc = { 'Item': [], 'Actor': [], 'JournalEntry': [] };
    for (const [domain, spec] of Object.entries(SEMANTIC_DOMAINS)) {
      if (domainsByDoc[spec.document]) {
        domainsByDoc[spec.document].push({ domain, spec });
      }
    }

    // Process each document type
    for (const [docName, domains] of Object.entries(domainsByDoc)) {
      if (!domains.length) continue;

      // Get all entries of this type from the library
      const entries = await library.entries({ limit: 20000 }); // Get all, but with safety limit
      const filteredEntries = entries.filter(e => e.documentName === docName);

      for (const { domain, spec } of domains) {
        const docs = [];
        const packSet = spec.packs ? new Set(spec.packs) : null;
        const typeSet = spec.types ? new Set(spec.types.map(_norm)) : null;

        for (const e of filteredEntries) {
          // Pack filter
          if (packSet && !packSet.has(e.pack)) continue;

          // Type filter
          if (typeSet) {
            const t = _norm(e.type);
            if (!typeSet.has(t)) continue;
          }

          docs.push({ 
            id: e._id, 
            name: e.name, 
            uuid: e.uuid, 
            type: e.type, 
            data: { pack: e.pack } 
          });
        }
        this.search.setIndex(domain, docs);
      }
    }
  }
}

export default JanusContentDiscoveryBridge;
