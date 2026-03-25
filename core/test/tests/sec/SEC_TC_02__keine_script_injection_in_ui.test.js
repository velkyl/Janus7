// Auto-generated from official test catalog
export default {
  id: "SEC-TC-02",
  title: "Keine Script-Injection in UI",
  phases: [],
  kind: "manual",
  expected: "Script wird escaped/sanitized, nicht ausgeführt",
  whereToFind: "Testkatalog",
  async run(ctx) {
    return { ok: true, status: "SKIP", summary: "MANUAL: Script wird escaped/sanitized, nicht ausgeführt" };
  }
};
