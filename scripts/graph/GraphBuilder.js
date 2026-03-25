/**
 * GraphBuilder is responsible for aggregating contributions from one or
 * more providers into a single JanusKnowledgeGraph.  Providers may be
 * asynchronous and return nodes and edges describing the current state
 * of a particular data source (e.g. academy data, state, DSA5 index).
 */

import { JanusKnowledgeGraph } from './JanusKnowledgeGraph.js';

export class GraphBuilder {
  /**
   * @param {{ providers: any[], logger?: any }} opts
   */
  constructor({ providers = [], logger } = {}) {
    this.providers = Array.isArray(providers) ? providers : [];
    this.logger = logger;
  }

  /**
   * Builds a new graph by merging the contributions from all providers.
   * Each provider is awaited sequentially; errors in a provider will
   * produce a warning but will not abort the build.  Duplicate node
   * IDs are overwritten by later providers.
   *
   * @returns {Promise<JanusKnowledgeGraph>}
   */
  async build() {
    const graph = new JanusKnowledgeGraph();
    for (const provider of this.providers) {
      if (!provider || typeof provider.collect !== 'function') continue;
      try {
        const { nodes = [], edges = [] } = await provider.collect();
        for (const node of nodes) {
          try {
            graph.addNode(node);
          } catch (err) {
            this.logger?.warn?.('[JANUS7] GraphBuilder: invalid node skipped', { node, error: err?.message });
          }
        }
        for (const edge of edges) {
          try {
            graph.addEdge(edge);
          } catch (err) {
            this.logger?.warn?.('[JANUS7] GraphBuilder: invalid edge skipped', { edge, error: err?.message });
          }
        }
      } catch (err) {
        this.logger?.warn?.('[JANUS7] GraphBuilder: provider failed', { provider: provider?.getName?.() ?? 'unknown', error: err?.message });
      }
    }
    return graph;
  }
}