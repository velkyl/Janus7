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
  expected: "Diagnostics Report beinhaltet eine Modulversion, einen Settings/Flags-Snapshot und der Health-Command liefert denselben Report konvergent aus.",
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

    const notes = [`moduleVersion=${mv}`];
    const healthCommand = engine?.commands?.runHealthCheck;
    if (typeof healthCommand === "function" && game?.user?.isGM) {
      const cmd = await healthCommand({});
      if (cmd?.success !== true) {
        return { ok: false, summary: "commands.runHealthCheck() fehlgeschlagen" };
      }

      const commandReport = cmd?.data?.report;
      if (!commandReport || typeof commandReport !== "object") {
        return { ok: false, summary: "commands.runHealthCheck() liefert keinen Diagnostics-Report" };
      }

      if (commandReport.health !== rep.health) {
        return {
          ok: false,
          summary: `Health-Drift zwischen diagnostics.report (${rep.health}) und commands.runHealthCheck (${commandReport.health})`
        };
      }

      const commandResults = cmd?.data?.results;
      if (!commandResults || typeof commandResults !== "object") {
        return { ok: false, summary: "commands.runHealthCheck() liefert keine strukturierte Result-Map" };
      }

      notes.push(`commandHealth=${commandReport.health}`);
    }

    return { ok: true, summary: `OK (${notes.join(", ")})`, notes };
  },
};
