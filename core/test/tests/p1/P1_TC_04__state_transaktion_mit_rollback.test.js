export default {
  id: "P1-TC-04",
  title: "State-Transaktion mit Rollback",
  phases: [1],
  kind: "auto",
  expected: "transaction() rollt Änderungen bei JanusTestRollback vollständig zurück.",
  whereToFind: "JanusStateCore.transaction()",
  async run(ctx) {
    const engine = ctx?.engine ?? game?.janus7;
    const state = engine?.core?.state;
    if (!state) return { ok: false, summary: "State fehlt" };

    const snap = foundry.utils.deepClone(state.get("time"));
    await state.transaction((s) => {
      s.set("time.week", (s.getPath("time.week") ?? 1) + 99);
      s.set("time.day", "ROLLBACK_TEST");
      const e = new Error("JANUS_TEST_ROLLBACK"); e.name = "JanusTestRollback"; throw e;
    }, { silent: true });

    const now = state.get("time");
    const ok = JSON.stringify(now) === JSON.stringify(snap);
    return { ok, summary: ok ? "Rollback OK" : "Rollback NICHT vollständig" };
  }
};
