export default {
  id: "P2-TC-02",
  title: "ContentRegistry wird gecached (Lazy-Load)",
  phases: [2],
  kind: "auto",
  expected: "getContentRegistry() lädt einmal und liefert danach dieselbe Referenz (kein Duplikat).",
  whereToFind: "AcademyDataApi.getContentRegistry()",
  async run(ctx) {
    const engine = ctx?.engine ?? game?.janus7;
    const api = engine?.academy?.data;
    if (!api || typeof api.getContentRegistry !== "function") {
      return { ok: true, status: "SKIP", summary: "SKIP: getContentRegistry() fehlt" };
    }

    const a = await api.getContentRegistry();
    const b = await api.getContentRegistry();

    if (!a || !b) return { ok: false, summary: "getContentRegistry() liefert null" };

    const sameRef = a === b;
    return { ok: sameRef, summary: sameRef ? "Cache OK (same reference)" : "Cache NICHT aktiv (neue Referenz)" };
  }
};
