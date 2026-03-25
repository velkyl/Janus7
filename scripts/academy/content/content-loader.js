import { JanusContentRegistry } from './content-registry.js';

/**
 * Phase 2 content loader:
 * - Preferred: split files under data/quests, data/events, data/effects (+ indices)
 * - Fallback: legacy monolith data/academy/content/content.bundle.json
 */
export class JanusContentLoader {
  constructor({ io, logger, moduleId = 'janus7' } = {}) {
    this.io = io;
    this.logger = logger;
    this.moduleId = moduleId;
    this.registry = new JanusContentRegistry();
  }

  async _loadJSON(path) {
    if (this.io && typeof this.io.loadJSON === 'function') return await this.io.loadJSON(path);
    this.logger?.debug?.(`Falling back to fetch: ${path}`);
    const response = await fetch(path, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${path}`);
    return await response.json();
  }

  _poolFile(poolName) {
    const safe = String(poolName ?? 'uncategorized').replace(/[^a-zA-Z0-9_\-]+/g, '_') || 'uncategorized';
    return safe;
  }

  async _loadSplit() {
    // Use absolute module path to avoid browser-relative resolution issues.
    const base = `/modules/${this.moduleId}/data`;
    const questIndex = await this._loadJSON(`${base}/quests/quest-index.json`);
    const eventIndex = await this._loadJSON(`${base}/events/event-index.json`);
    const effectIndex = await this._loadJSON(`${base}/academy/effects/effect-index.json`);
    const options = await this._loadJSON(`${base}/events/options.json`);
    const pools = await this._loadJSON(`${base}/events/pool-index.json`);

    // Quests + nodes
    const quests = [];
    const questNodes = [];
    for (const qi of questIndex) {
      const q = await this._loadJSON(`${base}/quests/${qi.questId}.json`);
      const { nodes = [], ...quest } = q ?? {};
      quests.push(quest);
      for (const rawNode of nodes) {
        const node = { ...(rawNode ?? {}), questId: quest.questId ?? qi.questId };
        if (!node.failureNodeId && node.failNodeId) node.failureNodeId = node.failNodeId;
        questNodes.push(node);
      }
    }

    // Events: load pool files referenced by index (unique)
    const poolFiles = new Set((eventIndex ?? []).map(e => e.file).filter(Boolean));
    const events = [];
    for (const relFile of poolFiles) {
      const arr = await this._loadJSON(`${base}/${String(relFile).replace(/^data\//, '')}`);
      if (Array.isArray(arr)) events.push(...arr);
    }

    // Effects
    const effects = [];
    for (const ei of effectIndex) {
      const eff = await this._loadJSON(`${base}/academy/effects/${ei.effectId}.json`);
      effects.push(eff);
    }

    return { quests, questNodes, events, options, effects, pools };
  }

  async load() {
    this.logger?.info?.('Loading quest/event content...');
    try {
      let data;
      try {
        data = await this._loadSplit();
        this.logger?.info?.('Content loaded (split files)');
      } catch (splitErr) {
        this.logger?.warn?.('Split content missing; falling back to legacy bundle', splitErr);
        // Prefer nested folder structure, fall back to flat naming convention.
        const bundlePathNested = `/modules/${this.moduleId}/data/academy/content/content.bundle.json`;
        try {
          data = await this._loadJSON(bundlePathNested);
        } catch (_err) {
          const bundlePathFlat = `/modules/${this.moduleId}/data/academy__content__content.bundle.json`;
          data = await this._loadJSON(bundlePathFlat);
        }
        this.logger?.info?.('Content loaded (legacy bundle)');
      }

      this.registry.loadFromObject(data);
      const v = this.registry.validate();
      if (v.errors.length > 0) {
        this.logger?.error?.('Content validation failed', v.errors);
        throw new Error(`Invalid content: ${v.errors.length} errors`);
      }
      this.logger?.info?.('Content ready', {
        quests: this.registry.quests.length,
        nodes: this.registry.questNodes.length,
        events: this.registry.events.length,
        effects: this.registry.effects.length
      });
      return this.registry;
    } catch (err) {
      this.logger?.error?.('Content load failed', err);
      throw err;
    }
  }
}

export default JanusContentLoader;
