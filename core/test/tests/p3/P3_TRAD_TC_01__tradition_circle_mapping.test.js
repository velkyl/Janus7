/**
 * @file core/test/tests/p3/P3_TRAD_TC_01__tradition_circle_mapping.test.js
 * @module janus7/test
 * @phase 3
 */

export default {
  id: 'P3-TRAD-TC-01',
  phase: 3,
  title: 'Tradition Bridge: readTradition() und Zirkel-Mapping',
  prio: 'P1',
  type: 'M',
  kind: 'manual',
  async run(ctx) {
    const students = globalThis.game?.janus7?.academy?.data?.listStudents?.() ?? [];
    const hasActors = students.some(s => s?.foundry?.actorUuid || s?.foundryUuid);
    if (!hasActors) {
      return { ok: true, status: 'SKIP', summary: 'SKIP: Keine Schüler-NPCs mit Foundry-Actor-Mapping vorhanden (no_actor für alle)' };
    }
    return { ok: true, status: 'PASS', summary: 'Prereq OK — manuell ausführen' };
  },
  // Manual + Smoke (Unit-Teil ist automatisierbar)

  snippets: [
    {
      title: '1. Unit-Test: Mapping-Logik ohne Foundry (Konsole)',
      code: `
// Mapping via Runtime testen (kein Import nötig)
const bridge = game.janus7.bridge.dsa5;

// Mock-Actor mit Tradition-Daten
const mockActor = {
  name: 'Testmagier',
  system: {
    magic: {
      tradition: { magical: 'Gildenmagier', clerical: '' },
      feature:   { magical: 'Feuer', clerical: '' },
      guidevalue:{ magical: 'kl', clerical: '-' },
      energyfactor: { magical: 1, clerical: 1 },
      happyTalents: { value: 'Magiekunde,Alchemie' },
    },
    isMage: true, isPriest: false,
    status: { wounds: { value: 0 }, astra: { value: 30, max: 30 } }
  }
};

const result = bridge.readTradition(mockActor);
console.log('traditionString:', result.traditionString);
console.log('resolvedCircleId:', result.resolvedCircleId);
console.log('isMage:', result.isMage);
console.assert(result.traditionString === 'Gildenmagier', 'traditionString');
console.assert(result.isMage === true, 'isMage');
console.log('✅ readTradition-Test OK');
`,
    },
    {
      title: '2. Integration: readTradition() auf echtem Foundry-Actor',
      code: `
// Benötigt: Actor mit gesetzter Tradition in Foundry
const actor = ((game.actors.getName('Testmagier') ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0]) ?? game.actors.contents.find(a => a.type === 'character') ?? game.actors.contents[0]); // Namen anpassen
if (!actor) { console.error('Actor nicht gefunden'); }

const data = await game.janus7.bridge.dsa5.readTradition(actor);
console.log('Tradition:', data.traditionString);
console.log('Item:', data.traditionItem);
console.log('Feature:', data.feature);
console.log('Zirkel:', data.resolvedCircleId);
console.log('isMage:', data.isMage);
console.log('Glücktalente:', data.happyTalents);
      `,
    },
    {
      title: '3. suggestCircleForActor() Kurzform',
      code: `
// Alle Actors in der Welt durchgehen
for (const actor of game.actors.contents.slice(0, 5)) {
  const circleId = await game.janus7.bridge.dsa5.suggestCircleForActor(actor);
  console.log(actor.name, '→', circleId ?? '(kein Mapping)');
}
      `,
    },
    {
      title: '4. JanusCircleSync: Dry-Run für alle NPCs',
      code: `
// Dry-Run via registriertem circleSync-Service (kein direkter Import nötig)
const sync = game.janus7.academy.circleSync;
if (!sync) { console.error('circleSync nicht initialisiert'); }
else {
  const preview = await sync.assignAllStudents({ dryRun: true, overwrite: false });
  console.table(preview.map(r => ({
    npc:      r.npcId ?? '?',
    circleId: r.circleId ?? '—',
    method:   r.method,
    conf:     r.confidence?.toFixed(2) ?? '—',
  })));
}
      `,
    },
    {
      title: '5. Vollständige Sync ausführen',
      code: `
// Schreibt circleId als session-local AcademyDataApi-Override (getNpc() sieht Änderung)
const results = await game.janus7.academy.circleSync.syncAll({
  dryRun: false,
  overwriteManual: false,  // manuell gesetzte Zirkel behalten
});

// Ergebnis-Felder: circleId, method, confidence, matchedOn, npcId, saved
const assigned  = results.filter(r => r.circleId && r.method !== 'no_actor');
const noActor   = results.filter(r => r.method === 'no_actor');
const noMapping = results.filter(r => !r.circleId && r.method !== 'no_actor');

console.log(\`Zugewiesen: \${assigned.length}\`);
console.log(\`Kein Actor: \${noActor.length}\`);
console.log(\`Kein Mapping: \${noMapping.length}\`);
      `,
    },
    {
      title: '6. Mapping erweitern (Laufzeit)',
      code: `
// Neue Tradition hinzufügen ohne Code-Deployment
const bridge = game.janus7.bridge.dsa5;

const currentMapping = Object.fromEntries(
  [...bridge.tradition.getMapping().entries()]
    .reduce((acc, [tradition, circleId]) => {
      if (!acc.has(circleId)) acc.set(circleId, []);
      acc.get(circleId).push(tradition);
      return acc;
    }, new Map())
);

// Neue Tradition eintragen
currentMapping.staves = [...(currentMapping.staves ?? []), 'Mein Custom-Magier'];

bridge.updateTraditionMapping(currentMapping);
console.log('Mapping aktualisiert');
      `,
    },
  ],
};
