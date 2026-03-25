/**
 * @file core/test/tests/p15/P15_TC_11__academy_graph_library_nodes.test.js
 */

import { AcademyGraphProvider } from '../../../../scripts/graph/providers/AcademyGraphProvider.js';

export default {
  id: 'P15-TC-11',
  title: 'Academy graph provider exposes library items and lesson→library edges',
  phases: [15],
  kind: 'auto',
  expected: 'Library items become academy graph nodes and referenced lesson edges are emitted',

  run: async () => {
    const provider = new AcademyGraphProvider({
      academyData: {
        getNpcs: () => [{ id: 'npc_rodorim', name: 'Rodorim' }],
        getLessons: () => [{
          id: 'lesson_arith',
          name: 'Arithmetik',
          teacherNpcId: 'npc_rodorim',
          subject: 'arithmetik',
          references: { libraryItemIds: ['LIB_ARITH'] }
        }],
        getLocations: () => [],
        getEvents: () => [],
        getCircles: () => [],
        getLibraryItems: () => [{ id: 'LIB_ARITH', title: 'Arithmetik Basics', type: 'book' }]
      }
    });

    const result = await provider.collect();
    const nodes = Array.isArray(result?.nodes) ? result.nodes : [];
    const edges = Array.isArray(result?.edges) ? result.edges : [];
    const libraryNode = nodes.find((n) => n.id === 'LIB_ARITH' && n.type === 'library_item');
    const lessonEdge = edges.find((e) => e.from === 'lesson_arith' && e.to === 'LIB_ARITH');

    const ok = Boolean(libraryNode && lessonEdge);
    return {
      ok,
      summary: ok ? 'Academy graph library integration OK' : 'Library node or lesson→library edge missing',
      notes: [`nodes=${nodes.length}`, `edges=${edges.length}`]
    };
  }
};
