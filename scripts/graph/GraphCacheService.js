/**
 * Simple caching layer that persists the graph to disk and reloads it
 * between sessions.  The cache path is resolved from the engine core
 * IO service; if unavailable, caching silently fails.
 */

export class GraphCacheService {
  /**
   * @param {{ core: any, logger?: any, cachePath?: string }} opts
   */
  constructor({ core, logger, cachePath } = {}) {
    this.core = core;
    this.logger = logger;
    // default location: worlds/<world>/janus/cache
    this.cachePath = cachePath ?? (() => {
      try {
        const world = game?.world?.id ?? 'world';
        return `worlds/${world}/janus/cache`;
      } catch (_) {
        return null;
      }
    })();
  }

  /**
   * Loads the cached graph from disk.  Returns null on error or
   * missing cache.
   * @returns {Promise<import('./JanusKnowledgeGraph.js').JanusKnowledgeGraph|null>}
   */
  async load() {
    try {
      const io = this.core?.io;
      if (!io || !this.cachePath) return null;
      const data = await io.readJson?.(`${this.cachePath}/knowledge-graph.json`);
      const { JanusKnowledgeGraph } = await import('./JanusKnowledgeGraph.js');
      return JanusKnowledgeGraph.fromJSON(data);
    } catch (err) {
      this.logger?.debug?.('[JANUS7] GraphCacheService: load failed', { message: err?.message });
      return null;
    }
  }

  /**
   * Saves the graph to disk.  Errors are logged but not thrown.
   * @param {import('./JanusKnowledgeGraph.js').JanusKnowledgeGraph} graph
   */
  async save(graph) {
    try {
      const io = this.core?.io;
      if (!io || !this.cachePath) return;
      await io.writeJson?.(`${this.cachePath}/knowledge-graph.json`, graph.toJSON());
    } catch (err) {
      this.logger?.debug?.('[JANUS7] GraphCacheService: save failed', { message: err?.message });
    }
  }
}