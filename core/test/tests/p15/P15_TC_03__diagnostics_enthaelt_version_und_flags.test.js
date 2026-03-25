/**
 * P15_TC_03 — Diagnostics enthält Version & Flags
 *
 * Zweck:
 * - engine.diagnostics.report() liefert meta.moduleVersion
 * - und enthält konfig-relevante Flags (hier: Settings-Snapshot)
 */

export default {
  id: "P15-TC-03",
  title: "Diagnostics enthält Version & Flags",
  phases: [15],
  kind: "automated",
  expected: "Diagnostics Report beinhaltet eine Modulversion und einen Settings/Flags-Snapshot.",
  whereToFind: "engine.diagnostics.report()",
  async run({ ctx }) {
    const engine = ctx?.engine;
    if (!engine?.diagnostics?.report) {
      return { ok: false, summary: "engine.diagnostics.report fehlt" };
    }

    const rep = await engine.diagnostics.report();
    const mv = rep?.meta?.moduleVersion;
    if (typeof mv !== "string" || mv.trim().length === 0) {
      return { ok: false, summary: "meta.moduleVersion fehlt/leer" };
    }

    // "Flags" = settings snapshot (pragmatische Definition)
    const settings = rep?.meta?.settings;
    if (!settings || typeof settings !== "object") {
      return { ok: false, summary: "meta.settings fehlt" };
    }

    // Mindestens ein paar erwartbare Keys, die wir in config.js definieren.
    const mustHave = [
      "enableSimulation",
      "enableAtmosphere",
      "enableSocial",
      "enableScoring",
    ];
    const missing = mustHave.filter((k) => !(k in settings));
    if (missing.length) {
      return { ok: false, summary: `meta.settings fehlen: ${missing.join(", ")}` };
    }

    return { ok: true, summary: `OK (moduleVersion=${mv})` };
  },
};
