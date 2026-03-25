import { moduleTemplatePath } from '../../core/common.js';
/**
 * @file ui/apps/JanusTestResultApp.js
 * @module janus7/ui
 * @phase 6
 */

const { HandlebarsApplicationMixin } = foundry.applications.api;
import { JanusBaseApp } from '../core/base-app.js';
import { JanusUI } from '../helpers.js';

function uniqueSorted(values = []) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b)));
}

function statusMeta(status) {
  switch (status) {
    case 'PASS': return { icon: '✅', css: 'pass', label: 'PASS' };
    case 'FAIL': return { icon: '❌', css: 'fail', label: 'FAIL' };
    case 'ERROR': return { icon: '⛔', css: 'error', label: 'ERROR' };
    case 'SKIP': return { icon: '⏭️', css: 'skip', label: 'SKIP' };
    case 'MANUAL': return { icon: '🧭', css: 'manual', label: 'MANUAL' };
    case 'CATALOG': return { icon: '🗂️', css: 'catalog', label: 'CATALOG' };
    case 'IMPORT_FAILED': return { icon: '📦', css: 'import-failed', label: 'IMPORT_FAILED' };
    default: return { icon: '•', css: 'skip', label: status ?? 'UNKNOWN' };
  }
}

export class JanusTestResultApp extends HandlebarsApplicationMixin(JanusBaseApp) {
  static DEFAULT_OPTIONS = {
    tag: 'section',
    id: 'janus-test-results',
    classes: ['janus7-app'],
    position: { width: 900, height: 760 },
    window: {
      title: 'JANUS7 · Test Results',
      resizable: true,
      minimizable: true
    },
    actions: {}
  };

  static PARTS = {
    main: { template: moduleTemplatePath('templates/apps/test-results.hbs') }
  };

  _configureRenderOptions(options) {
    options = super._configureRenderOptions?.(options ?? {}) ?? (options ?? {});
    options.window ??= {};
    options.window.title = 'JANUS7 · Test Results';
    // Foundry 13.351 can throw inside internal alias/localization resolution for some custom
    // window metadata during renderHTML. Keep the test window header intentionally minimal.
    delete options.window.icon;
    if (Array.isArray(options.window.controls)) delete options.window.controls;
    return options;
  }


  _testData = null;
  _running = false;
  _filters = { phase: 'all', suiteClass: 'all', status: 'all' };
  _localHandlersBound = false;

  async setResults(data) {
    this._testData = data;
    this._running = false;
    return this.render({ force: true });
  }

  _readFilterValue(selector, fallback = 'all') {
    try {
      return this.domElement?.querySelector?.(selector)?.value ?? fallback;
    } catch {
      return fallback;
    }
  }

  _matchesFilter(result) {
    if (this._filters.phase !== 'all' && !result.phaseLabels?.includes(this._filters.phase)) return false;
    if (this._filters.suiteClass !== 'all' && result.suiteClass !== this._filters.suiteClass) return false;
    if (this._filters.status !== 'all' && result.status !== this._filters.status) return false;
    return true;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.enableAutoRefresh(['janus7TestManualResultsChanged']);
    this._bindLocalUiActions();
  }

  _bindLocalUiActions() {
    const el = this.domElement;
    if (!el || el._janusTestActionsBound) return;
    el._janusTestActionsBound = true;

    el.addEventListener('click', async (event) => {
      const target = event.target?.closest?.('[data-action]');
      if (!target) return;
      const action = target.dataset.action;
      switch (action) {
        case 'rerun':
          event.preventDefault();
          await this.runTests();
          break;
        case 'copyReport':
          event.preventDefault();
          await JanusTestResultApp.onCopyReport.call(this);
          break;
        case 'copyBugReport':
          event.preventDefault();
          await JanusTestResultApp.onCopyBugReport.call(this);
          break;
        case 'toggleGroup':
          event.preventDefault();
          JanusTestResultApp.onToggleGroup.call(this, event);
          break;
        case 'applyFilters':
          event.preventDefault();
          await JanusTestResultApp.onApplyFilters.call(this);
          break;
        case 'resetFilters':
          event.preventDefault();
          await JanusTestResultApp.onResetFilters.call(this);
          break;
        case 'openGuidedManual':
          event.preventDefault();
          await JanusTestResultApp.onOpenGuidedManual.call(this);
          break;
      }
    });
  }

  async _prepareContext(_options) {
    if (this._running) return { running: true, hasResults: false };
    if (!this._testData) return { running: false, hasResults: false };

    const results = Array.isArray(this._testData?.results) ? this._testData.results : [];
    const summary = this._testData?.summary ?? {};
    const availablePhases = uniqueSorted(results.flatMap((r) => Array.isArray(r.phaseLabels) ? r.phaseLabels : []));
    const availableSuites = uniqueSorted(results.map((r) => r.suiteClass));
    const availableStatuses = uniqueSorted(results.map((r) => r.status));
    const filtered = results.filter((r) => this._matchesFilter(r));

    const groupMap = new Map();
    for (const result of filtered) {
      const groupName = result.phaseLabels?.[0] ?? '—';
      if (!groupMap.has(groupName)) groupMap.set(groupName, []);
      groupMap.get(groupName).push(result);
    }

    const groups = Array.from(groupMap.entries()).sort((a, b) => String(a[0]).localeCompare(String(b[0]))).map(([groupName, tests]) => ({
      groupName,
      tests: tests.map((t) => {
        const meta = statusMeta(t.status);
        return {
          ...t,
          name: t.title ?? t.id,
          detail: t.summary ?? '',
          statusIcon: meta.icon,
          statusClass: meta.css,
          statusLabel: meta.label,
          phaseText: (t.phaseLabels ?? []).join(', ') || '—',
          msText: Number.isFinite(t.ms) ? `${Math.round(t.ms)} ms` : '—'
        };
      })
    }));

    const firstFailed = filtered.find((r) => r.status === 'FAIL' || r.status === 'ERROR' || r.status === 'IMPORT_FAILED') ?? null;

    const phaseOptions = [{ value: 'all', label: 'Alle', selected: this._filters.phase === 'all' }, ...availablePhases.map((value) => ({ value, label: value, selected: this._filters.phase === value }))];
    const suiteOptions = [{ value: 'all', label: 'Alle', selected: this._filters.suiteClass === 'all' }, ...availableSuites.map((value) => ({ value, label: value, selected: this._filters.suiteClass === value }))];
    const statusOptions = [{ value: 'all', label: 'Alle', selected: this._filters.status === 'all' }, ...availableStatuses.map((value) => ({ value, label: value, selected: this._filters.status === value }))];

    return {
      running: false,
      hasResults: true,
      summary,
      groups,
      suiteMetrics: Array.isArray(summary.bySuite) ? summary.bySuite : [],
      filters: this._filters,
      phaseOptions,
      suiteOptions,
      statusOptions,
      visibleCount: filtered.length,
      generatedAt: this._testData?.generatedAt ?? null,
      failedTestId: firstFailed ? firstFailed.id : null
    };
  }

  async runTests() {
    this._running = true;
    this.render(true);

    try {
      const engine = game?.janus7;
      let data = null;
      if (engine?.test?.runCatalog) {
        data = await engine.test.runCatalog({ openWindow: false });
      } else {
        const mod = await import('../../scripts/integration/test-runner-integration.js');
        data = await mod?.runCatalog?.({ openWindow: false });
      }

      if (!data) throw new Error('Kein Testdatensatz zurückgegeben.');

      const { summary, results } = data;
      this._getLogger().info?.(
        `%c=== JANUS7 v${summary.version} Test Results ===`,
        'font-size:14px; font-weight:bold; color:#7b68ee'
      );
      this._getLogger().info?.(
        `%c  ${summary.pass}/${summary.total} PASS | ${summary.fail} FAIL | ${summary.error} ERROR | ${summary.importFailed} IMPORT_FAILED`,
        `font-size:13px; font-weight:bold; color:${summary.fail === 0 && summary.error === 0 && summary.importFailed === 0 ? '#4caf50' : '#ef5350'}`
      );
      console.table(results.map((r, i) => ({
        '#': i + 1,
        ID: r.id,
        Phase: (r.phaseLabels ?? []).join(', ') || '—',
        Suite: r.suiteClass,
        Kind: r.kind,
        Status: r.status,
        Summary: r.summary
      })));

      const severity = (summary.fail === 0 && summary.error === 0 && summary.importFailed === 0) ? 'info' : 'warn';
      ui.notifications[severity]?.(`JANUS7 v${summary.version}: ${summary.pass}/${summary.total} PASS | ${summary.fail} FAIL | ${summary.error} ERROR | ${summary.importFailed} Importfehler`);

      const failedResults = results.filter((r) => ['FAIL', 'ERROR', 'IMPORT_FAILED'].includes(r.status));
      this._lastFailedTestId = failedResults[0]?.id ?? null;
      if (failedResults.length) {
        const compactFailures = failedResults.map((r) => ({ id: r.id, status: r.status, summary: r.summary }));
        console.warn('[JANUS7] Failed test IDs:', JSON.stringify(compactFailures, null, 2));
        this._getLogger().warn?.(`[JANUS7] Failed test IDs: ${JSON.stringify(compactFailures)}`);
      }
      try {
        await this.setResults(data);
      } catch (renderErr) {
        this._testData = data;
        this._running = false;
        console.error('[JANUS7] Test result render failed', renderErr);
        ui.notifications?.error?.(`JANUS7 Test Results UI: ${renderErr?.message ?? renderErr}`);
      }
    } catch (err) {
      this._getLogger().error?.('JANUS7 | Test Runner failed:', err);
      ui.notifications.error(`JANUS7 Test Runner: ${err.message}`);
      this._running = false;
      this.render(true);
    }
  }

  static async onRerun() {
    await this.runTests();
  }

  static async onCopyReport() {
    if (!this._testData) {
      ui.notifications.warn('Kein Report vorhanden.');
      return;
    }
    const text = JSON.stringify(this._testData, null, 2);
    const ok = await JanusUI.copyToClipboard(text);
    ui.notifications.info(ok ? 'Report in Zwischenablage kopiert.' : 'Kopieren fehlgeschlagen.');
  }


  static async onOpenGuidedManual() {
    const engine = game?.janus7;
    if (!engine?.test?.openGuidedManualTests) {
      ui.notifications.warn('Guided Manual Tests sind nicht verfügbar.');
      return;
    }
    engine.test.openGuidedManualTests();
  }

  static async onCopyBugReport() {
    const engine = game?.janus7;
    if (!engine?.diagnostics?.generateBugReport) {
      ui.notifications.warn('Bug-Report-Generator nicht verfügbar.');
      return;
    }
    const report = engine.diagnostics.generateBugReport({
      failedTestId: this._lastFailedTestId ?? null,
      testData: this._testData ?? null
    });
    try {
      await navigator.clipboard.writeText(report);
      ui.notifications.info('Bug Report in Zwischenablage kopiert.');
    } catch (err) {
      this._getLogger().warn?.('[JANUS7] Bug report copy failed', { message: err?.message });
      ui.notifications.error('Bug Report konnte nicht kopiert werden.');
    }
  }

  static onToggleGroup(event) {
    const header = event.currentTarget;
    const body = header.nextElementSibling;
    if (!body) return;
    const isHidden = body.style.display === 'none';
    body.style.display = isHidden ? '' : 'none';
    const chevron = header.querySelector('.fa-chevron-down, .fa-chevron-right');
    if (chevron) {
      chevron.classList.toggle('fa-chevron-down', isHidden);
      chevron.classList.toggle('fa-chevron-right', !isHidden);
    }
  }

  static async onApplyFilters() {
    this._filters = {
      phase: this._readFilterValue('[name="phaseFilter"]'),
      suiteClass: this._readFilterValue('[name="suiteFilter"]'),
      status: this._readFilterValue('[name="statusFilter"]')
    };
    await this.render(true);
  }

  static async onResetFilters() {
    this._filters = { phase: 'all', suiteClass: 'all', status: 'all' };
    await this.render(true);
  }
}
