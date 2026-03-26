import { STATE_PATHS } from './common.js';

/**
 * JanusDiagnostics (robust)
 * - Darf niemals den Engine-Start blockieren
 * - Liefert einfache Smoke-Checks + Metriken, ohne harte Abhängigkeiten
 *
 * Nutzung:
 *   await game.janus7.diagnostics.run({ notify: true });
 */

/**
 * @typedef {object} JanusDiagnosticsOptions
 * @property {boolean} [notify=true] UI Notifications anzeigen
 */

/**
 * @param {any} engine
 * @param {JanusDiagnosticsOptions} [opts]
 */
/**
 * runJanusDiagnostics
 *
 * @description
 * Öffentliche API von JANUS7.
 * Diese Funktion/Klasse ist Teil der stabilen Oberfläche
 * und wird durch den Testkatalog abgesichert.
 *
 * @remarks
 * - Keine UI-Seiteneffekte
 * - Keine direkten Zugriffe auf Foundry- oder dsa5-Interna außerhalb definierter APIs
 * - Änderungen hier erfordern Anpassungen im Testkatalog
 */
export async function runJanusDiagnostics(engine, { notify = true, edgeCases = false, verbose = false } = {}) {
  const moduleId = engine?.moduleId ?? 'janus7';
  const getSetting = (key, fallback = null) => {
    try {
      const value = game?.settings?.get?.(moduleId, key);
      return value ?? fallback;
    } catch (_err) {
      return fallback;
    }
  };
  const report = {
    meta: {
      generatedAt: new Date().toISOString(),
      moduleId,
      moduleVersion: game?.modules?.get?.(moduleId)?.version ?? null,
      foundryVersion: game?.version ?? null,
      systemId: game?.system?.id ?? null,
      systemVersion: game?.system?.version ?? null,
      settings: {
        enableSimulation: getSetting('enableSimulation'),
        enableAtmosphere: getSetting('enableAtmosphere'),
        enableUI: getSetting('enableUI'),
        enableQuestSystem: getSetting('enableQuestSystem'),
        enableSocial: getSetting('enableSocial', true),
        enableScoring: getSetting('enableScoring', true),
        enablePhase7: getSetting('enablePhase7', true),
        debugLevel: getSetting('debugLevel', 'info'),
        syncWithDSA5Calendar: getSetting('syncWithDSA5Calendar', false),
        calendarSlotSeconds: getSetting('calendarSlotSeconds')
      }
    },
    checks: [],
    summary: { ok: 0, warn: 0, fail: 0 },
    sections: {},
    warnings: []
  };

  const push = (id, ok, message, details = null, level) => {
    const lvl = level ?? (ok ? 'ok' : 'fail');
    report.checks.push({ id, level: lvl, ok: Boolean(ok), message, details });
    if (lvl === 'ok') report.summary.ok += 1;
    else if (lvl === 'warn') report.summary.warn += 1;
    else report.summary.fail += 1;
  };

  const safe = async (id, fn, okMsg, failMsg, warn = false) => {
    try {
      const res = await fn();
      push(id, true, okMsg, res, 'ok');
      return res;
    } catch (err) {
      push(id, false, failMsg, { error: String(err?.message ?? err) }, warn ? 'warn' : 'fail');
      return null;
    }
  };

  // --- Presence
  push('engine.present', Boolean(engine), engine ? 'Engine ist vorhanden.' : 'Engine fehlt.');
  push('academy.present', Boolean(engine?.academy), engine?.academy ? 'engine.academy ist vorhanden.' : 'engine.academy fehlt.', null, engine?.academy ? 'ok' : 'warn');
  push('academy.data.present', Boolean(engine?.academy?.data), engine?.academy?.data ? 'engine.academy.data ist vorhanden.' : 'engine.academy.data fehlt.', null, engine?.academy?.data ? 'ok' : 'warn');

  // --- Data API smoke
  const data = engine?.academy?.data;

  if (data) {
    // init is optional
    if (typeof data.init === 'function') {
      await safe('academy.data.init', () => data.init(), 'academy.data.init() ok', 'academy.data.init() fehlgeschlagen', true);
    }

    // metrics helpers
    const metric = async (id, fnName, okLabel, extractor) => {
      if (typeof data[fnName] !== 'function') {
        push(id, false, `${fnName}() fehlt`, null, 'warn');
        return;
      }
      const res = await safe(id, () => data[fnName](), `${fnName}() ok`, `${fnName}() fehlgeschlagen`, true);
      if (!res) return;
      try {
        const m = extractor ? extractor(res) : null;
        push(`${id}.metric`, true, okLabel, m, 'ok');
      } catch (e) {
        push(`${id}.metric`, false, 'Metric konnte nicht berechnet werden', { error: String(e?.message ?? e) }, 'warn');
      }
    };

    await metric('academy.spellCurriculum', 'getSpellCurriculum', 'SpellCurriculum metric', (d) => ({ modules: d?.modules?.length ?? 0 }));
    await metric('academy.alchemyRecipes', 'getAlchemyRecipes', 'Alchemy metric', (d) => ({ recipes: d?.recipes?.length ?? 0 }));
    await metric('academy.lessonGenerator', 'getLessonGenerator', 'LessonGenerator metric', (d) => ({ templates: d?.templates?.length ?? 0 }));
    await metric('academy.calendarTemplate', 'getCalendarTemplate', 'CalendarTemplate metric', (d) => ({ plans: d?.plans?.length ?? 0, timeSlots: d?.timeSlots?.length ?? 0 }));
    await metric('academy.teachingSessions', 'getTeachingSessions', 'TeachingSessions metric', (d) => ({ sessions: d?.sessions?.length ?? 0 }));

    // targeted searches (optional)
    if (typeof data.findSpellOccurrences === 'function') {
      await safe(
        'academy.findSpellOccurrences',
        () => data.findSpellOccurrences('Ignifaxius'),
        'findSpellOccurrences("Ignifaxius") ok',
        'findSpellOccurrences fehlgeschlagen',
        true
      );
    }
    if (typeof data.findAlchemyRecipesByIngredient === 'function') {
      await safe(
        'academy.findAlchemyRecipesByIngredient',
        () => data.findAlchemyRecipesByIngredient('Quecksilber'),
        'findAlchemyRecipesByIngredient("Quecksilber") ok',
        'findAlchemyRecipesByIngredient fehlgeschlagen',
        true
      );
    }
  }

  // --- Phase 3 readiness
  const sysOk = (game?.system?.id === 'dsa5');
  push('phase3.system.dsa5', sysOk, sysOk ? 'System ist dsa5.' : `System ist nicht dsa5 (systemId=${game?.system?.id ?? 'unknown'}).`, null, sysOk ? 'ok' : 'warn');

  if (sysOk) {
    const bridge = engine?.bridge?.dsa5;
    const avail = Boolean(bridge?.available);
    push('phase3.bridge.dsa5.present', Boolean(bridge), bridge ? 'DSA5 Bridge Objekt vorhanden.' : 'DSA5 Bridge Objekt fehlt.', null, bridge ? 'ok' : 'warn');
    push('phase3.bridge.dsa5.available', avail, avail ? 'DSA5 Bridge verfügbar.' : 'DSA5 Bridge nicht verfügbar (Init fehlgeschlagen?).', { available: avail });
  }

  // --- Edge Case Tests (optional, comprehensive)
  if (edgeCases && engine?.simulation) {
    if (verbose) (engine?.core?.logger ?? console).info?.('[JANUS7] Running Edge Case Tests...');
    
    // SlotResolver Edge Cases
    if (engine.simulation?.lessons) {
      const emptySlot = { year: 99, trimester: 99, week: 99, day: 'Praiosstag', phase: 'Morgen' };
      await safe('edgecase.slotresolver.empty', 
        async () => {
          const result = engine.simulation.lessons.getLessonsForSlot(emptySlot);
          if (!Array.isArray(result)) throw new Error('Result not array');
          // Note: May return lessons from teaching sessions if they exist for this day/phase
          // The important thing is it doesn't crash and returns valid array
          return { length: result.length, type: 'array' };
        },
        'SlotResolver: Returns array for non-existent slot',
        'SlotResolver: Did not return array'
      );
      
      await safe('edgecase.slotresolver.invalid',
        async () => {
          const result = engine.simulation.lessons.getLessonsForSlot({ year: 1 });
          if (!Array.isArray(result)) throw new Error('Should handle invalid slot gracefully');
          return { handled: true };
        },
        'SlotResolver: Invalid slot handled gracefully',
        'SlotResolver: Invalid slot not handled'
      );
      
      await safe('edgecase.slotresolver.null',
        async () => {
          const r1 = engine.simulation.lessons.getLessonsForSlot(null);
          const r2 = engine.simulation.lessons.getLessonsForSlot(undefined);
          if (!Array.isArray(r1) || !Array.isArray(r2)) throw new Error('Should handle null/undefined');
          return { null: r1.length, undefined: r2.length };
        },
        'SlotResolver: Null/undefined handled',
        'SlotResolver: Null/undefined not handled'
      );
      
      await safe('edgecase.slotresolver.placeholder',
        async () => {
          const slot = { year: 1, trimester: 1, week: 2, day: 'Rondra', phase: 'Vormittag' };
          const lessons = engine.simulation.lessons.getLessonsForSlot(slot);
          for (const item of lessons) {
            const lesson = item?.lesson;
            if (lesson?.topic?.includes('[THEMA]')) {
              throw new Error(`Topic contains placeholder: ${lesson.topic}`);
            }
            if (lesson?.name?.includes('[THEMA]')) {
              throw new Error(`Name contains placeholder: ${lesson.name}`);
            }
          }
          return { checked: lessons.length };
        },
        'SlotResolver: No [THEMA] placeholders in generated lessons',
        'SlotResolver: [THEMA] placeholder found'
      );
    }
    
    // Events Engine Edge Cases
    if (engine.academy?.events) {
      const originalCalendar = engine.academy.events.calendar;
      await safe('edgecase.events.nocalendar',
        async () => {
          engine.academy.events.calendar = null;
          try {
            const result = engine.academy.events.listEventsForCurrentSlot();
            if (!Array.isArray(result)) throw new Error('Should return array without calendar');
            if (result.length !== 0) throw new Error('Should return empty array');
            return { length: 0 };
          } finally {
            engine.academy.events.calendar = originalCalendar;
          }
        },
        'Events: Works without calendar',
        'Events: Failed without calendar'
      );
      
      await safe('edgecase.events.nullslot',
        async () => {
          const result = engine.academy.events.listEventsForSlot(null);
          if (!Array.isArray(result)) throw new Error('Should handle null slot');
          return { handled: true };
        },
        'Events: Null slot handled',
        'Events: Null slot not handled'
      );
    }
    
    // Calendar Rollover Edge Cases
    if (engine.simulation?.calendar && engine.core?.state) {
      // Get backup of current time state
      const timeBackup = engine.core.state.get(STATE_PATHS.TIME);
      
      await safe('edgecase.calendar.week_rollover',
        async () => {
          try {
            engine.core.state.set(STATE_PATHS.TIME, { 
              year: 1, trimester: 1, week: 12, day: 'Firunstag', 
              phase: 'Nacht', totalDaysPassed: 0, isHoliday: false 
            });
            await engine.simulation.calendar.advanceDay({ days: 1 });
            const time = engine.core.state.get(STATE_PATHS.TIME);
            if (time.week !== 1) throw new Error(`Week should be 1, got ${time.week}`);
            if (time.trimester !== 2) throw new Error(`Trimester should be 2, got ${time.trimester}`);
            return { week: time.week, trimester: time.trimester };
          } finally {
            engine.core.state.set(STATE_PATHS.TIME, timeBackup);
          }
        },
        'Calendar: Week rollover at boundary',
        'Calendar: Week rollover failed'
      );
      
      await safe('edgecase.calendar.trimester_rollover',
        async () => {
          try {
            engine.core.state.set(STATE_PATHS.TIME, { 
              year: 1, trimester: 3, week: 12, day: 'Firunstag', 
              phase: 'Nacht', totalDaysPassed: 0, isHoliday: false 
            });
            await engine.simulation.calendar.advanceDay({ days: 1 });
            const time = engine.core.state.get(STATE_PATHS.TIME);
            if (time.trimester !== 1) throw new Error(`Trimester should be 1, got ${time.trimester}`);
            if (time.year !== 2) throw new Error(`Year should be 2, got ${time.year}`);
            return { trimester: time.trimester, year: time.year };
          } finally {
            engine.core.state.set(STATE_PATHS.TIME, timeBackup);
          }
        },
        'Calendar: Trimester rollover at boundary',
        'Calendar: Trimester rollover failed'
      );
      
      await safe('edgecase.calendar.backward',
        async () => {
          try {
            engine.core.state.set(STATE_PATHS.TIME, { 
              year: 1, trimester: 2, week: 5, day: 'Traviatag', 
              phase: 'Mittag', totalDaysPassed: 50, isHoliday: false 
            });
            await engine.simulation.calendar.advanceDay({ days: -1 });
            const time = engine.core.state.get(STATE_PATHS.TIME);
            if (time.week <= 0) throw new Error('Week should remain positive');
            if (time.trimester <= 0) throw new Error('Trimester should remain positive');
            if (time.year <= 0) throw new Error('Year should remain positive');
            return { week: time.week, trimester: time.trimester, year: time.year };
          } finally {
            engine.core.state.set(STATE_PATHS.TIME, timeBackup);
          }
        },
        'Calendar: Backward time travel',
        'Calendar: Backward time travel failed'
      );
    }
    
    // State Transaction Rollback
    if (engine.core?.state) {
      await safe('edgecase.state.rollback',
        async () => {
          const before = engine.core.state.get(STATE_PATHS.TIME_YEAR);
          try {
            await engine.core.state.transaction(async (s) => {
              s.set(STATE_PATHS.TIME_YEAR, 999);
              throw new Error('Intentional error for rollback test');
            });
          } catch (e) {
            // Expected error - rollback should have occurred
          }
          const after = engine.core.state.get(STATE_PATHS.TIME_YEAR);
          if (after !== before) throw new Error(`Year should be ${before}, got ${after}`);
          return { before, after };
        },
        'State: Transaction rollback on error',
        'State: Transaction rollback failed'
      );
    }
    
    // Data Integrity
    if (engine.academy?.data) {
      await safe('edgecase.data.npcs',
        async () => {
          const npcs = engine.academy.data.listNPCs() || [];
          if (npcs.length === 0) throw new Error('No NPCs loaded');
          for (const npc of npcs) {
            if (typeof npc.id !== 'string' || npc.id.length === 0) {
              throw new Error(`Invalid NPC ID: ${JSON.stringify(npc)}`);
            }
          }
          return { count: npcs.length };
        },
        'Data: NPCs have valid IDs',
        'Data: NPC IDs invalid'
      );
      
      await safe('edgecase.data.invalid_lesson',
        async () => {
          const lesson = engine.academy.data.getLesson('INVALID_ID_12345');
          if (lesson !== null) throw new Error('Invalid ID should return null');
          return { handled: true };
        },
        'Data: Invalid lesson ID returns null',
        'Data: Invalid lesson ID not handled'
      );
    }
    
    // Scoring Engine
    if (engine.simulation?.scoring && engine.core?.state) {
      // Get backup of scoring state
      const scoringBackup = engine.core.state.get(STATE_PATHS.SCORING);
      
      await safe('edgecase.scoring.negative',
        async () => {
          try {
            await engine.simulation.scoring.addStudentPoints(
              'TEST_STUDENT_EDGE',
              -10,
              'Edge case test penalty'
            );
            const score = engine.simulation.scoring.getStudentScore('TEST_STUDENT_EDGE');
            if (score !== -10) throw new Error(`Expected -10, got ${score}`);
            return { score };
          } finally {
            engine.core.state.set(STATE_PATHS.SCORING, scoringBackup);
          }
        },
        'Scoring: Negative points (penalties)',
        'Scoring: Negative points failed'
      );
      
      await safe('edgecase.scoring.nonexistent',
        async () => {
          const score = engine.simulation.scoring.getStudentScore('NON_EXISTENT_STUDENT');
          if (score !== 0) throw new Error(`Non-existent student should return 0, got ${score}`);
          return { score };
        },
        'Scoring: Non-existent student returns 0',
        'Scoring: Non-existent student handling failed'
      );
    }
    
    if (verbose) {
      const edgePassed = report.checks.filter(c => c.id.startsWith('edgecase.') && c.ok).length;
      const edgeFailed = report.checks.filter(c => c.id.startsWith('edgecase.') && !c.ok).length;
      (engine?.core?.logger ?? console).info?.(`[JANUS7] Edge Case Tests: ${edgePassed} passed, ${edgeFailed} failed`);
    }
  }


  const stateMeta = engine?.core?.state?.get?.('meta') ?? engine?.core?.state?.get?.()?.meta ?? {};
  const kiApi = engine?.capabilities?.ki ?? engine?.ki ?? null;
  let importHistory = [];
  let backups = [];
  try { importHistory = kiApi?.getImportHistory?.() ?? []; } catch (_err) { importHistory = []; }
  try { backups = await (kiApi?.listBackups?.() ?? []); } catch (_err) { backups = []; }
  const lastImport = Array.isArray(importHistory) && importHistory.length ? importHistory[importHistory.length - 1] : null;
  const activeOptionalModules = Array.from(game?.modules?.values?.() ?? [])
    .filter((m) => m?.active && !['janus7', game?.system?.id].includes(m?.id))
    .slice(0, 12)
    .map((m) => ({ id: m.id, title: m.title ?? m.id, version: m.version ?? '?' }));
  const recentLogs = (() => {
    try {
      const ctor = engine?.core?.logger?.constructor;
      return ctor?.getRecentEntries?.({ levels: ['warn', 'error', 'fatal'], limit: 5 }) ?? [];
    } catch (_err) {
      return [];
    }
  })();
  const serviceReport = engine?.serviceRegistry?.getReport?.()
    ?? engine?.services?.registry?.getReport?.()
    ?? { ready: [], pending: [], uptime: {} };
  const errorSummary = engine?.errors?.getSummary?.()
    ?? { totalErrors: 0, totalWarnings: 0, byPhase: {}, latest: [] };
  const importFailedCount = Array.isArray(engine?.test?.results)
    ? engine.test.results.filter((r) => String(r?.status ?? '').toUpperCase() === 'IMPORT_FAILED').length
    : 0;
  if ((errorSummary.totalErrors ?? 0) > 0 || (errorSummary.totalWarnings ?? 0) > 0) {
    push(
      'runtime.issues',
      false,
      `Runtime issues recorded: errors=${errorSummary.totalErrors ?? 0}, warnings=${errorSummary.totalWarnings ?? 0}`,
      errorSummary,
      'warn'
    );
  }
  report.sections = {
    build: {
      moduleId: report.meta.moduleId,
      moduleVersion: report.meta.moduleVersion,
      stateVersion: stateMeta?.version ?? null,
      stateSchemaVersion: stateMeta?.schemaVersion ?? null,
      foundryVersion: report.meta.foundryVersion,
      systemId: report.meta.systemId,
      systemVersion: report.meta.systemVersion
    },
    sync: {
      socketDeclared: game?.modules?.get?.(report.meta.moduleId)?.socket === true,
      socketAvailable: Boolean(game?.socket),
      syncWithDSA5Calendar: report.meta.settings?.syncWithDSA5Calendar ?? false,
      activeLocationId: engine?.core?.state?.get?.('academy.currentLocationId') ?? null
    },
    phase7: {
      enabled: report.meta.settings?.enablePhase7 !== false,
      apiReady: Boolean(kiApi?.previewImport && kiApi?.applyImport),
      importHistoryCount: Array.isArray(importHistory) ? importHistory.length : 0,
      lastImportStatus: lastImport?.status ?? null,
      backupCount: Array.isArray(backups) ? backups.length : 0,
      lastBackupRef: Array.isArray(backups) && backups.length ? (backups[0]?.fileRef ?? backups[0]?.name ?? null) : null
    },
    tests: {
      totalResults: Array.isArray(engine?.test?.results) ? engine.test.results.length : 0,
      importFailed: importFailedCount,
      lastRunAt: engine?.test?.lastRunAt ?? null
    },
    logger: {
      debugLevel: report.meta.settings?.debugLevel ?? null,
      recentWarnings: recentLogs.map((entry) => ({
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message
      }))
    },
    services: serviceReport,
    errors: errorSummary,
    modules: {
      activeOptionalModules
    },
    ui: {
      lastUiError: engine?.diagnostics?.lastUiError ?? null
    }
  };
  // State-Version-Drift Diagnose: wenn gespeicherter State älter als Modul
  const _modVer = report.meta.moduleVersion;
  const _stateVer = report.sections.build.stateVersion;
  if (_modVer && _stateVer && _stateVer !== _modVer) {
    report.checks.push({
      id: 'state.version.drift',
      level: 'warn',
      ok: true,
      message: `World coreState version (${_stateVer}) differs from module version (${_modVer}) — state will auto-align on next save`,
      details: { stateVersion: _stateVer, moduleVersion: _modVer }
    });
    report.summary.warn = (report.summary.warn ?? 0) + 1;
  }

  report.warnings = [
    ...(report.checks.filter((c) => c.level === 'warn').map((c) => c.message)),
    ...recentLogs.map((entry) => `${entry.level?.toUpperCase?.() ?? 'WARN'}: ${entry.message}`)
  ].slice(0, 8);
  report.health = report.summary.fail > 0 ? 'fail' : (report.summary.warn > 0 ? 'warn' : 'ok');
  report.overview = {
    generatedAt: report.meta.generatedAt,
    health: report.health,
    totals: { ...report.summary }
  };

  // optional UI notify
  if (notify && ui?.notifications) {
    const { ok, warn, fail } = report.summary;
    const msg = `JANUS7 Diagnostics: ${report.health.toUpperCase()} · OK=${ok} WARN=${warn} FAIL=${fail}`;
    ui.notifications[fail ? 'error' : warn ? 'warn' : 'info'](msg);
  }

  return report;
}

export function generateBugReport(engine, { failedTestId = null, testData = null } = {}) {
  const moduleId = engine?.moduleId ?? 'janus7';
  const moduleVersion = game?.modules?.get?.(moduleId)?.version ?? null;
  const foundryVersion = game?.version ?? game?.release?.version ?? null;
  const dsa5Version = game?.system?.id === 'dsa5' ? (game?.system?.version ?? null) : (game?.system?.version ?? null);
  const recentLogs = (() => {
    try {
      const ctor = engine?.core?.logger?.constructor;
      const raw = ctor?.getRecentEntries?.({ levels: ['warn', 'error', 'fatal'], limit: 25 }) ?? [];
      const ignore = [
        'TEST_IMPORT_ROLLBACK',
        'root.test ist nicht erlaubt',
        'autoSave ist deaktiviert',
        'amount ist 0 oder keine Zahl'
      ];
      return raw.filter((entry) => {
        const msg = String(entry?.message ?? '');
        return !ignore.some((needle) => msg.includes(needle));
      }).slice(0, 15);
    } catch (_err) {
      return [];
    }
  })();
  const fallbackFailedId = (() => {
    const failed = Array.isArray(testData?.results) ? testData.results.find((r) => r?.status === 'fail') : null;
    if (!failed) return null;
    return failed.id ?? `${failed.group ?? 'unknown'}::${failed.name ?? 'unnamed'}`;
  })();

  const payload = {
    generatedAt: new Date().toISOString(),
    janusVersion: moduleVersion,
    foundryVersion,
    dsa5Version,
    failedTestId: failedTestId ?? fallbackFailedId,
    recentErrorLogs: recentLogs
  };

  return [
    'JANUS7 Bug Report',
    `Generated: ${payload.generatedAt}`,
    `JANUS Version: ${payload.janusVersion ?? 'unknown'}`,
    `Foundry Version: ${payload.foundryVersion ?? 'unknown'}`,
    `DSA5 Version: ${payload.dsa5Version ?? 'unknown'}`,
    `Failed Test ID: ${payload.failedTestId ?? 'n/a'}`,
    '',
    'Recent Error Logs:',
    ...(payload.recentErrorLogs.length
      ? payload.recentErrorLogs.map((entry) => `- [${entry.timestamp}] ${entry.prefix} ${entry.level?.toUpperCase?.() ?? entry.level}: ${entry.message}`)
      : ['- none'])
  ].join('\n');
}
