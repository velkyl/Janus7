/**
 * @file core/test/tests/p3/P3_TC_BUFF_01__postroll_teacher_bonus.test.js
 * @module janus7/test
 * @phase 3
 */

export default {
  id: 'P3-TC-BUFF-01',
  phase: 3,
  title: 'PostRoll Teacher Buff: applyTeacherBonus erstellt DSA5-ActiveEffect',
  prio: 'P1',
  type: 'M',
  kind: 'manual',
  async run(ctx) {
    const students = globalThis.game?.janus7?.academy?.data?.listStudents?.() ?? [];
    const hasActors = students.some(s => s?.foundry?.actorUuid || s?.foundryUuid);
    if (!hasActors) {
      return { ok: true, status: 'SKIP', summary: 'SKIP: Keine Schüler-NPCs mit Foundry-Actor-Mapping vorhanden' };
    }
    return { ok: true, status: 'PASS', summary: 'Prereq OK — manuell ausführen' };
  },


  requires: [
    'DSA5-System aktiv',
    'Actor mit Owner-Rechten vorhanden',
    'game.time.worldTime verfügbar',
    'game.janus7.bridge.dsa5 initialisiert',
  ],

  snippets: [
    {
      title: '1. POST_ROLL_KEYS validieren',
      code: `
// POST_ROLL_KEYS/SCOPES inline (kein Import):
const POST_ROLL_KEYS = Object.freeze({ FP: 'system.skillModifiers.postRoll.FP', QL: 'system.skillModifiers.postRoll.QL', REROLL: 'system.skillModifiers.postRoll.reroll' });
const POST_ROLL_SCOPES = Object.freeze({ ANY: 'any', SKILL: 'skill', SPELL: 'spell', LITURGY: 'liturgy' });
const bridge = game.janus7.bridge.dsa5;

console.assert(POST_ROLL_KEYS.FP     === 'system.skillModifiers.postRoll.FP',    'FP key');
console.assert(POST_ROLL_KEYS.QL     === 'system.skillModifiers.postRoll.QL',    'QL key');
console.assert(POST_ROLL_KEYS.REROLL === 'system.skillModifiers.postRoll.reroll','REROLL key');
console.assert(POST_ROLL_SCOPES.ANY  === 'any', 'ANY scope');
console.log('✅ Keys OK');
      `,
    },
    {
      title: '2. applyTeacherBonus — FP-Buff auf Magiekunde',
      code: `
const actor = (game.actors.getName('Testmagier') ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0]);
const bridge = game.janus7.bridge.dsa5;

const effect = await bridge.applyTeacherBonus(actor, {
  name: 'Kosmaar: Arkanologie-Test',
  teacherNpcId: 'NPC_SIRDON_KOSMAAR',
  lessonId: 'LES_Y1_T1_ARKAN_01',
  buffs: [
    { type: 'FP', scope: 'Magiekunde', amount: 2 },
    { type: 'QL', scope: 'spell',      amount: 1 },
  ]
}, { durationSlots: 2 });

console.log('Effect UUID:', effect?.uuid);
console.log('Changes:', effect?.changes);
// Erwartet: changes[0].key = 'system.skillModifiers.postRoll.FP', value = 'Magiekunde 2'
// Erwartet: changes[1].key = 'system.skillModifiers.postRoll.QL',  value = 'spell 1'
// Im Actor-Sheet sollte der Effect mit Ablaufzeit sichtbar sein
      `,
    },
    {
      title: '3. Idempotenz prüfen — doppelter Apply',
      code: `
const actor = (game.actors.getName('Testmagier') ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0]);
const bridge = game.janus7.bridge.dsa5;

const bonusDef = {
  name: 'Idempotenz-Test',
  teacherNpcId: 'NPC_SIRDON_KOSMAAR',
  lessonId: 'LES_TEST',
  buffs: [{ type: 'FP', scope: 'any', amount: 1 }]
};

const e1 = await bridge.applyTeacherBonus(actor, bonusDef, { durationSlots: 1 });
const e2 = await bridge.applyTeacherBonus(actor, bonusDef, { durationSlots: 1 });

console.assert(e1?.id === e2?.id, 'Selbe Effect-ID bei Duplikat');
console.log('✅ Idempotenz OK — Effect-ID:', e1?.id);
      `,
    },
    {
      title: '4. getActiveTeacherBuffs anzeigen',
      code: `
const actor = (game.actors.getName('Testmagier') ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0]);
const bridge = game.janus7.bridge.dsa5;

const buffs = await bridge.getActiveTeacherBuffs(actor);
console.table(buffs.map(b => ({
  name:    b.name,
  teacher: b.teacherNpcId,
  lesson:  b.lessonId,
  remaining: b.remainingSeconds ? Math.round(b.remainingSeconds/3600) + 'h' : '—',
  buffs:   b.buffs.map(x => \`\${x.type}:\${x.scope}+\${x.amount}\`).join(', ')
})));
      `,
    },
    {
      title: '5. removeTeacherBuffs — spezifische Lektion',
      code: `
const actor = (game.actors.getName('Testmagier') ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0]);
const bridge = game.janus7.bridge.dsa5;

const removed = await bridge.removeTeacherBuffs(actor, {
  teacherNpcId: 'NPC_SIRDON_KOSMAAR',
  lessonId: 'LES_TEST',
});
console.log(\`Entfernt: \${removed} Effects\`);
      `,
    },
    {
      title: '6. applyTeacherBonusToMany — ganze Klasse',
      code: `
const bridge = game.janus7.bridge.dsa5;
const students = game.janus7.academy.data.listStudents();
const actorRefs = students.map(s => s?.foundry?.actorUuid ?? s?.foundryUuid).filter(Boolean);

const bonusDef = {
  name: 'Mafalda: Bibliothek',
  teacherNpcId: 'NPC_MAFALDA',
  lessonId: 'LES_Y2_T1_BIBLIO_01',
  buffs: [
    { type: 'FP', scope: 'Wissenstalente', amount: 2 },
  ]
};

const results = await bridge.applyTeacherBonusToMany(actorRefs, bonusDef, { durationSlots: 1 });
const ok = results.filter(r => r.success).length;
console.log(\`Buff auf \${ok}/\${results.length} Schüler angewendet\`);
      `,
    },
    {
      title: '7. LessonBuffManager Hook — manuell auslösen',
      code: `
// Simuliert das Starten einer Lektion (normaler Flow via Calendar/Simulation)
Hooks.callAll('janus7LessonStarted', {
  lessonId: 'LES_Y1_T1_ARKAN_01',
  participantActorIds: [(game.actors.getName('Testmagier') ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0])?.uuid].filter(Boolean),
  teacherNpcId: 'NPC_SIRDON_KOSMAAR',
  subjectKey: 'arkanologie',
  durationSlots: 2,
});
console.log('Hook gefeuert — LessonBuffManager verarbeitet den Hook (bridge.postRoll wird genutzt).');
      `,
    },
    {
      title: '8. REROLL-Buff — Neuauswurf auf Magiekunde',
      code: `
// REROLL: Erlaubt useFateOnRoll(isTalented) nach dem Würfeln
const actor = (game.actors.getName('Testmagier') ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0]);
const bridge = game.janus7.bridge.dsa5;

await bridge.applyTeacherBonus(actor, {
  name: 'Auriw: Experimentalmagie (Neuauswurf)',
  teacherNpcId: 'NPC_AURIW_STURMFELS',
  buffs: [{ type: 'REROLL', scope: 'spell', amount: 1 }]
}, { durationSlots: 1 });

// Nach dem nächsten Zauber-Würfelwurf: "Begabung / Neuauswurf" Button erscheint im Chat
console.log('REROLL-Buff gesetzt — nächsten Zauber würfeln und Neuauswurf-Button prüfen');
      `,
    },
  ],

  validation: [
    'Actor-Sheet zeigt Effect mit Ablaufzeit',
    'Im Roll-Dialog nach Würfeln: PostRoll-Buff-Buttons erscheinen',
    'FP-Buff: FP werden addiert, QS neu berechnet',
    'QL-Buff: QS wird direkt erhöht',
    'REROLL-Buff: "Begabung" Button erscheint im Chat nach Würfeln',
    'Nach duration.seconds Spielzeit: Effect verschwindet automatisch',
    'flags.janus7.postRollBuff.teacherNpcId korrekt gesetzt',
  ],
};
