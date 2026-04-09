/**
 * @file ui/commands/quest.js
 * @module janus7/ui/commands
 * @phase 6
 *
 * Quest commands for JANUS7 Command Center.
 */

import { _checkPermission, _engine, _wrap, JanusUI } from './_shared.js';
import { STATE_PATHS } from '../../core/common.js';

export const questCommands = {

  // =========================================================================
  // SPRINT 2 COMMANDS - Quest Engine
  // =========================================================================

  /**
   * Start a quest for an actor
   */
  async startQuest(dataset = {}) {
    if (!_checkPermission('startQuest')) return { success: false, cancelled: true };
    
    const engine = _engine();
    if (!engine?.academy?.quests) throw new Error('Quest Engine not available');
    
    const questId = dataset.questId || await JanusUI.prompt({ 
      title: 'Start Quest', 
      label: 'Quest ID', 
      defaultValue: 'Q_DEMO_LIBRARY' 
    });
    let actorId = dataset.actorId || game.user.character?.uuid;
    if (!actorId) {
      actorId = await JanusUI.prompt({
        title: 'Start Quest',
        label: 'Actor UUID',
        defaultValue: ''
      });
    }
    
    if (!questId || !actorId) return { cancelled: true };
    
    return await _wrap('startQuest', async () => {
      const result = await engine.academy.quests.startQuest(questId, { actorId });
      ui.notifications.info(`Quest started: ${questId}`);
      return result;
    });
  },

  /**
   * Spawn a random event from a configured pool and open it immediately.
   */
  async spawnEventFromPool(dataset = {}) {
    if (!_checkPermission('spawnEventFromPool')) return { success: false, cancelled: true };

    const engine = _engine();
    if (!engine?.academy?.events) throw new Error('Event Engine not available');

    const poolId = dataset.poolId || await JanusUI.prompt({
      title: 'Spawn Event Pool',
      label: 'Pool ID',
      defaultValue: ''
    });
    let actorId = dataset.actorId || game.user.character?.uuid;
    if (!actorId) {
      actorId = await JanusUI.prompt({
        title: 'Spawn Event Pool',
        label: 'Actor UUID',
        defaultValue: ''
      });
    }

    if (!poolId || !actorId) return { cancelled: true };

    return await _wrap('spawnEventFromPool', async () => {
      const event = await engine.academy.events.spawnFromPool(poolId, { actorId });
      if (!event) {
        ui.notifications.info(`Kein ausloesbares Event in Pool: ${poolId}`);
        return { success: true, spawned: false, poolId, actorId };
      }

      const open = game.janus7Quest?.showEvent;
      const eventId = event?.eventId ?? event?.id ?? null;
      if (eventId && typeof open === 'function') open(eventId, actorId);

      ui.notifications.info(`Event aus Pool gestartet: ${event?.title ?? eventId ?? poolId}`);
      return { success: true, spawned: true, poolId, actorId, eventId, event };
    });
  },

  /**
   * Complete a quest
   */
  async completeQuest(dataset = {}) {
    if (!_checkPermission('completeQuest')) return { success: false, cancelled: true };
    
    const engine = _engine();
    if (!engine?.academy?.quests) throw new Error('Quest Engine not available');
    
    const questId = dataset.questId || await JanusUI.prompt({ 
      title: 'Complete Quest', 
      label: 'Quest ID' 
    });
    const actorId = dataset.actorId || game.user.character?.uuid;
    
    if (!questId || !actorId) return { cancelled: true };
    
    return await _wrap('completeQuest', async () => {
      const result = await engine.academy.quests.completeQuest(questId, { actorId });
      ui.notifications.info(`Quest completed: ${questId}`);
      return result;
    });
  },

  /**
   * List active quests
   */
  async listActiveQuests(dataset = {}) {
    if (!_checkPermission('listActiveQuests')) return { success: false, cancelled: true };
    
    const engine = _engine();
    if (!engine?.academy?.quests) throw new Error('Quest Engine not available');
    
    const actorId = dataset.actorId || game.user.character?.uuid;
    
    return await _wrap('listActiveQuests', async () => {
      // Check if listQuests method exists
      if (typeof engine.academy.quests.listQuests !== 'function') {
        // Fallback: read directly from canonical quest state shape (actorId -> questId -> questState)
        const questRoot = engine.core.state.get(STATE_PATHS.ACADEMY_QUESTS)
          || engine.core.state.get(STATE_PATHS.QUEST_STATES)
          || {};
        const actorQuests = actorId ? (questRoot[actorId] || {}) : {};
        const activeQuests = Object.entries(actorQuests)
          .filter(([, q]) => q?.status === 'active')
          .map(([questId, q]) => ({ questId, ...q }));
        console.table(activeQuests);
        ui.notifications.info(`Active Quests: ${activeQuests.length}`);
        return { quests: activeQuests };
      }
      
      const quests = await engine.academy.quests.listQuests({ actorId, status: 'active' });
      console.table(quests);
      ui.notifications.info(`Active Quests: ${quests.length}`);
      return { quests };
    });
  },

  /**
   * Export quests to JSON
   */
  async exportQuests(_dataset = {}) {
    if (!_checkPermission('exportQuests')) return { success: false, cancelled: true };
    
    const engine = _engine();
    
    return await _wrap('exportQuests', async () => {
      const questState = engine.core.state.get(STATE_PATHS.QUEST_STATES) || engine.core.state.get(STATE_PATHS.ACADEMY_QUESTS) || {};
      const exported = JSON.stringify(questState, null, 2);
      
      const blob = new globalThis.Blob([exported], { type: 'application/json' });
      const url = globalThis.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `janus7-quests-${Date.now()}.json`;
      a.click();
      globalThis.URL.revokeObjectURL(url);
      
      ui.notifications.info('Quests exported');
      return { exported: true, size: exported.length };
    });
  },

  /**
   * Import quests from JSON
   */
  async importQuests(_dataset = {}) {
    if (!_checkPermission('importQuests')) return { success: false, cancelled: true };
    
    const engine = _engine();
    
    return await _wrap('importQuests', async () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      const file = await new Promise((resolve) => {
        input.onchange = (e) => resolve(e.target.files[0]);
        input.click();
      });
      
      if (!file) return { cancelled: true };
      
      const text = await file.text();
      const questData = JSON.parse(text);
      
      // UI should not persist state directly; route through the Director.
      await engine.core.director.set(STATE_PATHS.QUEST_STATES, questData, { save: true, forceSave: true });
      
      ui.notifications.info('Quests imported');
      return { imported: true, file: file.name };
    });
  },


  /**
   * Open the Quest Journal UI.
   */
  async openQuestJournal(_dataset = {}) {
    if (!_checkPermission('openQuestJournal')) return { success: false, cancelled: true };
    return await _wrap('openQuestJournal', async () => {
      const ctor = game.janus7Quest?.openJournal;
      if (typeof ctor === 'function') {
        ctor();
        return { opened: true };
      }
      throw new Error('Quest Journal nicht verfügbar');
    });
  },

  /**
   * Open a contextual event popup.
   */
  async openEventPopup(dataset = {}) {
    if (!_checkPermission('openEventPopup')) return { success: false, cancelled: true };
    const eventId = dataset.eventId || await JanusUI.prompt({ title: 'Event Popup', label: 'Event ID' });
    const actorId = dataset.actorId || game.user.character?.uuid;
    if (!eventId) return { cancelled: true };
    return await _wrap('openEventPopup', async () => {
      const open = game.janus7Quest?.showEvent;
      if (typeof open === 'function') {
        open(eventId, actorId);
        return { opened: true, eventId, actorId };
      }
      throw new Error('Event Popup nicht verfügbar');
    });
  },

  // =========================================================================
  // SPRINT 2 COMMANDS - Calendar
  // =========================================================================

  /**
   * Reset calendar to Week 1, Day 1
   */
};
