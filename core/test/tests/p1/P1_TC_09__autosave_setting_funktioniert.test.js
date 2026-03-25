export default {
  id: "P1-TC-09",
  title: "autoSave-Setting funktioniert",
  phases: [1],
  kind: "auto",
  expected: "Wenn autoSave=false und force=false, schreibt state.save() NICHT in game.settings.",
  whereToFind: "JanusStateCore.save() / JanusConfig.autoSave",
  async run(ctx) {
    const engine = ctx?.engine ?? game?.janus7;
    const state = engine?.core?.state;
    if (!state) return { ok: false, summary: "State fehlt" };

    // Settings-Key für autoSave
    const MODULE_ID = "Janus7";
    const key = "autoSave";
    const has = game?.settings?.settings?.has?.(`${MODULE_ID}.${key}`);
    if (!has) return { ok: true, status: "SKIP", summary: "SKIP: Setting janus7.autoSave nicht registriert" };

    const prevAuto = game.settings.get(MODULE_ID, key);
    const prevStored = game.settings.get(MODULE_ID, state.settingsKey);

    try {
      await game.settings.set(MODULE_ID, key, false);

      // Mutate in-memory state (dirty) but save should skip writing
      await state.transaction(async (s) => {
        s.set("meta.autoSaveTest", Date.now());
        await s.save({ force: false }); // should skip writing
        const afterStored = game.settings.get(MODULE_ID, state.settingsKey);
        if (JSON.stringify(afterStored) !== JSON.stringify(prevStored)) {
          throw new Error("state.save() hat trotz autoSave=false geschrieben");
        }
        const e = new Error("JANUS_TEST_ROLLBACK"); e.name = "JanusTestRollback"; throw e;
      }, { silent: true });

      return { ok: true, summary: "autoSave respected: no settings write" };
    } finally {
      await game.settings.set(MODULE_ID, key, prevAuto);
    }
  }
};
