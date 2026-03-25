import { DSA5MoonBridge } from '../../../../bridge/dsa5/moon.js';
import { HOOKS } from '../../../../core/hooks/topics.js';

export default {
  id: 'P3-TC-MOON-01',
  title: 'Moon Bridge: Mondphasen lesen, Modifikatoren, Phasenwechsel-Hook',
  phases: [3],
  kind: 'auto',
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
            // We'll simulate dayInCycle based on time for test predictability.
            // Let's say 1 day = 100 units of time.
            const dayInCycle = Math.floor(t / 100) % 28;

            // Determine phaseIndex based on dayStart boundaries
            // 0:0, 1:1, 2:7, 3:8, 4:14, 5:15, 6:21, 7:22
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
      simulatedWorldTime = 1400; // day 14 -> phase 4 (Full Moon)
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
      const mod = bridge.getLessonModifier('arcanology');

      if (!mod || !mod.isActive) {
        ok = false;
        notes.push('Expected arcanology modifier to be active during full moon');
      } else {
        if (mod.fpBonus !== 2) { ok = false; notes.push(`Expected fpBonus 2, got ${mod.fpBonus}`); }
        if (mod.qsBonus !== 1) { ok = false; notes.push(`Expected qsBonus 1, got ${mod.qsBonus}`); }
      }

      // Default fallback
      const unknownMod = bridge.getLessonModifier('unknown_lesson');
      if (unknownMod.isActive) {
        ok = false;
        notes.push('Expected unknown_lesson modifier to be inactive');
      }

      // 6. Test: Astral Energy Modifier
      const astralMod = bridge.getAstralEnergyModifier();
      if (astralMod.aspBonus !== 2) {
        ok = false;
        notes.push(`Expected aspBonus 2 for full moon, got ${astralMod.aspBonus}`);
      }

      simulatedWorldTime = 0; // day 0 -> phase 0 (New Moon)
      const darkAstralMod = bridge.getAstralEnergyModifier(true); // isDarkMage
      if (darkAstralMod.aspBonus !== 2) {
        ok = false;
        notes.push(`Expected aspBonus 2 for dark mage at new moon, got ${darkAstralMod.aspBonus}`);
      }

      // 7. Test: Upcoming Phases
      const upcoming = bridge.getUpcomingPhases(4);
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
      // Initially at time 0 (New Moon, phase 0).
      // Let's advance to time 100 (day 1, phase 1).
      bridge.onWorldTimeUpdated(100);

      if (!hookFired) {
        ok = false;
        notes.push('janus7MoonPhaseChanged hook was not fired upon phase change');
      } else if (!emittedHookData || emittedHookData.phaseIndex !== 1) {
        ok = false;
        notes.push(`Hook fired but emitted unexpected phaseIndex: ${emittedHookData?.phaseIndex}`);
      }

      // Try calling again with same phase, should NOT fire hook again (or change lastPhaseIndex)
      hookFired = false;
      bridge.onWorldTimeUpdated(150); // still day 1
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
      // Restore globals
      globalThis.game = _originalGame;
      globalThis.Hooks = _originalHooks;
    }

    return {
      ok,
      summary: ok ? 'Moon Bridge tests passed successfully' : 'Moon Bridge tests failed',
      notes: notes.length > 0 ? notes : undefined
    };
  }
};
