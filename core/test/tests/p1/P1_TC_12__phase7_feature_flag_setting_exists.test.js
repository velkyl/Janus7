/**
 * @file core/test/tests/p1/P1_TC_12__phase7_feature_flag_setting_exists.test.js
 * @description Phase 1 Gate: Feature-Flag setting for Phase 7 exists and is readable.
 */

import { JanusConfig } from '../../../../core/config.js';

export default {
  id: 'P1-TC-12',
  title: 'Config: enablePhase7 Feature-Flag exists',
  phases: [1, 7],
  kind: 'auto',
  expected: 'JanusConfig.get("enablePhase7") returns a boolean (default true).',

  run: async () => {
    try {
      const v = JanusConfig.get('enablePhase7');
      const ok = (typeof v === 'boolean');
      return {
        ok,
        summary: ok ? 'enablePhase7 available' : 'enablePhase7 missing/invalid',
        data: { value: v }
      };
    } catch (err) {
      return {
        ok: false,
        summary: 'enablePhase7 check failed',
        notes: [String(err?.message ?? err)]
      };
    }
  }
};
