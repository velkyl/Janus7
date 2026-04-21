import { JanusBaseApp } from '../core/base-app.js';

export class StoryGraphApp extends JanusBaseApp {
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

  async _renderHTML(_context, _options) {
    const graph = game.janus7?.graph;
    if (!graph || typeof graph.getAllNodes !== 'function') {
      return `<div style="padding: 20px;">Graph-Service nicht verf&uuml;gbar oder l&auml;dt noch.</div>`;
    }

    let mermaidDef = 'graph TD;\n';

    // Nodes
    const nodes = graph.getAllNodes() || [];
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

    // Edges
    const edges = graph.getAllEdges() || [];
    for (const edge of edges) {
      const from = String(edge.from).replace(/[^a-zA-Z0-9]/g, '_');
      const to = String(edge.to).replace(/[^a-zA-Z0-9]/g, '_');
      const edgeLabel = String(edge.type || '').replace(/_/g, ' ');
      mermaidDef += `  ${from} -- "${edgeLabel}" --> ${to}\n`;
    }

    return `
      <div style="width: 100%; height: 100%; overflow: hidden; background: #e0e6ed; display: flex; flex-direction: column;">
        <header style="padding: 15px; background: #1e2830; color: #fff; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0b1116;">
          <div>
            <h2 style="margin: 0; color: #4dc2d3;"><i class="fas fa-project-diagram"></i> JANUS7 Story Graph</h2>
            <p style="margin: 5px 0 0 0; font-size: 0.9em; opacity: 0.8;">Visuelle Darstellung der Akademiedaten (NPCs, Quests, Lektionen).</p>
          </div>
          <div style="font-size: 0.9em; text-align: right;">
            <b>Nodes:</b> ${nodes.length} &nbsp;|&nbsp; <b>Edges:</b> ${edges.length}
          </div>
        </header>
        <div style="flex: 1; padding: 20px; overflow: auto; display: flex; justify-content: center;">
          <div class="mermaid-container" style="min-width: 80%; text-align: center;">
            <div class="mermaid" style="background: transparent;">
${mermaidDef}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    const root = this.domElement;
    const mermaidNode = root?.querySelector('.mermaid');
    if (!mermaidNode) return;

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
