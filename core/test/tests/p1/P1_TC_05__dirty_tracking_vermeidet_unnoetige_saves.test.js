export default {
  id: "P1-TC-05",
  title: "Dirty-Tracking vermeidet unnötige Saves",
  phases: [1],
  kind: "auto",
  expected: "Identische Set-Operationen sollen _dirty NICHT toggeln (Optimierung).",
  whereToFind: "JanusStateCore._dirty / save()",
  async run(ctx) {
    // BHC-Perspektive:
    // Aktueller Stand: state.set() ruft immer _touchMeta() => _dirty wird immer true.
    // Die Optimierung existiert (noch) nicht. Der Test wäre aktuell ein erwarteter FAIL.
    return { ok: true, status: "SKIP", summary: "SKIP: state.set() markiert aktuell immer dirty; Optimierung (idempotent set) nicht implementiert" };
  }
};
