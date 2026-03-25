export default {
  id: 'P16-TC-06',
  title: 'AcademyOverview: onSetActiveSlot mappt day/phase korrekt auf dayIndex/slotIndex',
  phases: [6],
  kind: 'auto',
  expected: 'dayOrder.indexOf(day) und slotOrder.indexOf(phase) liefern ≥0 für bekannte Werte.',
  whereToFind: 'ui/apps/JanusAcademyOverviewApp.js → onSetActiveSlot',
  async run({ ctx }) {
    const engine = ctx?.engine ?? game?.janus7;
    const calendar = engine?.academy?.calendar;

    if (!calendar) throw new Error('academy.calendar nicht verfügbar');

    const dayOrder = calendar.config?.dayOrder ?? [];
    const slotOrder = calendar.config?.slotOrder ?? calendar.config?.phaseOrder ?? [];

    if (!dayOrder.length) throw new Error('calendar.config.dayOrder ist leer');
    if (!slotOrder.length) throw new Error('calendar.config.slotOrder / phaseOrder ist leer');

    // Erster bekannter Tag und Phase
    const day = dayOrder[0];
    const phase = slotOrder[0];

    const dayIndex = dayOrder.indexOf(day);
    const slotIndex = slotOrder.indexOf(phase);

    if (dayIndex < 0) throw new Error(`dayOrder.indexOf("${day}") = ${dayIndex} — Mapping defekt`);
    if (slotIndex < 0) throw new Error(`slotOrder.indexOf("${phase}") = ${slotIndex} — Mapping defekt`);

    // Unbekannte Werte müssen -1 liefern
    const badDay = dayOrder.indexOf('INVALID_DAY_XYZ');
    const badSlot = slotOrder.indexOf('INVALID_PHASE_XYZ');
    if (badDay >= 0) throw new Error('indexOf auf ungültigem Wert gibt ≥0 zurück – Fehler!');
    if (badSlot >= 0) throw new Error('indexOf auf ungültigem Slot gibt ≥0 zurück – Fehler!');

    return {
      ok: true,
      summary: `dayOrder[0]="${day}"(idx ${dayIndex}), slotOrder[0]="${phase}"(idx ${slotIndex})`
    };
  }
};
