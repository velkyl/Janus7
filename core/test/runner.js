import { readManualTestResult, manualEntryToRunnerResult } from './manual-store.js';

// janus7/core/test/runner.js (ESM)

function nowMs() {
  return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
}

function sortById(a, b) {
  return String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
}

export default class JanusTestRunner {
  constructor({ registry, logger, engine } = {}) {
    this.registry = registry;
    this.logger = logger;
    this.engine = engine ?? null;
  }

  _normalizeStructuredStatus(value) {
    const raw = String(value ?? '').trim().toUpperCase();
    if (!raw) return 'PASS';
    if (['PASS', 'FAIL', 'SKIP', 'ERROR', 'MANUAL', 'CATALOG', 'IMPORT_FAILED'].includes(raw)) return raw;
    return raw;
  }

  _phaseLabels(test = {}) {
    const phases = Array.isArray(test?.phases) ? test.phases : [];
    if (!phases.length) return ['—'];
    return phases.map((p) => `P${p}`);
  }

  _meta(test = {}) {
    return {
      id: test?.id ?? 'UNKNOWN',
      title: test?.title ?? test?.id ?? 'UNKNOWN',
      kind: test?.kind ?? 'manual',
      suiteClass: test?.suiteClass ?? 'manual',
      phases: Array.isArray(test?.phases) ? test.phases : [],
      phaseLabels: this._phaseLabels(test),
      sourceFile: test?.sourceFile ?? null,
      registrationStatus: test?.registrationStatus ?? 'registered',
      whereToFind: test?.whereToFind ?? null,
      expected: test?.expected ?? null
    };
  }

  _nonRunnableResult(test, status, summary, details, t0) {
    return {
      ...this._meta(test),
      status,
      summary,
      details,
      ms: Math.max(0, nowMs() - t0)
    };
  }


  async _storedManualResult(test, t0) {
    try {
      const entry = await readManualTestResult(test?.id);
      if (!entry?.status) return null;
      return manualEntryToRunnerResult(this._meta(test), entry, Math.max(0, nowMs() - t0));
    } catch (err) {
      try { this.logger?.warn?.(`[TEST] manual result lookup failed for ${test?.id}`, { message: err?.message }); } catch (_) {}
      return null;
    }
  }

  async runGuided({ tests = [], ctx = {} } = {}) {
    const manualApi = ctx?.engine?.test?.manual ?? game?.janus7?.test?.manual ?? null;
    if (manualApi?.runGuided) return manualApi.runGuided({ tests, ctx });
    throw new Error('Geführter Manual-Test-Runner ist nicht verfügbar.');
  }

  async runAll({ tests = [], ctx = {}, includeManual = false, includeCatalog = false, includeImportFailed = false } = {}) {
    const input = (tests?.length ? tests : this.registry?.list?.() ?? [])
      .map((t) => (typeof t === 'string' ? this.registry?.get?.(t) ?? { id: t, kind: 'manual', title: t } : t))
      .sort(sortById);

    const results = [];
    for (const test of input) {
      const t0 = nowMs();
      try {
        if (test?.registrationStatus === 'import-failed' || test?.kind === 'import-failed') {
          if (!includeImportFailed) {
            results.push(this._nonRunnableResult(test, 'IMPORT_FAILED', test?.importError ?? 'Import failed', { importError: test?.importError ?? null }, t0));
            continue;
          }
        }

        if (test?.suiteClass === 'catalog-only' || test?.kind === 'catalog') {
          if (!includeCatalog) {
            results.push(this._nonRunnableResult(test, 'CATALOG', 'Nur katalogisiert; keine ausführbare Testdatei registriert.', null, t0));
            continue;
          }
        }

        if (test?.kind === 'manual') {
          const storedManual = await this._storedManualResult(test, t0);
          if (storedManual) {
            results.push(storedManual);
            continue;
          }
          if (!includeManual) {
            results.push(this._nonRunnableResult(test, 'MANUAL', 'Manueller Test; noch kein geführtes Ergebnis gespeichert.', null, t0));
            continue;
          }
        }

        if (!test?.run || typeof test.run !== 'function') {
          results.push(this._nonRunnableResult(test, 'SKIP', 'No automated run() defined', null, t0));
          continue;
        }

        const assert = (condition, message = 'Assertion failed') => {
          if (!condition) throw new Error(message);
          return true;
        };
        const out = await test.run({
          ctx,
          engine: ctx?.engine,
          test,
          assert,
          logger: this.logger,
          registry: this.registry,
          runner: this
        });
        let status, summary, details;
        if (out && typeof out === 'object' && out.status) {
          status = this._normalizeStructuredStatus(out.status);
          summary = out.summary ?? '';
          details = out.details;
        } else if (out && typeof out === 'object' && 'ok' in out) {
          status = out.ok ? 'PASS' : 'FAIL';
          summary = out.summary ?? (out.ok ? 'OK' : 'FAIL');
          details = out.notes ? { notes: out.notes } : out.details;
        } else {
          status = 'PASS';
          summary = 'OK';
          details = undefined;
        }

        results.push({
          ...this._meta(test),
          status,
          summary,
          details,
          ms: Math.max(0, nowMs() - t0)
        });
      } catch (err) {
        const msg = (err && err.message) ? err.message : String(err);
        results.push({
          ...this._meta(test),
          status: 'ERROR',
          summary: msg,
          details: { stack: err?.stack },
          ms: Math.max(0, nowMs() - t0)
        });
        try { this.logger?.error?.(`[TEST] ${test?.id} ERROR: ${msg}`, err); } catch (_) {}
      }
    }
    return results;
  }

  summarizeResults({ results = [], tests = [], version = 'unknown' } = {}) {
    const summary = {
      version,
      total: tests.length || results.length,
      executed: 0,
      pass: 0,
      fail: 0,
      error: 0,
      skip: 0,
      manual: 0,
      catalogOnly: 0,
      importFailed: 0,
      autoActive: 0,
      bySuite: []
    };

    const suiteMap = new Map();
    for (const test of tests) {
      const key = test?.suiteClass ?? 'unknown';
      if (!suiteMap.has(key)) {
        suiteMap.set(key, { suiteClass: key, total: 0, executed: 0, pass: 0, fail: 0, error: 0, skip: 0, manual: 0, catalogOnly: 0, importFailed: 0 });
      }
      suiteMap.get(key).total += 1;
      if (test?.kind === 'auto') {
        summary.autoActive += 1;
      }
    }

    for (const result of results) {
      const suite = suiteMap.get(result?.suiteClass ?? 'unknown') ?? { suiteClass: result?.suiteClass ?? 'unknown', total: 0, executed: 0, pass: 0, fail: 0, error: 0, skip: 0, manual: 0, catalogOnly: 0, importFailed: 0 };
      suiteMap.set(suite.suiteClass, suite);

      switch (result?.status) {
        case 'PASS':
          summary.pass += 1; summary.executed += 1; suite.pass += 1; suite.executed += 1; break;
        case 'FAIL':
          summary.fail += 1; summary.executed += 1; suite.fail += 1; suite.executed += 1; break;
        case 'ERROR':
          summary.error += 1; summary.executed += 1; suite.error += 1; suite.executed += 1; break;
        case 'SKIP':
          summary.skip += 1; suite.skip += 1; break;
        case 'MANUAL':
          summary.manual += 1; suite.manual += 1; break;
        case 'CATALOG':
          summary.catalogOnly += 1; suite.catalogOnly += 1; break;
        case 'IMPORT_FAILED':
          summary.importFailed += 1; suite.importFailed += 1; break;
        default:
          summary.skip += 1; suite.skip += 1; break;
      }
    }

    summary.bySuite = Array.from(suiteMap.values()).sort((a, b) => String(a.suiteClass).localeCompare(String(b.suiteClass)));
    return summary;
  }
}
