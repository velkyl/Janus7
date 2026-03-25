/**
 * P15_TC_02 — IO Roundtrip (Export → Import)
 *
 * Zweck:
 * - engine.io.exportStateAsJSON() liefert JSON
 * - engine.io.importStateFromJSON() kann den Export wieder importieren
 * - Ein Marker im State überlebt den Roundtrip
 */

function _randTag() {
  return `rt_${Math.random().toString(16).slice(2, 10)}_${Date.now()}`;
}

export default {
  id: "P15-TC-02",
  title: "IO Roundtrip Export/Import funktioniert",
  phases: [15],
  kind: "automated",
  expected: "Exportierbarer State lässt sich wieder importieren; Marker bleibt konsistent.",
  whereToFind: "engine.io.exportStateAsJSON(), engine.io.importStateFromJSON(json)",
  async run({ ctx }) {
    const engine = ctx?.engine;
    if (!engine?.core?.state?.set || !engine?.core?.state?.get) {
      return { ok: false, summary: "engine.core.state API fehlt" };
    }
    if (!engine?.io?.exportStateAsJSON || !engine?.io?.importStateFromJSON) {
      return { ok: false, summary: "engine.io API fehlt" };
    }

    const path = "playerState.ioRoundtrip";
    const tag1 = _randTag();

    // Arrange
    await engine.core.state.set(path, tag1);
    const exported = await engine.io.exportStateAsJSON();
    if (typeof exported !== "string" || exported.length < 10) {
      return { ok: false, summary: "Export ist kein plausibles JSON-String" };
    }

    // Mutate away
    const tag2 = _randTag();
    await engine.core.state.set(path, tag2);
    const before = engine.core.state.get(path);
    if (before !== tag2) {
      return { ok: false, summary: "Vorbedingung: Marker ließ sich nicht ändern" };
    }

    // Act
    const res = await engine.io.importStateFromJSON(exported);
    if (!res?.ok) {
      return { ok: false, summary: `Import fehlgeschlagen: ${res?.error || "(unknown)"}` };
    }

    // Assert
    const after = engine.core.state.get(path);
    if (after !== tag1) {
      return { ok: false, summary: `Marker mismatch: expected=${tag1} got=${after}` };
    }

    return { ok: true, summary: "OK" };
  },
};
