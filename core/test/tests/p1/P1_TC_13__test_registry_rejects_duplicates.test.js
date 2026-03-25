/**
 * @file core/test/tests/p1/P1_TC_13__test_registry_rejects_duplicates.test.js
 * @description Phase 1 Gate: Test registry must reject duplicate IDs.
 */

import JanusTestRegistry from '../../../test/registry.js';

export default {
  id: 'P1-TC-13',
  title: 'Test Registry rejects duplicate IDs',
  phases: [1],
  kind: 'auto',
  expected: 'registry.register throws on duplicate id',

  run: async () => {
    const registry = new JanusTestRegistry();
    registry.register({ id: 'X-1', title: 'a', run: async () => ({ ok: true }) });

    let threw = false;
    try {
      registry.register({ id: 'X-1', title: 'b', run: async () => ({ ok: true }) });
    } catch (_err) {
      threw = true;
    }

    return {
      ok: threw,
      summary: threw ? 'duplicate rejected' : 'duplicate NOT rejected'
    };
  }
};
