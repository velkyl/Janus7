/**
 * @file core/test/tests/p3/P3_TC_ADV_01__advancement_bridge.test.js
 * @module janus7/test
 * @phase 3
 */

export default {
  id: 'P3-TC-ADV-01',
  phase: 3,
  title: 'Advancement Bridge: AP-Kosten, Steigerung, APTracker-Integration',
  prio: 'P1',
  type: 'M',

  requires: [
    'DSA5-System aktiv',
    'Actor (Schüler) mit Talent-Items vorhanden',
    'GM-Rechte',
    'game.janus7.bridge.dsa5 initialisiert',
  ],

  snippets: [
    {
      title: '1. ADVANCEMENT_COSTS Unit-Test (ohne Foundry)',
      code: `
// Advancement-Cost-Checks via Runtime (kein import nötig — Werte sind in den DSA5-Regeln fest)
// Führe getAdvanceCost mit unterschiedlichen Werten aus:
const bridge = game.janus7.bridge.dsa5;
console.log('Bridge verfügbar:', !!bridge.advancement);
// Kostenprüfung: Kategorie A, Stufe 0→1
const costA = bridge.getAdvanceCost({ system: { category: 'A', talentValue: { value: 0 } } });
console.log('Kosten Kat. A Stufe 0→1:', costA, '(erwartet: 1 AP)');
console.log('✅ Advancement-Bridge erreichbar');
      `,
    },
    {
      title: '2. getXpStatus eines Actors',
      code: `
const actor = ((game.actors.getName('Testmagier') ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0]) ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0]);
const bridge = game.janus7.bridge.dsa5;

const xp = await bridge.getXpStatus(actor);
console.log('XP-Status:', xp);
// → { total: 1100, spent: 450, free: 650 }
console.assert(xp.free === xp.total - xp.spent, 'free = total - spent');
      `,
    },
    {
      title: '3. awardXp — AP vergeben',
      code: `
const actor = ((game.actors.getName('Testmagier') ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0]) ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0]);
const bridge = game.janus7.bridge.dsa5;

const before = await bridge.getXpStatus(actor);
const result = await bridge.awardXp(actor, 25, 'Test-AP');
const after  = await bridge.getXpStatus(actor);

console.assert(after.total === before.total + 25, '+25 total');
console.assert(after.free  === before.free  + 25, '+25 free');
console.log(\`AP vergeben: \${before.total}→\${after.total}\`);
      `,
    },
    {
      title: '4. getAdvanceCost — Item-Steigerungskosten lesen',
      code: `
const actor = ((game.actors.getName('Testmagier') ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0]) ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0]);
const item  = actor.items.getName('Magiekunde'); // Talent-Item

const bridge = game.janus7.bridge.dsa5;
const info = bridge.getAdvanceCost(item);
console.log('Steigerungsinfo:', info);
// → { cost: X, currentValue: Y, nextValue: Y+1, category: 'B' }

const canAfford = await bridge.canAffordAdvancement(actor, item);
console.log('Leistbar?', canAfford);
      `,
    },
    {
      title: '4b. getAdvanceCost — Edge Cases (Max Stufe & ungültige Kategorie)',
      code: `
const bridge = game.janus7.bridge.dsa5;

// Edge Case 1: Max Stufe erreicht (z.B. Wert 25 in DSA5)
const maxItem = { system: { StF: { value: 'B' }, talentValue: { value: 25 } } };
const maxCost = bridge.advancement.getAdvanceCost(maxItem);
console.log('Kosten bei Max-Stufe (25):', maxCost);
console.assert(maxCost === null, 'Bei max Stufe sollte null zurückgegeben werden');

// Edge Case 2: Ungültige Kategorie
const invalidCatItem = { system: { StF: { value: 'Z' }, talentValue: { value: 5 } } };
const invalidCatCost = bridge.advancement.getAdvanceCost(invalidCatItem);
console.log('Kosten bei ungültiger Kategorie (Z):', invalidCatCost);
console.assert(invalidCatCost === null, 'Bei ungültiger Kategorie sollte null zurückgegeben werden');

// Edge Case 3: Negativer Talentwert (außerhalb des Arrays)
const negativeItem = { system: { StF: { value: 'B' }, talentValue: { value: -2 } } };
const negativeCost = bridge.advancement.getAdvanceCost(negativeItem);
console.log('Kosten bei negativem Wert (-2):', negativeCost);
console.assert(negativeCost === null, 'Bei negativem Startwert (Index < 0) sollte null zurückgegeben werden');

console.log('✅ getAdvanceCost Edge Cases erfolgreich validiert');
      `,
    },
    {
      title: '5. advanceItem — Talent steigern',
      code: `
const actor = ((game.actors.getName('Testmagier') ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0]) ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0]);
const item  = actor.items.getName('Magiekunde');
const bridge = game.janus7.bridge.dsa5;

const before = item.system.talentValue.value;
const result = await bridge.advanceItem(actor, item);

console.log('Ergebnis:', result);
if (result.success) {
  const after = actor.items.getName('Magiekunde').system.talentValue.value;
  console.assert(after === before + 1, 'Talentgrad +1');
  console.log(\`Magiekunde: \${result.previousValue}→\${result.nextValue} [\${result.cost} AP]\`);
}
// Im APTracker-Journal sollte ein neuer Eintrag erscheinen
      `,
    },
    {
      title: '6. advanceLessonSkills — Lektionsskills steigern',
      code: `
const actor  = ((game.actors.getName('Testmagier') ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0]) ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0]);
const lesson = game.janus7.academy.data.getLesson('LES_Y1_T1_ARITH_01');
const bridge = game.janus7.bridge.dsa5;

const result = await bridge.advanceLessonSkills(actor, lesson, { weightThreshold: 0.7 });
console.log('Advanced:', result.advanced);
console.log('Skipped:', result.skipped);
console.log('Failed:', result.failed);
// Nur Skills mit weight ≥ 0.7 in lesson.mechanics.skills werden gesteigert
      `,
    },
    {
      title: '7. LearningProgress — Prüfungsergebnis verarbeiten',
      code: `
// Vollständiger Exam→AP-Workflow
const lp = game.janus7.academy.learningProgress;
if (!lp) { console.error('LearningProgress nicht registriert'); }

const result = await lp.processExamResult({
  actorRef:    ((game.actors.getName('Testmagier') ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0]) ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0]).uuid,
  examId:      'EXAM_Y1_T1_ARKANOLOGIE',
  status:      'passed_with_distinction',
  qualityStep: 5,
  examDef:     { linkedLessonId: 'LES_Y1_T1_ARKAN_01' },
});

console.log('Lernfortschritt:', result);
// → { success: true, actorName: 'Testmagier', xpAwarded: 12, skillsAdvanced: ['Magiekunde'], status: '...' }
// 10 (Basis) + 2 (QS5-Bonus) = 12 AP
      `,
    },
    {
      title: '8. Batch-Prüfungsergebnisse (ganze Klasse)',
      code: `
const lp = game.janus7.academy.learningProgress;
const students = game.janus7.academy.data.listStudents();

const batchResults = [
  { actorRef: students[0]?.foundry?.actorUuid, status: 'passed_with_distinction', qualityStep: 6 },
  { actorRef: students[1]?.foundry?.actorUuid, status: 'passed',                 qualityStep: 3 },
  { actorRef: students[2]?.foundry?.actorUuid, status: 'marginal_fail',           qualityStep: 1 },
  { actorRef: students[3]?.foundry?.actorUuid, status: 'failed',                  qualityStep: 0 },
].filter(r => r.actorRef);

const results = await lp.processBatchExamResults(batchResults, 'EXAM_Y1_T1_ARKANOLOGIE');
console.table(results.map(r => ({
  schüler: r.actorName,
  status:  r.status,
  ap:      r.xpAwarded,
  skills:  r.skillsAdvanced.join(', ') || '—',
})));
      `,
    },
  ],

  validation: [
    'calculateAdvancementCost(0, "B") === 2',
    'calculateAdvancementCost(13, "B") === 6',
    'getAdvanceCost: gibt null zurück, wenn Stufe >= Max',
    'getAdvanceCost: gibt null zurück, wenn Kategorie ungültig ist',
    'getAdvanceCost: gibt null zurück, wenn Startwert negativ ist',
    'awardXp: actor.system.details.experience.total += amount',
    'advanceItem: item.system.talentValue.value += 1, experience.spent += cost',
    'canAffordAdvancement: false wenn free < cost',
    'APTracker-Eintrag in journal erscheint (wenn enableAPTracking aktiv)',
    'LearningProgress: passed_with_distinction → 10+QSBonus AP + advanceSkills',
    'Batch: alle Actors verarbeitet, Fehler pro Actor isoliert',
  ],
};
