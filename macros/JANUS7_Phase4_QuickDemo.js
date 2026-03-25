
/**
 * Hinweis (0.4.5):
 *  Phase-4 Event-Runner erzeugt keine ChatMessages direkt mehr.
 *  Dieses Makro kann optional den Hook `janus7EventMessage` abonnieren und
 *  die Inhalte als ChatMessages ausgeben.
 */

/**
 * JANUS7 – Phase 4 Quick Demo (Version 0.4.1)
 *
 * Zweck:
 *  - Schnelle Sichtprüfung der Phase-4-Simulation im laufenden Spiel.
 *  - Zeigt Kalender-Slot vorher/nachher.
 *  - Listet Lessons / Exams / Events für den aktuellen Slot.
 *  - Optional: vergibt 1 Debug-Punkt an einen Demo-Zirkel.
 *
 * Nutzung:
 *  - Als GM in Foundry ein Makro vom Typ "Script" anlegen.
 *  - Diesen Code einfügen.
 *  - Makro ausführen.
 *
 * Hinweis:
 *  - Das Makro schreibt minimal in den State:
 *    - `scoring.circles['debug-circle'] += 1` (falls ScoringEngine verfügbar).
 *  - Dies kann jederzeit manuell zurückgesetzt werden.
 */

(async () => {
  const TAG = 'JANUS7-PHASE4-DEMO';

  // --- Preconditions --------------------------------------------------------
  if (!game?.user?.isGM) {
    ui.notifications?.error?.('[JANUS7] Nur der GM darf dieses Makro ausführen.');
    return;
  }

  const j = game.janus7;
  if (!j) {
    ui.notifications?.error?.('[JANUS7] Engine nicht gefunden (game.janus7 ist undefined).');
    return;
  }

  const academy = j.academy;
  if (!academy) {
    ui.notifications?.error?.('[JANUS7] Academy-Namespace nicht verfügbar (Phase 2/4 nicht initialisiert?).');
    return;
  }

  const calendar = academy.calendar;
  const scoring  = academy.scoring;
  const lessons  = academy.lessons;
  const exams    = academy.exams;
  const events   = academy.events;
  const social   = academy.social;

  if (!calendar) {
    ui.notifications?.error?.('[JANUS7] CalendarEngine nicht verfügbar (Phase 4 nicht aktiv?).');
    return;
  }

  // --- Demo: Kalender -------------------------------------------------------
  const slotBefore = calendar.getCurrentSlotRef();
  const slotAfter  = await calendar.advancePhase({ steps: 1 });

  // --- Demo: Lessons / Exams / Events --------------------------------------
  const lessonsNow = lessons ? lessons.getLessonsForCurrentSlot() : [];
  const examsNow   = exams ? exams.getExamsForCurrentSlot(calendar) : [];
  const eventsNow  = events ? events.listEventsForCurrentSlot()    : [];

  // --- Demo: Scoring (Debug-Zirkel) ----------------------------------------
  let scoringChange = null;
  if (scoring) {
    try {
      const circleId = 'debug-circle';
      const reason   = 'JANUS7 Phase 4 Quick Demo Macro';
      const newScore = await scoring.addCirclePoints(circleId, 1, reason, {
        source: 'macro',
        meta: { tag: TAG }
      });
      scoringChange = { circleId, newScore };
    } catch (err) {
      console.error('[JANUS7] Fehler beim Vergabe von Debug-Punkten', err);
    }
  }

  // --- Demo: Social (nur Lesen, kein Write) ---------------------------------
  let sampleSocial = null;
  if (social) {
    // Beispiel: erste Relationship im Graphen auslesen (falls vorhanden)
    const socialState = j.core?.state?.get('academy.social') ?? {};
    const rels = socialState.relationships ?? {};
    const fromIds = Object.keys(rels);
    if (fromIds.length > 0) {
      const fromId = fromIds[0];
      const toIds = Object.keys(rels[fromId] ?? {});
      if (toIds.length > 0) {
        const toId = toIds[0];
        sampleSocial = {
          fromId,
          toId,
          attitude: social.getAttitude(fromId, toId)
        };
      }
    }
  }

  // --- Logging --------------------------------------------------------------
  console.group('%cJANUS7 PHASE 4 QUICK DEMO', 'font-weight: bold;');

  console.log('Slot vorher:', slotBefore);
  console.log('Slot nachher (nach advancePhase(1)):', slotAfter);

  console.group('Lessons für aktuellen Slot');
  console.log(lessonsNow);
  console.groupEnd();

  console.group('Exams für aktuellen Slot');
  console.log(examsNow);
  console.groupEnd();

  console.group('Events für aktuellen Slot');
  console.log(eventsNow);
  console.groupEnd();

  if (scoringChange) {
    console.group('Scoring-Debug');
    console.log('Debug-Zirkel:', scoringChange.circleId, 'neuer Score:', scoringChange.newScore);
    console.groupEnd();
  }

  if (sampleSocial) {
    console.group('Social-Demo');
    console.log(
      `Attitüde von ${sampleSocial.fromId} gegenüber ${sampleSocial.toId}:`,
      sampleSocial.attitude
    );
    console.groupEnd();
  }

  console.groupEnd();

  // --- Chat-Ausgabe ---------------------------------------------------------
  const slotLine = `Slot: Jahr ${slotAfter.year}, Trimester ${slotAfter.trimester}, Woche ${slotAfter.week}, Tag ${slotAfter.day}, Phase ${slotAfter.phase}`;
  const lessonCount = lessonsNow?.length ?? 0;
  const examCount   = examsNow?.length ?? 0;
  const eventCount  = eventsNow?.length ?? 0;

  let html = `<h2>JANUS7 Phase 4 – Quick Demo</h2>`;
  html += `<p>${slotLine}</p>`;
  html += `<ul>`;
  html += `<li>Lessons in diesem Slot: <b>${lessonCount}</b></li>`;
  html += `<li>Exams in diesem Slot: <b>${examCount}</b></li>`;
  html += `<li>Events in diesem Slot: <b>${eventCount}</b></li>`;
  if (scoringChange) {
    html += `<li>Debug-Scoring: Zirkel <code>${scoringChange.circleId}</code> hat jetzt <b>${scoringChange.newScore}</b> Punkte.</li>`;
  }
  if (sampleSocial) {
    html += `<li>Social-Beispiel: Attitüde von <code>${sampleSocial.fromId}</code> gegenüber <code>${sampleSocial.toId}</code> = <b>${sampleSocial.attitude}</b></li>`;
  }
  html += `</ul>`;
  html += `<p><small>Details im Browser-Log (Konsole) ansehen für vollständige Objekte.</small></p>`;

  await ChatMessage.create({
    content: html,
    speaker: { alias: 'JANUS7 Phase 4' }
  });
})();
