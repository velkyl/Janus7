import { JanusBaseApp } from '../core/base-app.js';

const { HandlebarsApplicationMixin } = foundry.applications.api;

export class StoryGraphApp extends HandlebarsApplicationMixin(JanusBaseApp) {
  static _mermaidLoadPromise = null;

  static DEFAULT_OPTIONS = {
    id: 'janus7-story-graph',
    tag: 'div',
    classes: ['janus7', 'janus7-story-graph-app'],
    window: {
      title: 'Story Graph Visualisierung',
      resizable: true,
      icon: 'fas fa-project-diagram'
    },
    position: {
      width: 1024,
      height: 768
    }
  };

  static PARTS = {
    content: {
      template: 'modules/Janus7/templates/apps/story-graph.hbs'
    }
  };

  /** @override */
  async _prepareContext(_options) {
    const service = game.janus7?.graph;
    const graph = service?.getGraph?.();
    
    if (!graph || typeof graph.getAllNodes !== 'function') {
      return {
        mermaidDef: 'graph TD; Error["Graph Service not available"];',
        nodesCount: 0,
        edgesCount: 0
      };
    }

    const nodes = graph.getAllNodes() || [];
    const edges = graph.getAllEdges() || [];

    let mermaidDef = 'graph TD;\n';

    for (const node of nodes) {
      const id = String(node.id).replace(/[^a-zA-Z0-9]/g, '_');
      const rawLabel = node.name || node.title || node.label || node.id;
      const label = String(rawLabel).replace(/"/g, "'").replace(/[\\{\\}\\[\\]]/g, ' ');
      const shortLabel = label.length > 35 ? `${label.substring(0, 35)}...` : label;

      let shape = `["${shortLabel}"]`;
      let style = '';
      if (node.type === 'NPC') {
        shape = `(["${shortLabel}"])`;
        style = `style ${id} fill:#3b5998,stroke:#1e3c72,stroke-width:2px,color:#fff`;
      } else if (node.type === 'LESSON' || node.type === 'EXAM') {
        shape = `> "${shortLabel}"]`;
        style = `style ${id} fill:#d0a030,stroke:#8b6b20,stroke-width:2px,color:#000`;
      } else if (node.type === 'QUEST') {
        shape = `{{"${shortLabel}"}}`;
        style = `style ${id} fill:#2d8b2d,stroke:#1b4f1b,stroke-width:2px,color:#fff`;
      } else if (node.type === 'LOCATION') {
        shape = `[/"${shortLabel}"/]`;
        style = `style ${id} fill:#8b5a2b,stroke:#5c3a1c,stroke-width:2px,color:#fff`;
      }

      mermaidDef += `  ${id}${shape}\n`;
      if (style) mermaidDef += `  ${style}\n`;
    }

    for (const edge of edges) {
      const from = String(edge.from).replace(/[^a-zA-Z0-9]/g, '_');
      const to = String(edge.to).replace(/[^a-zA-Z0-9]/g, '_');
      const edgeLabel = String(edge.type || '').replace(/_/g, ' ');
      mermaidDef += `  ${from} -- "${edgeLabel}" --> ${to}\n`;
    }

    return {
      mermaidDef,
      nodesCount: nodes.length,
      edgesCount: edges.length
    };
  }

  /** @override */
  _onPostRender(context, options) {
    super._onPostRender(context, options);

    const root = this.domElement;
    const mermaidNode = root?.querySelector('.mermaid');
    if (!mermaidNode) return;

    this._renderMermaid(mermaidNode);
  }

  async _renderMermaid(mermaidNode) {
    try {
      const mermaid = await this.constructor._getMermaid();
      if (!this.rendered || !this.domElement?.isConnected) return;
      await mermaid.run({ nodes: [mermaidNode] });
    } catch (err) {
      console.error('[JANUS7] Could not load mermaid script', err);
      if (mermaidNode.isConnected) {
        mermaidNode.textContent = 'Laden von Mermaid fehlgeschlagen. Bitte Internetverbindung prüfen.';
      }
    }
  }

  static async _getMermaid() {
    if (globalThis.window?.mermaid) return globalThis.window.mermaid;
    if (!this._mermaidLoadPromise) {
      this._mermaidLoadPromise = import('https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs')
        .then((m) => {
          const mermaid = m.default;
          globalThis.window.mermaid = mermaid;
          mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
          return mermaid;
        })
        .catch((err) => {
          this._mermaidLoadPromise = null;
          throw err;
        });
    }
    return this._mermaidLoadPromise;
  }
}

