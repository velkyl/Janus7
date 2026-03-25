/**
 * JANUS7 – Phase 4 TestRunner (Version 0.4.5)
 *
 * Zweck:
 *  - Führt eine Reihe einfacher Checks für die Phase-4-Engines durch:
 *    - Kalender
 *    - Scoring
 *    - Lessons
 *    - Exams
 *    - Events
 *    - Social
 *
 * Hinweis:
 *  - Der Runner verändert den State minimal (legt z. B. Testpunkte an).
 *  - Kann gefahrlos in einer Testwelt ausgeführt werden.
 */

(async () => {
  const TAG = 'JANUS7-Phase4-TestRunner';

  function assert(cond, msg) {
    if (!cond) throw new Error(msg);
  }

  const results = [];
  function record(name, ok, error) {
    results.push({ name, ok, error: error ? String(error) : null });
    const icon = ok ? '✅' : '❌';
    console[ok ? 'log' : 'error'](`[${TAG}] ${icon} ${name}`, error || '');
  }

  if (!game?.user?.isGM) {
    ui.notifications?.error?.('[JANUS7] Nur der GM darf den TestRunner ausführen.');
    return;
  }

  const j = game.janus7;
  if (!j) {
    ui.notifications?.error?.('[JANUS7] Engine nicht gefunden (game.janus7).');
    return;
  }

  const academy = j.academy;
  if (!academy) {
    ui.notifications?.error?.('[JANUS7] Academy-Namespace nicht verfügbar.');
    return;
  }

  const calendar = academy.calendar;
  const scoring  = academy.scoring;
  const lessons  = academy.lessons;
  const exams    = academy.exams;
  const events   = academy.events;
  const social   = academy.social;

  // ---------------------------------------------------------------------------
  // Tests
  // ---------------------------------------------------------------------------

  // Kalender
  try {
    const before = calendar.getCurrentSlotRef();
    const after  = await calendar.advancePhase({ steps: 1 });
    assert(after, 'advancePhase muss einen Slot zurückgeben');
    assert(typeof after.phase === 'string', 'Slot.phase muss gesetzt sein');
    record('Calendar: advancePhase basic', true);
  } catch (err) {
    record('Calendar: advancePhase basic', false, err);
  }

  // Scoring
  try {
    const sBefore = scoring.getCircleScore('testrunner');
    const sAfter  = await scoring.addCirclePoints('testrunner', 3, 'TestRunner', {
      source: 'testrunner'
    });
    assert(typeof sAfter === 'number', 'Score muss Zahl sein');
    assert(sAfter === sBefore + 3 || sBefore === 0, 'Score muss um 3 steigen (oder neu angelegt werden)');
    record('Scoring: addCirclePoints basic', true);
  } catch (err) {
    record('Scoring: addCirclePoints basic', false, err);
  }


  // Scoring – History / getLastAwards
  try {
    const history = scoring.getLastAwards ? scoring.getLastAwards() : [];
    assert(Array.isArray(history), 'getLastAwards muss ein Array liefern (oder leer).');
    record('Scoring: getLastAwards basic', true);
  } catch (err) {
    record('Scoring: getLastAwards basic', false, err);
  }

  // Lessons
  try {
    const slot = calendar.getCurrentSlotRef();
    const list = lessons.getLessonsForSlot(slot) || [];
    assert(Array.isArray(list), 'getLessonsForSlot muss ein Array liefern');
    record('Lessons: getLessonsForSlot returns array', true);
  } catch (err) {
    record('Lessons: getLessonsForSlot returns array', false, err);
  }

  // Exams – Grading Helpers
  try {
    const scheme = exams.getGradingScheme({});
    assert(Array.isArray(scheme) && scheme.length > 0, 'getGradingScheme muss ein Schema liefern');
    const grading = exams.determineStatusFromScore({ score: 8, maxScore: 10, examDef: {} });
    assert(grading && grading.statusId, 'determineStatusFromScore muss einen Status liefern');
    record('Exams: grading helpers basic', true);
  } catch (err) {
    record('Exams: grading helpers basic', false, err);
  }

  // Events
  try {
    const slot = calendar.getCurrentSlotRef();
    const evs  = events.listEventsForSlot(slot) || [];
    assert(Array.isArray(evs), 'listEventsForSlot muss ein Array liefern');
    record('Events: listEventsForSlot returns array', true);
  } catch (err) {
    record('Events: listEventsForSlot returns array', false, err);
  }

  // Social
  try {
    const v1 = await social.setAttitude('testrunner-A', 'testrunner-B', 5, { tags: ['testrunner'] });
    assert(v1 === 5, 'setAttitude muss Wert setzen');
    const v2 = await social.adjustAttitude('testrunner-A', 'testrunner-B', 2, { tags: ['testrunner'] });
    assert(v2 === 7, 'adjustAttitude muss Wert erhöhen');
    const v3 = social.getAttitude('testrunner-A', 'testrunner-B');
    assert(v3 === 7, 'getAttitude muss aktuellen Wert liefern');
    record('Social: basic set/adjust/get', true);
  } catch (err) {
    record('Social: basic set/adjust/get', false, err);
  }


  // Social – Query-Helper
  try {
    const listFrom = social.listRelationshipsFrom
      ? social.listRelationshipsFrom('testrunner-A')
      : [];
    assert(Array.isArray(listFrom), 'listRelationshipsFrom muss ein Array liefern.');
    record('Social: listRelationshipsFrom basic', true);
  } catch (err) {
    record('Social: listRelationshipsFrom basic', false, err);
  }

  // ---------------------------------------------------------------------------
  // Bericht
  // ---------------------------------------------------------------------------

  const okCount = results.filter(r => r.ok).length;
  const failCount = results.length - okCount;

  let html = `<h2>JANUS7 – Phase 4 TestRunner</h2>`;
  html += `<p>Getestete Engines: Kalender, Scoring, Lessons, Exams, Events, Social.</p>`;
  html += `<p>Ergebnis: <b>${okCount}</b> OK, <b>${failCount}</b> Fehler.</p>`;
  html += `<ul>`;
  for (const r of results) {
    const icon = r.ok ? '✅' : '❌';
    html += `<li>${icon} ${r.name}${r.error ? ` – <code>${r.error}</code>` : ''}</li>`;
  }
  html += `</ul>`;
  html += `<p><small>Details siehe Browser-Konsole (F12).</small></p>`;

  await ChatMessage.create({
    content: html,
    speaker: { alias: 'JANUS7 Phase 4 TestRunner' }
  });
})();
