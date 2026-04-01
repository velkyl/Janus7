export default {
  id: "QS-TC-05",
  title: "Social & Reward Integration (Mocked)",
  phases: [4],
  kind: "auto",
  expected: "Quest Completion löst Beziehungsänderungen (social.influence) für NPCs aus.",
  whereToFind: "game.janus7.academy.social",
  async run(ctx) {
    const engine = ctx?.engine ?? globalThis.game?.janus7;
    const socialEngine = engine?.academy?.social;
    const questEngine = engine?.academy?.quests;
    if (!socialEngine || !questEngine) return { ok: false, summary: "Social- oder Quest-Engine fehlt" };

    const actorId = "Actor.QSTestSocial";
    const questId = "Q_TEST_SOCIAL";
    const npcId = "npc.test_reward";

    // 1. Initialer Social State (Neutral)
    await engine.core.state.transaction((s) => {
      const social = s.get("academy.social") || { relationships: {} };
      social.relationships = social.relationships || {};
      social.relationships[actorId] = social.relationships[actorId] || {};
      social.relationships[actorId][npcId] = { attitude: 0, status: [] };
      s.set("academy.social", social);
    });

    try {
      // 2. Mocking _getQuest und _getNode für ein Reward
      const origGetQuest = questEngine._getQuest;
      const origGetNode = questEngine._getNode;
      
      questEngine._getQuest = async () => ({ startNodeId: "NODE_REWARD" });
      questEngine._getNode = async (nodeId) => {
        if (nodeId === "NODE_REWARD") return { 
          type: "reward", 
          rewards: { social: { [npcId]: 15 } }, 
          nextNodeId: null, 
          completeOnRender: true 
        };
        return null;
      };

      // 3. Quest starten und rendern (triggert completion & reward)
      await questEngine.startQuest(questId, { actorId });
      // In der echten Engine würde _renderNode das completeQuest triggern.
      // Wir simulieren hier die Kette bis zum social.influence() Call.
      await questEngine.completeQuest(questId, { actorId, applyRewards: true });

      // 4. Einfluss-Änderung prüfen
      const currentInfluence = socialEngine.getInfluence(actorId, npcId);
      if (currentInfluence === 0) {
        return { ok: false, summary: "influence() wurde nach Quest-Completion nicht erhöht." };
      }
      if (currentInfluence !== 15) {
        return { ok: false, summary: `Erwartet: 15, Gefunden: ${currentInfluence}` };
      }

      // Restore Mocks
      questEngine._getQuest = origGetQuest;
      questEngine._getNode = origGetNode;

      return { ok: true, summary: "Social-Rewards (Influence) wurden erfolgreich bei Quest-Abschluss vergeben." };

    } catch (e) {
      return { ok: false, summary: `Fehler: ${e.message}` };
    } finally {
      await engine.core.state.transaction((s) => {
        const social = s.get("academy.social") || { relationships: {} };
        if (social.relationships?.[actorId]) {
          delete social.relationships[actorId][npcId];
          if (Object.keys(social.relationships[actorId]).length === 0) delete social.relationships[actorId];
        }
        s.set("academy.social", social);
        
        const questRoot = s.get("questStates") || {};
        delete questRoot[actorId];
        s.set("questStates", questRoot);
      }, { silent: true });
    }
  }
};
