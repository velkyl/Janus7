import { emitHook, HOOKS } from '../../../core/hooks/emitter.js';
/**
 * @fileoverview JANUS7 Quest Engine - Story-driven quest system with node-based progression
 * @module academy/quests/quest-engine
 * @since 0.6.0
 *  Versionsstand wird zentral über module.json geführt.
 * @phase 4b
 */

/**
 * Quest Engine for managing story-driven quests with node-based progression.
 * 
 * Quests consist of nodes that can be:
 * - Events (trigger a specific event)
 * - Checks (evaluate conditions, branch on success/failure)
 * - Effects (apply state changes)
 * 
 * @class JanusQuestEngine
 * @example
 * const questEngine = new JanusQuestEngine({
 *   state: game.janus7.core.state,
 *   logger: game.janus7.core.logger,
 *   academyData: game.janus7.academy.data,
 *   events: game.janus7.academy.events,
 *   conditions: game.janus7.academy.conditions,
 *   effects: game.janus7.academy.effects
 * });
 * 
 * // Start a quest
 * await questEngine.startQuest('Q_DEMO_LIBRARY', { actorId: 'Actor.xyz123' });
 */
export class JanusQuestEngine {
  /**
   * Create a Quest Engine instance.
   * 
   * @param {Object} deps - Dependencies (injected)
   * @param {JanusStateCore} deps.state - State manager from Phase 1
   * @param {JanusLogger} deps.logger - Logger from Phase 1
   * @param {AcademyData} deps.academyData - Academy data API from Phase 2
   * @param {JanusEventsEngine} deps.events - Event engine (Phase 4b)
   * @param {JanusConditionEvaluator} deps.conditions - Condition evaluator (Phase 4b)
   * @param {JanusSocialEngine} [deps.social] - Social engine (Phase 4)
   * @param {JanusScoringEngine} [deps.scoring] - Scoring engine (Phase 4)
   */
  constructor({ state, logger, academyData, events, conditions, effects, social, scoring }) {
    this.state = state;
    this.logger = logger;
    this.academyData = academyData;
    this.events = events;
    this.conditions = conditions;
    this.effects = effects;
    this.social = social;
    this.scoring = scoring;
  }

  async _getQuest(questId) {
    const id = String(questId ?? '').trim();
    return this.academyData?.content?.by?.quest?.get?.(id)
      ?? await this.academyData?.getQuest?.(id)
      ?? null;
  }

  async _getNode(nodeId, questId = null) {
    const id = String(nodeId ?? '').trim();
    const regNode = this.academyData?.content?.by?.node?.get?.(id);
    if (regNode) return regNode;
    if (questId) {
      const q = await this._getQuest(questId);
      return q?.nodes?.find?.((n) => String(n?.nodeId ?? '') === id) ?? null;
    }
    return null;
  }



  _getQuestRoot() {
    const questStates = this.state.get('academy.quests');
    return (questStates && typeof questStates === 'object' && !Array.isArray(questStates))
      ? foundry.utils.deepClone(questStates)
      : {};
  }

  _normalizeQuestRoot(root = {}) {
    const out = {};
    if (!root || typeof root !== 'object' || Array.isArray(root)) return out;
    for (const [actorId, questMap] of Object.entries(root)) {
      if (questMap && typeof questMap === 'object' && !Array.isArray(questMap)) {
        const values = Object.values(questMap);
        const looksLikeQuestMap = values.every((entry) => entry && typeof entry === 'object' && !Array.isArray(entry) && (
          Object.prototype.hasOwnProperty.call(entry, 'status')
          || Object.prototype.hasOwnProperty.call(entry, 'currentNodeId')
          || Object.prototype.hasOwnProperty.call(entry, 'startedAt')
        ));
        if (looksLikeQuestMap) {
          out[actorId] = foundry.utils.deepClone(questMap);
          continue;
        }
        for (const [nestedId, nestedQuestMap] of Object.entries(questMap)) {
          const flatActorId = `${actorId}.${nestedId}`;
          if (nestedQuestMap && typeof nestedQuestMap === 'object' && !Array.isArray(nestedQuestMap)) {
            out[flatActorId] = foundry.utils.deepClone(nestedQuestMap);
          }
        }
        continue;
      }
      out[actorId] = {};
    }
    return out;
  }

  _getQuestStatesForActor(actorId) {
    const root = this._normalizeQuestRoot(this._getQuestRoot());
    const actorKey = String(actorId ?? '').trim();
    if (!actorKey) return {};

    const direct = root[actorKey];
    if (direct && typeof direct === 'object' && !Array.isArray(direct)) return foundry.utils.deepClone(direct);

    const nested = foundry.utils.getProperty(root, actorKey);
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) return foundry.utils.deepClone(nested);

    const flattened = {};
    for (const [candidateActorId, questMap] of Object.entries(root)) {
      if (candidateActorId === actorKey || candidateActorId.endsWith(`.${actorKey}`) || actorKey.endsWith(`.${candidateActorId}`)) {
        if (questMap && typeof questMap === 'object' && !Array.isArray(questMap)) Object.assign(flattened, foundry.utils.deepClone(questMap));
      }
    }
    return flattened;
  }

  _setQuestStatesForActor(actorId, questStates) {
    const root = this._normalizeQuestRoot(this._getQuestRoot());
    const actorKey = String(actorId ?? '').trim();
    if (!actorKey) throw new Error('Quest actorId fehlt');
    const cleanStates = (questStates && typeof questStates === 'object' && !Array.isArray(questStates)) ? foundry.utils.deepClone(questStates) : {};
    if (Object.keys(cleanStates).length) root[actorKey] = cleanStates;
    else delete root[actorKey];
    this.state.set('academy.quests', foundry.utils.deepClone(root));
  }
  /**
   * Start a quest for a specific actor.
   * 
   * Creates a new quest state entry, sets initial node, and triggers the start node.
   * 
   * @param {string} questId - Quest identifier (e.g., 'Q_DEMO_LIBRARY')
   * @param {Object} options - Quest start options
   * @param {string} options.actorId - Actor UUID who starts the quest
   * @returns {Promise<Object>} The quest definition object
   * @throws {Error} If quest is not found in content registry
   * @fires janus7QuestStarted
   * 
   * @example
   * const quest = await questEngine.startQuest('Q_DEMO_LIBRARY', {
   *   actorId: 'Actor.abc123'
   * });
   */
  async startQuest(questId, { actorId }) {
    const quest = await this._getQuest(questId);
    
    if (!quest) {
      throw new Error(`Unknown quest: ${questId}`);
    }

    await this.state.transaction(() => {
      const questStates = this._getQuestStatesForActor(actorId);
      
      // Absoluten Tag-Index für Fristberechnung sichern (wenn calendar verfügbar)
      let startDayAbsolute = null;
      try {
        const cal = this.academyData?._engine?.academy?.calendar
          ?? globalThis.game?.janus7?.academy?.calendar
          ?? globalThis.game?.janus7?.calendar;
        const slotRef = cal?.getCurrentSlotRef?.();
        startDayAbsolute = slotRef?.dayIndex ?? null;
      } catch (_) { /* optional — kein Blocker */ }

      questStates[questId] = {
        status: 'active',
        currentNodeId: quest.startNodeId,
        history: [],
        startedAt: new Date().toISOString(),
        startDayAbsolute,
      };
      
      this._setQuestStatesForActor(actorId, questStates);
    });

    // Persist immediately – transaction marks dirty but does not save.
    try { await this.state.save?.({ force: false }); } catch (e) { this.logger?.warn?.('Quest: state.save failed', e); }

    this.logger?.info?.('Quest started', { questId, actorId });
    emitHook(HOOKS.QUEST_STARTED, { questId, actorId, quest });

    const triggerResult = await this._triggerNode(questId, quest.startNodeId, { actorId });

    return {
      ...foundry.utils.deepClone(quest),
      questId: quest.questId ?? questId,
      startNodeId: quest.startNodeId ?? null,
      actorId,
      triggerResult: triggerResult ?? null
    };
  }

  /**
   * Trigger a specific quest node (internal).
   * 
   * Evaluates node requirements, handles failforward, and executes node action.
   * 
   * @private
   * @param {string} questId - Quest identifier
   * @param {string} nodeId - Node identifier
   * @param {Object} options - Node trigger options
   * @param {string} options.actorId - Actor UUID
   * @returns {Promise<Object>} Node execution result with success status and next node
   * @throws {Error} If node is not found
   * 
   * @example
   * const result = await this._triggerNode('Q_DEMO', 'QN_START', { actorId: 'Actor.xyz' });
   * // result: { success: true, nextNodeId: 'QN_CONTINUE' }
   */
  async _triggerNode(questId, nodeId, { actorId }) {
    const node = await this._getNode(nodeId, questId);
    
    if (!node) {
      throw new Error(`Unknown node: ${nodeId}`);
    }

    // Check node requirements
    const canEnter = await this.conditions.evaluate(node.reqExpr || '', { actorId });
    
    if (!canEnter) {
      if (node.failforwardNodeId) {
        this.logger?.info?.('Node failforward', { 
          nodeId, 
          failforward: node.failforwardNodeId 
        });
        return await this._triggerNode(questId, node.failforwardNodeId, { actorId });
      }
      return { success: false, reason: 'requirements_not_met' };
    }

    // Execute node action based on type
    switch (node.type) {
      case 'event': {
        const presentation = await this.events.presentEvent(node.eventId, { actorId, questId, nodeId });
        if (node.completesQuest) {
          await this.completeQuest(questId, { actorId });
        }
        return {
          success: true,
          nodeId,
          nextNodeId: node.nextNodeId ?? null,
          event: presentation?.event ?? null,
          options: presentation?.options ?? []
        };
      }

      case 'check': {
        const checkPassed = await this.conditions.evaluate(node.checkExpr, { actorId });
        return {
          success: checkPassed,
          nextNodeId: checkPassed ? node.successNodeId : node.failureNodeId
        };
      }

      case 'effect':
        await this.effects.applyEffects(node.effectIds || [], {
          actorId,
          source: 'quest',
          reason: `Quest node ${nodeId}`
        });
        return { success: true, nextNodeId: node.nextNodeId };

      case 'reward':
        await this._applyRewards(node.rewards || {}, { actorId, source: 'quest', questId, nodeId });
        if (node.completesQuest) {
          await this.completeQuest(questId, { actorId, applyRewards: true });
        }
        return { success: true, nextNodeId: node.nextNodeId };

      default:
        return { success: false };
    }
  }

  /**
   * Progress a quest to a specific node.
   * 
   * Updates quest state, adds history entry, and triggers the new node.
   * 
   * @param {string} questId - Quest identifier
   * @param {string} nodeId - Target node identifier
   * @param {Object} options - Progress options
   * @param {string} options.actorId - Actor UUID
   * @returns {Promise<Object>} Node execution result
   * @throws {Error} If quest is not active for this actor
   * @fires janus7QuestNodeChanged
   * 
   * @example
   * await questEngine.progressToNode('Q_DEMO', 'QN_NEXT', { actorId: 'Actor.xyz' });
   */
  async progressToNode(questId, nodeId, { actorId }) {
    await this.state.transaction(() => {
      const questStates = this._getQuestStatesForActor(actorId);
      const quest = questStates[questId];
      
      if (!quest) {
        throw new Error(`Quest not active: ${questId}`);
      }

      quest.history.push({
        nodeId: quest.currentNodeId,
        timestamp: new Date().toISOString()
      });
      
      quest.currentNodeId = nodeId;
      this._setQuestStatesForActor(actorId, questStates);
    });

    try { await this.state.save?.({ force: false }); } catch (e) { this.logger?.warn?.('Quest progress: state.save failed', e); }
    emitHook(HOOKS.QUEST_NODE_CHANGED, { questId, nodeId, actorId });
    
    return await this._triggerNode(questId, nodeId, { actorId });
  }

  /**
   * Get the current state of an active quest.
   * 
   * @param {string} actorId - Actor UUID
   * @param {string} questId - Quest identifier
   * @returns {Object|undefined} Quest state or undefined if not active
   * 
   * @example
   * const questState = questEngine.getActiveQuest('Actor.xyz', 'Q_DEMO');
   * // questState: { status: 'active', currentNodeId: 'QN_START', history: [...] }
   */
  getActiveQuest(actorId, questId) {
    const questStates = this._getQuestStatesForActor(actorId);
    return questStates[questId];
  }

  /**
   * Get all quest states for a specific actor.
   *
   * Compatibility shim for UI (QuestJournal) and older command layers.
   *
   * @param {string} actorId - Actor UUID
   * @returns {Record<string, any>} Map questId -> questState
   */
  getAllQuests(actorId) {
    return this._getQuestStatesForActor(actorId);
  }

  /**
   * Mark a quest as completed.
   * 
   * Updates quest status and adds completion timestamp.
   * 
   * @param {string} questId - Quest identifier
   * @param {Object} options - Completion options
   * @param {string} options.actorId - Actor UUID
   * @param {boolean} [options.applyRewards=true] - Whether to apply quest-level rewards
   * @returns {Promise<void>}
   * @fires janus7QuestCompleted
   * 
   * @example
   * await questEngine.completeQuest('Q_DEMO', { actorId: 'Actor.xyz', applyRewards: true });
   */
  async completeQuest(questId, { actorId, applyRewards = true } = {}) {
    const questDef = await this._getQuest(questId);

    await this.state.transaction(async () => {
      const questStates = this._getQuestStatesForActor(actorId);
      const quest = questStates[questId];
      
      if (quest) {
        quest.status = 'completed';
        quest.completedAt = new Date().toISOString();
      }
      
      this._setQuestStatesForActor(actorId, questStates);

      if (applyRewards && questDef?.rewards) {
        await this._applyRewards(questDef.rewards, { actorId, source: 'quest', questId });
      }
    });

    try { await this.state.save?.({ force: false }); } catch (e) { this.logger?.warn?.('Quest complete: state.save failed', e); }

    this.logger?.info?.('Quest completed', { questId, actorId });
    emitHook(HOOKS.QUEST_COMPLETED, { questId, actorId });
  }
  /**
   * Apply rewards (internal).
   * @private
   */
  async _applyRewards(rewards = {}, { actorId, source = 'unknown', questId = null, nodeId = null }) {
    if (!rewards || typeof rewards !== 'object') return;

    // 1. Social (NPC relationship value)
    if (rewards.social && typeof rewards.social === 'object' && this.social) {
      for (const [npcId, delta] of Object.entries(rewards.social)) {
        try {
          await this.social.adjustAttitude(actorId, npcId, delta, {
            meta: { source, questId, nodeId }
          });
        } catch (err) {
          this.logger?.warn?.(`Quest: applyRewards social failed for ${npcId}`, err);
        }
      }
    }

    // 2. Scoring (Circle points)
    if (rewards.scoring && typeof rewards.scoring === 'object' && this.scoring) {
      for (const [circleId, delta] of Object.entries(rewards.scoring)) {
        try {
          // Adjust circle score
          await this.scoring.adjustCircleScore(circleId, delta, {
            actorId,
            reason: `${source}: ${questId || 'unknown'}`
          });
        } catch (err) {
          this.logger?.warn?.(`Quest: applyRewards scoring failed for ${circleId}`, err);
        }
      }
    }
  }

  /**
   * List quests, optionally filtered by actorId and/or status.
   * Shim: command layer expects this method.
   * @param {{ actorId?: string, status?: string }} [opts]
   * @returns {object[]}
   */
  listQuests({ actorId, status } = {}) {
    // Gather from canonical state: academy.quests.{actorId} or all actors
    const allQuests = [];
    try {
      const questMap = this._normalizeQuestRoot(this._getQuestRoot());
      for (const [aId, questStates] of Object.entries(questMap)) {
        if (actorId && aId !== actorId) continue;
        if (!questStates || typeof questStates !== 'object') continue;
        for (const [qId, qState] of Object.entries(questStates)) {
          if (status && qState?.status !== status) continue;
          allQuests.push({ actorId: aId, questId: qId, ...qState });
        }
      }
    } catch (err) {
      this.logger?.warn?.('Quest listQuests failed', err);
    }
    return allQuests;
  }

  /**
   * Prüft alle aktiven Quests auf Fristen und markiert abgelaufene als 'expired'.
   *
   * Fristen-Schema (in Quest-JSON):
   * ```json
   * { "deadlineDays": 7 }   // Optional: Tage ab startedAt bis Fristablauf
   * ```
   *
   * Mechanismus:
   * - `startedAt` (ISO-String) + `deadlineDays` → Deadline-Datum
   * - Aktueller Stand via `currentDayAbsolute` (Parameter aus reactor)
   * - Bei Ablauf: Status → 'expired', Hook `janus7.quest.completed` mit reason='expired'
   *
   * @param {object} [opts]
   * @param {number} [opts.currentDayAbsolute] - Absoluter Tag-Index für Vergleich
   * @returns {Promise<{expired: number, checked: number}>}
   */
  async checkQuestDeadlines({ currentDayAbsolute } = {}) {
    const activeQuests = this.listQuests({ status: 'active' });
    if (!activeQuests.length) return { expired: 0, checked: 0 };

    const now = currentDayAbsolute ?? null;
    let expired = 0;

    for (const entry of activeQuests) {
      const { actorId, questId } = entry;
      try {
        // Quest-Definition holen (enthält deadlineDays)
        const questDef = this.academyData?.content?.by?.quest?.get?.(questId) ?? await this._getQuest(questId) ?? null;
        const deadlineDays = Number(questDef?.deadlineDays ?? 0);
        if (!deadlineDays || !Number.isFinite(deadlineDays) || deadlineDays <= 0) continue;

        // startedAt → absoluter Starttag
        const startedAt = entry.startedAt ? new Date(entry.startedAt).getTime() : null;
        if (!startedAt) continue;

        // Deadline in absoluten Tagen berechnen
        let daysElapsed;
        if (now !== null) {
          // Prefer absolute day index if given
          const startDayAbsolute = entry.startDayAbsolute ?? null;
          if (startDayAbsolute !== null) {
            daysElapsed = now - startDayAbsolute;
          } else {
            // Fallback: Wall-clock-Differenz in Tagen
            daysElapsed = Math.floor((Date.now() - startedAt) / 86_400_000);
          }
        } else {
          daysElapsed = Math.floor((Date.now() - startedAt) / 86_400_000);
        }

        if (daysElapsed < deadlineDays) continue;

        // Frist abgelaufen: Status auf 'expired' setzen
        await this.state.transaction(() => {
          const questStates = this._getQuestStatesForActor(actorId);
          if (questStates[questId]?.status === 'active') {
            questStates[questId] = {
              ...questStates[questId],
              status: 'expired',
              expiredAt: new Date().toISOString(),
            };
            this._setQuestStatesForActor(actorId, questStates);
          }
        });

        emitHook(HOOKS.QUEST_COMPLETED, { questId, actorId, reason: 'expired', daysElapsed });
        this.logger?.info?.(`[JANUS7][QuestEngine] Quest abgelaufen: ${questId} (${actorId}), elapsed=${daysElapsed}d`);
        expired++;
      } catch (err) {
        this.logger?.warn?.(`[JANUS7][QuestEngine] checkQuestDeadlines Fehler bei ${questId}`, err);
      }
    }

    this.logger?.debug?.(`[JANUS7][QuestEngine] checkQuestDeadlines: ${expired} abgelaufen, ${activeQuests.length} geprüft`);
    return { expired, checked: activeQuests.length };
  }

}
