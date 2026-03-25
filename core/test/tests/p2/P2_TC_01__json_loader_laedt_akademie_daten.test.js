export default {
  id: "P2-TC-01",
  title: "AcademyDataApi lädt Basisdaten",
  phases: [2],
  kind: "auto",
  expected: "AcademyDataApi.init() ist erfolgreich; export() liefert lessons/npcs/calendar/locations/events.",
  whereToFind: "engine.academy.data / AcademyDataApi.export()",
  async run(ctx) {
    const engine = ctx?.engine ?? game?.janus7;
    const api = engine?.academy?.data;
    if (!api) return { ok: false, summary: "engine.academy.data fehlt" };

    // export() muss existieren (static); bei instance ggf. api.constructor.export
    const expFn = api.export ?? api?.constructor?.export;
    if (typeof expFn !== "function") {
      return { ok: false, summary: "AcademyDataApi.export() fehlt" };
    }

    const snapshot = expFn.call(api);
    for (const k of ["lessons","npcs","calendar","locations","events"]) {
      if (!snapshot?.[k]) return { ok: false, summary: `export() liefert ${k} nicht` };
    }
    return { ok: true, summary: "Basisdaten vorhanden" };
  }
};
