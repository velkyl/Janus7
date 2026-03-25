import { GraphBuilder } from './GraphBuilder.js';
import { GraphQueryService } from './GraphQueryService.js';
import { GraphDiagnostics } from './GraphDiagnostics.js';
import { AcademyGraphProvider } from './providers/AcademyGraphProvider.js';
import { StateGraphProvider } from './providers/StateGraphProvider.js';
import { Dsa5IndexGraphProvider } from './providers/Dsa5IndexGraphProvider.js';
import { JanusGraphCache } from '../../services/graph/JanusGraphCache.js';

/**
 * Registers the knowledge graph service on the given engine.  The
 * graph is a derived, read‑only model built from static academy
 * definitions, the dynamic quest state and (optionally) the DSA5
 * compendium index.  Once registered, the graph can be rebuilt on
 * demand and queried for relevant entities.
 *
 * @param {{ engine: any, core: any, academyData: any, dsa5Index: any, logger?: any }} deps
 */
export async function registerGraphService({ engine, core, academyData, dsa5Index, logger } = {}) {
  if (!engine || !core) return;
  const providers = [
    new AcademyGraphProvider({ academyData, logger }),
    new StateGraphProvider({ state: core.state, logger }),
    new Dsa5IndexGraphProvider({ index: dsa5Index, academyData, logger })
  ];
  const builder = new GraphBuilder({ providers, logger });
  const queryCache = new JanusGraphCache();
  const queryService = new GraphQueryService({ logger, cache: queryCache });
  const diagnostics = new GraphDiagnostics({ logger });

  const service = {
    _graph: null,
    _dirty: { state: true, academy: true, index: true },
    /**
     * Rebuilds the graph if necessary.  If no dirty flags are set and
     * force is false, the cached graph is returned.  After building,
     * dirty flags are cleared and the cache is updated.
     *
     * @param {{ force?: boolean }} opts
     */
    async build({ force = false } = {}) {
      if (!force && !this.isDirty() && this._graph) {
        return this._graph;
      }
      const graph = await builder.build();
      this._graph = graph;
      queryService.setGraph(graph);
      queryCache.invalidate();
      this._dirty = { state: false, academy: false, index: false };
      this._lastBuildAt = new Date().toISOString();
      return graph;
    },
    /** Returns the current in‑memory graph. */
    getGraph() { return this._graph; },
    /**
     * Marks one or more aspects of the graph as dirty.  Supported
     * keys: 'state', 'academy', 'index'.
     * @param {string} key
     */
    markDirty(key) {
      if (Object.prototype.hasOwnProperty.call(this._dirty, key)) {
        this._dirty[key] = true;
        queryCache.invalidate(key);
      }
    },
    /** Returns true if any dirty flags are set. */
    isDirty() {
      return Object.values(this._dirty).some((v) => v);
    },
    /** Query API wrapper */
    query: {
      /**
       * @param {string} id
       */
      findNode: (id) => queryService.findNode(id),
      /**
       * @param {string} id
       * @param {{ edgeTypes?: string[] }} opts
       */
      neighbors: (id, opts = {}) => queryService.neighbors(id, opts),
      /**
       * @param {import('./types.js').GraphContext} ctx
       */
      findRelevantForContext: (ctx) => queryService.findRelevantForContext(ctx),
      /**
       * @param {import('./types.js').GraphContext} ctx
       */
      suggestQuests: (ctx) => queryService.suggestQuests(ctx)
    },
    /** Diagnostics API wrapper */
    cache: queryCache,
    diagnostics: {
      /**
       * @param {{ mode?: 'basic'|'strict' }} opts
       */
      run: (opts = {}) => diagnostics.run(service._graph, opts),
      cache: () => queryCache.snapshot()
    },
    getStatus() {
      return { dirty: this.isDirty(), lastBuildAt: this._lastBuildAt ?? null, cache: queryCache.snapshot() };
    }
  };


  // Attach service to engine and global game object
  engine.graph = service;
  if (globalThis.game?.janus7) {
    globalThis.game.janus7.graph = service;
  }

  // Register hooks to invalidate parts of the graph when state or
  // academy data changes.  We listen to high‑level events exposed via
  // hook aliases defined in core/hooks/topics.js.  Listeners are kept
  // simple; more nuanced invalidation can be added later.
  const markStateDirty = () => service.markDirty('state');
  const markAcademyDirty = () => service.markDirty('academy');
  const markIndexDirty = () => service.markDirty('index');

  Hooks.on('janus7.state.changed', markStateDirty);
  Hooks.on('janus7.state.replaced', markStateDirty);
  Hooks.on('janus7QuestStarted', markStateDirty);
  Hooks.on('janus7QuestNodeChanged', markStateDirty);
  Hooks.on('janus7QuestCompleted', markStateDirty);
  Hooks.on('janus7KiImportApplied', markStateDirty);

  // Reserved integration hooks for future explicit reload paths.
  Hooks.on('janus7.academy.data.reloaded', markAcademyDirty);
  Hooks.on('janus7.dsa5.index.updated', markIndexDirty);

  logger?.info?.('[JANUS7] Graph service registered');
}