import { DSA5_CONDITION_IDS } from '../../../../bridge/dsa5/conditions.js';

export default {
  id: 'P3-TC-COND-01',
  title: 'DSA5 Condition IDs Export',
  phases: [3],
  kind: 'auto',
  expected: 'DSA5_CONDITION_IDS export is an object and frozen',
  run: async (ctx) => {
    if (typeof DSA5_CONDITION_IDS !== 'object' || DSA5_CONDITION_IDS === null) {
      return { ok: false, summary: 'DSA5_CONDITION_IDS is not an object' };
    }

    if (!Object.isFrozen(DSA5_CONDITION_IDS)) {
      return { ok: false, summary: 'DSA5_CONDITION_IDS is not frozen' };
    }

    const expectedKeys = [
      'DEAD', 'INPAIN', 'PRONE', 'UNCONSCIOUS', 'STUNNED', 'ENCUMBERED',
      'INCAPACITATED', 'PARALYSED', 'POISONED', 'SICK', 'BURNING', 'BLIND',
      'DEAF', 'MUTE', 'INVISIBLE', 'ROOTED', 'FIXATED', 'CONSTRICTED',
      'SURPRISED', 'FEARED', 'RAPTURED', 'CONFUSED', 'BLOODRUSH', 'MINOR_SPIRITS',
      'SERVICES'
    ];

    for (const key of expectedKeys) {
      if (!(key in DSA5_CONDITION_IDS)) {
        return { ok: false, summary: `Missing expected key: ${key}` };
      }
    }

    return { ok: true, summary: 'DSA5_CONDITION_IDS has correct keys and is frozen' };
  }
};
