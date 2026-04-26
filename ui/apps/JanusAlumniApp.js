import { MODULE_ID } from '../../core/common.js';
import { createJanusAlumniService } from '../../scripts/extensions/phase8-api.js';
import { JanusBaseApp } from '../core/base-app.js';

const { HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * @file ui/apps/JanusAlumniApp.js
 * @module janus7
 *
 * JanusAlumniApp:
 * - Verwaltung des Alumni-Netzwerks.
 * - Nutzt JanusAlumniService für Daten und Scoring.
 */
export class JanusAlumniApp extends HandlebarsApplicationMixin(JanusBaseApp) {
  constructor(options = {}) {
    super(options);
    this._servicePromise = null;
  }

  async _getService() {
    this._servicePromise ??= createJanusAlumniService({
      engine: game?.janus7 ?? null,
      logger: game?.janus7?.core?.logger ?? console
    });
    return await this._servicePromise;
  }

  static DEFAULT_OPTIONS = {
    id: 'janus-alumni',
    classes: ['janus7', 'j7-app', 'j7-alumni-window'],
    tag: 'section',
    window: {
      title: 'JANUS7 · Alumni-Archiv & Mentoren',
      icon: 'fas fa-user-graduate',
      resizable: true
    },
    position: { width: 980, height: 750 },
    actions: {
      'register': '_onRegister',
      'set-status': '_onSetStatus',
      'set-focus': '_onSetFocus',
      'open-npc-sheet': '_onOpenNpcSheet',
      'refresh': '_onRefresh'
    }
  };

  static PARTS = {
    main: {
      template: `modules/${MODULE_ID}/templates/apps/alumni.hbs`,
      scrollable: ['.j7-app__content', '.j7-app__sidebar']
    }
  };

  async _preRender(_options) {
    await super._preRender(_options);
    const service = await this._getService();
    this.__renderCache = await service.getOverview();
  }

  _prepareContext(_options) {
    return this.__renderCache ?? {};
  }

  // -------------------------
  // Handlers
  // -------------------------

  async _onRegister(_event, target) {
    const npcId = target.dataset.npcId;
    if (!npcId) return;
    try {
      const service = await this._getService();
      await service.registerAlumnus({ npcId });
      this.render({ force: true });
    } catch (err) {
      ui.notifications.error(err.message);
    }
  }

  async _onSetStatus(_event, target) {
    const npcId = target.dataset.npcId;
    const status = target.value;
    if (!npcId || !status) return;
    try {
      const service = await this._getService();
      await service.setAlumniStatus({ npcId, status });
      this.render({ force: true });
    } catch (err) {
      ui.notifications.error(err.message);
    }
  }

  async _onSetFocus(_event, target) {
    const npcId = target.closest('[data-npc-id]')?.dataset.npcId;
    const focus = target.dataset.focus;
    if (!npcId) return;
    try {
      const service = await this._getService();
      await service.setAlumniFocus({ npcId, focus });
      this.render({ force: true });
    } catch (err) {
      ui.notifications.error(err.message);
    }
  }

  async _onOpenNpcSheet(_event, target) {
    const npcId = target.dataset.npcId;
    if (!npcId) return;
    try {
      const npc = game.janus7.academy.data.getNpc(npcId);
      const actorKey = npc?.foundry?.actorKey;
      if (!actorKey) throw new Error('Keine Actor-Referenz vorhanden');
      
      const actor = await fromUuid(actorKey);
      if (actor) actor.sheet.render({ force: true });
      else throw new Error('Akteur nicht gefunden');
    } catch (err) {
      ui.notifications.warn(err.message);
    }
  }

  async _onRefresh(_event, _target) {
    this.render({ force: true });
  }
}

export default JanusAlumniApp;

