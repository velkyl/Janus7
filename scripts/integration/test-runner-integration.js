/**
 * @file scripts/integration/test-runner-integration.js
 * @module janus7/integration
 * @phase 6
 *
 * Lightweight test-runner integration.
 * Exposes manual APIs without loading the heavy test catalog during world boot.
 */
import { HOOKS, registerRuntimeHook, JanusConfig, MODULE_ID } from '../core/public-api.mjs';

let _resultApp = null;
let _manualApp = null;
let _harness = null;

async function getResultApp() {
  if (_resultApp && !_resultApp._destroyed) return _resultApp;
  const { JanusTestResultApp } = await import('../../ui/apps/JanusTestResultApp.js');
  _resultApp = new JanusTestResultApp();
  return _resultApp;
}

async function getManualApp() {
  if (_manualApp && !_manualApp._destroyed) return _manualApp;
  const { JanusGuidedManualTestApp } = await import('../../ui/apps/JanusGuidedManualTestApp.js');
  _manualApp = JanusGuidedManualTestApp.showSingleton?.() ?? new JanusGuidedManualTestApp();
  return _manualApp;
}

async function ensureHarness(engine) {
  if (_harness) return _harness;
  const [RegMod, RunMod, CatMod, BuiltinMod, ExtendedMod] = await Promise.all([
    import('../../core/test/registry.js'),
    import('../../core/test/runner.js'),
    import('../../core/test/register-catalog.js'),
    import('../../core/test/register-builtins.js'),
    import('../../core/test/register-extended.js')
  ]);
  const Registry = RegMod?.default;
  const Runner = RunMod?.default;
  const registerCatalog = CatMod?.default;
  const registerBuiltins = BuiltinMod?.default;
  const registerExtended = ExtendedMod?.default;
  if (!Registry || !Runner || typeof registerCatalog !== 'function') {
    throw new Error('Test harness: missing exports.');
  }
  const logger = engine?.core?.logger;
  const registry = new Registry();
  const runner = new Runner({ registry, logger, engine });
  if (typeof registerBuiltins === 'function') await registerBuiltins({ registry, logger, engine });
  if (typeof registerExtended === 'function') await registerExtended({ registry, logger, engine });
  await registerCatalog({ registry, logger, engine });
  _harness = { registry, runner };
  engine.test = {
    ...(engine.test ?? {}),
    registry,
    runner,
    runCatalog: engine.test?.runCatalog,
    openResults: engine.test?.openResults,
    listTests: () => registry.list(),
    openGuidedManualTests: engine.test?.openGuidedManualTests,
    manual: engine.test?.manual
  };
  engine?.markServiceReady?.('test.harness', _harness);
  logger?.info?.('[JANUS7] Test harness lazy-loaded.');
  return _harness;
}

function buildVersion() {
  try { return game?.modules?.get?.(MODULE_ID)?.version ?? 'unknown'; } catch { return 'unknown'; }
}

async function executeCatalog(opts = {}) {
  const engine = game?.janus7;
  if (engine) await ensureHarness(engine);
  const { registry, runner } = _harness ?? {};
  const tests = registry?.list?.() ?? [];
  const results = await runner.runAll({
    tests,
    ctx: { engine },
    includeManual: opts.includeManual === true,
    includeCatalog: opts.includeCatalog === true,
    includeImportFailed: opts.includeImportFailed === true
  });
  const summary = runner.summarizeResults({ results, tests, version: buildVersion() });
  return {
    results,
    summary,
    generatedAt: new Date().toISOString(),
    options: {
      includeManual: opts.includeManual === true,
      includeCatalog: opts.includeCatalog === true,
      includeImportFailed: opts.includeImportFailed === true
    }
  };
}

export async function runCatalog(opts = {}) {
  const openWindow = opts.openWindow === true;
  const data = await executeCatalog(opts);
  if (openWindow) {
    const app = await getResultApp();
    try {
      await app.setResults(data);
    } catch (err) {
      (game?.janus7?.core?.logger ?? console).error?.('[JANUS7] Test Results window render failed:', err);
      ui?.notifications?.error?.(`JANUS7 Test Results UI: ${err?.message ?? err}`);
    }
  }
  return data;
}

export async function openResults() {
  const engine = game?.janus7;
  if (engine) await ensureHarness(engine);
  const app = await getResultApp();
  try {
    await app.render({ force: true });
  } catch (err) {
    (game?.janus7?.core?.logger ?? console).error?.('[JANUS7] Test Results window render failed:', err);
    ui?.notifications?.error?.(`JANUS7 Test Results UI: ${err?.message ?? err}`);
  }
  return app;
}

export async function openGuidedManualTests(opts = {}) {
  const engine = game?.janus7;
  if (engine) await ensureHarness(engine);
  const app = await getManualApp();
  const tests = Array.isArray(opts?.tests) && opts.tests.length
    ? opts.tests
    : (_harness?.registry?.list?.() ?? []).filter((t) => t?.kind === 'manual');
  const session = app.startSession({ tests, ctx: { engine } });
  return opts?.awaitCompletion === true ? session : app;
}

registerRuntimeHook('janus7:ready:test-runner', HOOKS.ENGINE_READY, (engine) => {
  if (!engine) return;
  if (!engine.test) engine.test = {};
  engine.test.runCatalog = runCatalog;
  engine.test.openResults = openResults;
  engine.test.openGuidedManualTests = openGuidedManualTests;
  engine.test._executeCatalog = executeCatalog;
  engine.test.manual = {
    runGuided: openGuidedManualTests
  };
  engine?.markServiceReady?.('test.api', engine.test);
  try {
    // A1 FIX: game.settings.get() → JanusConfig.get() (SSOT Gateway)
    const enabled = JanusConfig.get('enableTestRunner');
    if (enabled && game.user.isGM) {
      (engine?.core?.logger ?? console).info?.('[JANUS7] Test Runner auto-run disabled for lazy-loading; use the UI or console to start tests manually.');
    }
  } catch (err) {
    engine?.recordWarning?.('test.runner', 'setting-check', err);
    (engine?.core?.logger ?? console).warn?.('[JANUS7] Test Runner setting check failed:', err.message);
  }
});
