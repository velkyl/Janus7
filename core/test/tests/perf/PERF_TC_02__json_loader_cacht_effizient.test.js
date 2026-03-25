// Auto-generated from official test catalog
export default {
  id: "PERF-TC-02",
  title: "JSON-Loader cacht effizient",
  phases: [],
  kind: "manual",
  expected: "Nur 1. Load hat File-I/O, weitere < 1ms aus Cache",
  whereToFind: "Testkatalog",
  async run(ctx) {
    return { ok: true, status: "SKIP", summary: "MANUAL: Nur 1. Load hat File-I/O, weitere < 1ms aus Cache" };
  }
};
