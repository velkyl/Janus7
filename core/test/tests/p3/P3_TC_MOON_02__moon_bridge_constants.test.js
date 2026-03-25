/**
 * @file core/test/tests/p3/P3_TC_MOON_02__moon_bridge_constants.test.js
 * @module janus7/test
 * @phase 3
 *
 * Purpose: Test module-level exports from bridge/dsa5/moon.js directly.
 */

export default {
  id: 'P3-TC-MOON-02',
  phase: 3,
  title: 'Moon Bridge: Constants and Exports',
  prio: 'P2',
  type: 'M',

  requires: [],

  snippets: [
    {
      title: '1. Exported Constants Match MOON_PHASES',
      code: `
        const {
          MOON_PHASES,
          MOON_CYCLE_DAYS,
          FULL_MOON_INDEX,
          NEW_MOON_INDEX
        } = await import('/modules/Janus7/bridge/dsa5/moon.js');

        console.assert(MOON_CYCLE_DAYS === 28, 'MOON_CYCLE_DAYS should be 28');

        console.assert(FULL_MOON_INDEX === 4, 'FULL_MOON_INDEX should be 4');
        const fullMoonPhase = MOON_PHASES[FULL_MOON_INDEX];
        console.assert(fullMoonPhase.name === 'Rad', 'Full moon name should be "Rad"');
        console.assert(fullMoonPhase.academicCategory === 'fullmoon', 'Full moon category should be "fullmoon"');
        console.assert(fullMoonPhase.lightAdjust === 1.0, 'Full moon lightAdjust should be 1.0');

        console.assert(NEW_MOON_INDEX === 0, 'NEW_MOON_INDEX should be 0');
        const newMoonPhase = MOON_PHASES[NEW_MOON_INDEX];
        console.assert(newMoonPhase.name === 'ToteMada', 'New moon name should be "ToteMada"');
        console.assert(newMoonPhase.academicCategory === 'newmoon', 'New moon category should be "newmoon"');
        console.assert(newMoonPhase.lightAdjust === 0.0, 'New moon lightAdjust should be 0.0');

        console.log('✅ Moon Bridge constants validated');
      `
    }
  ],

  validation: [
    'MOON_CYCLE_DAYS is 28',
    'FULL_MOON_INDEX is 4, pointing to "Rad"',
    'NEW_MOON_INDEX is 0, pointing to "ToteMada"'
  ]
};
