/**
 * Basic in‑memory graph implementation for JANUS.  Stores nodes and
 * edges and provides simple accessors for neighbor lookup.  Graphs
 * returned by providers are merged into this structure via the
 * GraphBuilder.
 */

export class JanusKnowledgeGraph {
  constructor() {
    /**
     * Map of node IDs to node objects.
     * @type {Map<string, import('./types.js').GraphNode>}
     */
    this.nodes = new Map();

    /**
     * Array of all edges in insertion order.
     * @type {import('./types.js').GraphEdge[]}
     */
    this.edges = [];

    /**
     * Adjacency list mapping source node IDs to outgoing edges.
     * @type {Map<string, import('./types.js').GraphEdge[]>}
     */
    this.adjacency = new Map();
  }

  /**
   * Adds a node to the graph.  Duplicate IDs replace the previous entry.
   * @param {import('./types.js').GraphNode} node
   */
  addNode(node) {
    if (!node || typeof node.id !== 'string') {
      throw new Error('Graph node requires a string id');
    }
    this.nodes.set(node.id, node);
  }

  /**
   * Adds an edge to the graph.  Invalid edges (missing fields) will
   * throw an error.
   * @param {import('./types.js').GraphEdge} edge
   */
  addEdge(edge) {
    if (!edge || typeof edge.from !== 'string' || typeof edge.to !== 'string' || typeof edge.type !== 'string') {
      throw new Error('Graph edge requires from, to and type');
    }
    this.edges.push(edge);
    if (!this.adjacency.has(edge.from)) {
      this.adjacency.set(edge.from, []);
    }
    this.adjacency.get(edge.from).push(edge);
  }

  /**
   * Returns true if a node with the given ID exists in the graph.
   * @param {string} id
   */
  hasNode(id) {
    return this.nodes.has(id);
  }

  /**
   * Retrieves a node by ID, or null if it does not exist.
   * @param {string} id
   * @returns {import('./types.js').GraphNode|null}
   */
  getNode(id) {
    return this.nodes.get(id) ?? null;
  }

  /**
   * Returns a shallow array of all nodes in the graph.
   * @returns {import('./types.js').GraphNode[]}
   */
  getAllNodes() {
    return Array.from(this.nodes.values());
  }

  /**
   * Returns a shallow array of all edges in the graph.
   * @returns {import('./types.js').GraphEdge[]}
   */
  getAllEdges() {
    return this.edges.slice();
  }

  /**
   * Returns the list of outgoing edges from the given node ID.  If
   * none exist, an empty array is returned.
   * @param {string} id
   * @returns {import('./types.js').GraphEdge[]}
   */
  getOutgoingEdges(id) {
    return this.adjacency.get(id) ?? [];
  }

  /**
   * Returns an array of neighboring nodes reachable via outgoing edges
   * of optionally filtered types.  Filters are applied on edge types
   * before retrieving the target nodes.
   * @param {string} id
   * @param {string[]|null} [edgeTypes]
   * @returns {import('./types.js').GraphNode[]}
   */
  getNeighbors(id, edgeTypes = null) {
    const edges = this.getOutgoingEdges(id);
    let filtered = edges;
    if (edgeTypes && edgeTypes.length) {
      const set = new Set(edgeTypes);
      filtered = edges.filter(e => set.has(e.type));
    }
    return filtered
      .map((e) => this.getNode(e.to))
      .filter((n) => !!n);
  }

  /**
   * Serializes the graph into a plain JSON object.  This is useful
   * for caching the graph to disk.
   */
  toJSON() {
    return {
      nodes: this.getAllNodes(),
      edges: this.getAllEdges(),
    };
  }

  /**
   * Creates a graph from JSON.  Incoming data is trusted to be well
   * formed; invalid data will throw.
   * @param {{nodes: any[], edges: any[]}} data
   */
  static fromJSON(data) {
    const graph = new JanusKnowledgeGraph();
    if (Array.isArray(data?.nodes)) {
      for (const node of data.nodes) graph.addNode(node);
    }
    if (Array.isArray(data?.edges)) {
      for (const edge of data.edges) graph.addEdge(edge);
    }
    return graph;
  }
}