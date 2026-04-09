import { JanusContentRegistry } from './content-registry.js';
import { loadDataJson } from '../../../academy/data-api-store.js';

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

  _normalizeDataPath(path) {
    return String(path ?? '')
      .trim()
      .replace(/^\/+/, '')
      .replace(/^modules\/[^/]+\//, '')
      .replace(/^data\//, '');
  }

  async _loadJSON(path) {
    if (this.io && typeof this.io.loadJSON === 'function') return await this.io.loadJSON(path);
    this.logger?.debug?.(`Falling back to fetch: ${path}`);
    const response = await fetch(path, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${path}`);
    return await response.json();
  }

  async _loadProfileJSON(path) {
    const rel = this._normalizeDataPath(path);
    if (!rel) throw new Error('Missing profile-relative data path');
    return await loadDataJson(rel);
  }

  _poolFile(poolName) {
    const safe = String(poolName ?? 'uncategorized').replace(/[^a-zA-Z0-9_-]+/g, '_') || 'uncategorized';
    return safe;
  }

  async _loadSplit() {
    const questIndex = await this._loadProfileJSON('quests/quest-index.json');
    const eventIndex = await this._loadProfileJSON('events/event-index.json');
    const effectIndex = await this._loadProfileJSON('academy/effects/effect-index.json');
    const options = await this._loadProfileJSON('events/options.json');
    const pools = await this._loadProfileJSON('events/pool-index.json');

    // Quests + nodes
    const quests = [];
    const questNodes = [];
    for (const qi of questIndex) {
      let res;
      try {
        const relFile = qi.file ? this._normalizeDataPath(qi.file) : `quests/${qi.questId}.json`;
        res = await this._loadProfileJSON(relFile);
      } catch (err) {
        this.logger?.warn?.('Quest file missing', { questId: qi.questId, file: qi?.file ?? `quests/${qi.questId}.json` });
        continue;
      }

      // Support both single-quest files and quest-list files
      const rawQuests = Array.isArray(res?.quests) ? res.quests : (res?.questId ? [res] : []);
      
      for (const q of rawQuests) {
        if (!q) continue;
        const { nodes = [], ...questProps } = q;
        const questId = questProps.questId ?? questProps.id ?? qi.questId;
        const quest = { ...questProps, questId };
        
        quests.push(quest);
        for (const rawNode of nodes) {
          const node = { ...(rawNode ?? {}), questId };
          if (!node.failureNodeId && node.failNodeId) node.failureNodeId = node.failNodeId;
          questNodes.push(node);
        }
      }
    }

    // Events: load pool files referenced by index (unique)
    const poolFiles = new Set((eventIndex ?? []).map(e => e.file).filter(Boolean));
    const events = [];
    for (const relFile of poolFiles) {
      const arr = await this._loadProfileJSON(relFile);
      if (Array.isArray(arr)) events.push(...arr);
    }

    // Effects
    const effects = [];
    for (const ei of effectIndex) {
      const relFile = ei.file ? this._normalizeDataPath(ei.file) : `academy/effects/${ei.effectId}.json`;
      const eff = await this._loadProfileJSON(relFile);
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
