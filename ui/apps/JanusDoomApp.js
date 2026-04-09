import { JanusBaseApp } from '../core/base-app.js';
import { MODULE_ID, moduleTemplatePath } from '../../core/common.js';
import { getJanusCore } from '../../core/index.js';

export class JanusDoomApp extends JanusBaseApp {
  static DEFAULT_OPTIONS = {
    id: 'janus7-doom-monitor',
    classes: ['janus7-app', 'janus7-doom-monitor', 'premium-surface'],
    position: { width: 450, height: 650 },
    window: {
      title: 'Doom Engine · Überwachung',
      resizable: false,
      minimizable: true,
      icon: 'fas fa-skull'
    },
    actions: {
      adjustDoom: JanusDoomApp.onAdjustDoom
    }
  };

  static PARTS = {
    content: {
      template: moduleTemplatePath('extensions/doom-engine/doom-app.hbs')
    }
  };

  /** @override */
  _prepareContext(options) {
    const { state } = getJanusCore();
    const doomValue = state.get('academy.metrics.doom') || 0;
    const doomPercentage = Math.min(100, (doomValue / 100) * 100);
    
    // In a real scenario, we'd fetch actual logs from state
    const events = []; 

    return {
      doomValue,
      doomPercentage,
      events
    };
  }

  static async onAdjustDoom(event, target) {
    const value = parseInt(target.dataset.value);
    const { state, logger } = getJanusCore();
    
    state.transaction(() => {
        let current = state.get('academy.metrics.doom') || 0;
        state.set('academy.metrics.doom', Math.max(0, current + value));
        logger.info(`JANUS | Doom manually adjusted by ${value}.`);
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
