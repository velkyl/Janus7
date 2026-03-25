export default {
  id: "P6-TC-03",
  title: "Director.time.advanceSlot bewegt den Slot",
  phases: [6],
  kind: "auto",
  expected: "Slot-Ref ändert sich",
  run: async ({ engine }) => {
    const before = engine.calendar.getCurrentSlotRef();
    await engine.core.director.time.advanceSlot(1);
    const after = engine.calendar.getCurrentSlotRef();
    return {
      ok: before?.phase !== after?.phase,
      summary: before?.phase + " -> " + after?.phase
    };
  }
};
