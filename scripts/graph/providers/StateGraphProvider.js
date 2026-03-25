import { GRAPH_NODE_TYPES, GRAPH_EDGE_TYPES, GRAPH_SOURCES } from '../constants.js';

/**
 * Provider that extracts graph nodes from the dynamic state.  It
 * currently focuses on quest state, creating nodes for each active
 * quest for each actor.  Future versions may include threads,
 * relationships and other runtime features.
 */
export class StateGraphProvider {
  /**
   * @param {{ state: any, logger?: any }} opts
   */
  constructor({ state, logger } = {}) {
    this.state = state;
    this.logger = logger;
  }

  getName() {
    return 'StateGraphProvider';
  }

  /**
   * Walks the academy quest state and produces quest nodes.  Each
   * actorId at the top level will produce nodes for every quest
   * contained within its quest map.  A quest node is unique by ID;
   * duplicate quests across actors will result in a single node with
   * merged metadata (actorIds array).
   *
   * @returns {Promise<import('../types.js').GraphContribution>}
   */
  async collect() {
    const nodesMap = new Map();
    const edges = [];
    const nodes = [];
    const state = this.state;
    if (!state || typeof state.get !== 'function') return { nodes, edges };
    let questRoot;
    try {
      questRoot = state.get('questStates') ?? state.get('academy.quests');
    } catch (err) {
      this.logger?.debug?.('[JANUS7] StateGraphProvider: failed to read academy.quests', { message: err?.message });
      questRoot = null;
    }
    if (questRoot && typeof questRoot === 'object') {
      for (const [actorId, questMap] of Object.entries(questRoot)) {
        if (!questMap || typeof questMap !== 'object') continue;
        for (const [questId, qState] of Object.entries(questMap)) {
          if (!questId) continue;
          const existing = nodesMap.get(questId);
          const meta = {
            actorIds: existing?.meta?.actorIds ? [...new Set([...existing.meta.actorIds, actorId])] : [actorId],
            status: qState?.status ?? existing?.meta?.status ?? null,
            currentNodeId: qState?.currentNodeId ?? existing?.meta?.currentNodeId ?? null,
            startedAt: qState?.startedAt ?? existing?.meta?.startedAt ?? null,
            locationId: qState?.locationId ?? existing?.meta?.locationId ?? null,
            npcIds: existing?.meta?.npcIds ?? []
          };
          const node = {
            id: questId,
            type: GRAPH_NODE_TYPES.QUEST,
            label: questId,
            source: GRAPH_SOURCES.STATE,
            meta
          };
          nodesMap.set(questId, node);
        }
      }
    }

    let socialRoot;
    try {
      socialRoot = state.get('academy.social');
    } catch (err) {
      this.logger?.debug?.('[JANUS7] StateGraphProvider: failed to read academy.social', { message: err?.message });
      socialRoot = null;
    }
    const relationships = socialRoot?.relationships ?? null;
    if (relationships && typeof relationships === 'object') {
      for (const [fromId, targets] of Object.entries(relationships)) {
        if (!fromId || !targets || typeof targets !== 'object') continue;
        for (const [toId, rel] of Object.entries(targets)) {
          if (!toId || !rel || typeof rel !== 'object') continue;
          const rawValue = Number(rel?.value ?? 0);
          const normalizedWeight = Number.isFinite(rawValue)
            ? Math.max(0.1, Math.min(1, Math.abs(rawValue) / 100 || 0.1))
            : 0.5;
          edges.push({
            from: fromId,
            to: toId,
            type: GRAPH_EDGE_TYPES.RELATED_TO,
            weight: normalizedWeight,
            meta: {
              sentiment: rawValue,
              tags: Array.isArray(rel?.tags) ? rel.tags : [],
              source: 'state.social.relationships'
            }
          });
        }
      }
    }

    let socialLinks;
    try {
      socialLinks = state.get('academy.socialLinks');
    } catch (err) {
      this.logger?.debug?.('[JANUS7] StateGraphProvider: failed to read academy.socialLinks', { message: err?.message });
      socialLinks = null;
    }
    if (socialLinks && typeof socialLinks === 'object') {
      for (const [linkId, linkState] of Object.entries(socialLinks)) {
        if (!linkId || !linkState || typeof linkState !== 'object') continue;
        const rank = Number(linkState?.rank ?? 0);
        if (!(rank > 0)) continue;
        nodes.push({
          id: `slink:${linkId}`,
          type: GRAPH_NODE_TYPES.SOCIAL_LINK,
          label: linkId,
          source: GRAPH_SOURCES.STATE,
          meta: {
            rank,
            npcId: linkState?.npcId ?? null,
            perks: Array.isArray(linkState?.perks) ? linkState.perks : []
          }
        });
        if (linkState?.npcId) {
          edges.push({
            from: `slink:${linkId}`,
            to: linkState.npcId,
            type: GRAPH_EDGE_TYPES.RELATED_TO,
            weight: 0.7,
            meta: { role: 'social-link-target' }
          });
        }
      }
    }

    let currentLocationId = null;
    try {
      currentLocationId = state.get('academy.currentLocationId') ?? null;
    } catch (_err) {}

    let circleScores = null;
    try {
      circleScores = state.get('academy.scoring.circles') ?? state.get('scoring.circles') ?? null;
    } catch (_err) {}
    if (circleScores && typeof circleScores === 'object') {
      for (const [circleId, scoreValue] of Object.entries(circleScores)) {
        nodes.push({
          id: `score:${circleId}`,
          type: GRAPH_NODE_TYPES.CIRCLE,
          label: circleId,
          source: GRAPH_SOURCES.STATE,
          meta: {
            score: Number(scoreValue ?? 0),
            currentLocationId
          }
        });
      }
    }

    nodes.push(...nodesMap.values());
    return { nodes, edges };
  }
}