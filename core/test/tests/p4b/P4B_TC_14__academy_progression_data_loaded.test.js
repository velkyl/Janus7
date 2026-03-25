
export default {
  id: 'P4B-TC-14',
  title: 'Phase-2-Datensätze für Social Links, Milestones und Collections geladen',
  phases: [2, 4.6],
  kind: 'auto',
  expected: 'AcademyDataApi liefert Social Links, Milestones, Collections, School Stats und Resources',
  whereToFind: 'game.janus7.academy.data',
  run: async () => {
    const api = game?.janus7?.academy?.data;
    const ok = !!(api?.getSocialLinks?.().length && api?.getMilestones?.().length && api?.getCollections?.().length && api?.getSchoolStatsConfig?.().length && api?.getResourcesConfig?.().length);
    return { ok, summary: ok ? 'AcademyDataApi liefert Progression-Datensätze' : 'Progression-Datensätze fehlen' };
  }
};
