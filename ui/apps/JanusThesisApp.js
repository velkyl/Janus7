import { JanusBaseApp } from '../core/base-app.js';
import { MODULE_ID, moduleTemplatePath } from '../../core/common.js';
import { getJanusCore } from '../../core/index.js';

/**
 * JanusThesisApp
 * ApplicationV2 for managing scholar research progress.
 */
export class JanusThesisApp extends JanusBaseApp {
  static DEFAULT_OPTIONS = {
    id: 'janus7-thesis-manager',
    classes: ['janus7-app', 'janus7-thesis-manager', 'premium-surface'],
    position: { width: 600, height: 700 },
    window: {
      title: 'Thesis Manager · Recherche-Zentrum',
      resizable: true,
      minimizable: true,
      icon: 'fas fa-book-reader'
    },
    actions: {
      evaluateSource: JanusThesisApp.onEvaluateSource,
      removeSource: JanusThesisApp.onRemoveSource
    }
  };

  static PARTS = {
    content: {
      template: moduleTemplatePath('extensions/thesis-manager/thesis-app.hbs')
    }
  };

  constructor(options = {}) {
    super(options);
    this._dragDrop = this.#createDragDropHandlers();
  }

  /** @override */
  _prepareContext(options) {
    const { state } = getJanusCore();
    const theses = state.get('academy.theses') || {};
    
    // Transform theses for display
    const thesesList = Object.entries(theses).map(([id, data]) => {
        const actor = game.actors.get(data.scholarId);
        const progress = Math.min(100, Math.round((data.currentQS / data.requiredQS) * 100));
        
        return {
            id,
            ...data,
            scholarName: actor?.name || 'Unbekannter Scholar',
            progress,
            statusLabel: this.#getStatusLabel(data.status),
            isReady: data.status === 'ready_for_defense' || progress >= 100
        };
    });

    return {
      theses: thesesList
    };
  }

  #getStatusLabel(status) {
    const labels = {
        'in_progress': 'In Bearbeitung',
        'ready_for_defense': 'Bereit zur Verteidigung',
        'completed': 'Abgeschlossen'
    };
    return labels[status] || status;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    this._dragDrop.forEach(d => d.bind(this.domElement));
  }

  #createDragDropHandlers() {
    const DragDropImpl = foundry.applications?.ux?.DragDrop || globalThis.DragDrop;
    return [new DragDropImpl({
      dropSelector: '.j7-thesis-drop-zone',
      callbacks: {
        drop: this.#onDrop.bind(this)
      }
    })];
  }

  async #onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    if (data.type !== "JournalEntry") return;

    const thesisId = event.target.closest('[data-thesis-id]')?.dataset.thesisId;
    if (!thesisId) return;

    const { state, logger } = getJanusCore();
    
    state.transaction(() => {
        const theses = state.get('academy.theses') || {};
        const thesis = theses[thesisId];
        if (!thesis) return;

        thesis.sources = thesis.sources || [];
        if (!thesis.sources.includes(data.uuid)) {
            thesis.sources.push(data.uuid);
            state.set('academy.theses', theses);
            logger.info(`JANUS | Quelle ${data.uuid} zu Thesis ${thesisId} hinzugefügt.`);
            ui.notifications.info(`Quelle erfolgreich hinzugefügt.`);
        }
    });

    this.render();
  }

  static async onEvaluateSource(event, target) {
    const thesisId = target.closest('[data-thesis-id]')?.dataset.thesisId;
    if (!thesisId) return;

    const { state, logger, dsa5 } = getJanusCore();
    const theses = state.get('academy.theses') || {};
    const thesis = theses[thesisId];
    if (!thesis) return;

    // Check if there are sources
    if (!thesis.sources || thesis.sources.length === 0) {
        ui.notifications.warn("Keine Quellen zum Auswerten vorhanden.");
        return;
    }

    // Trigger Magiekunde roll via Bridge
    // Note: This is an abstraction, assuming dsa5 bridge has a roll feature
    const actor = game.actors.get(thesis.scholarId);
    if (!actor) return;

    // Simulate or trigger real roll. 
    // In DSA5 system, we might need to find the skill "Magiekunde" 
    const skill = actor.items.find(i => i.name === "Magiekunde" && i.type === "skill");
    
    if (skill) {
        // Trigger roll via system API (simplified for demonstration)
        // In a real module we would use game.dsa5.apps.DiceDSA5.xxx
        ui.notifications.info(`${actor.name} wertet eine Quelle aus (Magiekunde)...`);
        
        // Let's assume a simplified success for this artifact
        const rollResult = { qs: Math.floor(Math.random() * 3) + 1 }; 
        
        state.transaction(() => {
            thesis.currentQS += rollResult.qs;
            if (thesis.currentQS >= thesis.requiredQS) {
                thesis.status = 'ready_for_defense';
            }
            state.set('academy.theses', theses);
            logger.info(`JANUS | Thesis ${thesisId} Progress: +${rollResult.qs} QS`);
        });
        
        this.render();
    } else {
        ui.notifications.warn("Scholar beherrscht keine Magiekunde.");
    }
  }

  static async onRemoveSource(event, target) {
      const thesisId = target.closest('[data-thesis-id]')?.dataset.thesisId;
      const sourceUuid = target.dataset.uuid;
      if (!thesisId || !sourceUuid) return;

      const { state } = getJanusCore();
      state.transaction(() => {
          const theses = state.get('academy.theses') || {};
          const thesis = theses[thesisId];
          if (thesis && thesis.sources) {
              thesis.sources = thesis.sources.filter(s => s !== sourceUuid);
              state.set('academy.theses', theses);
          }
      });
      this.render();
  }

  static showSingleton() {
    if (this._instance) {
      this._instance.render({ force: true });
      this._instance.bringToFront();
      return this._instance;
    }
    this._instance = new this();
    this._instance.render(true);
    return this._instance;
  }
}
