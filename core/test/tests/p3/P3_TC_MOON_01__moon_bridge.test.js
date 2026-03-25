/**
 * @file core/test/tests/p3/P3_TC_MOON_01__moon_bridge.test.js
 * @module janus7/test
 * @phase 3
 */

export default {
  id: 'P3-TC-MOON-01',
  phase: 3,
  title: 'Moon Bridge: Mondphasen lesen, Modifikatoren, Phasenwechsel-Hook',
  prio: 'P2',
  type: 'M',
  kind: 'auto',

  async run() {
    const { NEW_MOON_INDEX, FULL_MOON_INDEX } = await import('../../../../bridge/dsa5/moon.js');
    const ok = NEW_MOON_INDEX === 0 && FULL_MOON_INDEX === 4;
    const summary = ok
      ? `NEW_MOON_INDEX is ${NEW_MOON_INDEX}, FULL_MOON_INDEX is ${FULL_MOON_INDEX} (expected 0 and 4)`
      : `FAIL: NEW_MOON_INDEX=${NEW_MOON_INDEX}, FULL_MOON_INDEX=${FULL_MOON_INDEX}`;
    return { ok, summary };
  },

  requires: [
    'DSA5-System aktiv',
    'DSA5-Kalender aktiviert (nicht "none")',
    'game.janus7.bridge.dsa5.moon initialisiert',
    'data/academy/moon-modifiers.json geladen',
  ],

  snippets: [
    {
      title: '1. MOON_PHASES Konstanten Unit-Test (ohne Foundry)',
      code: `
// Mondphasen-Konstanten sind modul-intern. Teste via Bridge-API:
const bridge = game.janus7.bridge.dsa5;

const status = bridge.getCurrentMoonStatus();
console.assert(status !== null, 'getCurrentMoonStatus() liefert Ergebnis');
console.assert(typeof status.phaseIndex === 'number' && status.phaseIndex >= 0 && status.phaseIndex <= 7, 'phaseIndex 0-7');
console.assert(typeof status.lightAdjust === 'number', 'lightAdjust vorhanden');
console.assert(['newmoon','fullmoon','waxing','waning'].includes(status.academicCategory), 'academicCategory valid');

const upcoming = bridge.getUpcomingMoonPhases(4);
console.assert(upcoming.length <= 4, 'max 4 upcoming phases');
console.assert(upcoming.every(p => p.inDays > 0), 'alle inDays > 0');

console.log('✅ Moon Bridge API OK');
      `,
    },
    {
      title: '2. getCurrentMoonStatus — Aktuelle Phase lesen',
      code: `
const bridge = game.janus7.bridge.dsa5;

const status = bridge.getCurrentMoonStatus();
console.log('Aktuelle Mondphase:', status);

if (!status) {
  console.warn('Kein Mondphase — DSA5-Kalender aktiv?');
} else {
  // Strukturprüfung
  console.assert(typeof status.name          === 'string',  'name = string');
  console.assert(typeof status.phaseIndex    === 'number',  'phaseIndex = number');
  console.assert(typeof status.lightAdjust   === 'number',  'lightAdjust = number');
  console.assert(typeof status.dayInCycle    === 'number',  'dayInCycle = number');
  console.assert(typeof status.isFullMoon    === 'boolean', 'isFullMoon = boolean');
  console.assert(typeof status.isNewMoon     === 'boolean', 'isNewMoon = boolean');
  console.assert(status.dayInCycle >= 0 && status.dayInCycle < 28, 'dayInCycle 0-27');
  console.assert(status.lightAdjust >= 0 && status.lightAdjust <= 1, 'lightAdjust 0-1');

  console.log(\`Phase: \${status.name} (Index \${status.phaseIndex}, lightAdjust \${status.lightAdjust})\`);
  console.log(\`Tag im Zyklus: \${status.dayInCycle}/28\`);
  console.log(\`Vollmond in \${status.daysUntilFullMoon} Tagen, Neumond in \${status.daysUntilNewMoon} Tagen\`);
}
      `,
    },
    {
      title: '3. getMoonPhaseName — Lesbare Ausgabe',
      code: `
const bridge = game.janus7.bridge.dsa5;

const name = bridge.getMoonPhaseName();
console.log('Mondphase:', name);
// z.B. 'Rad (Vollmond)' | 'ToteMada (Neumond)' | 'AuffuellenderKelch'
console.assert(typeof name === 'string' && name.length > 0, 'Name ist nichtleer');
      `,
    },
    {
      title: '4. getUpcomingMoonPhases — Nächste 4 Phasenwechsel',
      code: `
const bridge = game.janus7.bridge.dsa5;

const upcoming = bridge.getUpcomingMoonPhases(4);
console.log('Nächste Phasenwechsel:');
console.table(upcoming.map(p => ({
  name:     p.name,
  inDays:   p.inDays,
  kategorie: p.academicCategory,
  licht:    p.lightAdjust,
})));

console.assert(upcoming.length <= 4, 'Maximal 4 Einträge');
upcoming.forEach((p, i) => {
  if (i > 0) console.assert(p.inDays > upcoming[i-1].inDays, 'Aufsteigend sortiert');
  console.assert(p.inDays > 0, 'inDays > 0 (nicht vergangen)');
});
      `,
    },
    {
      title: '5. getMoonLessonModifier — Unterrichtsmodifikator',
      code: `
const bridge = game.janus7.bridge.dsa5;

// Arkanologie-Modifikator für aktuelle Phase
const mod = bridge.getMoonLessonModifier('arcanology');
console.log('Arkanologie-Mondmodifikator:', mod);
// Bei Vollmond: { fpBonus: 2, qsBonus: 1, scoringBonus: 5, isActive: true }

console.assert(typeof mod.fpBonus      === 'number',  'fpBonus = number');
console.assert(typeof mod.qsBonus      === 'number',  'qsBonus = number');
console.assert(typeof mod.scoringBonus === 'number',  'scoringBonus = number');
console.assert(typeof mod.isActive     === 'boolean', 'isActive = boolean');

// Default-Fallback für unbekannten Typ
const defaultMod = bridge.getMoonLessonModifier('unknown_lesson_type');
console.log('Default-Modifikator:', defaultMod);
// Sollte auf globalModifiers zurückfallen, nicht null
console.assert(defaultMod !== null, 'Default nicht null');

// Alle definierten Typen testen
for (const type of ['arcanology', 'magic_practice', 'astral_meditation', 'ritual_theory', 'alchemy', 'herbalism']) {
  const m = bridge.getMoonLessonModifier(type);
  console.log(\`\${type}: FP\${m.fpBonus >= 0 ? '+' : ''}\${m.fpBonus}, QS\${m.qsBonus}, Score\${m.scoringBonus} — \${m.description || '(kein)'}\`);
}
      `,
    },
    {
      title: '6. getMoonAstralModifier — AsP-Regen-Bonus',
      code: `
const bridge = game.janus7.bridge.dsa5;

const aspMod = bridge.getMoonAstralModifier();
console.log('AsP-Mondmodifikator:', aspMod);
// Beim Vollmond: { aspBonus: 2, description: 'Vollmond steigert Astralfluss (+2 AsP)' }
console.assert(typeof aspMod.aspBonus === 'number', 'aspBonus = number');

// Dunkelmagier-Sonderregel (nur bei Neumond relevant)
const darkMod = bridge.getMoonAstralModifier(true);
console.log('Dunkelmagier-Mod:', darkMod);
      `,
    },
    {
      title: '7. getNextFullMoon / getNextNewMoon',
      code: `
const bridge = game.janus7.bridge.dsa5;

const nextFull = bridge.getNextFullMoon();
const nextNew  = bridge.getNextNewMoon();

console.log(\`Nächster Vollmond: in \${nextFull?.inDays ?? '?'} Tagen\`);
console.log(\`Nächster Neumond: in \${nextNew?.inDays ?? '?'} Tagen\`);

if (nextFull) {
  console.assert(nextFull.inDays >= 0 && nextFull.inDays < 28, 'inDays 0-27');
}
      `,
    },
    {
      title: '8. janus7MoonPhaseChanged Hook — Phasenwechsel erkennen',
      code: `
// Dieser Snippet simuliert einen Phasenwechsel durch direktes Vorschieben der Zeit.
// Nur ausführen wenn GM und Test-Welt!

const bridge = game.janus7.bridge.dsa5;
let hookFired = false;

const id = Hooks.once('janus7MoonPhaseChanged', (moonStatus) => {
  hookFired = true;
  console.log('Phasenwechsel erkannt:', moonStatus);
  console.assert('name' in moonStatus,       'name vorhanden');
  console.assert('isFullMoon' in moonStatus, 'isFullMoon vorhanden');
});

// Zeit um 1 Tag vorschieben, bis Phasenwechsel eintritt (max. 28 Versuche)
if (!game.user.isGM) {
  console.warn('GM-Rechte erforderlich für Zeitmanipulation');
  Hooks.off('janus7MoonPhaseChanged', id);
} else {
  const current = bridge.getCurrentMoonStatus();
  const daysUntilChange = Math.min(current?.daysUntilFullMoon ?? 7, current?.daysUntilNewMoon ?? 14);
  const secondsToAdvance = daysUntilChange * 86400 + 1;

  await game.time.advance(secondsToAdvance);
  await new Promise(r => setTimeout(r, 200));
  console.log('Hook gefeuert:', hookFired);

  // Zurücksetzen
  await game.time.advance(-secondsToAdvance);
}
      `,
    },
    {
      title: '9. getMoonSummary — Vollständige Beamer-Übersicht',
      code: `
const bridge = game.janus7.bridge.dsa5;

const summary = bridge.getMoonSummary('arcanology');
console.log('Mondzusammenfassung:');
console.log('Aktuelle Phase:', summary?.current?.name, '(', summary?.current?.academicCategory, ')');
console.log('Astral-Bonus:', summary?.astralModifier);
console.log('Lektion (Arkanologie):', summary?.lessonModifier);
console.log('Nächste Phasen:');
console.table(summary?.upcoming);
      `,
    },
  ],

  validation: [
    'getCurrentMoonStatus() liefert { name, phaseIndex, lightAdjust, dayInCycle, isFullMoon, isNewMoon, daysUntilFullMoon }',
    'phaseIndex im Bereich [0, 7] (8 Mondphasen im 28-Tage-Zyklus)',
    'Vollmond (isFullMoon=true) hat lightAdjust=1.0; Neumond (isNewMoon=true) hat lightAdjust=0.0',
    'dayInCycle >= 0 && < 28',
    'lightAdjust >= 0 && <= 1',
    'getUpcomingPhases(4): aufsteigend nach inDays, alle inDays > 0',
    'getLessonModifier("arcanology") bei fullmoon: fpBonus=2, qsBonus=1',
    'getLessonModifier("unknown"): fallback auf default/global, kein null',
    'getAstralEnergyModifier(): aspBonus >= 0',
    'janus7MoonPhaseChanged gefeuert bei Phasenwechsel via updateWorldTime',
  ],
};
