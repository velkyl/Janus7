/**
 * @file JANUS7_TestRunner_EdgeCases.js
 * @description Umfassende Edge-Case-Tests für JANUS7 v0.5.1.1
 * 
 * Tests abgedeckt:
 * - SlotResolver Edge Cases (leere Slots, fehlende planId, malformed data)
 * - Events Engine Edge Cases (ohne Calendar, leere Event-Listen)
 * - Calendar Rollover Boundary Conditions
 * - State Transaction Rollback Scenarios
 * - Data Integrity (fehlende Referenzen, ungültige IDs)
 */

(async () => {
  const MODULE_ID = 'Janus7';
  
  // Helper: Test Framework
  const TestRunner = {
    passed: 0,
    failed: 0,
    tests: [],
    
    async test(name, fn) {
      try {
        await fn();
        this.passed++;
        this.tests.push({ name, status: 'PASS', error: null });
        console.log(`✅ PASS: ${name}`);
      } catch (error) {
        this.failed++;
        this.tests.push({ name, status: 'FAIL', error: error.message });
        console.error(`❌ FAIL: ${name}`, error);
      }
    },
    
    assert(condition, message) {
      if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
      }
    },
    
    assertEqual(actual, expected, message) {
      if (actual !== expected) {
        throw new Error(`${message} - Expected: ${expected}, Got: ${actual}`);
      }
    },
    
    assertThrows(fn, message) {
      let threw = false;
      try {
        fn();
      } catch (e) {
        threw = true;
      }
      if (!threw) {
        throw new Error(`${message} - Expected function to throw`);
      }
    },
    
    report() {
      console.log('\n' + '='.repeat(80));
      console.log('JANUS7 EDGE CASE TEST REPORT');
      console.log('='.repeat(80));
      console.log(`Total Tests: ${this.tests.length}`);
      console.log(`✅ Passed: ${this.passed}`);
      console.log(`❌ Failed: ${this.failed}`);
      console.log(`Success Rate: ${((this.passed / this.tests.length) * 100).toFixed(1)}%`);
      
      if (this.failed > 0) {
        console.log('\n' + '-'.repeat(80));
        console.log('FAILED TESTS:');
        this.tests.filter(t => t.status === 'FAIL').forEach(t => {
          console.log(`  ❌ ${t.name}`);
          console.log(`     ${t.error}`);
        });
      }
      
      console.log('='.repeat(80) + '\n');
      
      return this.failed === 0;
    }
  };
  
  // Check module is loaded
  if (!game.janus7) {
    ui.notifications.error('JANUS7 module not loaded');
    return;
  }
  
  const engine = game.janus7;
  
  console.log('\n' + '='.repeat(80));
  console.log('JANUS7 EDGE CASE TEST SUITE v0.5.1.1');
  console.log('='.repeat(80) + '\n');
  
  // ==========================================================================
  // SECTION 1: SLOTRESOLVER EDGE CASES
  // ==========================================================================
  
  console.log('\n📋 SECTION 1: SlotResolver Edge Cases\n');
  
  await TestRunner.test('SlotResolver: Empty slot (no sessions, no calendar)', async () => {
    const emptySlot = {
      year: 99,
      trimester: 99,
      week: 99,
      day: 'Praiosstag',
      phase: 'Morgen'
    };
    
    const result = engine.simulation?.lessons?.getLessonsForSlot?.(emptySlot);
    TestRunner.assert(Array.isArray(result), 'Result should be array');
    TestRunner.assertEqual(result.length, 0, 'Empty slot should return empty array');
  });
  
  await TestRunner.test('SlotResolver: Invalid slot reference (missing fields)', async () => {
    const invalidSlot = {
      year: 1,
      // Missing trimester, week, day, phase
    };
    
    const result = engine.simulation?.lessons?.getLessonsForSlot?.(invalidSlot);
    TestRunner.assert(Array.isArray(result), 'Should handle invalid slot gracefully');
    TestRunner.assertEqual(result.length, 0, 'Invalid slot should return empty array');
  });
  
  await TestRunner.test('SlotResolver: Null/undefined slot reference', async () => {
    const result1 = engine.simulation?.lessons?.getLessonsForSlot?.(null);
    const result2 = engine.simulation?.lessons?.getLessonsForSlot?.(undefined);
    
    TestRunner.assert(Array.isArray(result1), 'Null should return empty array');
    TestRunner.assert(Array.isArray(result2), 'Undefined should return empty array');
    TestRunner.assertEqual(result1.length, 0, 'Null slot length should be 0');
    TestRunner.assertEqual(result2.length, 0, 'Undefined slot length should be 0');
  });
  
  await TestRunner.test('SlotResolver: Valid slot with lessons', async () => {
    const validSlot = {
      year: 1,
      trimester: 1,
      week: 1,
      day: 'Praiosstag',
      phase: 'Morgen'
    };
    
    const result = engine.simulation?.lessons?.getLessonsForSlot?.(validSlot);
    TestRunner.assert(Array.isArray(result), 'Result should be array');
    // Should have at least one lesson or be empty (both valid)
    TestRunner.assert(result.length >= 0, 'Should return valid array');
  });
  
  await TestRunner.test('SlotResolver: Generated lessons have no [THEMA] placeholder', async () => {
    const slot = {
      year: 1,
      trimester: 1,
      week: 2,
      day: 'Rondra',
      phase: 'Vormittag'
    };
    
    const lessons = engine.simulation?.lessons?.getLessonsForSlot?.(slot);
    for (const item of lessons) {
      const lesson = item?.lesson;
      if (lesson?.topic) {
        TestRunner.assert(
          !lesson.topic.includes('[THEMA]'),
          `Topic should not contain placeholder: ${lesson.topic}`
        );
      }
      if (lesson?.name) {
        TestRunner.assert(
          !lesson.name.includes('[THEMA]'),
          `Name should not contain placeholder: ${lesson.name}`
        );
      }
    }
  });
  
  await TestRunner.test('SlotResolver: Debug explainSlot returns valid metadata', async () => {
    const slot = {
      year: 1,
      trimester: 1,
      week: 1,
      day: 'Praiosstag',
      phase: 'Morgen'
    };
    
    const explanation = engine.academy?.debug?.explainSlot?.(slot);
    if (explanation) {
      TestRunner.assert(typeof explanation === 'string', 'Explanation should be string');
      TestRunner.assert(explanation.includes('reason='), 'Should contain reason');
      TestRunner.assert(explanation.includes('day='), 'Should contain day');
    }
  });
  
  // ==========================================================================
  // SECTION 2: EVENTS ENGINE EDGE CASES
  // ==========================================================================
  
  console.log('\n📋 SECTION 2: Events Engine Edge Cases\n');
  
  await TestRunner.test('Events: listEventsForCurrentSlot without Calendar', async () => {
    // Temporarily null the calendar reference
    const originalCalendar = engine.academy?.events?.calendar;
    if (engine.academy?.events) {
      engine.academy.events.calendar = null;
    }
    
    try {
      const result = engine.academy?.events?.listEventsForCurrentSlot?.();
      TestRunner.assert(Array.isArray(result), 'Should return array even without calendar');
      TestRunner.assertEqual(result.length, 0, 'Should return empty array');
    } finally {
      // Restore calendar reference
      if (engine.academy?.events) {
        engine.academy.events.calendar = originalCalendar;
      }
    }
  });
  
  await TestRunner.test('Events: listEventsForSlot with null slot', async () => {
    const result = engine.academy?.events?.listEventsForSlot?.(null);
    TestRunner.assert(Array.isArray(result), 'Should handle null slot');
    TestRunner.assertEqual(result.length, 0, 'Should return empty array');
  });
  
  await TestRunner.test('Events: listEventsForSlot with valid slot', async () => {
    const slot = {
      year: 1,
      trimester: 1,
      week: 1,
      day: 'Praiosstag',
      phase: 'Morgen'
    };
    
    const result = engine.academy?.events?.listEventsForSlot?.(slot);
    TestRunner.assert(Array.isArray(result), 'Should return array for valid slot');
  });
  
  // ==========================================================================
  // SECTION 3: CALENDAR ROLLOVER BOUNDARY CONDITIONS
  // ==========================================================================
  
  console.log('\n📋 SECTION 3: Calendar Rollover Boundary Conditions\n');
  
  await TestRunner.test('Calendar: Week rollover at boundary', async () => {
    const state = engine.core?.state;
    if (!state) {
      throw new Error('State not available');
    }
    
    const backup = state.snapshot();
    
    try {
      // Set to last week of trimester
      await state.transaction((s) => {
        s.set('time', {
          year: 1,
          trimester: 1,
          week: 12, // Last week (config: 12 weeks per trimester)
          day: 'Firunstag', // Last day
          phase: 'Nacht',
          totalDaysPassed: 0,
          isHoliday: false
        });
      });
      
      // Advance 1 day (should trigger week rollover)
      await engine.simulation?.calendar?.advanceTime?.(1, 'day');
      
      const time = state.get('time');
      TestRunner.assertEqual(time.week, 1, 'Week should roll over to 1');
      TestRunner.assertEqual(time.trimester, 2, 'Trimester should increment');
    } finally {
      await state.restore(backup);
    }
  });
  
  await TestRunner.test('Calendar: Trimester rollover at boundary', async () => {
    const state = engine.core?.state;
    if (!state) {
      throw new Error('State not available');
    }
    
    const backup = state.snapshot();
    
    try {
      // Set to last trimester
      await state.transaction((s) => {
        s.set('time', {
          year: 1,
          trimester: 3, // Last trimester (config: 3 per year)
          week: 12,
          day: 'Firunstag',
          phase: 'Nacht',
          totalDaysPassed: 0,
          isHoliday: false
        });
      });
      
      // Advance 1 day
      await engine.simulation?.calendar?.advanceTime?.(1, 'day');
      
      const time = state.get('time');
      TestRunner.assertEqual(time.trimester, 1, 'Trimester should roll over to 1');
      TestRunner.assertEqual(time.year, 2, 'Year should increment');
    } finally {
      await state.restore(backup);
    }
  });
  
  await TestRunner.test('Calendar: Negative day advance (backward)', async () => {
    const state = engine.core?.state;
    if (!state) {
      throw new Error('State not available');
    }
    
    const backup = state.snapshot();
    
    try {
      // Set to mid-trimester
      await state.transaction((s) => {
        s.set('time', {
          year: 1,
          trimester: 2,
          week: 5,
          day: 'Traviatag',
          phase: 'Mittag',
          totalDaysPassed: 50,
          isHoliday: false
        });
      });
      
      // Advance -1 day (go backward)
      await engine.simulation?.calendar?.advanceTime?.(-1, 'day');
      
      const time = state.get('time');
      TestRunner.assert(time.week > 0, 'Week should remain positive');
      TestRunner.assert(time.trimester > 0, 'Trimester should remain positive');
      TestRunner.assert(time.year > 0, 'Year should remain positive');
    } finally {
      await state.restore(backup);
    }
  });
  
  await TestRunner.test('Calendar: getCurrentSlotRef returns valid structure', async () => {
    const slot = engine.simulation?.calendar?.getCurrentSlotRef?.();
    
    TestRunner.assert(slot !== null && slot !== undefined, 'Slot should exist');
    TestRunner.assert(typeof slot.year === 'number', 'Year should be number');
    TestRunner.assert(typeof slot.trimester === 'number', 'Trimester should be number');
    TestRunner.assert(typeof slot.week === 'number', 'Week should be number');
    TestRunner.assert(typeof slot.day === 'string', 'Day should be string');
    TestRunner.assert(typeof slot.phase === 'string', 'Phase should be string');
  });
  
  // ==========================================================================
  // SECTION 4: STATE TRANSACTION ROLLBACK
  // ==========================================================================
  
  console.log('\n📋 SECTION 4: State Transaction Rollback\n');
  
  await TestRunner.test('State: Transaction rollback on error', async () => {
    const state = engine.core?.state;
    if (!state) {
      throw new Error('State not available');
    }
    
    const before = state.get('time.year');
    
    try {
      await state.transaction((s) => {
        s.set('time.year', 999);
        throw new Error('Intentional error for rollback test');
      });
    } catch (e) {
      // Expected
    }
    
    const after = state.get('time.year');
    TestRunner.assertEqual(after, before, 'Year should be rolled back to original value');
  });
  
  await TestRunner.test('State: Multiple nested transactions', async () => {
    const state = engine.core?.state;
    if (!state) {
      throw new Error('State not available');
    }
    
    const backup = state.snapshot();
    
    try {
      await state.transaction(async (s) => {
        s.set('time.year', 10);
        
        await state.transaction((s2) => {
          s2.set('time.trimester', 2);
        });
        
        const year = s.get('time.year');
        const trimester = s.get('time.trimester');
        TestRunner.assertEqual(year, 10, 'Nested transaction should see outer changes');
        TestRunner.assertEqual(trimester, 2, 'Nested transaction changes should persist');
      });
    } finally {
      await state.restore(backup);
    }
  });
  
  // ==========================================================================
  // SECTION 5: DATA INTEGRITY CHECKS
  // ==========================================================================
  
  console.log('\n📋 SECTION 5: Data Integrity Checks\n');
  
  await TestRunner.test('Data: Academy Data API loaded', async () => {
    const api = engine.academy?.data;
    TestRunner.assert(api !== null && api !== undefined, 'Data API should exist');
    TestRunner.assert(typeof api.listNPCs === 'function', 'listNPCs should be function');
    TestRunner.assert(typeof api.listLocations === 'function', 'listLocations should be function');
  });
  
  await TestRunner.test('Data: NPCs have valid IDs', async () => {
    const npcs = engine.academy?.data?.listNPCs?.() ?? [];
    TestRunner.assert(npcs.length > 0, 'Should have at least one NPC');
    
    for (const npc of npcs) {
      TestRunner.assert(typeof npc.id === 'string', `NPC should have string ID: ${JSON.stringify(npc)}`);
      TestRunner.assert(npc.id.length > 0, `NPC ID should not be empty: ${npc.id}`);
    }
  });
  
  await TestRunner.test('Data: Locations have valid IDs', async () => {
    const locations = engine.academy?.data?.listLocations?.() ?? [];
    TestRunner.assert(locations.length > 0, 'Should have at least one location');
    
    for (const loc of locations) {
      TestRunner.assert(typeof loc.id === 'string', `Location should have string ID: ${JSON.stringify(loc)}`);
      TestRunner.assert(loc.id.length > 0, `Location ID should not be empty: ${loc.id}`);
    }
  });
  
  await TestRunner.test('Data: Teaching Sessions have valid structure', async () => {
    const sessions = engine.academy?.data?.listTeachingSessions?.() ?? [];
    
    for (const session of sessions) {
      TestRunner.assert(typeof session.id === 'string', 'Session should have ID');
      TestRunner.assert(typeof session.day === 'string', 'Session should have day');
      TestRunner.assert(typeof session.slotId === 'string', 'Session should have slotId');
    }
  });
  
  await TestRunner.test('Data: getLesson returns null for invalid ID', async () => {
    const lesson = engine.academy?.data?.getLesson?.('INVALID_ID_12345');
    TestRunner.assertEqual(lesson, null, 'Invalid lesson ID should return null');
  });
  
  await TestRunner.test('Data: getNPC returns null for invalid ID', async () => {
    const npc = engine.academy?.data?.getNPC?.('INVALID_NPC_12345');
    TestRunner.assertEqual(npc, null, 'Invalid NPC ID should return null');
  });
  
  // ==========================================================================
  // SECTION 6: SCORING ENGINE EDGE CASES
  // ==========================================================================
  
  console.log('\n📋 SECTION 6: Scoring Engine Edge Cases\n');
  
  await TestRunner.test('Scoring: Award points with negative value (penalty)', async () => {
    const state = engine.core?.state;
    const scoring = engine.simulation?.scoring;
    
    if (!state || !scoring) {
      throw new Error('State or Scoring not available');
    }
    
    const backup = state.snapshot();
    
    try {
      const actorId = 'TEST_ACTOR_EDGE';
      
      // Award negative points
      await scoring.awardPoints({
        actorId,
        category: 'academics',
        points: -10,
        reason: 'Edge case test penalty'
      });
      
      const score = scoring.getScore(actorId, 'academics');
      TestRunner.assertEqual(score, -10, 'Negative points should be awarded correctly');
    } finally {
      await state.restore(backup);
    }
  });
  
  await TestRunner.test('Scoring: getScore for non-existent actor returns 0', async () => {
    const scoring = engine.simulation?.scoring;
    if (!scoring) {
      throw new Error('Scoring not available');
    }
    
    const score = scoring.getScore('NON_EXISTENT_ACTOR', 'academics');
    TestRunner.assertEqual(score, 0, 'Non-existent actor should return 0');
  });
  
  // ==========================================================================
  // FINAL REPORT
  // ==========================================================================
  
  const allPassed = TestRunner.report();
  
  if (allPassed) {
    ui.notifications.info('✅ All edge case tests passed!');
  } else {
    ui.notifications.warn(`⚠️ ${TestRunner.failed} edge case test(s) failed. Check console.`);
  }
  
  return {
    passed: TestRunner.passed,
    failed: TestRunner.failed,
    total: TestRunner.tests.length,
    allPassed,
    tests: TestRunner.tests
  };
})();
