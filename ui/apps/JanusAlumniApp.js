import { MODULE_ID } from '../../core/common.js';
import { JanusAlumniService } from '../../phase8/alumni/JanusAlumniService.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * @file ui/apps/JanusAlumniApp.js
 * @module janus7
 *
 * JanusAlumniApp:
 * - Verwaltung des Alumni-Netzwerks.
 * - Nutzt JanusAlumniService für Daten und Scoring.
 */
export class JanusAlumniApp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.service = new JanusAlumniService();
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
      'register': JanusAlumniApp._onRegister,
      'set-status': JanusAlumniApp._onSetStatus,
      'set-focus': JanusAlumniApp._onSetFocus,
      'open-npc-sheet': JanusAlumniApp._onOpenNpcSheet,
      'refresh': JanusAlumniApp._onRefresh
    }
  };

  static PARTS = {
    main: {
      template: `modules/${MODULE_ID}/templates/apps/alumni.hbs`,
      scrollable: ['.j7-app__content', '.j7-app__sidebar']
    }
  };

  async _preRender(options) {
    await super._preRender(options);
    this.__renderCache = await this.service.getOverview();
  }

  _prepareContext(options) {
    return this.__renderCache ?? {};
  }

  // -------------------------
  // Handlers
  // -------------------------

  static async _onRegister(event, target) {
    const npcId = target.dataset.npcId;
    if (!npcId) return;
    try {
      await this.service.registerAlumnus({ npcId });
      this.render();
    } catch (err) {
      ui.notifications.error(err.message);
    }
  }

  static async _onSetStatus(event, target) {
    const npcId = target.dataset.npcId;
    const status = target.value;
    if (!npcId || !status) return;
    try {
      await this.service.setAlumniStatus({ npcId, status });
      this.render();
    } catch (err) {
      ui.notifications.error(err.message);
    }
  }

  static async _onSetFocus(event, target) {
    const npcId = target.closest('[data-npc-id]')?.dataset.npcId;
    const focus = target.dataset.focus;
    if (!npcId) return;
    try {
      await this.service.setAlumniFocus({ npcId, focus });
      this.render();
    } catch (err) {
      ui.notifications.error(err.message);
    }
  }

  static async _onOpenNpcSheet(event, target) {
    const npcId = target.dataset.npcId;
    if (!npcId) return;
    try {
      const npc = game.janus7.academy.data.getNpc(npcId);
      const actorKey = npc?.foundry?.actorKey;
      if (!actorKey) throw new Error('Keine Actor-Referenz vorhanden');
      
      const actor = await fromUuid(actorKey);
      if (actor) actor.sheet.render(true);
      else throw new Error('Akteur nicht gefunden');
    } catch (err) {
      ui.notifications.warn(err.message);
    }
  }

  static async _onRefresh(event, target) {
    this.render({ force: true });
  }
}

export default JanusAlumniApp;
