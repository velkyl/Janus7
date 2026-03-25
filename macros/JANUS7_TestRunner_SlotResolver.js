/**
 * JANUS7 SlotResolver TestRunner (v0.5.1.1)
 *
 * Zweck:
 *  - Smoke-Test für SlotResolver: Calendar-direct + TeachingSession/template fallback
 *  - Prüft Lessons/Exams/Events APIs für mehrere Slots
 *  - Testet Input-Validation (malformed slotRef)
 *
 * Nutzung:
 *  - Als GM ausführen.
 */

(async () => {
  const engine = game?.janus7;
  if (!engine) return ui.notifications.error('JANUS7 nicht initialisiert (game.janus7 fehlt).');

  const simCal = engine.simulation?.calendar ?? engine.academy?.calendar ?? null;
  if (!simCal?.getCurrentSlotRef) return ui.notifications.error('JANUS7 CalendarEngine fehlt oder hat kein getCurrentSlotRef().');

  const slotResolver = engine.academy?.slotResolver ?? engine.simulation?.slotResolver ?? null;

  const dayNames = ['Praiosstag', 'Rondratag', 'Efferdtag', 'Traviatag', 'Borontag', 'Hesindetag', 'Firuntag'];
  const phases = ['Morgen', 'Vormittag', 'Mittag', 'Nachmittag'];

  const base = simCal.getCurrentSlotRef();
  const header = `JANUS7 SlotResolver Test (base y${base.year} t${base.trimester} w${base.week})`;

  console.log(header, { base, slotResolver });

  // 1) Validation Test (should not throw)
  if (slotResolver?.resolveSlot) {
    const malformed = { year: base.year, trimester: base.trimester, week: base.week, day: base.day /* phase missing */ };
    const res = slotResolver.resolveSlot(malformed);
    console.log('Validation test (missing phase) ->', res?.meta);
  }

  const rows = [];

  for (const day of dayNames) {
    for (const phase of phases) {
      const slotRef = { ...base, day, phase };

      const lessons = engine.academy?.lessons?.getLessonsForSlot?.(slotRef) ?? [];
      const exams = engine.academy?.exams?.getExamsForSlot?.(slotRef) ?? [];
      const events = engine.academy?.events?.listEventsForSlot?.(slotRef) ?? [];

      rows.push({
        day,
        phase,
        lessons: lessons.length,
        exams: exams.length,
        events: events.length,
        sampleLesson: lessons?.[0]?.lesson?.name ?? lessons?.[0]?.lesson?.id ?? null,
        meta: lessons?.[0]?.calendarEntry ? 'calendar' : (lessons?.[0]?.teachingSession ? 'teachingSession' : null)
      });
    }
  }

  // Render to chat (compact)
  const lines = rows.map(r => `${r.day} ${r.phase}: L${r.lessons}/E${r.exams}/V${r.events}` + (r.sampleLesson ? ` | ${r.meta}: ${r.sampleLesson}` : ''));
  const content = `<h2>${header}</h2><pre style="white-space:pre-wrap">${lines.join('\n')}</pre>`;
  ChatMessage.create({ content });

  console.table(rows);
})();
