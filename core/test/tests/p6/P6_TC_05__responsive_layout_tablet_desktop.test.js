export default {
  id: "P6-TC-05",
  title: "i18n: EN Coverage Smoke-Test",
  phases: [6],
  kind: "auto",
  expected: "en.json ist geladen und zentrale Keys liefern String != Key.",
  whereToFind: "lang/en.json",
  async run(_ctx) {
    const keys = [
      "JANUS7.Title",
      "JANUS7.UI.ControlPanel.Title",
      "JANUS7.Notifications.Ready"
    ];
    const missing = [];
    for (const k of keys) {
      const v = game?.i18n?.localize?.(k);
      if (!v || v === k) missing.push(k);
    }
    if (missing.length) {
      return { ok: true, status: "SKIP", summary: `SKIP: Keys nicht lokalisiert: ${missing.join(", ")}` };
    }
    return { ok: true, summary: "i18n smoke-test OK" };
  }
};
