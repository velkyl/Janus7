import { GRAPH_NODE_TYPES, GRAPH_EDGE_TYPES } from './constants.js';

/**
 * Provides static and dynamic integrity checks for the graph.  In basic
 * mode, only structural issues such as orphan nodes, broken edges and
 * duplicate IDs are detected.  In strict mode, the diagnostics also
 * validate node and edge types and perform simple semantic checks on
 * lessons and quests.  Additional checks can be added as the graph
 * evolves.
 */
export class GraphDiagnostics {
  /**
   * @param {{ logger?: any }} opts
   */
  constructor({ logger } = {}) {
    this.logger = logger;
  }

  /**
   * Runs diagnostics on the provided graph.
   *
   * @param {import('./JanusKnowledgeGraph.js').JanusKnowledgeGraph} graph
   * @param {{ mode?: 'basic'|'strict' }} [opts]
   */
  run(graph, { mode = 'basic' } = {}) {
    const result = {
      orphanNodes: [],
      brokenEdges: [],
      duplicateNodeIds: [],
      unknownNodeTypes: [],
      unknownEdgeTypes: [],
      missingLessonReferences: [],
      missingQuestReferences: [],
      summary: {
        nodeCount: graph?.getAllNodes()?.length ?? 0,
        edgeCount: graph?.getAllEdges()?.length ?? 0,
        brokenEdgeCount: 0,
        semanticIssueCount: 0,
        strictPassed: mode !== 'strict',
      },
    };
    if (!graph) return result;

    const seen = new Set();
    for (const node of graph.getAllNodes()) {
      if (seen.has(node.id)) result.duplicateNodeIds.push(node.id);
      seen.add(node.id);
      // unknown node type (strict only)
      if (mode === 'strict' && !Object.values(GRAPH_NODE_TYPES).includes(node.type)) {
        result.unknownNodeTypes.push(node.id);
      }
      // orphan detection
      const outgoing = graph.getOutgoingEdges(node.id);
      const incoming = graph.getAllEdges().filter((e) => e.to === node.id);
      if (!outgoing.length && !incoming.length) result.orphanNodes.push(node.id);
    }
    for (const edge of graph.getAllEdges()) {
      // unknown edge type (strict)
      if (mode === 'strict' && !Object.values(GRAPH_EDGE_TYPES).includes(edge.type)) {
        result.unknownEdgeTypes.push({ from: edge.from, to: edge.to, type: edge.type });
      }
      // broken references
      if (!graph.hasNode(edge.from) || !graph.hasNode(edge.to)) {
        result.brokenEdges.push(edge);
      }
      if (mode === 'strict') {
        if (edge.type === GRAPH_EDGE_TYPES.TEACHES) {
          const fromNode = graph.getNode(edge.from);
          const toNode = graph.getNode(edge.to);
          if (fromNode && fromNode.type !== GRAPH_NODE_TYPES.NPC) {
            result.missingLessonReferences.push({ issue: 'TEACHES source is not NPC', edge, actualType: fromNode.type });
          }
          if (toNode && toNode.type !== GRAPH_NODE_TYPES.LESSON) {
            result.missingLessonReferences.push({ issue: 'TEACHES target is not LESSON', edge, actualType: toNode.type });
          }
        }
        if (edge.type === GRAPH_EDGE_TYPES.LOCATED_IN) {
          const toNode = graph.getNode(edge.to);
          if (toNode && toNode.type !== GRAPH_NODE_TYPES.LOCATION) {
            result.missingLessonReferences.push({ issue: 'LOCATED_IN target is not LOCATION', edge, actualType: toNode.type });
          }
        }
      }
    }
    if (mode === 'strict') {
      for (const node of graph.getAllNodes()) {
        if (node.type === GRAPH_NODE_TYPES.LESSON && node.meta?.teacherId && !graph.hasNode(node.meta.teacherId)) {
          result.missingLessonReferences.push({
            issue: 'Lesson references missing teacher NPC',
            lessonId: node.id,
            teacherId: node.meta.teacherId
          });
        }
        if (node.type === GRAPH_NODE_TYPES.QUEST && node.meta?.locationId && !graph.hasNode(node.meta.locationId)) {
          result.missingQuestReferences.push({
            issue: 'Quest references missing location',
            questId: node.id,
            locationId: node.meta.locationId
          });
        }
        if (node.type === GRAPH_NODE_TYPES.SOCIAL_LINK && node.meta?.npcId && !graph.hasNode(node.meta.npcId)) {
          result.missingLessonReferences.push({
            issue: 'Social link references missing NPC',
            socialLinkId: node.id,
            npcId: node.meta.npcId
          });
        }
      }
    }
    result.summary.brokenEdgeCount = result.brokenEdges.length;
    result.summary.semanticIssueCount = result.missingLessonReferences.length + result.missingQuestReferences.length + result.unknownNodeTypes.length + result.unknownEdgeTypes.length;
    result.summary.strictPassed = mode !== 'strict' ? true : (result.summary.brokenEdgeCount === 0 && result.summary.semanticIssueCount === 0);
    return result;
  }
}