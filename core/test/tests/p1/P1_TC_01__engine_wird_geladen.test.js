export default {
  id: "P1-TC-01",
  title: "Engine wird auf game.janus7 registriert",
  phases: [1],
  kind: "auto",
  expected: "game.janus7 existiert, core/state vorhanden.",
  whereToFind: "game.janus7",
  async run(_ctx) {
    const engine = game?.janus7;
    if (!engine) return { ok: false, summary: "game.janus7 fehlt" };
    if (!engine.core) return { ok: false, summary: "engine.core fehlt" };
    if (!engine.core.state) return { ok: false, summary: "engine.core.state fehlt" };
    return { ok: true, summary: "Engine registriert" };
  }
};
