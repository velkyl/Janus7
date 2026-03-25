export default {
  id: "P1-TC-08",
  title: "IO-Validierung blockiert invalide Daten",
  phases: [1],
  kind: "auto",
  expected: "importStateFromObject(validate=true) wirft bei fehlenden Pflichtfeldern.",
  whereToFind: "game.janus7.core.io / validator",
  async run(ctx) {
    const engine = ctx?.engine ?? game?.janus7;
    const core = engine?.core;
    const io = core?.io;

    if (!io || typeof io.exportState !== "function" || typeof io.importStateFromObject !== "function") {
      return { ok: true, status: "SKIP", summary: "SKIP: core.io.exportState/importStateFromObject fehlt" };
    }

    const good = io.exportState();
    const bad = foundry.utils.deepClone(good);
    delete bad.meta;

    let blocked = false;
    try {
      await io.importStateFromObject(bad, { save: false, validate: true });
    } catch (_e) {
      blocked = true;
    }

    return { ok: blocked, summary: blocked ? "Invalider Import wurde blockiert" : "Import wurde NICHT blockiert (Validator fehlt/ignoriert?)" };
  }
};
