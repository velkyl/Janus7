export default {
  id: "P6-TC-01",
  title: "ControlPanel öffnet und schließt",
  phases: [6],
  kind: "auto",
  expected: "UI render → assert → close ohne Fehler.",
  whereToFind: "engine.ui.openControlPanel()",
  async run(ctx) {
    const engine = ctx?.engine ?? game?.janus7;
    if (!engine?.ui?.openControlPanel) return { ok: false, summary: "engine.ui.openControlPanel fehlt" };

    const waitFor = async (pred, { timeoutMs = 1200, stepMs = 25 } = {}) => {
      const t0 = Date.now();
      while ((Date.now() - t0) < timeoutMs) {
        try { if (await pred()) return true; } catch (_e) {}
        await new Promise((r) => setTimeout(r, stepMs));
      }
      return false;
    };

    let app = null;
    try {
      // In manchen Builds liefert openControlPanel eine Promise.
      app = await engine.ui.openControlPanel({ focus: false });

      // Render deterministisch erzwingen, wenn möglich.
      if (typeof app?.render === "function") {
        await app.render({ force: true });
      }

      // ApplicationV2 ist erst "wirklich" da, wenn ein Element existiert.
      const ok = await waitFor(() => {
        const el = app?.element;
        if (el && typeof el.length === 'number') return el.length > 0;
        return !!app?.rendered;
      }, { timeoutMs: 1800, stepMs: 30 });
      if (!ok) return { ok: false, summary: "App ist nicht gerendert" };

      return { ok: true, summary: "ControlPanel render OK" };
    } catch (e) {
      return { ok: false, summary: e?.message ?? String(e) };
    } finally {
      try { await app?.close?.({ force: true }); } catch (_e) {}
    }
  }
};
