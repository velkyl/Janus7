import { emitHook, HOOKS } from '../../../core/hooks/emitter.js';
/**
 * @fileoverview JANUS7 Event Engine - Dynamic event system with conditional options
 * @module academy/events/event-engine
 * @since 0.6.0
 *  Versionsstand wird zentral über module.json geführt.
 * @phase 4b
 */

/**
 * Event Engine for managing dynamic events with conditional options.
 * 
 * Events can be:
 * - Spawned from pools (random selection based on conditions)
 * - Presented to actors with available options
 * - Processed when actors select options
 * 
 * @class JanusEventsEngineExtended
 * @example
 * const eventEngine = new JanusEventsEngineExtended({
 *   state: game.janus7.core.state,
 *   logger: game.janus7.core.logger,
 *   academyData: game.janus7.academy.data,
 *   calendar: game.janus7.academy.calendar,
 *   conditions: game.janus7.academy.conditions,
 *   effects: game.janus7.academy.effects
 * });
 */
export class JanusEventsEngineExtended {
  /**
   * Create an Event Engine instance.
   * 
   * @param {Object} deps - Dependencies (injected)
   * @param {JanusStateCore} deps.state - State manager from Phase 1
   * @param {JanusLogger} deps.logger - Logger from Phase 1
   * @param {AcademyData} deps.academyData - Academy data API from Phase 2
   * @param {JanusCalendarEngine} deps.calendar - Calendar engine from Phase 4
   * @param {JanusConditionEvaluator} deps.conditions - Condition evaluator (Phase 4b)
   * @param {JanusEffectAdapter} deps.effects - Effect adapter (Phase 4b)
   */
  constructor({ state, logger, academyData, calendar, conditions, effects }) {
    this.state = state;
    this.logger = logger;
    this.academyData = academyData;
    this.calendar = calendar;
    this.conditions = conditions;
    this.effects = effects;
  }

  _getEvent(eventId) {
    const id = String(eventId ?? '').trim();
    return this.academyData?.content?.by?.event?.get?.(id)
      ?? this.academyData?.getEvent?.(id)
      ?? null;
  }

  _getPool(poolName) {
    const id = String(poolName ?? '').trim();
    return this.academyData?.content?.by?.pool?.get?.(id)
      ?? this.academyData?.getPoolIndex?.()?.find?.((p) => String(p?.poolId ?? '') === id)
      ?? null;
  }

  _getOptionsForEvent(eventId) {
    const id = String(eventId ?? '').trim();
    const fromRegistry = this.academyData?.content?.by?.optionsByParent?.get?.(`event:${id}`);
    if (Array.isArray(fromRegistry) && fromRegistry.length) return fromRegistry;
    return this.academyData?.getOptionsForParent?.('event', id) ?? [];
  }

  _eventStatePath(actorId, eventId) {
    const actorKey = String(actorId ?? 'global').replace(/[^A-Za-z0-9_.:-]/g, '_');
    return `academy.eventStates.${actorKey}.${eventId}`;
  }

  /**
   * Spawn a random event from a pool.
   * 
   * Evaluates trigger conditions for all events in the pool and randomly
   * selects one eligible event.
   * 
   * @param {string} poolName - Pool identifier (e.g., 'exploration', 'social_minor')
   * @param {Object} options - Spawn options
   * @param {string} options.actorId - Actor UUID for condition evaluation
   * @returns {Promise<Object|null>} Selected event or null if no eligible events
   * 
   * @example
   * const event = await eventEngine.spawnFromPool('exploration', {
   *   actorId: 'Actor.xyz123'
   * });
   * // event: { eventId: 'E_LIBRARY_DISCOVER', title: '...', ... }
   */
  async spawnFromPool(poolName, { actorId }) {
    const pool = this._getPool(poolName);
    
    if (!pool) {
      this.logger?.warn?.(`Unknown pool: ${poolName}`);
      return null;
    }

    const candidates = [];
    
    for (const eventId of pool.events || []) {
      const event = this._getEvent(eventId);
      
      if (!event) {
        continue;
      }

      const canTrigger = await this.conditions.evaluate(
        event.triggerExpr || '',
        { actorId }
      );
      
      if (canTrigger) {
        candidates.push(event);
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    
    this.logger?.info?.('Event spawned', { 
      pool: poolName, 
      eventId: selected.eventId 
    });
    
    return selected;
  }

  /**
   * Present an event to an actor with available options.
   * 
   * Filters options based on requirement expressions and returns only
   * those the actor can select.
   * 
   * @param {string} eventId - Event identifier
   * @param {Object} options - Presentation options
   * @param {string} options.actorId - Actor UUID
   * @returns {Promise<Object>} Event with filtered options
   * @throws {Error} If event is not found
   * @fires janus7EventShown
   * 
   * @example
   * const presentation = await eventEngine.presentEvent('E_LIBRARY_DISCOVER', {
   *   actorId: 'Actor.xyz123'
   * });
   * // presentation: { event: {...}, options: [{...}, {...}] }
   */
  async presentEvent(eventId, { actorId }) {
    const event = this._getEvent(eventId);
    
    if (!event) {
      throw new Error(`Unknown event: ${eventId}`);
    }

    const allOptions = this._getOptionsForEvent(eventId);
    
    const availableOptions = [];
    
    for (const opt of allOptions) {
      const canSelect = await this.conditions.evaluate(
        opt.reqExpr || '',
        { actorId }
      );
      
      if (canSelect) {
        availableOptions.push(opt);
      }
    }

    emitHook(HOOKS.EVENT_SHOWN, { eventId, actorId, event });
    
    return { event, options: availableOptions };
  }

  /**
   * Process an actor's selection of an event option.
   * 
   * Validates requirements, executes checks if present, applies effects,
   * and records the selection in state.
   * 
   * @param {string} optionId - Option identifier
   * @param {Object} options - Selection options
   * @param {string} options.actorId - Actor UUID
   * @param {string} [options.source='event'] - Source context for effects
   * @returns {Promise<Object>} Selection result with success status and effects
   * @throws {Error} If option is not found
   * @fires janus7EventOptionSelected
   * 
   * @example
   * const result = await eventEngine.selectOption('OPT_INVESTIGATE', {
   *   actorId: 'Actor.xyz123'
   * });
   * // result: { success: true, effects: {...}, nextNodeId: 'QN_NEXT' }
   */
  async selectOption(optionId, { actorId, source = 'event' }) {
    const option = this.academyData?.content?.by?.option?.get?.(optionId) ?? this.academyData?.getOption?.(optionId) ?? null;
    
    if (!option) {
      throw new Error(`Unknown option: ${optionId}`);
    }

    // Validate requirements
    const canSelect = await this.conditions.evaluate(
      option.reqExpr || '',
      { actorId }
    );
    
    if (!canSelect) {
      return { success: false, reason: 'requirements_not_met' };
    }

    // Execute check if present
    if (option.checkExpr) {
      const checkPassed = await this.conditions.evaluate(
        option.checkExpr,
        { actorId }
      );
      
      if (!checkPassed) {
        return { success: false, reason: 'check_failed' };
      }
    }

    // Apply effects
    const effectResult = await this.effects.applyEffects(
      option.effectIds || [],
      {
        actorId,
        source,
        reason: `Selected option ${optionId}`
      }
    );

    // Record selection in state
    await this.state.transaction(() => {
      this.state.set(this._eventStatePath(actorId, option.parentId), {
        shown: true,
        selectedOption: optionId,
        timestamp: new Date().toISOString(),
        source
      });
    });

    emitHook(HOOKS.EVENT_OPTION_SELECTED, {
      optionId,
      eventId: option.parentId,
      actorId,
      effects: effectResult
    });

    return {
      success: true,
      effects: effectResult.changes,
      nextNodeId: option.nextNodeId
    };
  }
}
