import { moduleTemplatePath } from '../../core/common.js';
import { JanusRumorManager } from '../academy/systems/gossip-engine.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Master Dashboard - The GM's Control Center for Academy Management
 */
export class JanusMasterDashboard extends HandlebarsApplicationMixin(ApplicationV2) {
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
      refresh: this._onRefresh,
      adjustHeat: this._onAdjustHeat,
      modifyStress: this._onModifyStress,
      distributeRumor: this._onDistributeRumor,
      adjustAttitude: this._onAdjustAttitude
    }
  };

  static PARTS = {
    content: {
      template: moduleTemplatePath('templates/apps/master-dashboard.hbs'),
      scrollable: ['.dashboard-main', '.dashboard-side']
    }
  };

  async _prepareContext(options) {
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

      const isCritical = stress >= ko;
      const isDanger   = !isCritical && stress >= threshold2;
      const isWarn     = !isCritical && !isDanger && stress >= threshold1;

      let stressStateLabel = `KO: ${ko}`;
      if (isCritical) stressStateLabel = '💀 Zusammenbruch!';
      else if (isDanger) stressStateLabel = '❤ Betäubung II';
      else if (isWarn)   stressStateLabel = '⚠ Betäubung I';

      return {
        id: a.id,
        name: a.name,
        ko,
        stress,
        stressPercent,
        threshold1,
        threshold2,
        isCritical,
        isDanger,
        isWarn,
        stressStateLabel
      };
    });

    // NPCs & Relationships
    const npcs = await dataApi.getNpcs() || [];
    const npcRelationships = npcs.map(n => {
      const attitude = state.get(`academy.social.global.${n.id}`) || 0;
      let status = "Neutral";
      let statusClass = "neutral";
      if (attitude >= 10) { status = "Freundlich"; statusClass = "friendly"; }
      if (attitude >= 20) { status = "Verbündet"; statusClass = "ally"; }
      if (attitude <= -5) { status = "Abweisend"; statusClass = "wary"; }
      if (attitude <= -15) { status = "Feindselig"; statusClass = "hostile"; }
      
      return {
        id: n.id,
        name: n.name,
        attitude,
        status,
        statusClass
      };
    });

    return {
      globalHeat,
      globalHeatPercent: Math.min(100, (globalHeat / 20) * 100),
      inquisitionLevel,
      inqPercent: Math.min(100, (inquisitionLevel / 15) * 100),
      actors,
      npcRelationships,
      isGM: game.user.isGM
    };
  }

  static async _onRefresh() {
    this.render();
  }

  static async _onAdjustHeat(event, target) {
    const delta = parseInt(target.dataset.delta);
    const state = game.janus7.core.state;
    const current = state.get('academy.punin.heat') || 0;
    await state.set('academy.punin.heat', Math.max(0, current + delta));
    this.render();
  }

  static async _onModifyStress(event, target) {
    const actorId = target.dataset.actorId;
    const delta = parseInt(target.dataset.delta);
    const state = game.janus7.core.state;
    const current = state.get(`academy.actors.${actorId}.stress`) || 0;
    await state.set(`academy.actors.${actorId}.stress`, Math.max(0, current + delta));
    this.render();
  }

  static async _onAdjustAttitude(event, target) {
    const npcId = target.dataset.npcId;
    const delta = parseInt(target.dataset.delta);
    const state = game.janus7.core.state;
    const current = state.get(`academy.social.global.${npcId}`) || 0;
    await state.set(`academy.social.global.${npcId}`, current + delta);
    this.render();
  }

  static async _onDistributeRumor(event, target) {
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
