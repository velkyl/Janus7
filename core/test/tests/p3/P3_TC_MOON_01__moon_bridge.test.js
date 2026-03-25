import { DSA5MoonBridge } from '../../../../bridge/dsa5/moon.js';
import { HOOKS } from '../../../../core/hooks/topics.js';

export default {
  id: 'P3-TC-MOON-01',
  title: 'Moon Bridge: Mondphasen lesen, Modifikatoren, Phasenwechsel-Hook',
  phases: [3],
  prio: 'P2',
  type: 'M',
  kind: 'auto',
  requires: [
    'DSA5-System aktiv',
    'DSA5-Kalender aktiviert (nicht "none")',
    'game.janus7.bridge.dsa5.moon initialisiert',
    'data/academy/moon-modifiers.json geladen',
  ],
  expected: 'getCurrentMoonStatus liefert Daten, Modifikatoren werden angewendet, Phasenwechsel feuert Event',

  async run(ctx) {
    const logger = ctx?.logger ?? console;
    const notes = [];
    let ok = true;
    let hookFired = false;
    let emittedHookTopic = null;
    let emittedHookData = null;

    // 1. Setup Mock Environment
    const _originalGame = globalThis.game;
    const _originalHooks = globalThis.Hooks;

    globalThis.Hooks = {
      callAll: (topic, data) => {
        if (topic === HOOKS.MOON_PHASE_CHANGED) {
          hookFired = true;
          emittedHookTopic = topic;
          emittedHookData = data;
        }
      }
    };

    let simulatedWorldTime = 1000;

    // Mock for game.time.calendar.timeToComponents
    globalThis.game = {
      time: {
        get worldTime() { return simulatedWorldTime; },
        calendar: {
          timeToComponents: (t) => {
            const dayInCycle = Math.floor(t / 100) % 28;
            let phaseIndex = 0;
            if (dayInCycle >= 22) phaseIndex = 7;
            else if (dayInCycle >= 21) phaseIndex = 6;
            else if (dayInCycle >= 15) phaseIndex = 5;
            else if (dayInCycle >= 14) phaseIndex = 4; // Full moon
            else if (dayInCycle >= 8) phaseIndex = 3;
            else if (dayInCycle >= 7) phaseIndex = 2;
            else if (dayInCycle >= 1) phaseIndex = 1;

            return {
              moon: {
                phase: {
                  name: `Phase_${phaseIndex}`,
                  lightAdjust: phaseIndex === 4 ? 1.0 : phaseIndex === 0 ? 0.0 : 0.5
                },
                phaseIndex,
                dayInCycle
              }
            };
          }
        }
      }
    };

    try {
      // 2. Instantiate Bridge
      const bridge = new DSA5MoonBridge({ logger: { info: () => {}, warn: () => {} } });
      bridge.register();

      // 3. Test: Current Moon Status (Simulate Full Moon at day 14 -> time 1400)
      simulatedWorldTime = 1400;
      const currentStatus = bridge.getCurrentMoonStatus();
      if (!currentStatus) {
        ok = false;
        notes.push('getCurrentMoonStatus() returned null');
      } else {
        if (!currentStatus.isFullMoon) { ok = false; notes.push('Expected isFullMoon to be true at day 14'); }
        if (currentStatus.phaseIndex !== 4) { ok = false; notes.push(`Expected phaseIndex 4, got ${currentStatus.phaseIndex}`); }
        if (currentStatus.lightAdjust !== 1.0) { ok = false; notes.push(`Expected lightAdjust 1.0, got ${currentStatus.lightAdjust}`); }
      }

      // 4. Test: Moon Phase Name
      const phaseName = bridge.getMoonPhaseName();
      if (!phaseName || typeof phaseName !== 'string' || !phaseName.includes('(Vollmond)')) {
        ok = false;
        notes.push(`getMoonPhaseName() returned unexpected value: ${phaseName}`);
      }

      // 5. Test: Modifiers Loading and Retrieval
      const mockModifiers = {
        lessonModifiers: {
          arcanology: {
            fullmoon: { fpBonus: 2, qsBonus: 1, scoringBonus: 5, description: 'Test Fullmoon Bonus' },
            default: { fpBonus: 0, qsBonus: 0, scoringBonus: 0, description: 'Default' }
          }
        },
        globalModifiers: {}
      };

      await bridge.loadModifiers(mockModifiers);

      // HINWEIS: Hier prüfen, ob die Methode getLessonModifier oder getMoonLessonModifier heißt!
      const mod = bridge.getLessonModifier ? bridge.getLessonModifier('arcanology') : bridge.getMoonLessonModifier('arcanology');

      if (!mod || !mod.isActive) {
        ok = false;
        notes.push('Expected arcanology modifier to be active during full moon');
      } else {
        if (mod.fpBonus !== 2) { ok = false; notes.push(`Expected fpBonus 2, got ${mod.fpBonus}`); }
        if (mod.qsBonus !== 1) { ok = false; notes.push(`Expected qsBonus 1, got ${mod.qsBonus}`); }
      }

      // Default fallback
      const unknownMod = bridge.getLessonModifier ? bridge.getLessonModifier('unknown_lesson') : bridge.getMoonLessonModifier('unknown_lesson');
      if (unknownMod && unknownMod.isActive) {
        ok = false;
        notes.push('Expected unknown_lesson modifier to be inactive');
      }

      // 6. Test: Astral Energy Modifier
      const astralMod = bridge.getAstralEnergyModifier ? bridge.getAstralEnergyModifier() : bridge.getMoonAstralModifier();
      if (astralMod.aspBonus !== 2) {
        ok = false;
        notes.push(`Expected aspBonus 2 for full moon, got ${astralMod.aspBonus}`);
      }

      simulatedWorldTime = 0; // day 0 -> phase 0 (New Moon)
      const darkAstralMod = bridge.getAstralEnergyModifier ? bridge.getAstralEnergyModifier(true) : bridge.getMoonAstralModifier(true);
      if (darkAstralMod.aspBonus !== 2) {
        ok = false;
        notes.push(`Expected aspBonus 2 for dark mage at new moon, got ${darkAstralMod.aspBonus}`);
      }

      // 7. Test: Upcoming Phases
      const upcoming = bridge.getUpcomingPhases ? bridge.getUpcomingPhases(4) : bridge.getUpcomingMoonPhases(4);
      if (!upcoming || upcoming.length !== 4) {
        ok = false;
        notes.push('getUpcomingPhases() did not return 4 phases');
      } else {
        if (upcoming[0].inDays <= 0) {
          ok = false;
          notes.push('First upcoming phase should be in the future (inDays > 0)');
        }
      }

      // 8. Test: Next Full/New Moon
      const nextFull = bridge.getNextFullMoon();
      if (!nextFull || typeof nextFull.inDays !== 'number') {
        ok = false;
        notes.push('getNextFullMoon() failed');
      }

      const nextNew = bridge.getNextNewMoon();
      if (!nextNew || typeof nextNew.inDays !== 'number') {
        ok = false;
        notes.push('getNextNewMoon() failed');
      }

      // 9. Test: Hook Emission on World Time Update
      bridge.onWorldTimeUpdated(100);

      if (!hookFired) {
        ok = false;
        notes.push('janus7MoonPhaseChanged hook was not fired upon phase change');
      } else if (!emittedHookData || emittedHookData.phaseIndex !== 1) {
        ok = false;
        notes.push(`Hook fired but emitted unexpected phaseIndex: ${emittedHookData?.phaseIndex}`);
      }

      hookFired = false;
      bridge.onWorldTimeUpdated(150);
      if (hookFired) {
        ok = false;
        notes.push('Hook fired unexpectedly when phase did not change');
      }

      bridge.unregister();

    } catch (err) {
      ok = false;
      notes.push(`Test threw exception: ${err.message}`);
      logger.error('Moon Bridge test failed:', err);
    } finally {
      globalThis.game = _originalGame;
      globalThis.Hooks = _originalHooks;
    }

    return {
      ok,
      summary: ok ? 'Moon Bridge tests passed successfully' : 'Moon Bridge tests failed',
      notes: notes.length > 0 ? notes : undefined
    };
  },

  snippets: [
    {
      title: '1. MOON_PHASES Konstanten Unit-Test (ohne Foundry)',
      code: `
const bridge = game.janus7.bridge.dsa5;

const status = bridge.getCurrentMoonStatus();
console.assert(status !== null, 'getCurrentMoonStatus() liefert Ergebnis');
console.assert(typeof status.phaseIndex === 'number' && status.phaseIndex >= 0 && status.phaseIndex <= 7, 'phaseIndex 0-7');
console.assert(typeof status.lightAdjust === 'number', 'lightAdjust vorhanden');
console.assert(['newmoon','fullmoon','waxing','waning'].includes(status.academicCategory), 'academicCategory valid');

const upcoming = bridge.getUpcomingMoonPhases ? bridge.getUpcomingMoonPhases(4) : bridge.getUpcomingPhases(4);
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
console.assert(typeof name === 'string' && name.length > 0, 'Name ist nichtleer');
      `,
    },
    {
      title: '4. getUpcomingPhases — Nächste 4 Phasenwechsel',
      code: `
const bridge = game.janus7.bridge.dsa5;
const upcoming = bridge.getUpcomingMoonPhases ? bridge.getUpcomingMoonPhases(4) : bridge.getUpcomingPhases(4);
console.log('Nächste Phasenwechsel:');
console.table(upcoming.map(p => ({
  name:     p.name,
  inDays:   p.inDays,
  kategorie: p.academicCategory,
  licht:    p.lightAdjust,
})));
console.assert(upcoming.length <= 4, 'Maximal 4 Einträge');
      `,
    },
    {
      title: '5. janus7MoonPhaseChanged Hook — Phasenwechsel erkennen',
      code: `
const bridge = game.janus7.bridge.dsa5;
let hookFired = false;

const id = Hooks.once('janus7MoonPhaseChanged', (moonStatus) => {
  hookFired = true;
  console.log('Phasenwechsel erkannt:', moonStatus);
});

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
  await game.time.advance(-secondsToAdvance);
}
      `,
    }
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