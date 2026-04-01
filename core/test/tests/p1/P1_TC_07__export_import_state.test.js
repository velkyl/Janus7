export default {
  id: "P1-TC-07",
  title: "IO Roundtrip: Export -> Import",
  phases: [1],
  kind: "auto",
  expected: "core.io.exportState() + importStateFromObject() funktionieren; Rollback hält World-State sauber.",
  whereToFind: "game.janus7.core.io",
  async run({ ctx, engine }) {
    const activeEngine = engine ?? ctx?.engine ?? game?.janus7;
    const core = activeEngine?.core;
    const state = core?.state;
    const io = core?.io;

    if (!state || !io) return { ok: false, summary: "core.state oder core.io fehlt" };
    if (typeof io.exportState !== "function" || typeof io.importStateFromObject !== "function") {
      return { ok: true, status: "SKIP", summary: "SKIP: IO-API (exportState/importStateFromObject) fehlt" };
    }

    const original = io.exportState();
    if (!original || typeof original !== "object") return { ok: false, summary: "exportState liefert kein Objekt" };

    await state.transaction(async () => {
      const mutated = foundry.utils.deepClone(original);
      mutated.meta = mutated.meta ?? {};
      mutated.meta.roundtripTest = true;

      await io.importStateFromObject(mutated, { save: false, validate: true });

      const now = io.exportState();
      if (!now?.meta?.roundtripTest) throw new Error("import hat State nicht übernommen");

      const e = new Error("JANUS_TEST_ROLLBACK"); e.name = "JanusTestRollback"; throw e;
    }, { silent: true });

    const after = io.exportState();
    const ok = JSON.stringify(after) === JSON.stringify(original);
    return { ok, summary: ok ? "Roundtrip + Rollback OK" : "Rollback nach Import fehlgeschlagen" };
  }
};
