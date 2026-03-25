export default {
  id: 'P6-TC-09',
  title: 'Director Kernel setzt Tagesstart auf Slot 0 zurück',
  phases: [6],
  kind: 'auto',
  expected: 'director.kernel.startDay() normalisiert den aktuellen Tag auf SlotIndex 0.',
  async run({ engine }) {
    const dir = engine?.core?.director ?? engine?.director;
    const cal = engine?.academy?.calendar ?? engine?.calendar;
    if (!dir?.kernel?.startDay) throw new Error('director.kernel.startDay fehlt');
    if (!cal?.getCurrentSlotRef || !cal?.setSlot || !cal?.advanceSlot) throw new Error('calendar API unvollständig');

    let before = cal.getCurrentSlotRef();
    if (!Number.isFinite(before?.slotIndex)) throw new Error('slotIndex im Calendar-Ref fehlt');

    if (before.slotIndex === 0) {
      await cal.advanceSlot({ steps: 1 });
      before = cal.getCurrentSlotRef();
    }

    await dir.kernel.startDay({
      advanceDay: false,
      triggerQueuedEvents: false,
      evaluateSocial: false,
      generateQuests: false,
      runLesson: false,
      save: false,
    });

    const after = cal.getCurrentSlotRef();
    return {
      ok: Number(after?.slotIndex) === 0,
      summary: `slotIndex ${before?.slotIndex} -> ${after?.slotIndex}`
    };
  }
};
