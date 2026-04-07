import { HOOKS, emitHook, cleanupEngineHookBucket, registerEngineHook, registerRuntimeHook } from '../core/public-api.mjs';
import { JanusRuleEvaluator } from '../../academy/rule-evaluator.js';
import { JanusResourcesEngine } from '../../academy/resources-engine.js';
import { JanusSocialEngine } from '../../academy/social-engine.js';
import { JanusMilestoneEngine } from '../../academy/milestone-engine.js';
import { JanusCollectionEngine } from '../../academy/collection-engine.js';
import { JanusActivityEngine } from '../../academy/activity-engine.js';

registerRuntimeHook('janus7:ready:academy-progression', HOOKS.ENGINE_READY, async (engine) => {
  const logger = engine?.core?.logger ?? console;
  try {
    const calendar = engine?.academy?.calendar ?? engine?.simulation?.calendar ?? engine?.calendar;
    const dsa5Bridge = engine?.bridge?.dsa5 ?? engine?.dsa5 ?? null;
    if (!state || !academyData) {
      logger?.warn?.('[JANUS7] Academy Progression skipped: state/academyData missing.');
      return;
    }
    const ruleEvaluator = new JanusRuleEvaluator({ state, calendar, academyData, dsa5Bridge, logger });
    const resourcesEngine = new JanusResourcesEngine({ state, academyData, logger });
    const socialEngine = new JanusSocialEngine({ state, academyData, ruleEvaluator, logger });
    const milestoneEngine = new JanusMilestoneEngine({ state, academyData, ruleEvaluator, logger });
    const collectionEngine = new JanusCollectionEngine({ state, academyData, ruleEvaluator, resourcesEngine, logger });
    const activityEngine = new JanusActivityEngine({ state, academyData, dsa5Bridge, resourcesEngine, logger });

    await resourcesEngine.ensureDefaults();
    await state.save?.();

    engine.academy.progression = { ruleEvaluator, resourcesEngine, socialEngine, milestoneEngine, collectionEngine, activityEngine };
    engine.progression = engine.academy.progression;

    let _defaultsEnsured = true;

    cleanupEngineHookBucket(engine, '_progressionHookIds');
    registerEngineHook(engine, '_progressionHookIds', HOOKS.DATE_CHANGED, async ({ current } = {}) => {
      try {
        if (!_defaultsEnsured) {
          await resourcesEngine.ensureDefaults();
          _defaultsEnsured = true;
        }
        await resourcesEngine.checkThresholds();
        await socialEngine.evaluateForActor('party');
        const milestoneResults = await milestoneEngine.evaluateAll();
        await state.save?.();
        emitHook(HOOKS.PROGRESSION_TICK, { week: current?.week ?? null, milestoneResults });
        logger?.debug?.('[JANUS7] Academy Progression tick processed.', { week: current?.week ?? null });
      } catch (tickErr) {
        logger?.warn?.('[JANUS7] Academy Progression tick error', { message: tickErr?.message });
      }
    });

    logger?.info?.('[JANUS7] Academy Progression registered.');
  } catch (err) {
    logger?.warn?.('[JANUS7] Academy Progression init failed', { message: err?.message });
  }
});
