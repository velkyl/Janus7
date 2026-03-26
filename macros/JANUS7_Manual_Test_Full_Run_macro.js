/**
 * JANUS7 Manual Test Full Run
 *
 * Runs the conservative auto-runner first and then opens a guided session
 * for the remaining unresolved manual tests.
 */

(async () => {
  const CONFIG = {
    runAutoRunner: true,
    awaitGuidedCompletion: true,
    includeDocumentedStatuses: [],
    onlyIds: [],
    openResultsAfterGuided: false
  };

  const MODULE_ID = 'Janus7';
  const MODULE_BASE = `modules/${MODULE_ID}`;
  const engine = game?.janus7 ?? null;

  if (!engine) {
    ui.notifications.error('JANUS7 engine not available.');
    return null;
  }

  const moduleUrl = (path) => new URL(`${MODULE_BASE}/${path}`, `${globalThis.location?.origin ?? ''}/`).toString();
  const normalizeIds = (value) => Array.isArray(value) ? value.map((v) => String(v ?? '').trim()).filter(Boolean) : [];
  const normalizeStatuses = (value) => Array.isArray(value) ? value.map((v) => String(v ?? '').trim().toUpperCase()).filter(Boolean) : [];
  const onlyIds = new Set(normalizeIds(CONFIG.onlyIds));
  const includeDocumentedStatuses = new Set(normalizeStatuses(CONFIG.includeDocumentedStatuses));

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

  const loadAutoRunner = async () => {
    if (!CONFIG.runAutoRunner) return null;
    const url = moduleUrl('macros/JANUS7_Manual_Test_AutoRunner_macro.js');
    const source = await (await fetch(url)).text();
    return await eval(source);
  };

  const { readManualTestResults } = await import(moduleUrl('core/test/manual-store.js'));
  const registry = await ensureRegistry();

  if (!registry?.list) {
    ui.notifications.error('JANUS7 test registry not available.');
    return null;
  }

  const autoReport = await loadAutoRunner();
  const manualResults = await readManualTestResults();

  const selectedManualTests = registry.list()
    .filter((test) => String(test?.kind ?? '').toLowerCase() === 'manual')
    .filter((test) => !onlyIds.size || onlyIds.has(test.id));

  const remainingTests = selectedManualTests.filter((test) => {
    const status = String(manualResults?.[test.id]?.status ?? '').trim().toUpperCase();
    if (!status) return true;
    return includeDocumentedStatuses.has(status);
  });

  const report = {
    startedAt: new Date().toISOString(),
    moduleVersion: game?.modules?.get?.(MODULE_ID)?.version ?? 'unknown',
    config: {
      runAutoRunner: CONFIG.runAutoRunner === true,
      awaitGuidedCompletion: CONFIG.awaitGuidedCompletion === true,
      includeDocumentedStatuses: Array.from(includeDocumentedStatuses),
      onlyIds: Array.from(onlyIds),
      openResultsAfterGuided: CONFIG.openResultsAfterGuided === true
    },
    autoReport: autoReport ?? null,
    selectedManualCount: selectedManualTests.length,
    remainingManualCount: remainingTests.length,
    remainingManualIds: remainingTests.map((test) => test.id),
    guidedResult: null,
    finishedAt: null
  };

  globalThis.__JANUS7_LAST_MANUAL_FULL_RUN_REPORT__ = report;

  if (!remainingTests.length) {
    report.finishedAt = new Date().toISOString();
    console.groupCollapsed('[JANUS7] Manual Test Full Run');
    console.log(report);
    console.groupEnd();
    ui.notifications.info('JANUS7 Manual Full Run: keine offenen Guided-Tests mehr.');
    return report;
  }

  if (typeof engine?.test?.openGuidedManualTests !== 'function') {
    report.finishedAt = new Date().toISOString();
    ui.notifications.error('JANUS7 Guided Manual Tests API not available.');
    return report;
  }

  const guidedResult = await engine.test.openGuidedManualTests({
    tests: remainingTests,
    awaitCompletion: CONFIG.awaitGuidedCompletion === true
  });

  report.guidedResult = guidedResult ?? null;
  report.finishedAt = new Date().toISOString();
  globalThis.__JANUS7_LAST_MANUAL_FULL_RUN_REPORT__ = report;

  console.groupCollapsed('[JANUS7] Manual Test Full Run');
  console.log(report);
  console.table(remainingTests.map((test) => ({
    id: test.id,
    title: test.title,
    expected: test.expected ?? ''
  })));
  console.groupEnd();

  if (CONFIG.openResultsAfterGuided && typeof engine?.test?.openResults === 'function') {
    await engine.test.openResults();
  }

  if (CONFIG.awaitGuidedCompletion === true) {
    const counts = guidedResult?.counts ?? {};
    ui.notifications.info(`JANUS7 Manual Full Run: PASS ${counts.pass ?? 0} | FAIL ${counts.fail ?? 0} | SKIP ${counts.skip ?? 0} | OFFEN ${counts.pending ?? 0}`);
  } else {
    ui.notifications.info(`JANUS7 Manual Full Run: Guided-Session geöffnet (${remainingTests.length} Tests).`);
  }

  return report;
})();
