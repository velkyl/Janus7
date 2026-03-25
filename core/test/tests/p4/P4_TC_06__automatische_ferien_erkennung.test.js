export default {
  id: "P4-TC-06",
  title: "Holiday-Flag wird berechnet",
  phases: [4],
  kind: "auto",
  expected: "_computeIsHoliday liefert boolean und crasht nicht.",
  whereToFind: "engine.simulation.calendar._computeIsHoliday",
  async run(ctx) {
    const engine = ctx?.engine ?? game?.janus7;
    const cal = engine?.simulation?.calendar;
    if (!cal || typeof cal.getCurrentSlotRef !== "function") return { ok: false, summary: "simulation.calendar fehlt" };

    const slotRef = cal.getCurrentSlotRef();
    if (!slotRef) return { ok: false, summary: "getCurrentSlotRef() liefert null" };

    if (typeof cal._computeIsHoliday !== "function") {
      return { ok: true, status: "SKIP", summary: "SKIP: _computeIsHoliday nicht vorhanden" };
    }

    const v = cal._computeIsHoliday(slotRef);
    const ok = typeof v === "boolean";
    return { ok, summary: ok ? `Holiday-Flag = ${v}` : "Return ist kein boolean" };
  }
};
