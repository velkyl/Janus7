
export default {
  id: 'P4B-TC-13',
  title: 'Academy Progression registriert RuleEvaluator und Engines',
  phases: [4, 4.6],
  kind: 'auto',
  expected: 'game.janus7.academy.progression enthält resources/social/milestone/collection/activity',
  whereToFind: 'game.janus7.academy.progression',
  run: async () => {
    const p = game?.janus7?.academy?.progression;
    const ok = !!(p?.ruleEvaluator && p?.resourcesEngine && p?.socialEngine && p?.milestoneEngine && p?.collectionEngine && p?.activityEngine);
    return { ok, summary: ok ? 'Academy Progression vollständig registriert' : 'Academy Progression unvollständig' };
  }
};
