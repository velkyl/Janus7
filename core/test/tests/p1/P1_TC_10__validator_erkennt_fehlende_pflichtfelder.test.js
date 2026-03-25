export default {
  id: "P1-TC-10",
  title: "Validator erkennt fehlende Pflichtfelder",
  phases: [1],
  kind: "auto",
  expected: "validator.validateState() oder IO-Import muss fehlende meta/time erkennen.",
  whereToFind: "game.janus7.core.validator",
  async run(ctx) {
    const engine = ctx?.engine ?? game?.janus7;
    const core = engine?.core;
    const validator = core?.validator;
    const io = core?.io;

    const hasValidate = typeof validator?.validateState === "function";
    const hasImport = typeof io?.importStateFromObject === "function" && typeof io?.exportState === "function";

    if (!hasValidate && !hasImport) {
      return { ok: true, status: "SKIP", summary: "SKIP: validator.validateState() und IO-Import fehlen" };
    }

    const good = hasImport ? io.exportState() : null;
    if (!good || typeof good !== "object") return { ok: false, summary: "Konnte keinen validen State exportieren" };

    const bad = foundry.utils.deepClone(good);
    delete bad.meta;

    if (hasValidate) {
      const res = validator.validateState(bad);
      const ok = res?.valid === false;
      return { ok, summary: ok ? "Validator meldet fehlende meta" : "Validator akzeptiert invalide Daten" };
    }

    let blocked = false;
    try {
      await io.importStateFromObject(bad, { save: false, validate: true });
    } catch (_e) {
      blocked = true;
    }
    return { ok: blocked, summary: blocked ? "Import blockiert" : "Import nicht blockiert" };
  }
};
