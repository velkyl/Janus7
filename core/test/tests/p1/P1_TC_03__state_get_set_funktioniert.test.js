export default {
  id: "P1-TC-03",
  title: "State Get/Set funktioniert",
  phases: [1],
  kind: "auto",
  expected: "state.set und state.getPath liefern konsistenten Wert (ohne Persistenz).",
  whereToFind: "game.janus7.core.state",
  async run(ctx) {
    const engine = ctx?.engine ?? game?.janus7;
    const state = engine?.core?.state;
    if (!state) return { ok: false, summary: "State fehlt" };

    const before = state.getPath("time.phase");
    await state.transaction((s) => {
      s.set("time.phase", "TEST_PHASE");
      const inside = s.getPath("time.phase");
      if (inside !== "TEST_PHASE") throw new Error("set/getPath inkonsistent in Transaction");
      const getObj = s.get("time");
      if (!getObj || getObj.phase !== "TEST_PHASE") throw new Error("get('time') inkonsistent");
      const e = new Error("JANUS_TEST_ROLLBACK"); e.name = "JanusTestRollback"; throw e;
    }, { silent: true });

    const after = state.getPath("time.phase");
    if (after !== before) return { ok: false, summary: `Rollback fehlgeschlagen (${before} -> ${after})` };

    return { ok: true, summary: "get/set OK (Rollback sauber)" };
  }
};
