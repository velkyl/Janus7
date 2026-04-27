import { moduleTemplatePath } from '../../core/common.js';
/**
 * @file ui/apps/JanusStateInspectorApp.js
 * @module janus7/ui
 * @phase 6
 *
 * State Inspector: Read-only JSON-Snapshot des vollständigen JANUS7-State.
 * Ausschließlich für Debug/Dev-Zwecke. Keine Mutationen.
 */
const { HandlebarsApplicationMixin } = foundry.applications.api;
import { JanusBaseApp } from '../core/base-app.js';

/**
 * JanusStateInspectorApp
 * Read-only State Snapshot Viewer (Debug/Dev).
 */
export class JanusStateInspectorApp extends HandlebarsApplicationMixin(JanusBaseApp) {
  static _instance = null;

  static showSingleton(options = {}) {
    if (!this._instance) this._instance = new this(options);
    this._instance.render({ force: true });
    return this._instance;
  }

  static DEFAULT_OPTIONS = {
    id: 'janus-state-inspector',
    classes: ['janus7-app', 'janus7-state-inspector'],
    position: { width: 980, height: 780 },
    window: {
      title: 'JANUS7 · State Inspector (Read-Only)',
      resizable: true,
    },
    actions: {
      refresh: 'onRefresh',
      copy: 'onCopy'
    }
  };

  static PARTS = {
    main: { template: moduleTemplatePath('templates/apps/state-inspector.hbs') }
  };

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.enableAutoRefresh(['janus7StateChanged']);
  }

  async onRefresh(){ this.refresh(); }

  async onCopy(event, target) {
    event?.preventDefault?.();
    const textarea = this.element?.querySelector?.('textarea[name="snapshot"]');
    const text = textarea?.value ?? '';
    try {
      await navigator.clipboard.writeText(text);
      ui.notifications.info('Snapshot kopiert.');
    } catch (err) {
      this._getLogger().error?.('JANUS7 | clipboard failed', err);
      ui.notifications.warn('Kopieren nicht möglich (Browser/HTTPS).');
    }
  }

  _prepareContext(_options) {
    const engine = game.janus7;
    const state = engine?.core?.state;
    if (!engine || !state) return { notReady: true };

    const snapshot = state.get?.() ?? {};
    const json = JSON.stringify(snapshot, null, 2);

    return {
      notReady: false,
      isGM: game.user?.isGM ?? false,
      stateJson: json
    };
  }
}

