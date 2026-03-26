/**
 * JANUS7 Manual Test Auto Runner
 *
 * Scope:
 * - Automates only a conservative subset of manual tests that can be verified
 *   deterministically from the live Foundry/JANUS runtime.
 * - Does NOT fake PASS for tests that still need human observation, multi-user
 *   setup, audio/beamer output, or cross-client validation.
 * - Can optionally persist automated PASS/FAIL/SKIP decisions into the JANUS7
 *   manual test store.
 */

(async () => {
  const CONFIG = {
    persistResults: true,
    overwriteExisting: false,
    resetExisting: false,
    openGuidedForRemaining: false,
    onlyIds: []
  };

  const MODULE_ID = 'Janus7';
  const MODULE_BASE = `modules/${MODULE_ID}`;
  const engine = game?.janus7 ?? null;

  if (!engine) {
    ui.notifications.error('JANUS7 engine not available.');
    return null;
  }

  const moduleUrl = (path) => new URL(`${MODULE_BASE}/${path}`, `${globalThis.location?.origin ?? ''}/`).toString();
  const deepClone = (value) => {
    try { return foundry.utils.deepClone(value); } catch (_) {}
    try { return structuredClone(value); } catch (_) {}
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
  };
  const deepEqual = (a, b) => {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch (_) { return false; }
  };
  const nowIso = () => new Date().toISOString();
  const normalizeIdList = (value) => Array.isArray(value) ? value.map((v) => String(v ?? '').trim()).filter(Boolean) : [];
  const onlyIds = new Set(normalizeIdList(CONFIG.onlyIds));

  const [
    manualStore,
    guidedHarness
  ] = await Promise.all([
    import(moduleUrl('core/test/manual-store.js')),
    import(moduleUrl('core/test/guided/guided-harness.js'))
  ]);

  const {
    readManualTestResults,
    writeManualTestResult,
    resetManualTestResults
  } = manualStore;
  const {
    buildGuideForTest
  } = guidedHarness;

  const ensureRegistry = async () => {
    if (engine?.test?.registry?.list) return engine.test.registry;
    if (typeof engine?.test?.runCatalog === 'function') {
      await engine.test.runCatalog({
        includeManual: false,
        includeCatalog: false,
        includeImportFailed: false,
        openWindow: false
      });
    }
    return engine?.test?.registry ?? null;
  };

  const registry = await ensureRegistry();
  if (!registry?.list) {
    ui.notifications.error('JANUS7 test registry not available.');
    return null;
  }

  if (CONFIG.resetExisting) {
    await resetManualTestResults();
  }

  const existingResults = await readManualTestResults();
  const allManualTests = registry.list().filter((test) => String(test?.kind ?? '').toLowerCase() === 'manual');
  const selectedTests = onlyIds.size
    ? allManualTests.filter((test) => onlyIds.has(test.id))
    : allManualTests;

  const pass = (notes, details = {}) => ({ status: 'PASS', notes, details });
  const fail = (notes, details = {}) => ({ status: 'FAIL', notes, details });
  const skip = (notes, details = {}) => ({ status: 'SKIP', notes, details });

  const pushNote = (notes, line) => [String(notes ?? '').trim(), String(line ?? '').trim()].filter(Boolean).join(' | ');

  const pickPrimaryActor = () => {
    const actors = Array.from(game?.actors?.contents ?? []);
    return actors.find((actor) => actor?.hasPlayerOwner)
      ?? actors.find((actor) => actor?.type === 'character')
      ?? actors[0]
      ?? null;
  };

  const measureAsync = async (fn) => {
    const t0 = globalThis.performance?.now?.() ?? Date.now();
    const value = await fn();
    const t1 = globalThis.performance?.now?.() ?? Date.now();
    return { ms: Number((t1 - t0).toFixed(3)), value };
  };

  const withPatchedSettingSet = async (callback) => {
    const original = game.settings.set.bind(game.settings);
    const calls = [];
    game.settings.set = async function patchedSet(namespace, key, value) {
      calls.push({ namespace, key, value: deepClone(value) });
      return original(namespace, key, value);
    };
    try {
      const result = await callback(calls);
      return { calls, result };
    } finally {
      game.settings.set = original;
    }
  };

  const summarizeGuide = (test) => {
    const guide = buildGuideForTest(test, engine);
    const steps = Array.isArray(guide?.steps) ? guide.steps : [];
    const userSteps = steps.filter((step) => step?.type === 'user').length;
    return {
      openApp: guide?.openApp ?? null,
      userSteps,
      actionSteps: steps.length - userSteps,
      snippets: Array.isArray(guide?.snippets) ? guide.snippets.length : 0,
      requires: Array.isArray(guide?.requires) ? guide.requires : []
    };
  };

  const recentLoggerEntries = ({ levels = ['warn', 'error', 'fatal'], limit = 20 } = {}) => {
    const ctor = engine?.core?.logger?.constructor;
    if (typeof ctor?.getRecentEntries !== 'function') return [];
    return ctor.getRecentEntries({ levels, limit }) ?? [];
  };

  const AUTO_RUNNERS = {
    'P1-TC-06': async () => {
      const logger = engine?.core?.logger;
      if (!logger || typeof logger.setLevel !== 'function' || typeof logger.debug !== 'function') {
        return skip('Logger API not available.');
      }
      const previousLevel = logger.level;
      const marker = `JANUS7_MANUAL_AUTO_DEBUG_${Date.now()}`;
      try {
        logger.setLevel('debug');
        logger.debug(marker);
        const hit = recentLoggerEntries({ levels: ['debug'], limit: 20 })
          .find((entry) => String(entry?.message ?? '').includes(marker));
        if (!hit) {
          return fail('Debug entry was not recorded in logger history.');
        }
        return pass(`debugLevel switch verified (${hit.prefix ?? 'logger'})`);
      } finally {
        logger.setLevel(previousLevel);
      }
    },

    'P2-TC-03': async () => {
      const npcs = engine?.academy?.data?.getNpcs?.() ?? [];
      if (!Array.isArray(npcs) || !npcs.length) {
        return skip('Academy NPC dataset not available.');
      }
      const invalid = npcs.filter((npc) => {
        const actorUuid = String(npc?.foundry?.actorUuid ?? '').trim();
        const actorKey = String(npc?.foundry?.actorKey ?? '').trim();
        return !actorUuid && !actorKey;
      });
      if (invalid.length) {
        return fail(`NPC actor refs missing for ${invalid.length}/${npcs.length}`, {
          ids: invalid.slice(0, 10).map((npc) => npc.id)
        });
      }
      return pass(`All ${npcs.length} NPCs expose actorUuid or actorKey (current bridge contract).`);
    },

    'P2-TC-05': async () => {
      const questionSet = engine?.academy?.data?.getQuestionSetForExam?.('EXAM_MAG_BASICS_01') ?? null;
      if (!questionSet) {
        return fail('Question set for EXAM_MAG_BASICS_01 not found.');
      }
      const questions = Array.isArray(questionSet?.questions) ? questionSet.questions : [];
      const invalid = questions.filter((question) => {
        const answers = Array.isArray(question?.answers) ? question.answers : [];
        const correctCount = answers.filter((answer) => answer?.isCorrect === true).length;
        return answers.length < 4 || correctCount !== 1;
      });
      if (questions.length < 10) {
        return fail(`Question set too small: ${questions.length} questions.`);
      }
      if (invalid.length) {
        return fail(`Invalid MCQ shape in ${invalid.length} questions.`);
      }
      return pass(`Question set valid: ${questions.length} questions, 4 answers each.`);
    },

    'P3-TC-03': async () => {
      const actor = pickPrimaryActor();
      if (!actor) {
        return skip('No actor available for wrapper smoke test.');
      }
      const wrapper = await engine?.bridge?.dsa5?.wrapActor?.(actor);
      if (!wrapper || typeof wrapper.getSkillValue !== 'function') {
        return fail('Actor wrapper missing or incomplete.');
      }
      let sample = null;
      try {
        sample = wrapper.getSkillValue('Magiekunde');
      } catch (error) {
        return fail(`wrapper.getSkillValue threw: ${error?.message ?? error}`);
      }
      return pass(`Actor wrapper available for ${actor.name}; sample Magiekunde=${sample ?? 'n/a'}.`);
    },

    'P3-TRAD-TC-01': async () => {
      const actors = Array.from(game?.actors?.contents ?? []);
      const bridge = engine?.bridge?.dsa5;
      if (!bridge || typeof bridge.readTradition !== 'function') {
        return skip('Tradition bridge not available.');
      }
      const candidate = actors
        .map((actor) => ({ actor, data: bridge.readTradition(actor) }))
        .find((row) => row?.data && (row.data.traditionString || row.data.traditionItem || row.data.feature || row.data.resolvedCircleId));
      if (!candidate) {
        return skip('No actor with readable tradition data found.');
      }
      if (!candidate.data.resolvedCircleId) {
        return fail(`Tradition readable on ${candidate.actor.name}, but no circle mapping resolved.`, candidate.data);
      }
      return pass(`${candidate.actor.name} -> ${candidate.data.resolvedCircleId}`);
    },

    'PERF-TC-01': async () => {
      const state = engine?.core?.state;
      if (!state || typeof state.load !== 'function') {
        return skip('State.load() not available.');
      }
      const { ms } = await measureAsync(() => state.load());
      return ms < 200
        ? pass(`state.load() completed in ${ms}ms.`)
        : fail(`state.load() took ${ms}ms (> 200ms).`);
    },

    'PERF-TC-02': async () => {
      const dataApi = engine?.academy?.data;
      if (!dataApi || typeof dataApi.reloadContentRegistry !== 'function' || typeof dataApi.getContentRegistry !== 'function') {
        return skip('Content registry API not available.');
      }
      const first = await measureAsync(() => dataApi.reloadContentRegistry());
      const second = await measureAsync(() => dataApi.getContentRegistry());
      const third = await measureAsync(() => dataApi.getContentRegistry());
      const sameRef = second.value === third.value;
      const fastEnough = third.ms <= Math.max(5, first.ms);
      if (!sameRef || !fastEnough) {
        return fail(`Registry cache weak: first=${first.ms}ms second=${second.ms}ms third=${third.ms}ms sameRef=${sameRef}.`);
      }
      return pass(`Registry cache ok: first=${first.ms}ms third=${third.ms}ms sameRef=${sameRef}.`);
    },

    'REG-TC-01': async () => {
      const state = engine?.core?.state;
      if (!state || typeof state.transaction !== 'function' || typeof state.save !== 'function') {
        return skip('State persistence API not available.');
      }
      const prevAuto = game.settings.get(MODULE_ID, 'autoSave');
      const prevStored = deepClone(game.settings.get(MODULE_ID, state.settingsKey));
      try {
        await game.settings.set(MODULE_ID, 'autoSave', false);
        await state.transaction(async (s) => {
          s.set('meta.manualAutoSaveProbe', Date.now());
          await s.save({ force: false });
          const afterStored = game.settings.get(MODULE_ID, state.settingsKey);
          if (!deepEqual(afterStored, prevStored)) {
            throw new Error('state.save() wrote settings although autoSave=false.');
          }
          const rollback = new Error('JANUS_TEST_ROLLBACK');
          rollback.name = 'JanusTestRollback';
          throw rollback;
        }, { silent: true });
        const warnHit = recentLoggerEntries({ levels: ['warn'], limit: 20 })
          .find((entry) => String(entry?.message ?? '').includes('autoSave ist deaktiviert'));
        return warnHit
          ? pass('autoSave=false prevented settings write and emitted warning.')
          : fail('autoSave=false prevented write, but warning was not recorded.');
      } finally {
        await game.settings.set(MODULE_ID, 'autoSave', prevAuto);
      }
    },

    'REG-TC-02': async () => {
      const io = engine?.core?.io;
      if (!io || typeof io.exportState !== 'function' || typeof io.importStateFromObject !== 'function') {
        return skip('core.io import/export API not available.');
      }
      const before = io.exportState();
      const invalid = deepClone(before);
      delete invalid.meta;
      let blocked = false;
      try {
        await io.importStateFromObject(invalid, { save: false, validate: true });
      } catch (_) {
        blocked = true;
      }
      const after = io.exportState();
      if (!blocked) {
        return fail('Invalid import was not blocked.');
      }
      if (!deepEqual(before, after)) {
        return fail('State changed after blocked invalid import.');
      }
      return pass('Invalid import was blocked and state remained unchanged.');
    },

    'REG-TC-03': async () => {
      const state = engine?.core?.state;
      if (!state || typeof state.load !== 'function') {
        return skip('State.load() not available.');
      }
      const stored = game.settings.get(MODULE_ID, state.settingsKey);
      if (!stored) {
        return skip('No persisted coreState available; load() would initialize a new state.');
      }
      if (state._legacySyncPending) {
        return skip('Legacy sync pending; load() may legitimately write once.');
      }
      const beforeDirty = state._dirty === true;
      const { calls } = await withPatchedSettingSet(async () => {
        await state.load();
      });
      const janusWrites = calls.filter((call) =>
        call.namespace === MODULE_ID && (call.key === state.settingsKey || call.key === state.legacySettingsKey)
      );
      if (janusWrites.length > 0) {
        return fail(`load() triggered ${janusWrites.length} JANUS settings write(s).`, { writes: janusWrites.map((call) => call.key) });
      }
      if (beforeDirty || state._dirty) {
        return fail(`State dirty flag not clean after load (before=${beforeDirty}, after=${state._dirty === true}).`);
      }
      return pass('load() performed no JANUS settings write on existing persisted state.');
    },

    'SEC-TC-01': async () => {
      const io = engine?.core?.io;
      const validator = engine?.core?.validator;
      if (!io || typeof io.exportState !== 'function' || typeof io.importStateFromObject !== 'function' || !validator) {
        return skip('State validator/import API not available.');
      }
      const good = io.exportState();
      const bad = deepClone(good);
      bad.unknownSecurityProbe = { injected: true };
      const validation = validator.validateState(bad);
      if (validation?.valid !== false) {
        return fail('Validator accepted unknown root field.');
      }
      const unknownKeyError = (validation.errors ?? []).find((entry) => String(entry).includes('unknown key'));
      if (!unknownKeyError) {
        return fail('Validator rejected state, but did not report unknown key.');
      }
      let blocked = false;
      try {
        await io.importStateFromObject(bad, { save: false, validate: true });
      } catch (_) {
        blocked = true;
      }
      return blocked
        ? pass(`Unknown field rejected: ${unknownKeyError}`)
        : fail('Import accepted state with unknown root field.');
    }
  };

  const report = {
    startedAt: nowIso(),
    moduleVersion: game?.modules?.get?.(MODULE_ID)?.version ?? 'unknown',
    persistResults: CONFIG.persistResults,
    overwriteExisting: CONFIG.overwriteExisting,
    selected: selectedTests.length,
    automated: [],
    remainingManual: [],
    unchanged: [],
    counts: {
      pass: 0,
      fail: 0,
      skip: 0,
      manual: 0,
      unchanged: 0
    }
  };

  for (const test of selectedTests) {
    const existing = existingResults?.[test.id] ?? null;
    const runner = AUTO_RUNNERS[test.id] ?? null;

    if (!runner) {
      report.remainingManual.push({
        id: test.id,
        title: test.title,
        expected: test.expected ?? null,
        guide: summarizeGuide(test)
      });
      report.counts.manual += 1;
      continue;
    }

    if (existing?.status && !CONFIG.overwriteExisting) {
      report.unchanged.push({
        id: test.id,
        title: test.title,
        status: existing.status,
        notes: existing.notes ?? ''
      });
      report.counts.unchanged += 1;
      continue;
    }

    const t0 = globalThis.performance?.now?.() ?? Date.now();
    let outcome;
    try {
      outcome = await runner({ engine, game, test });
    } catch (error) {
      outcome = fail(error?.message ?? String(error), { stack: error?.stack ?? null });
    }
    const t1 = globalThis.performance?.now?.() ?? Date.now();
    const entry = {
      id: test.id,
      title: test.title,
      status: String(outcome?.status ?? 'SKIP').toUpperCase(),
      notes: String(outcome?.notes ?? '').trim(),
      ms: Number((t1 - t0).toFixed(3)),
      details: outcome?.details ?? null
    };
    report.automated.push(entry);

    if (entry.status === 'PASS') report.counts.pass += 1;
    else if (entry.status === 'FAIL') report.counts.fail += 1;
    else report.counts.skip += 1;

    if (CONFIG.persistResults) {
      await writeManualTestResult(test.id, {
        status: entry.status,
        notes: `[AUTO-MANUAL ${report.moduleVersion}] ${entry.notes}`.trim()
      }, test);
    }
  }

  report.finishedAt = nowIso();
  report.counts.total = report.automated.length + report.remainingManual.length + report.unchanged.length;

  globalThis.__JANUS7_LAST_MANUAL_AUTOMATION_REPORT__ = report;

  const summaryText = [
    `Automated PASS ${report.counts.pass}`,
    `FAIL ${report.counts.fail}`,
    `SKIP ${report.counts.skip}`,
    `MANUAL ${report.counts.manual}`,
    `UNCHANGED ${report.counts.unchanged}`
  ].join(' | ');

  console.groupCollapsed('[JANUS7] Manual Test Auto Runner');
  console.log(report);
  console.table(report.automated.map((entry) => ({
    id: entry.id,
    status: entry.status,
    ms: entry.ms,
    notes: entry.notes
  })));
  if (report.remainingManual.length) {
    console.table(report.remainingManual.map((entry) => ({
      id: entry.id,
      title: entry.title,
      openApp: entry.guide?.openApp ?? '',
      userSteps: entry.guide?.userSteps ?? 0,
      actionSteps: entry.guide?.actionSteps ?? 0
    })));
  }
  console.groupEnd();

  if (CONFIG.openGuidedForRemaining && report.remainingManual.length && typeof engine?.test?.openGuidedManualTests === 'function') {
    const remainingIds = new Set(report.remainingManual.map((entry) => entry.id));
    const remainingTests = selectedTests.filter((test) => remainingIds.has(test.id));
    await engine.test.openGuidedManualTests({ tests: remainingTests });
  }

  ui.notifications.info(`JANUS7 Manual Auto Runner: ${summaryText}`);
  return report;
})();
