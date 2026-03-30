export default {
  id: "QS-TC-04",
  title: "Quest State Persistence (Mocked)",
  phases: [4],
  kind: "auto",
  expected: "Quest-Daten bleiben nach State-Operationen konsistent und lassen sich über getActiveQuest laden.",
  whereToFind: "game.janus7.academy.quests",
  async run(ctx) {
    const engine = ctx?.engine ?? globalThis.game?.janus7;
    const questEngine = engine?.academy?.quests;
    if (!questEngine) return { ok: false, summary: "JanusQuestEngine fehlt" };

    const actorId = "Actor.QSTestPersist";
    const questId = "Q_TEST_PERSIST";

    try {
      // 1. Initialer State setzen
      await engine.core.state.transaction((s) => {
        const root = s.get("questStates") || {};
        root[actorId] = {
           [questId]: {
             status: "active",
             currentNodeId: "START_NODE",
             history: []
           }
        };
        s.set("questStates", root);
      });

      // 2. Über questEngine abfragen
      const state = questEngine.getActiveQuest(actorId, questId);
      if (!state || state.status !== "active" || state.currentNodeId !== "START_NODE") {
        return { ok: false, summary: "State konnte nicht korrekt aus dem initialen Store geladen werden." };
      }

      // 3. Round-Trip Validation
      await engine.core.state.save({ force: true });
      const stateAfterSave = questEngine.getActiveQuest(actorId, questId);
      if (!stateAfterSave || stateAfterSave.status !== "active") {
         return { ok: false, summary: "State ging nach engine.core.state.save verloren oder wurde korrumpiert." };
      }

      return { ok: true, summary: "Quest-Persistence über State-Transactions hinweg bestätigt." };

    } catch (e) {
      return { ok: false, summary: `Fehler: ${e.message}` };
    } finally {
      await engine.core.state.transaction((s) => {
        const root = s.get("questStates") || {};
        delete root[actorId];
        s.set("questStates", root);
      }, { silent: true });
    }
  }
};
