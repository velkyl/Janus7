export default {
  id: "QS-TC-01",
  title: "Quest System Lifecycle (Mocked)",
  phases: [4],
  kind: "auto",
  expected: "startQuest, progressToNode und completeQuest setzen den korrekten State im JanusStateCore.",
  whereToFind: "game.janus7.academy.quests",
  async run(ctx) {
    const engine = ctx?.engine ?? globalThis.game?.janus7;
    const questEngine = engine?.academy?.quests;
    if (!questEngine) return { ok: false, summary: "JanusQuestEngine fehlt" };

    const actorId = "Actor.QSTestLifecycle";
    const questId = "Q_TEST_LIFECYCLE";

    // 1. Mock _getQuest und _getNode temporär auf der Instanz
    const origGetQuest = questEngine._getQuest;
    const origGetNode = questEngine._getNode;
    
    questEngine._getQuest = async () => ({ startNodeId: "NODE_1" });
    questEngine._getNode = async (nodeId) => {
      if (nodeId === "NODE_1") return { type: "check", checkExpr: "", successNodeId: "NODE_2" }; // empty check passes silently
      if (nodeId === "NODE_2") return { type: "effect", effectIds: [], nextNodeId: null };
      return null;
    };

    try {
      // Cleanup run
      await engine.core.state.transaction((s) => {
        const root = s.get("questStates") || {};
        delete root[actorId];
        s.set("questStates", root);
      });

      // 2. startQuest testen
      const startResult = await questEngine.startQuest(questId, { actorId });
      if (!startResult || startResult.startNodeId !== "NODE_1") {
        return { ok: false, summary: "startQuest gab unerwartetes Ergebnis zurück." };
      }

      const activeState = questEngine.getActiveQuest(actorId, questId);
      if (!activeState || activeState.status !== "active" || activeState.currentNodeId !== "NODE_1") {
         return { ok: false, summary: "State nach startQuest nicht korrekt gesetzt (erwartet: active, NODE_1)." };
      }

      // 3. progressToNode testen
      await questEngine.progressToNode(questId, "NODE_2", { actorId });
      const progressedState = questEngine.getActiveQuest(actorId, questId);
      if (!progressedState || progressedState.currentNodeId !== "NODE_2" || progressedState.history.length === 0) {
        return { ok: false, summary: "progressToNode hat history oder NodeId nicht sauber aktualisiert." };
      }

      // 4. completeQuest testen
      await questEngine.completeQuest(questId, { actorId });
      const completedState = questEngine.getActiveQuest(actorId, questId);
      if (!completedState || completedState.status !== "completed") {
        return { ok: false, summary: "completeQuest hat Status nicht auf 'completed' gesetzt." };
      }

    } catch (e) {
      return { ok: false, summary: `Fehlerhafter Exception-Wurf: ${e.message}` };
    } finally {
      // Mocks aufräumen
      questEngine._getQuest = origGetQuest;
      questEngine._getNode = origGetNode;

      await engine.core.state.transaction((s) => {
        const root = s.get("questStates") || {};
        delete root[actorId];
        s.set("questStates", root);
      }, { silent: true });
    }

    return { ok: true, summary: "Lifecycle start->progress->complete funktionierte ordnungsgemäß im State." };
  }
};
