import { GRAPH_NODE_TYPES } from './constants.js';
import { GraphContextNormalizer } from './GraphContextNormalizer.js';

/**
 * Query service encapsulates all read operations against the graph.
 * It holds a reference to the current graph and exposes methods to
 * retrieve nodes, neighbors and context‑aware suggestions.
 */
export class GraphQueryService {
  /**
   * @param {{ logger?: any }} opts
   */
  constructor({ logger, cache = null } = {}) {
    this.logger = logger;
    this.graph = null;
    this.cache = cache;
  }

  /**
   * Associates a graph instance with this query service.  Call
   * whenever the graph has been rebuilt.
   * @param {import('./JanusKnowledgeGraph.js').JanusKnowledgeGraph} graph
   */
  setGraph(graph) {
    this.graph = graph;
    this.cache?.invalidate?.();
  }

  /**
   * Retrieves a node by ID.
   * @param {string} id
   */
  findNode(id) {
    if (!this.graph) return null;
    const cached = this.cache?.get?.('findNode', { id });
    if (cached !== null) return cached;
    const value = this.graph.getNode(id);
    return this.cache?.set?.('findNode', { id }, value) ?? value;
  }

  /**
   * Returns the neighbor nodes of a given node.  Edge types may be
   * specified to filter which relationships are considered.
   * @param {string} id
   * @param {Object} [opts]
   * @param {string[]} [opts.edgeTypes]
   */
  neighbors(id, { edgeTypes = null } = {}) {
    if (!this.graph) return [];
    const payload = { id, edgeTypes: edgeTypes ?? null };
    const cached = this.cache?.get?.('neighbors', payload);
    if (cached) return cached;
    const value = this.graph.getNeighbors(id, edgeTypes);
    return this.cache?.set?.('neighbors', payload, value) ?? value;
  }

  /**
   * Computes a list of nodes that are relevant for the given context.
   * The scoring algorithm is deliberately simple for V1 and may be
   * extended in future versions.  See GraphContextNormalizer for
   * the expected input shape.
   *
   * @param {import('./types.js').GraphContext} context
   */
  findRelevantForContext(context) {
    if (!this.graph) return [];
    const ctx = GraphContextNormalizer.normalize(context);
    const cached = this.cache?.get?.('findRelevantForContext', ctx);
    if (cached) return cached;
    const results = [];
    for (const node of this.graph.getAllNodes()) {
      let score = 0;
      const reasons = [];

      // Match on lesson
      if (ctx.lessonId && node.id === ctx.lessonId) {
        score += 0.4;
        reasons.push('lesson match');
      }
      // Location match via meta.locationId or direct node id
      if (ctx.locationId && (node.id === ctx.locationId || node.meta?.locationId === ctx.locationId)) {
        score += 0.2;
        reasons.push('location match');
      }
      // Thread relevance: node id matches thread or edge points from thread
      if (ctx.threadIds?.includes?.(node.id)) {
        score += 0.2;
        reasons.push('thread match');
      }
      // NPC relevance: node id matches an NPC
      if (ctx.npcIds?.includes?.(node.id)) {
        score += 0.2;
        reasons.push('npc match');
      }
      // Adjacency bonus from directly matched context nodes
      if (score === 0) {
        const allContextIds = [
          ctx.lessonId,
          ctx.locationId,
          ...(ctx.npcIds ?? []),
          ...(ctx.threadIds ?? []),
          ...(ctx.questIds ?? [])
        ].filter(Boolean);
        for (const ctxId of allContextIds) {
          const outgoing = this.graph.getOutgoingEdges(ctxId);
          if (outgoing.some((e) => e.to === node.id)) {
            score += 0.1;
            reasons.push(`adjacent to ${ctxId}`);
            break;
          }
        }
      }
      if (score > 0) {
        results.push({ node, score, reasons });
      }
    }
    // Sort by descending score
    results.sort((a, b) => b.score - a.score);
    return this.cache?.set?.('findRelevantForContext', ctx, results) ?? results;
  }

  /**
   * Suggests quests given a context.  Only quest nodes are considered
   * and scored based on matching factors such as location, thread and
   * involvement of NPCs.  Returns an array of objects containing the
   * quest node, its score and textual reasons.
   *
   * @param {import('./types.js').GraphContext} context
   */
  suggestQuests(context) {
    if (!this.graph) return [];
    const ctx = GraphContextNormalizer.normalize(context);
    const cached = this.cache?.get?.('suggestQuests', ctx);
    if (cached) return cached;
    const quests = [];
    for (const node of this.graph.getAllNodes()) {
      if (node.type !== GRAPH_NODE_TYPES.QUEST) continue;
      let score = 0;
      const reasons = [];

      // Thread link: if any edge from context threads points to the quest
      if (ctx.threadIds?.length) {
        for (const threadId of ctx.threadIds) {
          const outgoing = this.graph.getOutgoingEdges(threadId);
          if (outgoing.some((e) => e.to === node.id)) {
            score += 0.4;
            reasons.push('thread suggests quest');
            break;
          }
        }
      }
      // Location match
      if (ctx.locationId && node.meta?.locationId === ctx.locationId) {
        score += 0.2;
        reasons.push('quest location match');
      }
      // NPC involvement: match if the quest references an NPC via meta
      if (ctx.npcIds?.length) {
        const involved = node.meta?.npcIds ?? [];
        if (involved.some((id) => ctx.npcIds.includes(id))) {
          score += 0.2;
          reasons.push('quest NPC match');
        }
      }
      // Lesson or tag match (simple heuristics)
      if (ctx.lessonId && node.meta?.lessonIds?.includes?.(ctx.lessonId)) {
        score += 0.1;
        reasons.push('quest lesson match');
      }
      // Novelty or other factors could reduce or boost score here
      if (score > 0) {
        quests.push({ quest: node, score, reasons });
      }
    }
    quests.sort((a, b) => b.score - a.score);
    return this.cache?.set?.('suggestQuests', ctx, quests) ?? quests;
  }
}