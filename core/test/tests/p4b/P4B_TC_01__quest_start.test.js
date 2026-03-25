/**
 * @file core/test/tests/p4b/P4B_TC_01__quest_start.test.js
 * @phase 4b
 * @testid P4B-TC-01
 */

export default {
  id: 'P4B-TC-01',
  title: 'Quest Start (Actor, QuestId)',
  phases: ['4b'],
  kind: 'automated',
  priority: 'P0',

  async run({ engine, assert }) {
    const questId = 'Q_DEMO_LIBRARY';
    const actorId = 'Actor.test_p4b_01';
    const questEngine = engine?.academy?.quests;
    assert(questEngine, 'Quest Engine not available');

    const result = await questEngine.startQuest(questId, { actorId });
    assert(result, 'startQuest returned null');
    assert(result.questId === questId, 'Quest definition mismatch');

    const persistedState = questEngine.getActiveQuest(actorId, questId);
    assert(persistedState, 'Quest state not persisted in JanusStateCore');
    assert(persistedState.status === 'active', 'Persisted state not active');
    assert(persistedState.currentNodeId === result.startNodeId, 'Current node mismatch after start');

    await engine.core.state.transaction(() => {
      const questRoot = foundry.utils.deepClone(engine.core.state.get('academy.quests') || {});
      const actorQuests = questRoot[actorId] && typeof questRoot[actorId] === 'object' ? questRoot[actorId] : {};
      delete actorQuests[questId];
      if (Object.keys(actorQuests).length) questRoot[actorId] = actorQuests;
      else delete questRoot[actorId];
      engine.core.state.set('academy.quests', questRoot);
    });

    return { success: true, questId, actorId };
  }
};
