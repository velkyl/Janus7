/**
 * P15_TC_01 — Kill-Switch Settings sind registriert
 *
 * Zweck:
 * - Beim Laden des Moduls müssen die Kill-Switches als game.settings existieren.
 * - Der Test ist defensiv: er prüft nur Registrierung + Defaults.
 */

export default {
  id: "P15-TC-01",
  title: "Kill-Switch Settings sind registriert",
  phases: [15],
  kind: "automated",
  expected: "Alle Kill-Switch Settings sind im Foundry Settings Registry vorhanden.",
  whereToFind: "game.settings.get('janus7', <key>)",
  async run({ ctx }) {
    const engine = ctx?.engine;
    const ns = "janus7";

    if (!engine?.config?.KILL_SWITCHES) {
      return { ok: false, summary: "engine.config.KILL_SWITCHES fehlt" };
    }

    const keys = Object.values(engine.config.KILL_SWITCHES);
    const missing = [];
    const values = {};

    for (const key of keys) {
      try {
        const v = game.settings.get(ns, key);
        values[key] = v;
      } catch (_e) {
        missing.push(key);
      }
    }

    if (missing.length) {
      return { ok: false, summary: `Fehlende Settings: ${missing.join(", ")}` };
    }

    // Minimal-Check: Werte sind boolean (Kill-Switches sind toggles)
    const nonBool = Object.entries(values).filter(([, v]) => typeof v !== "boolean");
    if (nonBool.length) {
      return {
        ok: false,
        summary: `Nicht-boolean Werte: ${nonBool.map(([k, v]) => `${k}=${typeof v}`).join(", ")}`,
      };
    }

    return { ok: true, summary: `OK (${keys.length} Settings)` };
  },
};
