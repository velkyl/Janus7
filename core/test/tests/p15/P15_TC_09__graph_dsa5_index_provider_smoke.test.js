/**
 * @file core/test/tests/p15/P15_TC_09__graph_dsa5_index_provider_smoke.test.js
 */

import { Dsa5IndexGraphProvider } from '../../../../scripts/graph/providers/Dsa5IndexGraphProvider.js';

export default {
  id: 'P15-TC-09',
  title: 'DSA5 index graph provider builds lightweight rule nodes',
  phases: [15],
  kind: 'auto',
  expected: 'Provider converts lightweight library entries into DSA5 graph nodes',

  run: async () => {
    const provider = new Dsa5IndexGraphProvider({
      index: {
        entries: async () => ([
          { uuid: 'Compendium.dsa5.spells.odem', name: 'Odem Arcanum', type: 'spell', pack: 'dsa5.spells', packageName: 'dsa5' },
          { uuid: 'Compendium.dsa5.items.staff', name: 'Magierstab', type: 'equipment', pack: 'dsa5.items', packageName: 'dsa5' }
        ])
      }
    });
    const result = await provider.collect();
    const nodes = Array.isArray(result?.nodes) ? result.nodes : [];
    const ok = nodes.length === 2 && nodes.every((n) => n.type === 'dsa5_entry' && n.id.startsWith('dsa5:'));
    return {
      ok,
      summary: ok ? 'DSA5 index provider OK' : 'DSA5 index provider returned unexpected graph contribution',
      notes: nodes.map((n) => `${n.id}:${n.label}`)
    };
  }
};
