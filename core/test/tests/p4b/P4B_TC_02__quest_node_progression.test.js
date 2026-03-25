/**
 * @file core/test/tests/p4b/P4B_TC_02__quest_node_progression.test.js
 * @phase 4b
 * @testid P4B-TC-02
 */

export default {
  id: 'P4B-TC-02',
  title: 'Quest Node Progression (Event/Check/Effect Nodes)',
  phases: ['4b'],
  kind: 'automated',
  priority: 'P0',

  async run({ engine, assert }) {
    const questId = 'Q_DEMO_LIBRARY';
    const actorId = 'Actor.test_p4b_02';
    const questEngine = engine.academy.quests;

    const questDef = await questEngine.startQuest(questId, { actorId });
    const stateBefore = questEngine.getActiveQuest(actorId, questId);
    assert(stateBefore, 'Quest not started');

    const initialNode = stateBefore.currentNodeId;
    assert(initialNode === questDef.startNodeId, 'Unexpected initial node');

    const result = await questEngine.progressToNode(questId, 'QN_LIBRARY_INVESTIGATE', { actorId });
    assert(result && result.success === true, 'Node progression failed');

    const stateAfter = questEngine.getActiveQuest(actorId, questId);
    assert(stateAfter, 'Quest state lost after progression');
    const newNode = stateAfter.currentNodeId;
    assert(newNode === 'QN_LIBRARY_INVESTIGATE', `Node did not progress: ${newNode}`);

    assert(Array.isArray(stateAfter.history), 'No history array');
    assert(stateAfter.history.length > 0, 'History not recorded');
    const lastHistoryEntry = stateAfter.history[stateAfter.history.length - 1];
    assert(lastHistoryEntry.nodeId === initialNode, 'History previous node mismatch');

    await engine.core.state.transaction(() => {
      const questRoot = foundry.utils.deepClone(engine.core.state.get('academy.quests') || {});
      const actorQuests = questRoot[actorId] && typeof questRoot[actorId] === 'object' ? questRoot[actorId] : {};
      delete actorQuests[questId];
      if (Object.keys(actorQuests).length) questRoot[actorId] = actorQuests;
      else delete questRoot[actorId];
      engine.core.state.set('academy.quests', questRoot);
    });

    return { success: true, initialNode, newNode };
  }
};
