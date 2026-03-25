
export default {
  id: "P0-TC-01",
  title: "Leitbild konsistent dokumentiert",
  phases: [0],
  kind: "manual",
  expected: "Alle Leitplanken klar dokumentiert, keine DSA5-Logik im Core",
  whereToFind: "docs/ Leitplan & Entwickler-Doku",
  async run() {
    return { ok: true, summary: "Manual", notes: [
      "1) Leitplan & Entwickler-Doku öffnen",
      "2) Phasen 0–8 prüfen",
      "3) Leitplanken prüfen",
      "4) Auf Widersprüche achten"
    ]};
  }
};
