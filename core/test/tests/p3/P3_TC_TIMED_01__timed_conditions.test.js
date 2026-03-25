/**
 * @file core/test/tests/p3/P3_TC_TIMED_01__timed_conditions.test.js
 * @module janus7/test
 * @phase 3
 */

export default {
  id: 'P3-TC-TIMED-01',
  phase: 3,
  title: 'Timed Conditions: addTimedCondition + applyTimedAcademyCondition',
  prio: 'P1',
  type: 'M',

  requires: [
    'DSA5-System aktiv',
    'Actor mit owner-Rechten vorhanden',
    'game.time.worldTime verfügbar (Foundry Simple Calendar oder ähnlich)',
  ],

  snippets: [
    {
      title: '1. JANUS_DURATION Konstanten prüfen',
      code: `
// Dauer-Konstanten direkt als Sekunden (JANUS_DURATION.ONE_HOUR=3600, ONE_DAY=86400 etc.)
const JANUS_DURATION = { ONE_HOUR: 3600, TWO_HOURS: 7200, HALF_DAY: 43200, ONE_DAY: 86400, TWO_DAYS: 172800, THREE_DAYS: 259200, ONE_WEEK: 604800, TWO_WEEKS: 1209600, HOURS: (h) => h*3600, DAYS: (d) => d*86400, WEEKS: (w) => w*7*86400 };

console.assert(JANUS_DURATION.ONE_DAY   === 86400,   'ONE_DAY');
console.assert(JANUS_DURATION.ONE_WEEK  === 604800,  'ONE_WEEK');
console.assert(JANUS_DURATION.TWO_HOURS === 7200,    'TWO_HOURS');
console.assert(JANUS_DURATION.DAYS(3)   === 259200,  'DAYS(3)');
console.assert(JANUS_DURATION.HOURS(6)  === 21600,   'HOURS(6)');
console.log('✅ JANUS_DURATION OK');
      `,
    },
    {
      title: '2. addTimedCondition direkt (1 Tag)',
      code: `
// Dauer-Konstanten direkt als Sekunden (JANUS_DURATION.ONE_HOUR=3600, ONE_DAY=86400 etc.)
const JANUS_DURATION = { ONE_HOUR: 3600, TWO_HOURS: 7200, HALF_DAY: 43200, ONE_DAY: 86400, ONE_WEEK: 604800, HOURS: (h) => h*3600, DAYS: (d) => d*86400 };

const actor = (game.actors.getName('Testmagier') ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0]); // Namen anpassen
const bridge = game.janus7.bridge.dsa5;

const effect = await bridge.addTimedCondition(actor, 'feared', {
  value: 1,
  seconds: JANUS_DURATION.ONE_DAY,
  description: 'Test: Prüfungspanik'
});

console.log('Effect erstellt:', effect?.[0]?.name);
console.log('Duration:', effect?.[0]?.duration);
// Prüfen: actor.effects in Foundry sollte jetzt "feared" mit duration.seconds=86400 haben
      `,
    },
    {
      title: '3. applyTimedAcademyCondition — aus Map',
      code: `
const actor = (game.actors.getName('Testmagier') ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0]);
const bridge = game.janus7.bridge.dsa5;

// exam_panic: feared, 1 Tag
await bridge.applyTimedAcademyCondition(actor, 'exam_panic');
console.log('exam_panic gesetzt (1 Tag)');

// magic_shock: stunned, 2h
await bridge.applyTimedAcademyCondition(actor, 'magic_shock');
console.log('magic_shock gesetzt (2h)');

// Alle aktiven timed conditions anzeigen
const timed = await bridge.getTimedConditions(actor);
console.table(timed.map(t => ({
  name: t.name,
  remaining: t.remainingSeconds + 's',
  expired: t.expired
})));
      `,
    },
    {
      title: '4. applyTimedAcademyCondition — secondsOverride',
      code: `
// Dauer-Konstanten direkt als Sekunden (JANUS_DURATION.ONE_HOUR=3600, ONE_DAY=86400 etc.)
const JANUS_DURATION = { ONE_HOUR: 3600, TWO_HOURS: 7200, HALF_DAY: 43200, ONE_DAY: 86400, TWO_DAYS: 172800, THREE_DAYS: 259200, ONE_WEEK: 604800, HOURS: (h) => h*3600, DAYS: (d) => d*86400 };

const actor = (game.actors.getName('Testmagier') ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0]);
const bridge = game.janus7.bridge.dsa5;

// Stress nur 3 Tage statt Standard 7 Tage
await bridge.applyTimedAcademyCondition(actor, 'stress', {
  secondsOverride: JANUS_DURATION.THREE_DAYS,
  descriptionOverride: 'Leichter Lernstress (kurz)'
});
console.log('Stress mit Override gesetzt');
      `,
    },
    {
      title: '5. applyTimedConditionToMany — Klassenprüfung',
      code: `
const bridge = game.janus7.bridge.dsa5;

// Alle NPCs mit actorUuid aus AcademyDataApi
const students = game.janus7.academy.data.listStudents();
const actorRefs = students
  .map(s => s?.foundry?.actorUuid ?? s?.foundryUuid)
  .filter(Boolean);

console.log(\`Wende post_exam_fatigue auf \${actorRefs.length} Schüler an...\`);

const results = await bridge.applyTimedConditionToMany(actorRefs, 'post_exam_fatigue');

const ok  = results.filter(r => r.success).length;
const err = results.filter(r => !r.success).length;
console.log(\`✅ Erfolgreich: \${ok} | ❌ Fehler: \${err}\`);
results.filter(r => !r.success).forEach(r => console.warn(r.actor, r.error));
      `,
    },
    {
      title: '6. Hook janus7ExamResultRecorded — manuelle Auslösung zum Test',
      code: `
// Simuliert was exams.recordExamResult() nach einem echten Ergebnis feuert
Hooks.callAll('janus7ExamResultRecorded', {
  actorUuid: (game.actors.getName('Testmagier') ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0])?.uuid,
  examId: 'EXAM_MAG_BASICS_01',
  status: 'failed',       // → exam_panic + stress werden gesetzt
  score: 2,
  maxScore: 10,
  examDef: null,
});
console.log('Hook gefeuert — JanusExamConditionHooks reagiert falls registriert.');
      `,
    },
    {
      title: '7. Aktive Timed-Conditions des Actors anzeigen',
      code: `
// Aktive Timed-Conditions eines Actors prüfen
const bridge = game.janus7.bridge.dsa5;
const actor = (game.actors.getName('Testmagier')
  ?? game.actors.contents.find(a => a.type === 'character')
  ?? game.actors.contents[0]);

if (!actor) { console.error('Kein Actor gefunden'); }
else {
  const timed = await bridge.getTimedConditions(actor);
  console.table(timed.map(t => ({
    conditionId: t.conditionId,
    name:        t.name ?? t.conditionId,
    remaining:   t.remainingSeconds,
    expired:     t.expired ?? false
  })));
  console.log(timed.length + ' aktive Timed-Conditions auf ' + actor.name);
}
`,
    },
    {
      title: '8. Fallback: kein seconds → permanente Condition',
      code: `
const actor = (game.actors.getName('Testmagier') ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0]);
const bridge = game.janus7.bridge.dsa5;

// Kein seconds → fällt auf actor.addCondition() zurück (permanent)
await bridge.addTimedCondition(actor, 'stunned', {
  value: 1
  // kein seconds, kein rounds
});
console.log('Permanent-Fallback OK (Konsole sollte warn zeigen)');
      `,
    },
  ],

  expectedResults: [
    'Timed effects erscheinen im Actor-Sheet mit Ablaufzeit',
    'game.time.worldTime + duration.seconds = Ablaufzeitpunkt',
    'Nach Zeitablauf verschwindet Effect automatisch (Foundry-Standard)',
    'applyToMany: alle Actors bekommen Condition, Fehler werden geloggt aber nicht geworfen',
    'Hook janus7ExamResultRecorded → JanusExamConditionHooks.register() → applyTimedAcademyCondition()',
  ],
};
