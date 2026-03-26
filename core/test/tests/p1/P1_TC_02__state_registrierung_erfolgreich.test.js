import { MODULE_ID } from '../../../common.js';

export default {
  id: "P1-TC-02",
  title: "State-Registrierung erfolgreich",
  phases: [1],
  kind: "auto",
  expected: "Foundry Settings-Key janus7.coreState ist registriert und JanusStateCore ist initialisiert.",
  whereToFind: "game.settings.settings / game.janus7.core.state",
  async run(ctx) {
    const engine = ctx?.engine ?? game?.janus7;
    if (!engine?.core?.state) return { ok: false, summary: "engine.core.state fehlt" };

    const key = `${MODULE_ID}.coreState`;
    const hasSetting = game?.settings?.settings?.has?.(key) ?? false;

    if (!hasSetting) {
      return { ok: false, summary: `Setting ${key} nicht registriert` };
    }

    // State muss geladen sein (ready)
    const st = engine.core.state.get?.("meta") ?? null;
    if (!st || typeof st !== "object") {
      return { ok: false, summary: "State scheint nicht geladen (meta fehlt)" };
    }

    return { ok: true, summary: "State registriert und geladen" };
  }
};
