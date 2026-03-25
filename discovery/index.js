/**
 * @file discovery/index.js
 * @module janus7/discovery
 * @phase 6.5
 *
 * Content Discovery Bridge
 *
 * Goal:
 * - Provide a semantic search facade over DSA5 content (items / actors) for use by tools and (later) KI.
 * - Avoid hard compendium IDs in user/assistant prompts by routing everything through domains.
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
    this.logger?.info?.('Discovery: building indexes ...');
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
    const spec = SEMANTIC_DOMAINS[domain];
    if (!spec) return [];
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
   * This is intentionally GM-gated and requires approval.
   *
   * @param {string} actorUuid
   * @param {object} [opts]
   * @param {string} [opts.name]
   * @returns {Promise<Actor|null>}
   */
  async spawnActor(actorUuid, { name } = {}) {
    const ok = await requestGMApproval({
      title: 'JANUS7 – GM Approval',
      html: `<p>Spawn actor from UUID?</p><p><code>${actorUuid}</code></p>`
    });
    if (!ok) return null;

    // fromUuid is a Foundry VTT global (not DSA5-specific). Annotated per arch contract.
    const doc = await (globalThis.fromUuid ?? fromUuid)(actorUuid);
    if (!doc) throw new Error(`Actor not found for UUID: ${actorUuid}`);
    if (!(doc instanceof Actor)) throw new Error(`UUID is not an Actor: ${actorUuid}`);

    // Create as world actor (GM-only visibility by default)
    const created = await Actor.create(doc.toObject(), {
      renderSheet: false,
      ownership: { default: 0 }
    });
    if (name && created) await created.update({ name });
    return created;
  }

  // ---------------------------------------------------------------------------
  // Internal indexing
  // ---------------------------------------------------------------------------

  async _buildIndexes() {
    const packs = Array.from(game?.packs ?? []);

    // Build Item indexes
    for (const [domain, spec] of Object.entries(SEMANTIC_DOMAINS)) {
      if (spec.document !== 'Item') continue;
      const docs = [];

      const relevantPacks = spec.packs
        ? packs.filter(p => spec.packs.includes(p.collection))
        : packs.filter(p => p.documentName === 'Item');

      for (const pack of relevantPacks) {
        let idx;
        try {
          idx = await pack.getIndex({ fields: ['name', 'type'] });
        } catch {
          continue;
        }
        for (const e of idx) {
          const type = e.type ?? null;
          if (spec.types && spec.types.length) {
            const t = String(type ?? '');
            const ok = spec.types.some(x => _norm(x) === _norm(t));
            if (!ok) continue;
          }
          const uuid = `Compendium.${pack.collection}.${e._id}`;
          docs.push({ id: e._id, name: e.name, uuid, type, data: { pack: pack.collection } });
        }
      }

      this.search.setIndex(domain, docs);
    }

    // Build Actor indexes
    for (const [domain, spec] of Object.entries(SEMANTIC_DOMAINS)) {
      if (spec.document !== 'Actor') continue;
      const docs = [];

      const relevantPacks = spec.packs
        ? packs.filter(p => spec.packs.includes(p.collection))
        : packs.filter(p => p.documentName === 'Actor');

      for (const pack of relevantPacks) {
        let idx;
        try {
          idx = await pack.getIndex({ fields: ['name', 'type'] });
        } catch {
          continue;
        }
        for (const e of idx) {
          const type = e.type ?? null;
          if (spec.types && spec.types.length) {
            const t = String(type ?? '');
            const ok = spec.types.some(x => _norm(x) === _norm(t));
            if (!ok) continue;
          }
          const uuid = `Compendium.${pack.collection}.${e._id}`;
          docs.push({ id: e._id, name: e.name, uuid, type, data: { pack: pack.collection } });
        }
      }
      this.search.setIndex(domain, docs);
    }
  }
}

export default JanusContentDiscoveryBridge;
