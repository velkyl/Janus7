import { DSA5ConditionBridge, JANUS_TO_DSA5_CONDITION_MAP, DSA5_CONDITION_IDS } from '../../../../bridge/dsa5/conditions.js';
import { DSA5ResolveError } from '../../../../bridge/dsa5/errors.js';

export default {
  id: 'P3-TC-15',
  title: 'DSA5ConditionBridge Contract',
  phases: [3],
  kind: 'auto',
  expected: 'DSA5ConditionBridge reads, adds, removes and maps DSA5 conditions correctly without side effects.',
  run: async (ctx) => {
    const logs = [];
    const mockLogger = {
      warn: (msg, ...args) => logs.push({ level: 'warn', msg, args }),
      info: (msg, ...args) => logs.push({ level: 'info', msg, args }),
      error: (msg, ...args) => logs.push({ level: 'error', msg, args }),
      debug: (msg, ...args) => logs.push({ level: 'debug', msg, args })
    };

    const mockResolver = {};

    let addConditionCalled = 0;
    let removeConditionCalled = 0;
    let lastAddArgs = [];
    let lastRemoveArgs = [];

    // Base mock actor
    const createMockActor = (effectsArray = []) => {
      return {
        name: 'Test Actor',
        effects: new Map(effectsArray.map((e, i) => [i, {
          name: e.name || e.id,
          uuid: e.uuid || `uuid-${i}`,
          statuses: new Set([e.id]),
          getFlag: (scope, key) => {
            if (scope === 'dsa5' && key === 'value') return e.value;
            if (scope === 'core' && key === 'statusId') return e.id;
            return null;
          }
        }])),
        addCondition: async (...args) => {
          addConditionCalled++;
          lastAddArgs = args;
        },
        removeCondition: async (...args) => {
          removeConditionCalled++;
          lastRemoveArgs = args;
        }
      };
    };

    try {
      // Test Constructor
      try {
        new DSA5ConditionBridge();
        return { ok: false, summary: 'Constructor should throw without resolver' };
      } catch (e) {
        if (!e.message.includes('Resolver')) return { ok: false, summary: 'Wrong error message in constructor' };
      }

      const bridge = new DSA5ConditionBridge({ resolver: mockResolver, logger: mockLogger });

      // 1. Reading Conditions
      const actorWithEffects = createMockActor([
        { id: DSA5_CONDITION_IDS.DEAD },
        { id: DSA5_CONDITION_IDS.INPAIN, value: 2 },
        { id: 'custom', value: 'not-a-number' } // Should handle gracefully
      ]);

      const active = bridge.getActiveConditions(actorWithEffects);
      if (active.length !== 3) return { ok: false, summary: 'getActiveConditions failed to read all effects' };

      const inpainEffect = active.find(c => c.id === DSA5_CONDITION_IDS.INPAIN);
      if (!inpainEffect || inpainEffect.value !== 2) return { ok: false, summary: 'getActiveConditions failed to read value flag' };

      if (!bridge.hasCondition(actorWithEffects, DSA5_CONDITION_IDS.DEAD)) return { ok: false, summary: 'hasCondition failed (positive)' };
      if (bridge.hasCondition(actorWithEffects, DSA5_CONDITION_IDS.FEARED)) return { ok: false, summary: 'hasCondition failed (negative)' };

      if (bridge.getConditionValue(actorWithEffects, DSA5_CONDITION_IDS.INPAIN) !== 2) return { ok: false, summary: 'getConditionValue failed (active)' };
      if (bridge.getConditionValue(actorWithEffects, DSA5_CONDITION_IDS.FEARED) !== 0) return { ok: false, summary: 'getConditionValue failed (inactive)' };

      try {
        bridge.getActiveConditions(null);
        return { ok: false, summary: 'getActiveConditions should throw on null actor' };
      } catch (e) {
        if (!(e instanceof DSA5ResolveError)) return { ok: false, summary: 'getActiveConditions threw wrong error type' };
      }

      // 2. Setting Conditions
      const actor = createMockActor();

      await bridge.addCondition(actor, DSA5_CONDITION_IDS.FEARED, 2, true);
      if (addConditionCalled !== 1 || lastAddArgs[0] !== DSA5_CONDITION_IDS.FEARED || lastAddArgs[1] !== 2 || lastAddArgs[2] !== true) {
        return { ok: false, summary: 'addCondition failed to pass correct arguments' };
      }

      await bridge.removeCondition(actor, DSA5_CONDITION_IDS.INPAIN, 1, false);
      if (removeConditionCalled !== 1 || lastRemoveArgs[0] !== DSA5_CONDITION_IDS.INPAIN || lastRemoveArgs[1] !== 1 || lastRemoveArgs[3] !== false) {
        return { ok: false, summary: 'removeCondition failed to pass correct arguments' };
      }

      await bridge.setConditionValue(actor, DSA5_CONDITION_IDS.STUNNED, 3);
      if (addConditionCalled !== 2 || lastAddArgs[0] !== DSA5_CONDITION_IDS.STUNNED || lastAddArgs[1] !== 3 || lastAddArgs[2] !== true) {
        return { ok: false, summary: 'setConditionValue (add) failed' };
      }

      await bridge.setConditionValue(actor, DSA5_CONDITION_IDS.STUNNED, 0);
      if (removeConditionCalled !== 2 || lastRemoveArgs[0] !== DSA5_CONDITION_IDS.STUNNED || lastRemoveArgs[1] !== 1 || lastRemoveArgs[3] !== true) {
        return { ok: false, summary: 'setConditionValue (remove on 0) failed' };
      }

      // 3. API validation
      try {
        await bridge.addCondition({ name: 'Bad Actor' }, DSA5_CONDITION_IDS.DEAD);
        return { ok: false, summary: 'Should assert actor has condition API' };
      } catch (e) {
        if (!e.message.includes('API')) return { ok: false, summary: 'Wrong error for missing API' };
      }

      // 4. Academy Mapping
      addConditionCalled = 0;
      removeConditionCalled = 0;

      await bridge.applyAcademyCondition(actor, 'stress');
      if (addConditionCalled !== 1 || lastAddArgs[0] !== JANUS_TO_DSA5_CONDITION_MAP['stress'].conditionId || lastAddArgs[1] !== JANUS_TO_DSA5_CONDITION_MAP['stress'].defaultValue) {
        return { ok: false, summary: 'applyAcademyCondition (default) failed' };
      }

      await bridge.applyAcademyCondition(actor, 'tired', 3);
      if (addConditionCalled !== 2 || lastAddArgs[0] !== JANUS_TO_DSA5_CONDITION_MAP['tired'].conditionId || lastAddArgs[1] !== 3) {
        return { ok: false, summary: 'applyAcademyCondition (override) failed' };
      }

      await bridge.clearAcademyCondition(actor, 'stress');
      if (removeConditionCalled !== 1 || lastRemoveArgs[0] !== JANUS_TO_DSA5_CONDITION_MAP['stress'].conditionId || lastRemoveArgs[3] !== true) {
        return { ok: false, summary: 'clearAcademyCondition failed' };
      }

      // Unknown condition
      const logsBefore = logs.length;
      await bridge.applyAcademyCondition(actor, 'unknown_condition');
      if (logs.length === logsBefore || !logs[logs.length - 1].msg.includes('Unbekannter Akademiezustand')) {
        return { ok: false, summary: 'applyAcademyCondition unknown condition should warn' };
      }

      // 5. Snapshot
      const actorWithAcademy = createMockActor([
        { id: JANUS_TO_DSA5_CONDITION_MAP['stress'].conditionId, value: 2 }
      ]);
      const snapshot = bridge.getAcademyConditionSnapshot(actorWithAcademy);

      if (!snapshot['stress'].active || snapshot['stress'].value !== 2 || snapshot['stress'].dsaConditionId !== JANUS_TO_DSA5_CONDITION_MAP['stress'].conditionId) {
        return { ok: false, summary: 'getAcademyConditionSnapshot failed for active condition' };
      }
      if (snapshot['tired'].active || snapshot['tired'].value !== 0) {
        return { ok: false, summary: 'getAcademyConditionSnapshot failed for inactive condition' };
      }

      return { ok: true, summary: 'DSA5ConditionBridge contract verified' };
    } catch (err) {
      return { ok: false, summary: `Test threw unexpected error: ${err.message}` };
    }
  }
};
