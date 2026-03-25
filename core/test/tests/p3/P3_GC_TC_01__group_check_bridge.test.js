/**
 * @file core/test/tests/p3/P3_GC_TC_01__group_check_bridge.test.js
 * @module janus7/test
 * @phase 3
 *
 * Testkatalog-Eintrag: Gruppenprobe-Bridge
 */

export default {
  id: 'P3-GC-TC-01',
  phase: 3,
  title: 'GroupCheck Bridge: showGroupCheckMessage erstellt Chat-Nachricht',
  prio: 'P1',
  type: 'M',  // Manual — benötigt aktive DSA5-Welt

  requires: [
    'DSA5-System aktiv',
    'game.dsa5.apps.RequestRoll.showGCMessage verfügbar',
    'Talent "Magiekunde" in DSA5-Kompendium vorhanden',
  ],

  steps: [
    '1. game.janus7.bridge.dsa5.showGroupCheckMessage({ skillName: "Magiekunde", modifier: -2, maxRolls: 3, targetQs: 6, label: "Test-Prüfung" }) aufrufen',
    '2. Chat prüfen: Gruppenprobe-Nachricht sichtbar?',
    '3. Einen Actor auswählen und auf "Magiekunde würfeln" klicken',
    '4. Ergebnis erscheint in der GC-Nachricht',
  ],

  expected: 'Chat-Nachricht mit GC-Widget erscheint. Würfel-Click löst Probe aus. Ergebnis wird aggregiert.',

  snippets: [
    {
      title: 'Konsole — showGroupCheckMessage',
      code: `
const msgId = await game.janus7.bridge.dsa5.showGroupCheckMessage({
  skillName: 'Magiekunde',
  modifier: -2,
  maxRolls: 3,
  targetQs: 6,
  label: 'Test-Prüfung Arkanologie'
});
console.log('GC Message ID:', msgId);
      `,
    },
    {
      title: 'Konsole — conductGroupExam (wartet auf Ergebnisse)',
      code: `
// Wartet max. 2 Minuten auf alle Würfe
const result = await game.janus7.bridge.dsa5.conductGroupExam({
  skillName: 'Magiekunde',
  modifier: 0,
  maxRolls: 2,
  expectedRolls: 2,
  targetQs: 4,
  label: 'Schnelltest',
  timeoutMs: 120_000,
});
console.log('Ergebnis:', result);
// Erwartete Felder: { targetMet, totalQs, successCount, failCount, botched, messageId, results }
      `,
    },
    {
      title: 'Konsole — triggerGroupExam (Exam-Engine-Pfad)',
      code: `
// Benötigt: exams.json mit einem Eintrag der "skill" hat
const exams = game.janus7.academy.exams;
const outcome = await exams.triggerGroupExam({
  examId: 'EXAM_MAG_BASICS_01',
  bridge: game.janus7.bridge.dsa5,
  participantActorIds: [],  // leer = kein Recording
  timeoutMs: 60_000,
  applyScoring: false,
  recordResults: false,
});
console.log('Outcome:', outcome);
      `,
    },
  ],
};
