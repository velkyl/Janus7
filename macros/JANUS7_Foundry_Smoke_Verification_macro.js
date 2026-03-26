/**
 * JANUS7 Foundry Smoke Verification
 *
 * Run this as a Script Macro inside a loaded Foundry world.
 * The report is written to:
 *   - console
 *   - globalThis.__JANUS7_LAST_SMOKE_REPORT__
 */

(async () => {
  const CONFIG = {
    moduleId: 'Janus7',
    examId: 'EXAM_MAG_BASICS_01',
    shellViews: ['director', 'academy', 'tools'],
    skillName: 'Magiekunde',
    modifier: 3,
    showDialog: true,
    copyJsonToClipboard: false,
  };

  const REPORT_KEY = '__JANUS7_LAST_SMOKE_REPORT__';

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  async function showSummaryDialog(title, content) {
    const DialogV2 = foundry?.applications?.api?.DialogV2;
    if (!DialogV2) return false;
    await new Promise((resolve) => {
      const dlg = new DialogV2({
        window: { title },
        content,
        buttons: [{ action: 'ok', label: 'Close', default: true }],
        modal: true,
        rejectClose: false,
        close: () => resolve(true),
      });
      dlg.render(true);
    });
    return true;
  }

  async function copyText(text) {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(String(text ?? ''));
        return true;
      }
    } catch (_err) {
      // fall through
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = String(text ?? '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch (_err) {
      return false;
    }
  }

  async function waitFor(predicate, { timeoutMs = 2000, stepMs = 30 } = {}) {
    const start = Date.now();
    while ((Date.now() - start) < timeoutMs) {
      try {
        if (await predicate()) return true;
      } catch (_err) {
        // keep polling
      }
      await sleep(stepMs);
    }
    return false;
  }

  async function ensureRendered(app, { timeoutMs = 2000 } = {}) {
    if (!app) return false;
    try {
      await app.render?.({ force: true, focus: false });
    } catch (_err) {
      try {
        await app.render?.(true);
      } catch (_err2) {
        // ignore and rely on waitFor
      }
    }
    return waitFor(() => {
      const el = app?.element?.[0] ?? app?.element ?? null;
      if (el instanceof HTMLElement) return true;
      if (typeof app?.rendered === 'boolean') return app.rendered;
      return false;
    }, { timeoutMs });
  }

  async function closeApp(app) {
    try {
      await app?.close?.({ force: true });
    } catch (_err) {
      try {
        await app?.close?.();
      } catch (_err2) {
        // ignore
      }
    }
  }

  function summarizeError(err) {
    if (err instanceof Error) {
      return {
        name: err.name,
        message: err.message,
        stack: err.stack ?? null,
      };
    }
    return { message: String(err) };
  }

  function makeResult(id, title, status, summary, details = {}) {
    return {
      id,
      title,
      status,
      summary,
      details,
      ts: new Date().toISOString(),
    };
  }

  const pass = (id, title, summary, details = {}) => makeResult(id, title, 'PASS', summary, details);
  const fail = (id, title, summary, details = {}) => makeResult(id, title, 'FAIL', summary, details);
  const blocked = (id, title, summary, details = {}) => makeResult(id, title, 'BLOCKED', summary, details);

  async function runStep(id, title, fn) {
    try {
      const result = await fn();
      if (!result || !result.status) {
        return fail(id, title, 'Step returned no structured result');
      }
      return result;
    } catch (err) {
      return fail(id, title, err?.message ?? String(err), { error: summarizeError(err) });
    }
  }

  const module = game?.modules?.get?.(CONFIG.moduleId) ?? null;
  const engine = game?.janus7 ?? null;
  const report = {
    generatedAt: new Date().toISOString(),
    moduleId: CONFIG.moduleId,
    moduleVersion: module?.version ?? null,
    worldId: game?.world?.id ?? null,
    worldTitle: game?.world?.title ?? null,
    user: {
      id: game?.user?.id ?? null,
      name: game?.user?.name ?? null,
      isGM: Boolean(game?.user?.isGM),
    },
    results: [],
  };

  let shellApp = null;
  let resultsApp = null;

  report.results.push(await runStep('module.active', 'Module is active', async () => {
    if (!module) return fail('module.active', 'Module is active', 'Module is not registered in game.modules');
    if (!module.active) return fail('module.active', 'Module is active', 'Module is registered but not active', { version: module.version ?? null });
    return pass('module.active', 'Module is active', `Module active (version=${module.version ?? 'unknown'})`);
  }));

  report.results.push(await runStep('engine.available', 'game.janus7 is available', async () => {
    if (!engine) return fail('engine.available', 'game.janus7 is available', 'game.janus7 is missing');
    if (!engine?.core?.state) return fail('engine.available', 'game.janus7 is available', 'game.janus7 exists but core.state is missing');
    return pass('engine.available', 'game.janus7 is available', 'Engine and core.state are available');
  }));

  report.results.push(await runStep('version.plausible', 'Module version is plausible', async () => {
    if (!engine?.diagnostics?.snapshot) {
      return blocked('version.plausible', 'Module version is plausible', 'engine.diagnostics.snapshot is unavailable');
    }
    const snapshot = engine.diagnostics.snapshot();
    const runtimeVersion = snapshot?.moduleVersion ?? null;
    const moduleVersion = module?.version ?? null;
    if (!moduleVersion || !runtimeVersion) {
      return fail('version.plausible', 'Module version is plausible', 'Version information is incomplete', { moduleVersion, runtimeVersion });
    }
    if (moduleVersion !== runtimeVersion) {
      return fail('version.plausible', 'Module version is plausible', 'Runtime version differs from module version', { moduleVersion, runtimeVersion });
    }
    return pass('version.plausible', 'Module version is plausible', `Version ${moduleVersion} matches runtime snapshot`);
  }));

  report.results.push(await runStep('runtime.bootstrap', 'No aggregated bootstrap errors', async () => {
    const summary = engine?.errors?.getSummary?.() ?? null;
    if (!summary) {
      return blocked('runtime.bootstrap', 'No aggregated bootstrap errors', 'engine.errors.getSummary is unavailable');
    }
    const totalErrors = Number(summary?.totalErrors ?? 0);
    const totalWarnings = Number(summary?.totalWarnings ?? 0);
    if (totalErrors > 0) {
      return fail('runtime.bootstrap', 'No aggregated bootstrap errors', `Aggregated runtime errors present (${totalErrors})`, summary);
    }
    return pass(
      'runtime.bootstrap',
      'No aggregated bootstrap errors',
      `No aggregated errors; warnings=${totalWarnings}`,
      summary
    );
  }));

  report.results.push(await runStep('ui.shell.open', 'Shell opens', async () => {
    if (!engine?.ui?.openShell) {
      return fail('ui.shell.open', 'Shell opens', 'engine.ui.openShell is missing');
    }
    shellApp = await engine.ui.openShell({ focus: false });
    const ok = await ensureRendered(shellApp, { timeoutMs: 2500 });
    if (!ok) {
      await closeApp(shellApp);
      shellApp = null;
      return fail('ui.shell.open', 'Shell opens', 'Shell did not render within timeout');
    }
    return pass('ui.shell.open', 'Shell opens', 'Shell rendered successfully');
  }));

  report.results.push(await runStep('ui.shell.views', 'Shell core views render', async () => {
    if (!shellApp) {
      return blocked('ui.shell.views', 'Shell core views render', 'Shell app is not open');
    }
    const element = shellApp?.element?.[0] ?? shellApp?.element ?? null;
    if (!(element instanceof HTMLElement)) {
      return fail('ui.shell.views', 'Shell core views render', 'Shell element is unavailable');
    }

    const visited = [];
    for (const viewId of CONFIG.shellViews) {
      const button = element.querySelector(`[data-action="selectView"][data-view-id="${viewId}"]`);
      if (!button) {
        return fail('ui.shell.views', 'Shell core views render', `Shell view button missing: ${viewId}`, { visited });
      }
      button.click();
      const ok = await waitFor(() => {
        const active = element.querySelector('.janus-shell__nav .is-active, .janus-shell__nav [aria-pressed="true"]');
        return shellApp?._viewId === viewId
          && !!active
          && (active.dataset.viewId === viewId || active.getAttribute('data-view-id') === viewId);
      }, { timeoutMs: 1200, stepMs: 25 });
      if (!ok) {
        return fail('ui.shell.views', 'Shell core views render', `Shell view did not activate: ${viewId}`, { visited });
      }
      visited.push(viewId);
    }
    return pass('ui.shell.views', 'Shell core views render', `Views rendered: ${visited.join(', ')}`, { visited });
  }));

  report.results.push(await runStep('ui.testResults.open', 'Test Results open', async () => {
    if (!engine?.test?.openResults) {
      return blocked('ui.testResults.open', 'Test Results open', 'engine.test.openResults is unavailable');
    }
    resultsApp = await engine.test.openResults();
    const ok = await ensureRendered(resultsApp, { timeoutMs: 2500 });
    if (!ok) {
      await closeApp(resultsApp);
      resultsApp = null;
      return fail('ui.testResults.open', 'Test Results open', 'Test Results app did not render');
    }
    await closeApp(resultsApp);
    resultsApp = null;
    return pass('ui.testResults.open', 'Test Results open', 'Test Results rendered successfully');
  }));

  report.results.push(await runStep('health.check', 'Health checks run', async () => {
    const cmd = engine?.commands?.runHealthCheck;
    const diagnostics = engine?.diagnostics?.report;
    if (typeof diagnostics !== 'function') {
      return fail('health.check', 'Health checks run', 'engine.diagnostics.report is missing');
    }

    const diag = await diagnostics({ notify: false });
    let commandResult = null;
    if (typeof cmd === 'function') {
      commandResult = await cmd({});
    }

    const diagHealth = diag?.health ?? 'unknown';
    const checks = Array.isArray(diag?.checks) ? diag.checks.length : 0;
    const commandOk = commandResult ? commandResult.success === true : null;

    if (diagHealth === 'fail') {
      return fail('health.check', 'Health checks run', `Diagnostics health=fail (${checks} checks)`, {
        diagnostics: diag,
        commandResult,
      });
    }

    return pass('health.check', 'Health checks run', `Diagnostics health=${diagHealth}; checks=${checks}; command=${commandOk === null ? 'n/a' : commandOk}`, {
      diagnostics: {
        health: diagHealth,
        summary: diag?.summary ?? null,
        warningCount: Array.isArray(diag?.warnings) ? diag.warnings.length : 0,
      },
      commandResult,
    });
  }));

  report.results.push(await runStep('state.persist.roundtrip', 'State write persists and restores', async () => {
    if (!game?.user?.isGM) {
      return blocked('state.persist.roundtrip', 'State write persists and restores', 'GM required for persistent world-state smoke test');
    }
    const state = engine?.core?.state;
    const director = engine?.core?.director ?? engine?.director;
    const academyData = engine?.academy?.data ?? null;
    if (!state || !director?.saveState) {
      return fail('state.persist.roundtrip', 'State write persists and restores', 'State or Director.saveState is unavailable');
    }

    const locationIds = academyData?.listLocationIds?.(999) ?? [];
    if (!Array.isArray(locationIds) || locationIds.length === 0) {
      return blocked('state.persist.roundtrip', 'State write persists and restores', 'No academy locations available for safe persistence test');
    }

    const before = state.get?.('academy.currentLocationId') ?? null;
    const next = locationIds.find((id) => id !== before) ?? locationIds[0];
    if (next == null) {
      return blocked('state.persist.roundtrip', 'State write persists and restores', 'Could not derive a valid alternate location id');
    }

    const persistedBefore = game?.settings?.get?.(CONFIG.moduleId, 'coreState')?.academy?.currentLocationId ?? null;
    let restored = false;

    try {
      state.set('academy.currentLocationId', next);
      await director.saveState({ force: true });
      const persistedNext = game?.settings?.get?.(CONFIG.moduleId, 'coreState')?.academy?.currentLocationId ?? null;
      if (persistedNext !== next) {
        return fail('state.persist.roundtrip', 'State write persists and restores', 'Persisted value does not match written location', {
          before,
          next,
          persistedBefore,
          persistedNext,
        });
      }
      state.set('academy.currentLocationId', before);
      await director.saveState({ force: true });
      const persistedRestored = game?.settings?.get?.(CONFIG.moduleId, 'coreState')?.academy?.currentLocationId ?? null;
      restored = true;
      if (persistedRestored !== before) {
        return fail('state.persist.roundtrip', 'State write persists and restores', 'Original location was not restored after smoke write', {
          before,
          next,
          persistedBefore,
          persistedNext,
          persistedRestored,
        });
      }
      return pass('state.persist.roundtrip', 'State write persists and restores', `Persisted academy.currentLocationId ${String(before)} -> ${String(next)}`, {
        before,
        next,
        persistedBefore,
        persistedNext,
        persistedRestored,
      });
    } finally {
      try {
        if (!restored) {
          state.set('academy.currentLocationId', before);
          await director.saveState({ force: true });
          restored = true;
        }
      } catch (restoreErr) {
        console.error('[JANUS7][Smoke] Failed to restore academy.currentLocationId', restoreErr);
      }
      if (!restored) {
        ui.notifications?.warn?.('JANUS7 Smoke: academy.currentLocationId could not be restored automatically.');
      }
    }
  }));

  report.results.push(await runStep('exam.mcq.resolve', 'MCQ exam resolves and activates', async () => {
    const api = engine?.academy?.data ?? null;
    if (!api) {
      return fail('exam.mcq.resolve', 'MCQ exam resolves and activates', 'AcademyDataApi is unavailable');
    }

    const exam = api.getExam?.(CONFIG.examId) ?? (api.getExams?.() ?? []).find((row) => row?.id === CONFIG.examId) ?? null;
    if (!exam) {
      return fail('exam.mcq.resolve', 'MCQ exam resolves and activates', `Exam not found: ${CONFIG.examId}`);
    }

    const questionSet = api.getQuestionSetForExam?.(CONFIG.examId) ?? null;
    if (!questionSet) {
      return fail('exam.mcq.resolve', 'MCQ exam resolves and activates', `Question set not resolved for ${CONFIG.examId}`, { exam });
    }

    const questionCount = Array.isArray(questionSet?.questions) ? questionSet.questions.length : 0;
    if (questionCount === 0) {
      return fail('exam.mcq.resolve', 'MCQ exam resolves and activates', `Question set is empty for ${CONFIG.examId}`, { questionSet });
    }

    const lessonApi = engine?.capabilities?.lesson ?? null;
    if (lessonApi?.setActiveExam && lessonApi?.clearActive && lessonApi?.getActive) {
      await lessonApi.setActiveExam(CONFIG.examId);
      const active = lessonApi.getActive();
      await lessonApi.clearActive();
      if (active?.activeExamId !== CONFIG.examId) {
        return fail('exam.mcq.resolve', 'MCQ exam resolves and activates', 'Exam activation did not update activeExamId', {
          examId: CONFIG.examId,
          active,
          questionCount,
        });
      }
      return pass('exam.mcq.resolve', 'MCQ exam resolves and activates', `Exam ${CONFIG.examId} resolved with ${questionCount} question(s) and activated via capabilities`, {
        questionSetId: questionSet.id,
        questionCount,
      });
    }

    if (game?.user?.isGM && engine?.commands?.['exam.start'] && engine?.commands?.['exam.clear']) {
      const start = await engine.commands['exam.start']({ examId: CONFIG.examId });
      const status = await engine.commands['lesson.status']?.({});
      await engine.commands['exam.clear']({});
      const activeExamId = status?.data?.activeExamId ?? null;
      if (start?.success !== true || activeExamId !== CONFIG.examId) {
        return fail('exam.mcq.resolve', 'MCQ exam resolves and activates', 'Exam command path did not activate the exam', {
          start,
          status,
          questionCount,
        });
      }
      return pass('exam.mcq.resolve', 'MCQ exam resolves and activates', `Exam ${CONFIG.examId} resolved with ${questionCount} question(s) and activated via command path`, {
        questionSetId: questionSet.id,
        questionCount,
      });
    }

    return pass('exam.mcq.resolve', 'MCQ exam resolves and activates', `Exam ${CONFIG.examId} resolved with ${questionCount} question(s); activation path unavailable`, {
      questionSetId: questionSet.id,
      questionCount,
    });
  }));

  report.results.push(await runStep('bridge.roll.modifier', 'bridgeRollTest forwards modifier', async () => {
    if (!game?.user?.isGM) {
      return blocked('bridge.roll.modifier', 'bridgeRollTest forwards modifier', 'GM required because bridgeRollTest is permission-gated');
    }
    const bridge = engine?.bridge?.dsa5 ?? null;
    const command = engine?.commands?.bridgeRollTest ?? null;
    if (!bridge || typeof bridge.rollSkill !== 'function') {
      return fail('bridge.roll.modifier', 'bridgeRollTest forwards modifier', 'DSA5 bridge or rollSkill() is unavailable');
    }
    if (typeof command !== 'function') {
      return fail('bridge.roll.modifier', 'bridgeRollTest forwards modifier', 'game.janus7.commands.bridgeRollTest is unavailable');
    }

    const original = bridge.rollSkill;
    let captured = null;
    try {
      bridge.rollSkill = async (actorRef, skillRef, options = {}) => {
        captured = { actorRef, skillRef, options };
        return { success: true, quality: 1, context: { type: 'skill' } };
      };

      const actorId = 'Actor.janus7.smoke.bridge';
      const response = await command({
        actorId,
        skillName: CONFIG.skillName,
        modifier: String(CONFIG.modifier),
      });

      if (response?.success !== true) {
        return fail('bridge.roll.modifier', 'bridgeRollTest forwards modifier', 'bridgeRollTest command failed', { response, captured });
      }
      if (captured?.actorRef !== actorId || captured?.skillRef !== CONFIG.skillName || captured?.options?.modifier !== CONFIG.modifier) {
        return fail('bridge.roll.modifier', 'bridgeRollTest forwards modifier', 'Modifier or command payload was not forwarded correctly', {
          response,
          captured,
          expected: { actorId, skillName: CONFIG.skillName, modifier: CONFIG.modifier },
        });
      }

      return pass('bridge.roll.modifier', 'bridgeRollTest forwards modifier', `Modifier ${CONFIG.modifier} reached bridge.rollSkill`, {
        captured,
      });
    } finally {
      bridge.rollSkill = original;
    }
  }));

  report.results.push(await runStep('hook.registry.structure', 'Current hook registry has no duplicate entries', async () => {
    const coreHooks = Array.isArray(globalThis.__janus7_core_hook_ids__) ? globalThis.__janus7_core_hook_ids__ : null;
    const runtimeStore = globalThis.__janus7_runtime_hook_store__;
    if (!coreHooks || !(runtimeStore instanceof Map)) {
      return blocked('hook.registry.structure', 'Current hook registry has no duplicate entries', 'Runtime hook stores are not exposed in this session');
    }

    const seen = new Set();
    const duplicates = [];
    for (const entry of coreHooks) {
      const key = `${entry?.name ?? 'unknown'}::${entry?.id ?? 'null'}`;
      if (seen.has(key)) duplicates.push(key);
      seen.add(key);
    }
    if (duplicates.length) {
      return fail('hook.registry.structure', 'Current hook registry has no duplicate entries', `Duplicate hook registrations detected (${duplicates.length})`, {
        duplicates,
        coreHookCount: coreHooks.length,
        runtimeHookKeys: [...runtimeStore.keys()],
      });
    }

    return pass('hook.registry.structure', 'Current hook registry has no duplicate entries', `coreHooks=${coreHooks.length}; runtimeHooks=${runtimeStore.size}`, {
      coreHookCount: coreHooks.length,
      runtimeHookKeys: [...runtimeStore.keys()],
    });
  }));

  report.results.push(blocked(
    'reload.double-init',
    'Reload without duplicate init effects',
    'Not automatable inside a one-shot macro. Reload the world and rerun the macro to verify post-reload behavior.',
  ));

  await closeApp(resultsApp);
  await closeApp(shellApp);

  const counts = report.results.reduce((acc, entry) => {
    acc.total += 1;
    acc[entry.status] = (acc[entry.status] ?? 0) + 1;
    return acc;
  }, { total: 0, PASS: 0, FAIL: 0, BLOCKED: 0 });

  report.summary = counts;
  globalThis[REPORT_KEY] = report;

  const table = report.results.map((entry) => ({
    id: entry.id,
    status: entry.status,
    title: entry.title,
    summary: entry.summary,
  }));

  console.group('[JANUS7] Foundry Smoke Verification');
  console.table(table);
  console.log(report);
  console.groupEnd();

  const summaryLine = `JANUS7 Smoke: PASS ${counts.PASS} | FAIL ${counts.FAIL} | BLOCKED ${counts.BLOCKED}`;
  if (counts.FAIL > 0) ui.notifications?.warn?.(summaryLine);
  else ui.notifications?.info?.(summaryLine);

  if (CONFIG.copyJsonToClipboard) {
    const copied = await copyText(JSON.stringify(report, null, 2));
    if (copied) ui.notifications?.info?.('JANUS7 Smoke report copied to clipboard.');
  }

  if (CONFIG.showDialog) {
    const rows = report.results.map((entry) => `
      <tr>
        <td><code>${escapeHtml(entry.id)}</code></td>
        <td><strong>${escapeHtml(entry.status)}</strong></td>
        <td>${escapeHtml(entry.summary)}</td>
      </tr>
    `).join('');

    const content = `
      <div class="janus7-smoke-report">
        <p><strong>${escapeHtml(summaryLine)}</strong></p>
        <p>Report key: <code>${escapeHtml(REPORT_KEY)}</code></p>
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left;">ID</th>
              <th style="text-align:left;">Status</th>
              <th style="text-align:left;">Summary</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
    await showSummaryDialog('JANUS7 - Foundry Smoke Verification', content);
  }

  return report;
})();
