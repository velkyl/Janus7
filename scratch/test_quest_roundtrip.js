
/**
 * Regression Test: KI Quest Roundtrip
 * Verifies that quest state updates via KI import correctly target 'academy.quests'.
 */
async function testQuestRoundtrip() {
  const engine = game.janus7;
  if (!engine) throw new Error("JANUS7 Engine not found");

  console.log("Starting Quest Roundtrip Test...");

  // 1. Prepare initial state
  const testActorId = "Actor.TestActor123";
  const testQuestId = "test_quest_001";
  const initialQuestState = { status: "active", currentNodeId: "start", startedAt: "day1" };
  
  await engine.core.state.set(`academy.quests.${testActorId}.${testQuestId}`, initialQuestState);
  await engine.core.state.save();
  
  console.log("Initial state set.");

  // 2. Export Lite Bundle
  const exportBundle = engine.ki.exportBundle({ mode: 'lite' });
  console.log("Exported bundle keys:", Object.keys(exportBundle));
  
  // Verify quests are in the export
  const exportedQuests = exportBundle.campaign_state.academy.quests;
  if (!exportedQuests[testActorId] || !exportedQuests[testActorId][testQuestId]) {
    throw new Error("Quests missing from export bundle");
  }
  console.log("Quest found in export.");

  // 3. Simulate KI Response (Update quest status to 'completed')
  const kiResponse = {
    version: "JANUS_KI_RESPONSE_V1",
    sourceExportMeta: exportBundle.meta,
    changes: {
      questUpdates: [
        {
          path: `${testActorId}.${testQuestId}.status`,
          op: "replace",
          value: "completed"
        },
        {
          path: `${testActorId}.${testQuestId}.completedAt`,
          op: "replace",
          value: "day2"
        }
      ]
    },
    notes: "Test quest completion"
  };

  // 4. Preview Import
  const preview = await engine.ki.previewImport(kiResponse);
  console.log("Preview summary:", preview.map(p => `${p.type}: ${p.path} -> ${p.after}`));

  // 5. Apply Import
  await engine.ki.applyImport(kiResponse);
  console.log("Import applied.");

  // 6. Verify State
  const finalState = engine.core.state.getPath(`academy.quests.${testActorId}.${testQuestId}`);
  console.log("Final quest state:", finalState);

  if (finalState.status !== "completed") {
    throw new Error(`Quest status mismatch! Expected 'completed', got '${finalState.status}'`);
  }
  if (finalState.completedAt !== "day2") {
    throw new Error(`Quest field missing! Expected 'day2' at completedAt`);
  }

  // Cleanup
  await engine.core.state.unset(`academy.quests.${testActorId}`);
  await engine.core.state.save();

  console.log("✅ Quest Roundtrip Test PASSED!");
}

testQuestRoundtrip().catch(err => console.error("❌ Quest Roundtrip Test FAILED:", err));
