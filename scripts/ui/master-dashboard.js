import { moduleTemplatePath } from '../core/public-api.mjs';
import { JanusRumorManager } from '../academy/systems/gossip-engine.js';
import { JanusBaseApp } from '../../ui/core/base-app.js';

const { HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Master Dashboard - The GM's Control Center for Academy Management
 */
export class JanusMasterDashboard extends HandlebarsApplicationMixin(JanusBaseApp) {
  static DEFAULT_OPTIONS = {
    id: 'janus7-master-dashboard',
    tag: 'div',
    window: {
      title: 'JANUS7 Master Dashboard',
      resizable: true,
      icon: 'fas fa-crown'
    },
    position: {
      width: 900,
      height: 700
    },
    actions: {
      refresh: '_onRefresh',
      adjustHeat: '_onAdjustHeat',
      modifyStress: '_onModifyStress',
      distributeRumor: '_onDistributeRumor',
      adjustAttitude: '_onAdjustAttitude'
    }
  };

  static PARTS = {
    content: {
      template: moduleTemplatePath('templates/apps/master-dashboard.hbs'),
      scrollable: ['.dashboard-main', '.dashboard-side']
    }
  };

  /** @type {object|null} Transient cache for sanitized render data */
  __renderCache = null;

  /** @override */
  async _preRender(_options) {
    await super._preRender(_options);
    try {
      const dataApi = game.janus7.academy.data;
      const state = game.janus7.core.state;
      
      // Global Stats
      const globalHeat = state.get('academy.punin.heat') || 0;
      const inquisitionLevel = state.get('academy.punin.inquisition') || 0;

      // Characters (SCs)
      const actors = game.actors.filter(a => a.type === 'character').map(a => {
        const ko = a.system.characteristics?.ko?.value || 10;
        const stress = state.get(`academy.actors.${a.id}.stress`) || 0;
        const stressPercent = Math.min(100, (stress / ko) * 100);
        const threshold1 = ko / 3;
        const threshold2 = (ko / 3) * 2;

        let status = 'Stabil';
        let statusClass = 'status-ok';
        if (stress >= threshold2) { status = 'Kritisch'; statusClass = 'status-critical'; }
        else if (stress >= threshold1) { status = 'Belastet'; statusClass = 'status-warning'; }

        return {
          id: a.id,
          name: a.name,
          stress,
          ko,
          stressPercent,
          status,
          statusClass
        };
      });

      // Simple NPC social overview
      const npcRelationships = (dataApi.getNpcs?.() ?? []).filter(n => n.role === 'teacher').map(n => {
        const attitude = state.get(`academy.social.global.${n.id}`) || 0;
        let status = 'Neutral';
        let statusClass = 'status-neutral';
        if (attitude >= 5) { status = 'Gezielt Wohlwollend'; statusClass = 'status-ok'; }
        else if (attitude <= -5) { status = 'Feindselig'; statusClass = 'status-critical'; }

        return {
          id: n.id,
          name: n.name,
          attitude,
          status,
          statusClass
        };
      });

      this.__renderCache = {
        globalHeat,
        globalHeatPercent: Math.min(100, (globalHeat / 20) * 100),
        inquisitionLevel,
        inqPercent: Math.min(100, (inquisitionLevel / 15) * 100),
        actors,
        npcRelationships,
        isGM: game.user.isGM
      };
    } catch (err) {
      console.error('[JANUS7][MasterDashboard] _preRender failed:', err);
      this.__renderCache = { error: err.message };
    }
  }

  /** @override */
  _prepareContext(_options) {
    return this.__renderCache ?? {};
  }

  async _onRefresh() {
    this.render({ force: true });
  }

  async _onAdjustHeat(event, target) {
    const delta = parseInt(target.dataset.delta);
    const state = game.janus7.core.state;
    const current = state.get('academy.punin.heat') || 0;
    await state.set('academy.punin.heat', Math.max(0, current + delta));
    this.render({ force: true });
  }

  async _onModifyStress(event, target) {
    const actorId = target.dataset.actorId;
    const delta = parseInt(target.dataset.delta);
    const state = game.janus7.core.state;
    const current = state.get(`academy.actors.${actorId}.stress`) || 0;
    await state.set(`academy.actors.${actorId}.stress`, Math.max(0, current + delta));
    this.render({ force: true });
  }

  async _onAdjustAttitude(event, target) {
    const npcId = target.dataset.npcId;
    const delta = parseInt(target.dataset.delta);
    const state = game.janus7.core.state;
    const current = state.get(`academy.social.global.${npcId}`) || 0;
    await state.set(`academy.social.global.${npcId}`, current + delta);
    this.render({ force: true });
  }

  async _onDistributeRumor(event, target) {
    const form = target.closest('.janus-master-dashboard');
    const actorId = form.querySelector('[name="targetActorId"]').value;
    const category = form.querySelector('[name="rumorCategory"]').value;

    const actor = game.actors.get(actorId);
    if (!actor) return ui.notifications.error("Kein Ziel-Akteur gewählt.");

    const rumor = await JanusRumorManager.getRandomRumor(category);
    if (rumor) {
      await JanusRumorManager.learnRumor(actor, rumor);
      ui.notifications.info(`Gerücht an ${actor.name} gesendet.`);
    }
  }
}
