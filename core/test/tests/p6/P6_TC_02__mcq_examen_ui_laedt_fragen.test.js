export default {
  id: "P6-TC-02",
  title: "Shell-Navigation (DOM) funktioniert",
  phases: [6],
  kind: "auto",
  expected: "Shell rendert und View-Wechsel setzt aktive Navigation.",
  whereToFind: "JanusShellApp / janus-shell.hbs",
  async run(ctx) {
    const engine = ctx?.engine ?? game?.janus7;
    if (!engine?.ui?.openShell) return { ok: false, summary: "engine.ui.openShell fehlt" };

    let app = null;
    try {
      app = engine.ui.openShell({ focus: false });
      await new Promise((r) => setTimeout(r, 0));

      const el = app?.element?.[0] ?? app?.element ?? null;
      if (!el || !(el instanceof HTMLElement)) {
        return { ok: false, summary: "App element nicht verfügbar" };
      }

      const btn = el.querySelector('[data-action="selectView"][data-view-id="academy"]');
      if (!btn) {
        return { ok: false, summary: "academy-View Button nicht gefunden" };
      }

      btn.click();
      await new Promise((r) => setTimeout(r, 0));

      const active = el.querySelector('.janus-shell__nav button.is-active, .janus-shell__nav [aria-pressed="true"]');
      const ok = !!active && (active.dataset.viewId === 'academy' || active.getAttribute('data-view-id') === 'academy');
      return { ok, summary: ok ? "Shell-Viewwechsel OK" : "Shell-Navigation wurde nicht aktiv gesetzt" };
    } catch (e) {
      return { ok: false, summary: e?.message ?? String(e) };
    } finally {
      try { await app?.close?.({ force: true }); } catch (_e) {}
    }
  }
};
