import { moduleTemplatePath } from '../../core/common.js';
/**
 * @file ui/apps/JanusGuidedManualTestApp.js
 * @module janus7/ui
 * @phase 6
 */

const { HandlebarsApplicationMixin } = foundry.applications.api;
import { JanusBaseApp } from '../core/base-app.js';
import {
  readManualTestResults,
  writeManualTestResult,
  clearManualTestResult,
  resetManualTestResults,
  MANUAL_TEST_HOOK
} from '../../core/test/manual-store.js';
import {
  buildGuideForTest,
  runGuidedCheck,
  runGuidedAction,
  buildEvidenceRecord,
  summarizeManualDecision,
  GUIDED_HARNESS_VERSION
} from '../../core/test/guided/guided-harness.js';

function statusChip(status, t = null) {
  const tt = typeof t === 'function' ? t : ((key, fallback) => fallback ?? key);
  switch (String(status ?? '').toUpperCase()) {
    case 'PASS': return { label: 'PASS', css: 'pass', icon: '✅' };
    case 'FAIL': return { label: 'FAIL', css: 'fail', icon: '❌' };
    case 'SKIP': return { label: 'SKIP', css: 'skip', icon: '⏭️' };
    default: return { label: tt('JANUS7.GuidedManual.StatusOpen', 'OFFEN'), css: 'pending', icon: '🧭' };
  }
}

function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value == null || value === '') return [];
  return [value];
}

function deepClone(value) {
  try { return foundry.utils.deepClone(value); } catch (_) {}
  try { return structuredClone(value); } catch (_) {}
  try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
}

function stringifyPayload(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

export class JanusGuidedManualTestApp extends HandlebarsApplicationMixin(JanusBaseApp) {
  static _instance = null;

  static showSingleton(options = {}) {
    if (!this._instance) this._instance = new this(options);
    this._instance.render({ force: true });
    return this._instance;
  }

  static DEFAULT_OPTIONS = {
    id: 'janus-guided-manual-tests',
    classes: ['janus7-app', 'janus7-guided-manual-tests'],
    position: { width: 1280, height: 900 },
    window: {
      title: 'JANUS7 · Guided Manual Tests',
      resizable: true,
    },
    actions: {
      refreshList: JanusGuidedManualTestApp.onRefreshList,
      selectTest: JanusGuidedManualTestApp.onSelectTest,
      prevTest: JanusGuidedManualTestApp.onPrevTest,
      nextTest: JanusGuidedManualTestApp.onNextTest,
      markPass: JanusGuidedManualTestApp.onMarkPass,
      markFail: JanusGuidedManualTestApp.onMarkFail,
      markSkip: JanusGuidedManualTestApp.onMarkSkip,
      clearDecision: JanusGuidedManualTestApp.onClearDecision,
      saveNotes: JanusGuidedManualTestApp.onSaveNotes,
      resetAll: JanusGuidedManualTestApp.onResetAll,
      verifyCatalog: JanusGuidedManualTestApp.onVerifyCatalog,
      openResults: JanusGuidedManualTestApp.onOpenResults,
      runAllChecks: JanusGuidedManualTestApp.onRunAllChecks,
      runCheck: JanusGuidedManualTestApp.onRunCheck,
      runStep: JanusGuidedManualTestApp.onRunStep,
      markStepDone: JanusGuidedManualTestApp.onMarkStepDone,
      clearEvidence: JanusGuidedManualTestApp.onClearEvidence,
      copyEvidence: JanusGuidedManualTestApp.onCopyEvidence,
      openRelevantApp: JanusGuidedManualTestApp.onOpenRelevantApp,
      copySnippet: JanusGuidedManualTestApp.onCopySnippet
    }
  };

  _configureRenderOptions(options) {
    options = super._configureRenderOptions?.(options ?? {}) ?? (options ?? {});
    options.window ??= {};
    options.window.title = 'JANUS7 · Guided Manual Tests';
    delete options.window.icon;
    if (Array.isArray(options.window.controls)) delete options.window.controls;
    return options;
  }

  static PARTS = {
    main: { template: moduleTemplatePath('templates/apps/guided-manual-tests.hbs') }
  };

  constructor(options = {}) {
    super(options);
    this._tests = [];
    this._selectedId = null;
    this._manualResults = {};
    this._completionResolver = null;
    this._completionPromise = null;
    this._completed = false;
    this._session = { checks: {}, steps: {}, evidence: {} };
    this._lastRun = null;
  }

  async startSession({ tests = [], ctx = {} } = {}) {
    this._tests = Array.isArray(tests) && tests.length ? tests.slice() : this._tests;
    this.engine = ctx?.engine ?? this.engine ?? game?.janus7 ?? null;
    await this._loadManualResults();
    this._selectedId = this._selectedId ?? this._pickInitialTestId();
    this._completed = false;
    this.render({ force: true });
    if (!this._completionPromise) {
      this._completionPromise = new Promise((resolve) => { this._completionResolver = resolve; });
    }
    return this._completionPromise;
  }

  async _loadManualResults() {
    this._manualResults = await readManualTestResults();
  }

  _pickInitialTestId() {
    const unresolved = this._tests.find((t) => !this._manualResults?.[t.id]?.status);
    return unresolved?.id ?? this._tests?.[0]?.id ?? null;
  }

  _selectedIndex() {
    return Math.max(0, this._tests.findIndex((t) => t.id === this._selectedId));
  }

  _selectedTest() {
    return this._tests[this._selectedIndex()] ?? null;
  }

  _notesValue() {
    try { return this.domElement?.querySelector?.('[name="manualNotes"]')?.value ?? ''; } catch { return ''; }
  }

  _guideFor(test = null) {
    const current = test ?? this._selectedTest();
    return buildGuideForTest(current ?? {}, this.engine ?? game?.janus7 ?? null);
  }

  _checkState(testId, checkId) {
    return this._session?.checks?.[testId]?.[checkId] ?? null;
  }

  _stepState(testId, stepId) {
    return this._session?.steps?.[testId]?.[stepId] ?? null;
  }

  _ensureSessionBucket(kind, testId) {
    this._session[kind] ??= {};
    this._session[kind][testId] ??= {};
    return this._session[kind][testId];
  }

  _appendEvidence(testId, record) {
    const bucket = this._ensureSessionBucket('evidence', testId);
    bucket.items ??= [];
    bucket.items.unshift(deepClone(record));
    bucket.items = bucket.items.slice(0, 16);
  }

  _currentEvidence(testId = null) {
    const id = testId ?? this._selectedId;
    return toArray(this._session?.evidence?.[id]?.items);
  }

  _decorateChecks(test, guide) {
    return toArray(guide.preconditions).map((check, idx) => {
      const stored = this._checkState(test.id, check.id ?? `check-${idx + 1}`);
      return {
        ...check,
        id: check.id ?? `check-${idx + 1}`,
        idx: idx + 1,
        status: stored?.status ?? 'OPEN',
        ok: stored?.ok === true,
        summary: stored?.summary ?? '',
        lastRunAt: stored?.ts ?? null,
        preview: stored?.preview ?? ''
      };
    });
  }

  _decorateSteps(test, guide) {
    return toArray(guide.steps).map((step, idx) => {
      const id = step.id ?? `step-${idx + 1}`;
      const stored = this._stepState(test.id, id);
      const status = stored?.status ?? 'OPEN';
      return {
        ...step,
        id,
        idx: idx + 1,
        status,
        done: status === 'DONE' || status === 'OK',
        ok: status === 'OK',
        actionSummary: stored?.summary ?? '',
        actionPreview: stored?.preview ?? '',
        lastRunAt: stored?.ts ?? null,
        payloadText: stringifyPayload(stored?.payload ?? null)
      };
    });
  }

  _buildList() {
    return this._tests.map((test, idx) => {
      const saved = this._manualResults?.[test.id] ?? null;
      const chip = statusChip(saved?.status, this._t.bind(this));
      const evidenceCount = this._currentEvidence(test.id).length;
      return {
        ...test,
        idx: idx + 1,
        selected: test.id === this._selectedId,
        saved,
        statusLabel: chip.label,
        statusIcon: chip.icon,
        statusClass: chip.css,
        phaseText: (Array.isArray(test.phaseLabels) ? test.phaseLabels : []).join(', ') || '—',
        evidenceCount
      };
    });
  }

  _buildCounts() {
    const statuses = Object.values(this._manualResults ?? {}).map((x) => String(x?.status ?? '').toUpperCase());
    return {
      total: this._tests.length,
      pass: statuses.filter((s) => s === 'PASS').length,
      fail: statuses.filter((s) => s === 'FAIL').length,
      skip: statuses.filter((s) => s === 'SKIP').length,
      pending: this._tests.length - statuses.filter(Boolean).length
    };
  }

  _prepareContext(_options) {
    const testList = this._buildList();
    const current = this._selectedTest();
    const currentSaved = current ? (this._manualResults?.[current.id] ?? null) : null;
    const counts = this._buildCounts();
    const chip = statusChip(currentSaved?.status, this._t.bind(this));
    const guide = current ? this._guideFor(current) : null;
    const evidence = current ? this._currentEvidence(current.id) : [];

    return {
      hasTests: testList.length > 0,
      counts,
      testList,
      harnessVersion: GUIDED_HARNESS_VERSION,
      current: current ? {
        ...current,
        phaseText: (Array.isArray(current.phaseLabels) ? current.phaseLabels : []).join(', ') || '—',
        guide,
        requires: toArray(guide?.requires ?? current.requires),
        snippets: toArray(guide?.snippets ?? current.snippets).map((snippet, idx) => ({ ...snippet, idx, copyId: `snippet-${idx}` })),
        preconditions: this._decorateChecks(current, guide),
        steps: this._decorateSteps(current, guide),
        statusLabel: chip.label,
        statusIcon: chip.icon,
        statusClass: chip.css,
        notes: currentSaved?.notes ?? '',
        updatedAt: currentSaved?.updatedAt ?? null,
        updatedBy: currentSaved?.updatedBy ?? null,
        index: this._selectedIndex() + 1,
        total: this._tests.length,
        evidence,
        relevantApp: guide?.openApp ?? null,
        savedDecision: summarizeManualDecision(currentSaved)
      } : null,
      lastRun: this._lastRun
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.enableAutoRefresh([MANUAL_TEST_HOOK]);
  }

  async _persistCurrent(status) {
    const test = this._selectedTest();
    if (!test) return false;
    const notes = this._notesValue();
    const evidence = this._currentEvidence(test.id);
    await writeManualTestResult(test.id, { status, notes, evidence }, test);
    await this._loadManualResults();
    await this.render({ force: true });
    return true;
  }

  _notesForTest(testId) {
    if (testId && testId === this._selectedId) return this._notesValue();
    return String(this._manualResults?.[testId]?.notes ?? '').trim();
  }

  _guidedProgress(test = null) {
    const current = test ?? this._selectedTest();
    if (!current) return null;

    const guide = this._guideFor(current);
    const checks = toArray(guide?.preconditions).map((check, idx) => {
      const id = check.id ?? `check-${idx + 1}`;
      const stored = this._checkState(current.id, id);
      const status = String(stored?.status ?? 'OPEN').toUpperCase();
      return {
        id,
        status,
        ok: status === 'OK',
        failed: status === 'FAIL'
      };
    });

    const steps = toArray(guide?.steps).map((step, idx) => {
      const id = step.id ?? `step-${idx + 1}`;
      const stored = this._stepState(current.id, id);
      const status = String(stored?.status ?? 'OPEN').toUpperCase();
      const satisfied = step?.action ? status === 'OK' : (status === 'DONE' || status === 'OK');
      return {
        id,
        status,
        failed: status === 'FAIL',
        satisfied
      };
    });

    const evidenceCount = this._currentEvidence(current.id).length;
    const touched = evidenceCount > 0
      || checks.some((entry) => entry.status !== 'OPEN')
      || steps.some((entry) => entry.status !== 'OPEN');
    const checksSatisfied = checks.every((entry) => entry.ok);
    const stepsSatisfied = steps.every((entry) => entry.satisfied);
    const blockingFailures = [
      ...checks.filter((entry) => entry.failed).map((entry) => `check:${entry.id}`),
      ...steps.filter((entry) => entry.failed).map((entry) => `step:${entry.id}`)
    ];

    return {
      testId: current.id,
      totalChecks: checks.length,
      totalSteps: steps.length,
      okChecks: checks.filter((entry) => entry.ok).length,
      okSteps: steps.filter((entry) => entry.satisfied).length,
      evidenceCount,
      touched,
      checksSatisfied,
      stepsSatisfied,
      blockingFailures,
      readyForAutoPass: touched && blockingFailures.length === 0 && checksSatisfied && stepsSatisfied
    };
  }

  _buildAutoPassNote(progress) {
    return `[GUIDED AUTO ${GUIDED_HARNESS_VERSION}] Preconditions OK (${progress?.okChecks ?? 0}/${progress?.totalChecks ?? 0}), Schritte vollständig (${progress?.okSteps ?? 0}/${progress?.totalSteps ?? 0}), Evidence=${progress?.evidenceCount ?? 0}`;
  }

  async _adoptReadyGuidedTests({ tests = null, render = true, force = false } = {}) {
    const candidates = Array.isArray(tests) && tests.length ? tests : this._tests;
    const adopted = [];

    for (const test of candidates) {
      if (!test?.id) continue;
      const existingStatus = String(this._manualResults?.[test.id]?.status ?? '').trim().toUpperCase();
      if (existingStatus && !force) continue;

      const progress = this._guidedProgress(test);
      if (!progress?.readyForAutoPass) continue;

      const notes = [this._notesForTest(test.id), this._buildAutoPassNote(progress)].filter(Boolean).join(' | ');
      await writeManualTestResult(test.id, {
        status: 'PASS',
        notes,
        evidence: this._currentEvidence(test.id)
      }, test);

      adopted.push({ id: test.id, title: test.title, notes, progress });
    }

    if (adopted.length) {
      await this._loadManualResults();
      if (render) await this.render({ force: true });
    }

    return adopted;
  }

  async _finishIfComplete() {
    await this._adoptReadyGuidedTests({ render: false });
    const counts = this._buildCounts();
    if (counts.pending > 0 || this._completed) return;
    this._completed = true;
    this._completionResolver?.({
      completed: true,
      manualResults: this._manualResults,
      counts
    });
    this._completionResolver = null;
    this._completionPromise = null;
  }

  async _runCheckById(checkId) {
    const test = this._selectedTest();
    if (!test) return;
    const guide = this._guideFor(test);
    const check = toArray(guide.preconditions).find((entry, idx) => (entry.id ?? `check-${idx + 1}`) === checkId);
    if (!check) return;
    const result = await runGuidedCheck(check.check ?? {}, this.engine ?? game?.janus7 ?? null);
    const bucket = this._ensureSessionBucket('checks', test.id);
    bucket[checkId] = {
      ts: new Date().toISOString(),
      ok: result?.ok === true,
      status: result?.ok === true ? 'OK' : 'FAIL',
      summary: result?.summary ?? '',
      preview: stringifyPayload(result?.details ?? null)
    };
    this._appendEvidence(test.id, buildEvidenceRecord('check', checkId, check.label, { ...result, data: result?.details ?? null }));
    this._lastRun = { kind: 'check', id: checkId, summary: result?.summary ?? '' };
    await this._adoptReadyGuidedTests({ tests: [test], render: false });
    await this.render({ force: true });
  }

  async _runAllChecks() {
    const test = this._selectedTest();
    if (!test) return;
    const guide = this._guideFor(test);
    for (const [idx, check] of toArray(guide.preconditions).entries()) {
      const id = check.id ?? `check-${idx + 1}`;
      await this._runCheckById(id);
    }
  }

  async _runStepById(stepId, { markOnly = false } = {}) {
    const test = this._selectedTest();
    if (!test) return;
    const guide = this._guideFor(test);
    const step = toArray(guide.steps).find((entry, idx) => (entry.id ?? `step-${idx + 1}`) === stepId);
    if (!step) return;
    const bucket = this._ensureSessionBucket('steps', test.id);

    if (markOnly || step.type === 'user') {
      bucket[stepId] = {
        ts: new Date().toISOString(),
        status: 'DONE',
        summary: step.help || step.label,
        preview: step.help || ''
      };
      this._appendEvidence(test.id, {
        ts: new Date().toISOString(),
        kind: 'step',
        id: stepId,
        label: step.label,
        ok: true,
        summary: 'Vom Nutzer bestätigt',
        preview: step.help || ''
      });
      this._lastRun = { kind: 'step', id: stepId, summary: 'Vom Nutzer bestätigt' };
      await this._adoptReadyGuidedTests({ tests: [test], render: false });
      await this.render({ force: true });
      return;
    }

    const result = await runGuidedAction(step.action ?? {}, this.engine ?? game?.janus7 ?? null);
    bucket[stepId] = {
      ts: new Date().toISOString(),
      status: result?.ok === true ? 'OK' : 'FAIL',
      summary: result?.summary ?? '',
      preview: result?.preview ?? '',
      payload: result?.data ?? null
    };
    this._appendEvidence(test.id, buildEvidenceRecord('step', stepId, step.label, result));
    this._lastRun = { kind: 'step', id: stepId, summary: result?.summary ?? '' };
    await this._adoptReadyGuidedTests({ tests: [test], render: false });
    await this.render({ force: true });
  }

  static async onRefreshList() {
    await this._loadManualResults();
    await this.render({ force: true });
  }

  static async onSelectTest(_event, target) {
    const id = target?.dataset?.testId;
    if (!id) return;
    this._selectedId = id;
    await this.render({ force: true });
  }

  static async onPrevTest() {
    const idx = this._selectedIndex();
    if (idx <= 0) return;
    this._selectedId = this._tests[idx - 1]?.id ?? this._selectedId;
    await this.render({ force: true });
  }

  static async onNextTest() {
    const idx = this._selectedIndex();
    if (idx >= this._tests.length - 1) return;
    this._selectedId = this._tests[idx + 1]?.id ?? this._selectedId;
    await this.render({ force: true });
  }

  static async onMarkPass() {
    await this._persistCurrent('PASS');
    await this._finishIfComplete();
  }

  static async onMarkFail() {
    await this._persistCurrent('FAIL');
    await this._finishIfComplete();
  }

  static async onMarkSkip() {
    await this._persistCurrent('SKIP');
    await this._finishIfComplete();
  }

  static async onSaveNotes() {
    const current = this._selectedTest();
    if (!current) return;
    const existing = this._manualResults?.[current.id]?.status ?? null;
    if (!existing) {
      ui.notifications?.warn?.(this._t('JANUS7.GuidedManual.ChooseDecisionFirst', 'Bitte zuerst PASS, FAIL oder SKIP wählen, damit die Notizen einem Ergebnis zugeordnet werden.'));
      return;
    }
    await this._persistCurrent(existing);
    ui.notifications?.info?.(this._t('JANUS7.GuidedManual.NotesSaved', 'Notizen gespeichert.'));
  }

  static async onClearDecision() {
    const current = this._selectedTest();
    if (!current) return;
    await clearManualTestResult(current.id);
    await this._loadManualResults();
    await this.render({ force: true });
  }

  static async onResetAll() {
    const D2 = foundry?.applications?.api?.DialogV2;
    let confirmed = true;
    try {
      if (D2?.confirm) {
        confirmed = await D2.confirm({
          window: { title: this._t('JANUS7.GuidedManual.ResetConfirmTitle', 'Geführte Manual-Ergebnisse zurücksetzen') },
          content: `<p>${this._t('JANUS7.GuidedManual.ResetConfirmBody', 'Alle gespeicherten Ergebnisse geführter manueller Tests löschen?')}</p>`,
          rejectClose: false,
          modal: true
        });
      }
    } catch (_) {}
    if (!confirmed) return;
    await resetManualTestResults();
    this._session = { checks: {}, steps: {}, evidence: {} };
    await this._loadManualResults();
    await this.render({ force: true });
  }

  static async onVerifyCatalog() {
    const engine = game?.janus7 ?? this._getEngine();
    if (!engine?.test?.runCatalog) return ui.notifications?.warn?.(this._t('JANUS7.GuidedManual.CatalogUnavailable', 'Testkatalog nicht verfügbar.'));
    const adopted = await this._adoptReadyGuidedTests({ render: false });
    if (adopted.length) {
      ui.notifications?.info?.(`${adopted.length} Guided-Ergebnisse als PASS übernommen.`);
    }
    const data = await engine.test.runCatalog({ openWindow: true });
    const counts = this._buildCounts();
    const summary = data?.summary ?? {};
    ui.notifications?.info?.(`Manual: ${counts.pass}/${counts.total} bewertet · Katalog: ${summary.pass ?? 0}/${summary.total ?? 0} PASS`);
    await this._finishIfComplete();
    return data;
  }

  static async onOpenResults() {
    return game?.janus7?.test?.openResults?.();
  }

  static async onRunAllChecks() {
    return this._runAllChecks();
  }

  static async onRunCheck(_event, target) {
    const id = target?.dataset?.checkId;
    if (!id) return;
    await this._runCheckById(id);
  }

  static async onRunStep(_event, target) {
    const id = target?.dataset?.stepId;
    if (!id) return;
    await this._runStepById(id);
  }

  static async onMarkStepDone(_event, target) {
    const id = target?.dataset?.stepId;
    if (!id) return;
    await this._runStepById(id, { markOnly: true });
  }

  static async onClearEvidence() {
    const current = this._selectedTest();
    if (!current) return;
    const bucket = this._ensureSessionBucket('evidence', current.id);
    bucket.items = [];
    await this.render({ force: true });
  }

  static async onCopyEvidence() {
    const current = this._selectedTest();
    if (!current) return;
    const evidence = this._currentEvidence(current.id);
    const text = JSON.stringify(evidence, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      ui.notifications?.info?.(this._t('JANUS7.GuidedManual.EvidenceCopied', 'Evidenz in die Zwischenablage kopiert.'));
    } catch (_) {
      ui.notifications?.warn?.(this._t('JANUS7.GuidedManual.CopyFailed', 'Kopieren fehlgeschlagen.'));
    }
  }


  static async onCopySnippet(_event, target) {
    const current = this._selectedTest();
    if (!current) return;
    const guide = this._guideFor(current);
    const snippets = toArray(guide?.snippets ?? current.snippets).map((snippet, idx) => ({ ...snippet, idx, copyId: `snippet-${idx}` }));
    const id = target?.dataset?.snippetId;
    const snippet = snippets.find((entry) => entry.copyId === id);
    if (!snippet?.code) return;
    try {
      await navigator.clipboard.writeText(snippet.code);
      ui.notifications?.info?.(this._t('JANUS7.GuidedManual.SnippetCopied', 'Konsolenbefehl in die Zwischenablage kopiert.'));
    } catch (_) {
      ui.notifications?.warn?.(this._t('JANUS7.GuidedManual.CopyFailed', 'Kopieren fehlgeschlagen.'));
    }
  }

  static async onOpenRelevantApp() {
    const current = this._selectedTest();
    if (!current) return;
    const guide = this._guideFor(current);
    const app = guide?.openApp;
    if (!app) return;
    try {
      game?.janus7?.ui?.open?.(app);
    } catch (error) {
      ui.notifications?.warn?.(error?.message ?? String(error));
    }
  }

  async close(options = {}) {
    await this._adoptReadyGuidedTests({ render: false });
    if (!this._completed && this._completionResolver) {
      this._completionResolver({
        completed: false,
        manualResults: this._manualResults,
        counts: this._buildCounts()
      });
      this._completionResolver = null;
      this._completionPromise = null;
    }
    return super.close(options);
  }
}

export default JanusGuidedManualTestApp;
