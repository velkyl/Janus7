import { JANUS_TO_DSA5_CONDITION_MAP, DSA5_CONDITION_IDS } from '../../../../bridge/dsa5/conditions.js';

export default {
  id: 'P3-TC-16',
  title: 'JANUS_TO_DSA5_CONDITION_MAP Contract',
  phases: [3],
  kind: 'auto',
  expected: 'JANUS_TO_DSA5_CONDITION_MAP is correctly defined, frozen, and maps to valid DSA5 conditions.',
  run: async (ctx) => {
    // 1. Verify object is frozen
    if (!Object.isFrozen(JANUS_TO_DSA5_CONDITION_MAP)) {
      return { ok: false, summary: 'JANUS_TO_DSA5_CONDITION_MAP is not frozen' };
    }

    // 2. Verify all keys have valid conditionIds from DSA5_CONDITION_IDS
    const validDSA5Ids = new Set(Object.values(DSA5_CONDITION_IDS));

    for (const [janusKey, mapping] of Object.entries(JANUS_TO_DSA5_CONDITION_MAP)) {
      if (!mapping || typeof mapping !== 'object') {
        return { ok: false, summary: `Mapping for ${janusKey} is not an object` };
      }
      if (!validDSA5Ids.has(mapping.conditionId)) {
        return { ok: false, summary: `Invalid conditionId '${mapping.conditionId}' for ${janusKey}` };
      }
    }

    // 3. Verify specific mappings exist and have correct types
    const expectedMappings = {
      stress:      { conditionId: DSA5_CONDITION_IDS.MINOR_SPIRITS, defaultValue: 1 },
      tired:       { conditionId: DSA5_CONDITION_IDS.INPAIN, defaultValue: 1 },
      exam_panic:  { conditionId: DSA5_CONDITION_IDS.FEARED, defaultValue: 1 },
      overworked:  { conditionId: DSA5_CONDITION_IDS.ENCUMBERED, defaultValue: 2 },
      sick:        { conditionId: DSA5_CONDITION_IDS.SICK, defaultValue: 1 },
      injured:     { conditionId: DSA5_CONDITION_IDS.INPAIN, defaultValue: 2 },
      magic_shock: { conditionId: DSA5_CONDITION_IDS.STUNNED, defaultValue: 1 },
      detention:   { conditionId: DSA5_CONDITION_IDS.SERVICES, defaultValue: 5 },
    };

    for (const [key, expected] of Object.entries(expectedMappings)) {
      const actual = JANUS_TO_DSA5_CONDITION_MAP[key];
      if (!actual) {
        return { ok: false, summary: `Missing expected key: ${key}` };
      }
      if (actual.conditionId !== expected.conditionId) {
        return { ok: false, summary: `Mismatch conditionId for ${key}: expected ${expected.conditionId}, got ${actual.conditionId}` };
      }
      if (actual.defaultValue !== expected.defaultValue) {
        return { ok: false, summary: `Mismatch defaultValue for ${key}: expected ${expected.defaultValue}, got ${actual.defaultValue}` };
      }
    }

    // Ensure there are no unexpected extra keys to catch unintended modifications
    const actualKeys = Object.keys(JANUS_TO_DSA5_CONDITION_MAP);
    const expectedKeys = Object.keys(expectedMappings);
    if (actualKeys.length !== expectedKeys.length) {
      return { ok: false, summary: `Expected ${expectedKeys.length} keys, found ${actualKeys.length}` };
    }

    return { ok: true, summary: 'JANUS_TO_DSA5_CONDITION_MAP contract verified' };
  }
};
