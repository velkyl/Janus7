/**
 * @fileoverview JANUS7 Condition Evaluator - Expression-based condition system
 * @module academy/conditions/condition-evaluator
 * @since 0.6.0
 *  Versionsstand wird zentral über module.json geführt.
 * @phase 4b
 */

import { parseExpr, evalAst, parseCheckExpr } from '../content/expression/parser.js';

/**
 * Evaluates conditional expressions for quests, events, and game logic.
 * 
 * Supports two expression types:
 * 1. Logical expressions: `playerState.skills.lore >= 2 AND playerState.energy > 5`
 * 2. DSA5 checks: `CHECK(Magiekunde, 15)` - execute DSA5 skill roll
 * 
 * @class JanusConditionEvaluator
 * @example
 * const evaluator = new JanusConditionEvaluator({
 *   contextProvider: game.janus7.academy.conditions.contextProvider,
 *   dsa5Bridge: game.janus7.dsa5,
 *   logger: game.janus7.core.logger
 * });
 * 
 * // Evaluate logical expression
 * const canEnter = await evaluator.evaluate(
 *   'playerState.skills.lore >= 2',
 *   { actorId: 'Actor.xyz' }
 * );
 * 
 * // Evaluate DSA5 check
 * const checkPassed = await evaluator.evaluate(
 *   'CHECK(Magiekunde, 15)',
 *   { actorId: 'Actor.xyz' }
 * );
 */
export class JanusConditionEvaluator {
  /**
   * Create a Condition Evaluator instance.
   * 
   * @param {Object} deps - Dependencies (injected)
   * @param {JanusConditionContextProvider} deps.contextProvider - Context builder
   * @param {DSA5SystemBridge} deps.dsa5Bridge - DSA5 bridge from Phase 3
   * @param {JanusLogger} deps.logger - Logger from Phase 1
   */
  constructor({ contextProvider, dsa5Bridge, logger }) {
    this.contextProvider = contextProvider;
    this.dsa5Bridge = dsa5Bridge;
    this.logger = logger;

    /**
     * Mapping of human-readable talent names to DSA5 system IDs.
     * 
     * @type {Map<string, string>}
     * @example
     * talentMap.get('Magiekunde') // returns 'skill_magicallore'
     */
    this.talentMap = new Map([
      ['Magiekunde', 'skill_magicallore'],
      ['Alchimie', 'skill_alchemy']
    ]);
  }

  /**
   * Evaluate a conditional expression.
   * 
   * Automatically detects expression type:
   * - DSA5 checks: `CHECK(TalentName, DC)`
   * - Logical expressions: `playerState.prop OP value`
   * 
   * Empty expressions always return true (no requirements).
   * 
   * @param {string} expr - Expression to evaluate
   * @param {Object} options - Evaluation options
   * @param {string} options.actorId - Actor UUID for context building
   * @returns {Promise<boolean>} True if condition is met, false otherwise
   * 
   * @example
   * // Logical expression
   * await evaluator.evaluate('playerState.skills.lore >= 2', { actorId: 'Actor.xyz' });
   * 
   * // DSA5 check
   * await evaluator.evaluate('CHECK(Magiekunde, 15)', { actorId: 'Actor.xyz' });
   * 
   * // Empty (always true)
   * await evaluator.evaluate('', { actorId: 'Actor.xyz' }); // returns true
   */
  async evaluate(expr, { actorId }) {
    // Empty expressions = no requirements
    if (!expr || expr.trim() === '') {
      return true;
    }

    // Build evaluation context (player state, calendar, etc.)
    const context = this.contextProvider.buildContext(actorId);

    try {
      // Try parsing as DSA5 check first
      const checkResult = parseCheckExpr(expr);
      
      if (checkResult) {
        return await this._evaluateCheck(checkResult, actorId);
      }

      // Otherwise, parse as logical expression
      const ast = parseExpr(expr);
      return evalAst(ast, context);

    } catch (err) {
      this.logger?.error?.('Expression evaluation failed', {
        expr,
        err: err.message
      });
      return false;
    }
  }

  /**
   * Execute a DSA5 talent check (internal).
   * 
   * Converts talent name to system ID, executes roll via DSA5 Bridge,
   * and interprets result (QL >= 1 = success).
   * 
   * @private
   * @param {Object} checkAst - Parsed check AST from parser
   * @param {string} checkAst.key - Talent name (e.g., 'Magiekunde')
   * @param {number} checkAst.dc - Difficulty class
   * @param {string} actorId - Actor UUID
   * @returns {Promise<boolean>} True if check succeeds (QL >= 1)
   * 
   * @example
   * // Internal call from evaluate()
   * const result = await this._evaluateCheck(
   *   { key: 'Magiekunde', dc: 15 },
   *   'Actor.xyz'
   * );
   */
  async _evaluateCheck(checkAst, actorId) {
    const { key, dc } = checkAst;

    // Resolve talent name to system ID
    const talentId = this.talentMap.get(key);
    
    if (!talentId) {
      this.logger?.warn?.(`Unknown talent: ${key}`);
      return false;
    }

    try {
      // Execute roll via DSA5 Bridge (Phase 3)
      const result = await this.dsa5Bridge.roll({
        actorId,
        talentId,
        difficulty: dc || 0
      });

      const success = result.qualityLevel >= 1;

      this.logger?.info?.('CHECK executed', {
        talent: key,
        dc,
        success,
        qL: result.qualityLevel
      });

      return success;

    } catch (err) {
      this.logger?.error?.('CHECK failed', {
        key,
        dc,
        err: err.message
      });
      return false;
    }
  }
}
