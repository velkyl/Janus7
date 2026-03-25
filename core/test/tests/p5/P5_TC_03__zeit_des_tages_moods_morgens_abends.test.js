export default {
  id: "P5-TC-03",
  title: "Mood apply ohne Audioausgabe",
  phases: [5],
  kind: "auto",
  expected: "applyMood() darf als Non-Master keine lokale Audioausgabe starten (nur broadcast/no-op).",
  whereToFind: "engine.atmosphere.controller.applyMood()",
  async run(ctx) {
    const engine = ctx?.engine ?? game?.janus7;
    const core = engine?.core;
    const state = core?.state;
    const controller = engine?.atmosphere?.controller;
    if (!controller) return { ok: false, summary: "engine.atmosphere.controller fehlt" };
    if (typeof controller.applyMood !== "function") return { ok: false, summary: "controller.applyMood fehlt" };
    if (typeof state?.transaction !== "function") return { ok: false, summary: "core.state.transaction fehlt" };

    let moodId = null;
    let broadcasted = false;

    // Rollback via Sentinel-Error (siehe JanusStateCore.transaction)
    try {
      await state.transaction(async (s) => {
        // Ensure Atmosphere is enabled for the duration of this test.
        s.set("features.atmosphere.enabled", true);

        // Load moods deterministically.
        await controller.init();

        moodId = Array.from(controller._moods?.keys?.() ?? [])?.[0] ?? null;
        if (!moodId) return;

        const oldIsMaster = controller._isMasterClient?.bind?.(controller);
        const oldEmit = controller._emitSocket?.bind?.(controller);
        const oldApplyLocal = controller._applyMoodLocal?.bind?.(controller);

        try {
          if (typeof controller._isMasterClient === "function") controller._isMasterClient = () => false;
          if (typeof controller._emitSocket === "function") controller._emitSocket = () => { broadcasted = true; };
          if (typeof controller._applyMoodLocal === "function") {
            controller._applyMoodLocal = async () => { throw new Error("Audio path must not be reached"); };
          }

          const r = await controller.applyMood(moodId, { broadcast: true, force: true });
          if (r === true) broadcasted = true;
        } finally {
          if (oldIsMaster) controller._isMasterClient = oldIsMaster;
          if (oldEmit) controller._emitSocket = oldEmit;
          if (oldApplyLocal) controller._applyMoodLocal = oldApplyLocal;
        }

        // Always rollback state changes after the test.
        const e = new Error("JANUS_TEST_ROLLBACK");
        e.name = "JanusTestRollback";
        throw e;
      }, { silent: true });
    } catch (_e) {
      // transaction() handles rollback for the sentinel
    }

    if (!moodId) return { ok: true, status: "SKIP", summary: "SKIP: Keine Moods verfügbar" };
    return { ok: broadcasted === true, summary: broadcasted ? "applyMood broadcast/no-op OK" : "applyMood hat nicht broadcasted (oder r!=true)" };
  }
};
