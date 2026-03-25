export default {
  id: "P6-TC-03A",
  title: "QuickAction: Zeit voranschreiten (API) (Alias)",
  phases: [6],
  kind: "auto",
  expected: "advancePhase/advanceDay ändern SlotRef innerhalb Transaction und rollen sauber zurück.",
  whereToFind: "engine.simulation.calendar.advancePhase/advanceDay",
  async run(ctx) {
    const engine = ctx?.engine ?? game?.janus7;
    const state = engine?.core?.state;
    const cal = engine?.simulation?.calendar;
    if (!state || !cal) return { ok: false, summary: "state oder calendar fehlt" };
    if (typeof cal.advancePhase !== "function" && typeof cal.advanceDay !== "function") {
      return { ok: true, status: "SKIP", summary: "SKIP: calendar.advancePhase/advanceDay fehlen" };
    }

    const before = cal.getCurrentSlotRef?.();
    await state.transaction(async () => {
      if (typeof cal.advancePhase === "function") await cal.advancePhase();
      else await cal.advanceDay();
      const after = cal.getCurrentSlotRef?.();
      if (JSON.stringify(after) === JSON.stringify(before)) throw new Error("Zeit hat sich nicht verändert");
      const e = new Error("JANUS_TEST_ROLLBACK"); e.name = "JanusTestRollback"; throw e;
    }, { silent: true });

    const end = cal.getCurrentSlotRef?.();
    const ok = JSON.stringify(end) === JSON.stringify(before);
    return { ok, summary: ok ? "Zeitänderung + Rollback OK" : "Rollback hat Zeit nicht zurückgesetzt" };
  }
};
