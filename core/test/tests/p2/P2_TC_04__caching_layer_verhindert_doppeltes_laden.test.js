export default {
  id: "P2-TC-04",
  title: "reloadContentRegistry() ohne Duplikate",
  phases: [2],
  kind: "auto",
  expected: "reloadContentRegistry() ersetzt Registry sauber; doppelte Einträge werden vermieden.",
  whereToFind: "AcademyDataApi.reloadContentRegistry()",
  async run(ctx) {
    const engine = ctx?.engine ?? game?.janus7;
    const api = engine?.academy?.data;
    if (!api || typeof api.getContentRegistry !== "function" || typeof api.reloadContentRegistry !== "function") {
      return { ok: true, status: "SKIP", summary: "SKIP: reloadContentRegistry/getContentRegistry fehlt" };
    }

    const before = await api.getContentRegistry();
    const beforeCounts = {
      quests: before?.quests?.length ?? null,
      events: before?.events?.length ?? null,
      effects: before?.effects?.length ?? null
    };

    const after = await api.reloadContentRegistry();
    const afterCounts = {
      quests: after?.quests?.length ?? null,
      events: after?.events?.length ?? null,
      effects: after?.effects?.length ?? null
    };

    // Basic sanity: arrays exist and lengths are stable (or at least non-negative)
    for (const k of ["quests","events","effects"]) {
      const arr = after?.[k];
      if (!Array.isArray(arr)) return { ok: false, summary: `Registry.${k} ist nicht Array` };
    }

    const ok = JSON.stringify(beforeCounts) === JSON.stringify(afterCounts);
    return { ok, summary: ok ? "Reload stabil (Counts gleich)" : `Reload Counts geändert (vorher ${JSON.stringify(beforeCounts)} / nachher ${JSON.stringify(afterCounts)})` };
  }
};
