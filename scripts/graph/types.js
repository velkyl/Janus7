/**
 * @typedef {Object} GraphNode
 * @property {string} id      Unique identifier for the node.  Should be
 *                            stable across rebuilds if the underlying
 *                            entity is the same.
 * @property {string} type    One of GRAPH_NODE_TYPES; defines the kind of
 *                            entity this node represents.
 * @property {string} label   Human‑readable label for UI/diagnostics.
 * @property {string} source  One of GRAPH_SOURCES indicating where this
 *                            node originated.
 * @property {Object.<string, any>=} meta Arbitrary additional metadata
 *                            about the node.  Consumers may use this to
 *                            store extra fields such as lesson subject,
 *                            NPC rank, or quest status.
 */

/**
 * @typedef {Object} GraphEdge
 * @property {string} from    The ID of the source node.
 * @property {string} to      The ID of the target node.
 * @property {string} type    One of GRAPH_EDGE_TYPES; defines the kind of
 *                            relationship between the two nodes.
 * @property {number=} weight Optional numeric weighting.  A value of 1 is
 *                            treated as neutral importance; higher values
 *                            increase the influence of this edge in scoring
 *                            operations, while lower values reduce it.
 * @property {Object.<string, any>=} meta Optional additional metadata
 *                            about the edge.
 */

/**
 * @typedef {Object} GraphContribution
 * @property {GraphNode[]} nodes
 * @property {GraphEdge[]} edges
 */

/**
 * @typedef {Object} GraphContext
 * Defines the shape of the contextual input used by the query service.
 * Queries take a normalized context to compute relevant nodes or quests.
 *
 * @property {number} version          Schema version to allow future
 *                                     evolution of the context without
 *                                     breaking existing callers.
 * @property {string|null} lessonId    Currently focused lesson, if any.
 * @property {string|null} locationId  Active location, if any.
 * @property {string[]} npcIds         List of NPC IDs involved in the current
 *                                     context (e.g. teachers or students
 *                                     present).
 * @property {string[]} threadIds      List of thread IDs currently in scope
 *                                     (e.g. active story arcs).
 * @property {string[]} questIds       List of quest IDs currently in scope,
 *                                     allowing weighting of active quests.
 * @property {string[]} tags           Arbitrary tags to refine query
 *                                     semantics; unused in V1 but reserved
 *                                     for future use.
 */