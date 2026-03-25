/**
 * @file core/test/tests/p4b/P4B_TC_03__quest_completion.test.js
 * @phase 4b
 * @testid P4B-TC-03
 */

export default {
  id: 'P4B-TC-03',
  title: 'Quest Completion (State Update)',
  phases: ['4b'],
  kind: 'automated',
  priority: 'P0',

  async run({ engine, assert }) {
    const questId = 'Q_DEMO_LIBRARY';
    const actorId = 'Actor.test_p4b_03';
    const questEngine = engine.academy.quests;

    await questEngine.startQuest(questId, { actorId });
    const stateBefore = questEngine.getActiveQuest(actorId, questId);
    assert(stateBefore?.status === 'active', 'Quest not active before completion');

    await questEngine.completeQuest(questId, { actorId });

    const stateAfter = questEngine.getActiveQuest(actorId, questId);
    assert(stateAfter, 'Quest state lost after completion');
    assert(stateAfter.status === 'completed', `Quest not completed: ${stateAfter.status}`);
    assert(stateAfter.completedAt, 'No completion timestamp');
    assert(typeof stateAfter.completedAt === 'string', 'Invalid completion timestamp type');

    await engine.core.state.transaction(() => {
      const questRoot = foundry.utils.deepClone(engine.core.state.get('academy.quests') || {});
      const actorQuests = questRoot[actorId] && typeof questRoot[actorId] === 'object' ? questRoot[actorId] : {};
      delete actorQuests[questId];
      if (Object.keys(actorQuests).length) questRoot[actorId] = actorQuests;
      else delete questRoot[actorId];
      engine.core.state.set('academy.quests', questRoot);
    });

    return { success: true, completedAt: stateAfter.completedAt };
  }
};
