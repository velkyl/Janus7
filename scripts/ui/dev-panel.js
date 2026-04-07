import { moduleTemplatePath } from '../core/public-api.mjs';
/**
 * Developer Panel - Testing & Debug Interface
 */

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class JanusDevPanel extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'janus7-dev-panel',
    tag: 'div',
    window: {
      title: 'Quest System Developer Panel',
      resizable: true
    },
    position: {
      width: 700,
      height: 600
    },
    actions: {
      spawnEvent: this._onSpawnEvent,
      startQuest: this._onStartQuest,
      applyEffect: this._onApplyEffect,
      resetState: this._onResetState,
      exportState: this._onExportState
    }
  };

  static PARTS = {
    content: {
      template: moduleTemplatePath('templates/quest-system/dev-panel.hbs'),
      scrollable: ['.dev-content']
    }
  };

  async _prepareContext(options) {
    const actor = game.user.character || game.actors.find(a => a.type === 'character');
    const actorId = actor?.uuid;

    const content = game.janus7?.academy?.data?.content;
    const state = game.janus7?.core?.state;

    let playerState = null;
    let questStates = null;
    let eventStates = null;

    if (state && actorId) {
      const playerStateRoot = state.get('playerState') || {};
      const questStatesRoot = state.get('questStates') || state.get('academy.quests') || {};
      const eventStatesRoot = state.get('eventStates') || {};
      playerState = playerStateRoot?.[actorId] || {};
      questStates = questStatesRoot?.[actorId] || {};
      eventStates = eventStatesRoot?.[actorId] || {};
    }

    return {
      hasActor: !!actor,
      actor: actor?.name,
      actorId,
      pools: content?.pools || [],
      quests: content?.quests || [],
      effects: content?.effects || [],
      playerState: JSON.stringify(playerState, null, 2),
      questStates: JSON.stringify(questStates, null, 2),
      eventStates: JSON.stringify(eventStates, null, 2),
      systemStatus: {
        contentLoaded: !!content,
        questEngine: !!game.janus7?.academy?.quests,
        eventEngine: !!game.janus7?.academy?.events,
        effectEngine: !!game.janus7?.academy?.effects
      }
    };
  }

  static async _onSpawnEvent(event, target) {
    const poolName = target.closest('[data-pool-name]')?.dataset.poolName;
    const actorId = target.dataset.actorId;

    if (!poolName || !actorId) return;

    try {
      const spawnedEvent = await game.janus7.academy.events.spawnFromPool(poolName, {
        actorId
      });

      if (spawnedEvent) {
        ui.notifications.info(`Event spawned: ${spawnedEvent.eventId}`);
        
        // Auto-open event popup
        const result = await game.janus7.academy.events.presentEvent(
          spawnedEvent.eventId,
          {actorId}
        );
        
        new CONFIG.janus7Quest.ui.EventPopup({
          eventId: spawnedEvent.eventId,
          actorId,
          event: result.event,
          options: result.options
        }).render(true);
      } else {
        ui.notifications.warn('Kein Event spawned (Conditions nicht erfüllt)');
      }
    } catch (err) {
      ui.notifications.error(`Fehler: ${err.message}`);
    }
  }

  static async _onStartQuest(event, target) {
    const questId = target.closest('[data-quest-id]')?.dataset.questId;
    const actorId = target.dataset.actorId;

    if (!questId || !actorId) return;

    try {
      await game.janus7.academy.quests.startQuest(questId, {actorId});
      ui.notifications.info(`Quest gestartet: ${questId}`);
      this.render();
    } catch (err) {
      ui.notifications.error(`Fehler: ${err.message}`);
    }
  }

  static async _onApplyEffect(event, target) {
    const effectId = target.closest('[data-effect-id]')?.dataset.effectId;
    const actorId = target.dataset.actorId;

    if (!effectId || !actorId) return;

    try {
      const result = await game.janus7.academy.effects.applyEffects([effectId], {
        actorId,
        source: 'dev-panel'
      });

      if (result.success) {
        const changes = result.changes.map(c => 
          `${c.path}: ${c.newValue}`
        ).join(', ');
        ui.notifications.info(`Effect applied: ${changes}`);
        this.render();
      }
    } catch (err) {
      ui.notifications.error(`Fehler: ${err.message}`);
    }
  }

  static async _onResetState(event, target) {
    const actorId = target.dataset.actorId;
    if (!actorId) return;

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: 'State zurücksetzen?' },
      content: '<p>Alle Quest- und Event-States werden gelöscht!</p>'
    });

    if (!confirmed) return;

    try {
      await game.janus7.director.resetActorQuestEventState(actorId);
      
      ui.notifications.info('State zurückgesetzt');
      this.render();
    } catch (err) {
      ui.notifications.error(`Fehler: ${err.message}`);
    }
  }

  static async _onExportState(event, target) {
    const actorId = target.dataset.actorId;
    if (!actorId) return;

    const state = {
      playerState: game.janus7.core.state.get('playerState', actorId),
      questStates: game.janus7.core.state.get('questStates', actorId) || game.janus7.core.state.get('academy.quests', actorId),
      eventStates: game.janus7.core.state.get('eventStates', actorId)
    };

    const json = JSON.stringify(state, null, 2);
    
    foundry.applications.api.DialogV2.wait({
      window: { title: 'Export State' },
      content: `<textarea style="width:100%;height:400px;font-family:monospace;">${json}</textarea>`,
      buttons: [
        {
          action: 'copy',
          label: 'Copy to Clipboard',
          callback: () => {
            navigator.clipboard.writeText(json);
            ui.notifications.info('State kopiert!');
          }
        },
        { action: 'close', label: 'Schließen' }
      ],
      rejectClose: false,
    }).catch(() => {});
  }
}
