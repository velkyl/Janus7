import { HOOKS } from "../../core/hooks/topics.js";
import {
  JanusAssignmentSimulationEngine,
  JanusFactionSimulationEngine,
  JanusRumorSimulationEngine,
  JanusSanctuarySimulationEngine,
  JanusSocialRelationshipSimulationEngine,
  JanusLivingWorldScheduler
} from "../../academy/living-world.js";
import { cleanupEngineHookBucket, registerEngineHook, registerRuntimeHook } from "../../core/hooks/runtime.js";

registerRuntimeHook('janus7:ready:living-world', HOOKS.ENGINE_READY, async (engine) => {
  const logger = engine?.core?.logger ?? console;
  try {
    const state = engine?.core?.state;
    const academyData = engine?.academy?.data;
    const calendar = engine?.academy?.calendar ?? engine?.simulation?.calendar ?? engine?.calendar;
    if (!state || !academyData || !calendar) {
      logger?.warn?.("[JANUS7] Living World skipped: state/academyData/calendar missing.");
      return;
    }

    const assignmentEngine = new JanusAssignmentSimulationEngine({ state, academyData, logger });
    const factionEngine = new JanusFactionSimulationEngine({ state, academyData, logger });
    const rumorEngine = new JanusRumorSimulationEngine({ state, academyData, calendar, logger });
    const sanctuaryEngine = new JanusSanctuarySimulationEngine({ state, academyData, logger });
    const socialDynamicsEngine = new JanusSocialRelationshipSimulationEngine({ state, academyData, social: engine?.academy?.social ?? engine?.simulation?.social ?? engine?.social, logger });
    const scheduler = new JanusLivingWorldScheduler({
      state, academyData, calendar, logger, assignmentEngine, factionEngine, rumorEngine, sanctuaryEngine, socialDynamicsEngine
    });

    engine.academy = engine.academy ?? {};
    engine.simulation = engine.simulation ?? {};
    engine.academy.livingWorld = { assignmentEngine, factionEngine, rumorEngine, sanctuaryEngine, socialDynamicsEngine, scheduler };
    engine.simulation.livingWorld = engine.academy.livingWorld;
    engine.livingWorld = engine.academy.livingWorld;

    cleanupEngineHookBucket(engine, '_livingWorldHookIds');
    registerEngineHook(engine, '_livingWorldHookIds', HOOKS.DATE_CHANGED, async (payload) => {
      try {
        await scheduler.onDateChanged(payload);
        await state.save?.();
      } catch (err) {
        logger?.warn?.("[JANUS7] Living World tick error", { message: err?.message });
      }
    });

    logger?.info?.("[JANUS7] Living World registered.");
  } catch (err) {
    logger?.warn?.("[JANUS7] Living World init failed", { message: err?.message, stack: err?.stack });
  }
});
