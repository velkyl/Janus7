/**
 * @file core/test/tests/p15/P15_TC_12__graph_dsa5_semantic_edges.test.js
 */

import { Dsa5IndexGraphProvider } from '../../../../scripts/graph/providers/Dsa5IndexGraphProvider.js';

export default {
  id: 'P15-TC-12',
  title: 'DSA5 index graph provider creates semantic academy→DSA5 edges',
  phases: [15],
  kind: 'auto',
  expected: 'Lesson rule refs and library knowledge hooks connect academy nodes with DSA5 entries',

  run: async () => {
    const provider = new Dsa5IndexGraphProvider({
      index: {
        entries: async () => ([
          { uuid: 'Compendium.dsa5.skills.rechnen', name: 'Rechnen', type: 'skill', pack: 'dsa5.skills', packageName: 'dsa5' },
          { uuid: 'Compendium.dsa5.skills.sphaerenkunde', name: 'Sphärenkunde', type: 'skill', pack: 'dsa5.skills', packageName: 'dsa5' }
        ])
      },
      academyData: {
        getLessons: () => [{
          id: 'lesson_arith',
          subject: 'arithmetik',
          references: { dsa5RuleRefs: ['TALENT: RECHNEN'] }
        }],
        getLibraryItems: () => [{
          id: 'LIB_SPH',
          knowledgeHooks: [{ relatedSkillId: 'TALENT_SPHAERENKUNDE' }]
        }]
      }
    });

    const result = await provider.collect();
    const edges = Array.isArray(result?.edges) ? result.edges : [];
    const hasLessonEdge = edges.some((e) => e.from === 'lesson_arith' && e.to === 'dsa5:Compendium.dsa5.skills.rechnen');
    const hasSubjectEdge = edges.some((e) => e.from === 'subject:arithmetik' && e.to === 'dsa5:Compendium.dsa5.skills.rechnen');
    const hasLibraryEdge = edges.some((e) => e.from === 'LIB_SPH' && e.to === 'dsa5:Compendium.dsa5.skills.sphaerenkunde');
    const ok = hasLessonEdge && hasSubjectEdge && hasLibraryEdge;
    return {
      ok,
      summary: ok ? 'Semantic DSA5 graph edges OK' : 'Expected academy→DSA5 semantic edges missing',
      notes: edges.map((e) => `${e.from}->${e.to}:${e.type}`)
    };
  }
};
