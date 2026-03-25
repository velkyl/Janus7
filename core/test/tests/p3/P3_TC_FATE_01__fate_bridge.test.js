/**
 * @file core/test/tests/p3/P3_TC_FATE_01__fate_bridge.test.js
 * @module janus7/test
 * @phase 3
 */

export default {
  id: 'P3-TC-FATE-01',
  phase: 3,
  title: 'Fate Bridge: Schips lesen, vergeben, Verbrauch erkennen',
  prio: 'P2',
  type: 'M',
  kind: 'manual',
  async run(ctx) {
    try {
      const raw = globalThis.game?.settings?.get?.('dsa5', 'groupschips') ?? '0/0';
      const parts = String(raw).split('/');
      const maxVal = parseInt(parts[1] ?? '0', 10);
      if (maxVal <= 0) {
        return { ok: true, status: 'SKIP', summary: 'SKIP: Gruppen-Schips max=0 (keine aktive Scene/Konfiguration)' };
      }
    } catch (_) {
      return { ok: true, status: 'SKIP', summary: 'SKIP: DSA5-Settings nicht verfügbar' };
    }
    return { ok: true, status: 'PASS', summary: 'Prereq OK — manuell ausführen' };
  },


  requires: [
    'DSA5-System aktiv',
    'Actor (Schüler) mit fatePoints-Status vorhanden',
    'GM-Rechte für Mutations',
    'game.janus7.bridge.dsa5.fate initialisiert',
    'game.janus7.bridge.dsa5.fate.register() aufgerufen',
  ],

  snippets: [
    {
      title: '1. readGroupSchips Unit-Test (ohne Foundry)',
      code: `
// Konstanten direkt (kein Import nötig):
const SCHIP_SOURCE = Object.freeze({ PERSONAL: 0, GROUP: 1 });
// readGroupSchips via bridge:
const readGroupSchips = () => game?.scenes?.active ? game.janus7.bridge.dsa5.getGroupSchips(game.scenes.active) : [];
// SCHIP_SOURCE: {MANUAL:'manual', AWARD:'award', SPEND:'spend'}

// SCHIP_SOURCE-Konstanten
console.assert(SCHIP_SOURCE.PERSONAL === 0, 'PERSONAL = 0');
console.assert(SCHIP_SOURCE.GROUP    === 1, 'GROUP    = 1');

// readGroupSchips (benötigt laufendes Foundry)
const grp = readGroupSchips();
console.log('Gruppen-Schips:', grp); // { value: N, max: M }
console.assert(typeof grp.value === 'number', 'value ist number');
console.assert(typeof grp.max   === 'number', 'max ist number');
console.log('✅ readGroupSchips OK');
      `,
    },
    {
      title: '2. getFateStatus — persönlich + Gruppe',
      code: `
const actor  = (game.actors.getName('Testmagier') ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0]);
const bridge = game.janus7.bridge.dsa5;

const status = await bridge.getFateStatus(actor);
console.log('Fate-Status:', status);
// → { personal: {value:2, max:3, available:true}, group:{value:1, max:5, available:true} }

console.assert('personal' in status, 'personal vorhanden');
console.assert('group'    in status, 'group vorhanden');
console.assert(typeof status.personal.value === 'number', 'personal.value = number');
      `,
    },
    {
      title: '3. canUseFate — Verfügbarkeitscheck',
      code: `
const actor  = (game.actors.getName('Testmagier') ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0]);
const bridge = game.janus7.bridge.dsa5;

const canPersonal = await bridge.canUseFate(actor, 'personal');
const canGroup    = await bridge.canUseFate(actor, 'group');
console.log('Persönlich verfügbar:', canPersonal);
console.log('Gruppe verfügbar:',     canGroup);

// Sollte mit tatsächlichem Schips-Wert übereinstimmen
const { personal } = await bridge.getFateStatus(actor);
console.assert(canPersonal === personal.available, 'canPersonal konsistent');
      `,
    },
    {
      title: '4. awardFatePoint — Schip vergeben',
      code: `
const actor  = (game.actors.getName('Testmagier') ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0]);
const bridge = game.janus7.bridge.dsa5;

const before = await bridge.getPersonalSchips(actor);
// Nur vergeben wenn nicht schon am Maximum
if (before.value < before.max) {
  const result = await bridge.awardFatePoint(actor, 1, 'Test-Belohnung');
  const after  = await bridge.getPersonalSchips(actor);
  console.assert(after.value === before.value + 1, '+1 Schip');
  console.log(\`Schip vergeben: \${before.value}→\${after.value} (max: \${after.max})\`);
} else {
  console.log('Actor ist bereits am Maximum → Test überspringen');
}
      `,
    },
    {
      title: '5. setFatePoints — auf Wert setzen',
      code: `
const actor  = (game.actors.getName('Testmagier') ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0]);
const bridge = game.janus7.bridge.dsa5;

// Auf 1 setzen (für deterministischen Test)
const result = await bridge.setFatePoints(actor, 1);
const after  = await bridge.getPersonalSchips(actor);
console.assert(after.value === 1, 'Wert = 1 nach set');
console.log(\`setFatePoints: \${result.previous}→\${result.next}\`);

// Zurücksetzen auf Originalwert
await bridge.setFatePoints(actor, result.previous);
      `,
    },
    {
      title: '6. janus7SchipUsed Hook — Verbrauch erkennen',
      code: `
const actor  = (game.actors.getName('Testmagier') ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0]);
const bridge = game.janus7.bridge.dsa5;

// Einmaligen Hook-Listener registrieren
let hookFired = false;
const id = Hooks.once('janus7SchipUsed', (data) => {
  hookFired = true;
  console.log('janus7SchipUsed gefeuert:', data);
  // → { actorId, actorName, source:0, used:1, previous:N, next:N-1, remaining:N-1 }
  console.assert(data.used >= 1,         'used >= 1');
  console.assert(data.source === 0,      'source = PERSONAL(0)');
  console.assert(data.actorId === actor.id, 'actorId korrekt');
});

// Schip manuell abziehen (simuliert FateRolls.#reduceSchips)
const before = (await bridge.getPersonalSchips(actor)).value;
if (before > 0) {
  await actor.update({'system.status.fatePoints.value': before - 1});
  // Hook sollte jetzt gefeuert sein
  await new Promise(r => setTimeout(r, 100));
  console.assert(hookFired, 'janus7SchipUsed wurde gefeuert');
  // Wiederherstellen
  await bridge.setFatePoints(actor, before);
} else {
  Hooks.off('janus7SchipUsed', id);
  console.log('Actor hat keine Schips → Test überspringen');
}
      `,
    },
    {
      title: '7. awardGroupFatePoints — Gruppen-Schip vergeben',
      code: `
const bridge = game.janus7.bridge.dsa5;

const before = bridge.getGroupSchips();
const result = await bridge.awardGroupFatePoints(1);
const after  = bridge.getGroupSchips();
console.log(\`Gruppen-Schips: \${before.value}→\${after.value} / \${after.max}\`);
// GM-only: sollte Wert erhöhen (sofern nicht am Maximum)
      `,
    },
    {
      title: '8. FateTracker Snapshot — Schüler-Übersicht',
      code: `
const tracker = game.janus7.academy.fateTracker;
if (!tracker) {
  console.error('FateTracker nicht registriert');
} else {
  // Session-Events dieser Session
  const events = tracker.getSessionEvents();
  console.log('Schips-Events diese Session:', events.length);
  console.table(events.map(e => ({
    actor:    e.actorName ?? 'Gruppe',
    source:   e.source,
    used:     e.used,
    remaining: e.remaining,
    examen:   e.duringExam,
    punkte:   e.scoringPoints,
  })));

  // Schüler-Status
  const status = tracker.getStudentFateStatus();
  console.log('Schüler-Schips:');
  console.table(status.map(s => ({
    npc:      s.npcId,
    actor:    s.actorName,
    persönl:  \`\${s.personal.value}/\${s.personal.max}\`,
    gruppe:   \`\${s.group.value}/\${s.group.max}\`,
  })));
}
      `,
    },
  ],

  validation: [
    'SCHIP_SOURCE.PERSONAL === 0, SCHIP_SOURCE.GROUP === 1',
    'getFateStatus: { personal: {value,max,available}, group: {value,max,available} }',
    'getPersonalSchips: liest actor.system.status.fatePoints.{value,max}',
    'getGroupSchips: parst game.settings.get("dsa5","groupschips") → "N/M"',
    'awardFatePoint: actor.system.status.fatePoints.value += amount (cap bei max)',
    'updateActor-Hook → janus7SchipUsed gefeuert bei value-Senkung',
    'janus7SchipUsed.source=0 bei personal, .source=1 bei group',
    'FateTracker: Session-Events werden akkumuliert',
    'FateTracker: scoringPoints > 0 nur bei duringExam=true',
  ],
};
