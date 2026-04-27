import { MODULE_ID, moduleTemplatePath } from '../../core/common.js';
import { JanusBaseApp } from '../core/base-app.js';
import { listJanusUiAppStatus } from '../app-manifest.js';
import { getPanel, getQuickPanels } from '../layer/panel-registry.js';
import { getView, getViews } from '../layer/view-registry.js';
import { runShellAction } from '../layer/action-router.js';
import { JanusUI } from '../helpers.js';
import { prepareDirectorRuntimeSummary, buildDirectorRunbookView, buildDirectorWorkflowView } from '../layer/director-context.js';
import { JanusConfig } from '../../core/config.js';
import { DSA5CalendarSync } from '../../bridge/dsa5/calendar-sync.js';

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { renderTemplate: renderHbsTemplate } = foundry.applications.handlebars;

function escHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function mapActions(actions = []) {
  return actions.map((action, index) => ({
    ...action,
    actionIndex: index,
    actionIcon: action.icon ?? 'fas fa-bolt',
    actionLabel: action.label ?? action.command ?? action.appKey ?? action.action ?? action.panelId ?? 'Aktion'
  }));
}

function mapViewCards(cards = []) {
  return cards.map((card, cardIndex) => ({
    ...card,
    cardIndex,
    actions: mapActions(card.actions ?? [])
  }));
}

function toChronicleDsa5Date(value) {
  const text = String(value ?? '').trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, yearRaw, monthRaw, dayRaw] = match;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const dayOfMonth = Number(dayRaw);
  if (!year || month < 1 || month > 12 || dayOfMonth < 1 || dayOfMonth > 31) return null;
  return { year, month: month - 1, dayOfMonth };
}

function buildChronicleCalendarEntryContent(entry = {}, focusDate = '') {
  const lines = [
    `<p><strong>JANUS7 Bote-Chronik</strong></p>`,
    `<p><strong>Datum:</strong> ${escHtml(focusDate || '—')}</p>`,
    `<p><strong>Kategorie:</strong> ${escHtml(entry?.category ?? '—')}</p>`,
    `<p><strong>Quelle:</strong> ${escHtml(entry?.sourceType ?? '—')}</p>`,
  ];
  if (entry?.tags) lines.push(`<p><strong>Tags:</strong> ${escHtml(entry.tags)}</p>`);
  lines.push(`<p>${escHtml(entry?.description ?? '—')}</p>`);
  return lines.join('\n');
}

function listCalendarJournals() {
  const journals = [];
  for (const journal of game?.journal ?? []) {
    const hasCalendarPage = journal?.pages?.some?.((page) => page?.type === 'dsacalendar');
    if (!hasCalendarPage) continue;
    journals.push({ id: journal.id, name: journal.name ?? journal.id });
  }
  return journals.sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

function hasCalendarDuplicate(page, { title, dsa5Date, location }) {
  const entries = Object.values(page?.system?.calendarentries ?? {});
  return entries.some((entry) => {
    const from = entry?.from ?? {};
    return String(entry?.title ?? '').trim() === String(title ?? '').trim()
      && Number(from?.year ?? 0) === Number(dsa5Date?.year ?? 0)
      && Number(from?.month ?? -1) === Number(dsa5Date?.month ?? -1)
      && Number(from?.dayOfMonth ?? 0) === Number(dsa5Date?.dayOfMonth ?? 0)
      && String(entry?.location ?? '').trim() === String(location ?? '').trim();
  });
}

async function promptChronicleCalendarJournal({ preferredJournalId = '', title = 'DSA5 Kalender-Export', summary = '' } = {}) {
  const journals = listCalendarJournals();
  if (!journals.length) {
    ui.notifications?.warn?.('Kein Journal mit dsacalendar-Page gefunden.');
    return null;
  }

  const D2 = foundry?.applications?.api?.DialogV2;
  if (!D2?.prompt) {
    ui.notifications?.warn?.('DialogV2 nicht verfuegbar.');
    return null;
  }

  const options = journals
    .map((journal) => `<option value="${escHtml(journal.id)}" ${journal.id === preferredJournalId ? 'selected' : ''}>${escHtml(journal.name)}</option>`)
    .join('');
  const content = `
    <div class="janus7-card j7-dialog-card-reset">
      <p class="j7-dialog-heading"><strong>${escHtml(title)}</strong></p>
      <div class="j7-dialog-form-row">
        <label for="janus7-chronicle-calendar-journal" class="j7-dialog-label-fixed">Kalenderjournal</label>
        <select id="janus7-chronicle-calendar-journal" class="j7-dialog-input-grow">${options}</select>
      </div>
      ${summary ? `<p class="j7-dialog-subtext">${escHtml(summary)}</p>` : ''}
    </div>
  `;

  const result = await D2.prompt({
    window: { title },
    content,
    ok: { label: 'Exportieren', icon: 'fas fa-calendar-plus' },
    rejectClose: false,
    modal: true,
  }).catch(() => null);
  if (result === null) return null;

  const journalId = document.getElementById('janus7-chronicle-calendar-journal')?.value?.trim?.() ?? '';
  if (!journalId) {
    ui.notifications?.warn?.('Kein Kalenderjournal ausgewaehlt.');
    return null;
  }
  return journalId;
}

async function exportChronicleEntriesToCalendar({ journalId, entriesByDate = [] } = {}) {
  const calendarSync = new DSA5CalendarSync({ logger: console });
  const page = calendarSync.getCalendarPage(journalId);
  if (!page) {
    ui.notifications?.warn?.('Im ausgewaehlten Journal wurde keine dsacalendar-Page gefunden.');
    return null;
  }

  let created = 0;
  let skipped = 0;
  for (const day of entriesByDate) {
    const focusDate = String(day?.date ?? '').trim();
    const dsa5Date = toChronicleDsa5Date(focusDate);
    if (!focusDate || !dsa5Date) {
      skipped += Array.isArray(day?.entries) ? day.entries.length : 0;
      continue;
    }

    for (const entry of (day?.entries ?? [])) {
      const title = String(entry?.label ?? '').trim();
      const location = String(entry?.location ?? 'Akademie').trim() || 'Akademie';
      if (!title) {
        skipped++;
        continue;
      }
      if (hasCalendarDuplicate(page, { title, dsa5Date, location })) {
        skipped++;
        continue;
      }
      const ok = await calendarSync.addCalendarEventForDate({
        journalId,
        title,
        content: buildChronicleCalendarEntryContent(entry, focusDate),
        dsa5Date,
        location,
        category: 2,
      });
      if (ok) created++;
      else skipped++;
    }
  }

  return { created, skipped };
}

function clearNode(node) {
  node?.replaceChildren?.();
}

function renderAiStatus(outputBox, { iconClass = '', message = '', muted = true } = {}) {
  if (!outputBox) return;
  clearNode(outputBox);
  const paragraph = document.createElement('p');
  paragraph.className = muted ? 'muted animate-pulse' : '';
  if (iconClass) {
    const icon = document.createElement('i');
    icon.className = iconClass;
    paragraph.append(icon, document.createTextNode(' '));
  }
  paragraph.append(document.createTextNode(message));
  outputBox.append(paragraph);
}

function renderAiImageResult(outputBox, imagePath) {
  if (!outputBox) return;
  clearNode(outputBox);

  const wrapper = document.createElement('div');
  wrapper.className = 'ai-generated-image';

  const image = document.createElement('img');
  image.src = imagePath;
  image.style.maxWidth = '100%';
  image.style.borderRadius = '4px';
  image.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
  wrapper.append(image);

  const pathParagraph = document.createElement('p');
  pathParagraph.className = 'mt-sm';
  const strong = document.createElement('strong');
  strong.textContent = 'Pfad:';
  const code = document.createElement('code');
  code.textContent = imagePath;
  pathParagraph.append(strong, document.createTextNode(' '), code);
  wrapper.append(pathParagraph);

  outputBox.append(wrapper);
}

function renderAiError(outputBox, error) {
  if (!outputBox) return;
  clearNode(outputBox);
  const paragraph = document.createElement('p');
  paragraph.className = 'error';
  paragraph.textContent = `Fehler: ${error?.message ?? error ?? 'Unbekannter Fehler'}`;
  outputBox.append(paragraph);
}

function renderAiTextResponse(outputBox, text) {
  if (!outputBox) return;
  clearNode(outputBox);
  const wrapper = document.createElement('div');
  wrapper.className = 'ai-response';
  const chunks = String(text ?? '').split(/\r?\n/);
  for (const chunk of chunks) {
    const line = document.createElement('p');
    line.textContent = chunk || ' ';
    wrapper.append(line);
  }
  outputBox.append(wrapper);
}

const APP_LAUNCHER_EXCLUDE = new Set(['shell', 'sessionPrepWizard', 'commandCenter', 'settingsTestHarness']);

const APP_NAV_META = Object.freeze({
  academyOverview: { title: 'Academy Overview', icon: 'fas fa-school', description: 'Kalender, Wochenraster und Akademie-Überblick.' },
  scoringView: { title: 'Scoring View', icon: 'fas fa-trophy', description: 'Zirkelpunkte, Wertungen und Ranglisten.' },
  lessonLibrary: { title: 'Lesson Library', icon: 'fas fa-book-open', description: 'Lektionskatalog und Arbeitsbibliothek.' },
  socialView: { title: 'Social View', icon: 'fas fa-users', description: 'Beziehungen, Spannungen und Sozialgraph.' },
  atmosphereDJ: { title: 'Atmosphäre DJ', icon: 'fas fa-music', description: 'Mood-, Audio- und Overlay-Steuerung.' },
  academyDataStudio: { title: 'Academy Data Studio', icon: 'fas fa-table', description: 'Direkter Datenzugriff für Inhalte und Kataloge.' },
  kiRoundtrip: { title: 'KI Roundtrip', icon: 'fas fa-brain', description: 'Export, Preview und kontrollierter Import.' },
  kiBackupManager: { title: 'KI Backups', icon: 'fas fa-life-ring', description: 'Backup- und Restore-Werkzeuge für KI-Artefakte.' },
  configPanel: { title: 'Config Panel', icon: 'fas fa-sliders', description: 'Modulweite Konfiguration und Kill-Switches.' },
  syncPanel: { title: 'Sync Panel', icon: 'fas fa-link', description: 'UUID-Verknüpfungen, Diagnose und Sync-Audits.' },
  libraryBrowser: { title: 'Library Browser', icon: 'fas fa-folder-open', description: 'Bibliotheks- und Sammlungsnavigation.' },
  studentArchive: { title: 'Student Archive', icon: 'fas fa-user-graduate', description: 'Archivierte Schüler und Verlaufsdaten.' },
  enrollmentScanner: { title: 'Enrollment Scanner', icon: 'fas fa-id-card', description: 'Import- und Einschreibungsprüfung.' },
  quartermaster: { title: 'Quartermaster', icon: 'fas fa-box-open', description: 'Inventar- und Versorgungswerkzeuge.' },
  stateInspector: { title: 'State Inspector', icon: 'fas fa-database', description: 'Read-only Sicht auf den Runtime-State.' },
  commandCenter: { title: 'Command Center', icon: 'fas fa-terminal', description: 'Legacy Power Tools für Debug und Spezialpfade.' },
  testResults: { title: 'Test Results', icon: 'fas fa-clipboard-check', description: 'Testergebnisse und Ausführungsberichte.' },
  guidedManualTests: { title: 'Guided Manual Tests', icon: 'fas fa-vial', description: 'Geführte manuelle Prüfschritte.' },
  settingsTestHarness: { title: 'Settings Harness', icon: 'fas fa-flask', description: 'Spezialwerkzeug für Settings-Tests.' },
  thesisManager: { title: 'Thesis Manager', icon: 'fas fa-microscope', description: 'Recherche-Fortschritt und Quellen-Management.' },
  laborInterface: { title: 'Labor Interface', icon: 'fas fa-vials', description: 'Alchimie-Lager und Brau-Workflow.' },
  doomMonitor: { title: 'Doom Monitor', icon: 'fas fa-skull', description: 'Überwachung des Risikos dunkler Magie.' }
});

function classifyAppNavGroup(meta = {}) {
  const maturity = String(meta.maturity ?? '').toLowerCase();
  if (maturity.includes('test') || maturity.includes('debug')) return 'debug';
  if (maturity.includes('legacy')) return 'legacy';
  if (meta.admin) return 'admin';
  return 'workbench';
}

function buildAppLauncherSections(currentViewId = 'director', app = null) {
  const appRegistry = game?.janus7?.ui?.apps ?? {};
  const query = (app?._searchQuery || '').toLowerCase();
  
  const groups = new Map([
    ['workbench', { id: 'workbench', title: 'Arbeitsflächen', items: [] }],
    ['admin', { id: 'admin', title: 'GM & Admin', items: [] }],
    ['debug', { id: 'debug', title: 'Debug & Tests', items: [] }],
    ['legacy', { id: 'legacy', title: 'Legacy & Bridges', items: [] }]
  ]);

  for (const meta of listJanusUiAppStatus()) {
    if (!meta?.key || APP_LAUNCHER_EXCLUDE.has(meta.key)) continue;
    const navMeta = APP_NAV_META[meta.key] ?? {};
    
    const matches = !query || 
                    navMeta.title?.toLowerCase().includes(query) || 
                    navMeta.description?.toLowerCase().includes(query) ||
                    meta.key.toLowerCase().includes(query);

    if (matches) {
      groups.get(classifyAppNavGroup(meta))?.items.push({
        key: meta.key,
        icon: navMeta.icon ?? 'fas fa-window-maximize',
        title: navMeta.title ?? meta.className ?? meta.key,
        description: navMeta.description ?? meta.mode ?? '',
        maturity: meta.maturity ?? 'unbekannt',
        mode: meta.mode ?? 'n/a',
        isAvailable: !!appRegistry?.[meta.key],
        isActive: meta.key === 'sessionPrepWizard' ? (currentViewId === 'sessionPrep') : false
      });
    }
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      items: group.items.sort((a, b) => a.title.localeCompare(b.title, 'de'))
    }))
    .filter((group) => group.items.length > 0);
}

function buildViewNavSections(currentViewId = 'director', app = null) {
  const query = (app?._searchQuery || '').toLowerCase();
  
  const groups = new Map([
    ['main', { id: 'main', title: 'Hauptbereiche', items: [] }],
    ['academy', { id: 'academy', title: 'Akademie-Betrieb', items: [] }],
    ['system', { id: 'system', title: 'System & Tools', items: [] }]
  ]);

  const viewCategories = {
    director: 'main',
    academy: 'academy',
    schedule: 'academy',
    people: 'academy',
    places: 'academy',
    system: 'system',
    tools: 'system'
  };

  for (const view of getViews()) {
    const matches = !query || 
                    view.title.toLowerCase().includes(query) || 
                    view.description.toLowerCase().includes(query) ||
                    view.id.toLowerCase().includes(query);
    
    if (matches) {
      const category = viewCategories[view.id] || 'main';
      groups.get(category)?.items.push({
        ...view,
        isActive: view.id === currentViewId
      });
    }
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      items: group.items.sort((a, b) => a.title.localeCompare(b.title, 'de'))
    }))
    .filter((group) => group.items.length > 0);
}

export class JanusShellApp extends HandlebarsApplicationMixin(JanusBaseApp) {
  static DEFAULT_OPTIONS = {
    id: 'janus7-shell',
    classes: ['janus7-app', 'janus7-shell', 'janus-shell-app'],
    position: { width: 1320, height: 860, left: 40, top: 40 },
    window: {
      title: 'JANUS7 · Zauberakademie OS (Director Shell)',
      resizable: true,
      minimizable: true
    },
    actions: {
      selectView: 'onSelectView',
      openPanel: 'onOpenPanel',
      closePanel: 'onClosePanel',
      executeShellAction: 'onExecuteShellAction',
      togglePalette: 'onTogglePalette',
      copySeed: 'onCopySeed',
      chroniclePickDate: 'onChroniclePickDate',
      chronicleSearch: 'onChronicleSearch',
      chronicleJumpPeriod: 'onChronicleJumpPeriod',
      chronicleExportCalendar: 'onChronicleExportCalendar',
      chronicleExportMonthCalendar: 'onChronicleExportMonthCalendar',
      chronicleSelectCalendarImport: 'onChronicleSelectCalendarImport',
      chronicleClearCalendarImport: 'onChronicleClearCalendarImport',

      // Control Panel Extracted Actions
      clearSlotBuilder: 'onClearSlotBuilder',
      generateSlotJournal: 'onGenerateSlotJournal',
      kiClearContext: 'onKiClearContext',
      kiExportClipboard: 'onKiExportClipboard',
      kiExportFile: 'onKiExportFile',
      kiApplyImport: 'onKiApplyImport',
      kiPreviewImport: 'onKiPreviewImport',
      kiSearch: 'onKiSearch',
      kiGeminiTest: 'onKiGeminiTest',
      kiGenerateConsequences: 'onKiGenerateConsequences',
      kiGenerateAtmosphere: 'onKiGenerateAtmosphere',
      kiGenerateVisual: 'onKiGenerateVisual',
      kiGenerateImage: 'onKiGenerateImage',
      kiApplySceneBackground: 'onKiApplySceneBackground',
      kiApplyAsPortrait: 'onKiApplyAsPortrait',
      kiApplyAsIcon: 'onKiApplyAsIcon',
      
      startDirectorDay: 'onStartDirectorDay',
      directorRunLesson: 'onDirectorRunLesson',
      directorProcessQueue: 'onDirectorProcessQueue',
      directorGenerateQuests: 'onDirectorGenerateQuests',
      directorAcceptQuestSuggestion: 'onDirectorAcceptQuestSuggestion',
      directorEvaluateSocial: 'onDirectorEvaluateSocial',
      directorApplyMood: 'onDirectorApplyMood',
      directorRunbookNext: 'onDirectorRunbookNext',
      
      // New UI/UX Actions
      selectView: 'onSelectView',
      openPanel: 'onOpenPanel',
      closePanel: 'onClosePanel',
      togglePalette: 'onTogglePalette',
      executeShellAction: 'onExecuteShellAction',
      onSearch: "onSearch",
      clearSearch: "clearSearch",
      openSheet: "onOpenSheet",
      openUrl: "onOpenUrl"
    }
  };

  static PARTS = {
    shell: { template: moduleTemplatePath('shell/janus-shell.hbs') }
  };

  constructor(options = {}) {
    super(options);
    this._viewId = options.viewId ?? 'director';
    this._activePanelId = options.panelId ?? null;
    this._paletteOpen = false;
    this._lastActionResult = null;
    this._viewState = {};
    this._searchQuery = '';

    // Director State
    this._slotBuilder = [];
    this._kiContextItems = [];
    this._directorWorkflow = { lastAction: null, lastRunAt: null, lastResult: null, lastError: null, history: [] };
    this._directorDnDEnabled = false;

    // Hotkeys
    this._boundOnKeyDown = this._onKeyDown.bind(this);

    // Internal cache for synchronous prepareContext (Pass 1 Optimization)
    this.__renderCache = {
      viewId: null,
      panelId: null,
      viewModel: { cards: [], cardSections: [], tiles: [] },
      panelModel: { metrics: [], items: [], actions: [] },
      playerStats: [],
      viewPartial: `modules/${MODULE_ID}/templates/shell/views/director.hbs`,
      panelPartial: null,
      isBusy: false,
      busyMessage: '',
      // Long-term cache for performance-heavy data
      _persistent: {
        moduleContent: null,
        conditionRules: {},
        lastModuleScanAt: 0,
        lastConditionScanAt: 0
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Shell Core Hooks
  // ═══════════════════════════════════════════════════════════════════════════

  static showSingleton(options = {}) {
    if (this._instance?.rendered) {
      this._instance.bringToFront?.();
      this._instance._setView(options.viewId ?? this._instance._viewId);
      if (Object.prototype.hasOwnProperty.call(options, 'panelId')) this._instance._setActivePanel(options.panelId ?? null);
      return this._instance;
    }
    this._instance = new this(options);
    return this._instance;
  }

  async _setView(viewId = 'director') {
    const view = getView(viewId);
    if (!view) {
      console.warn(`[JANUS7] View "${viewId}" not found in registry.`);
      return;
    }
    
    // Prevent redundant switches
    if (this._viewId === view.id && !this.__renderCache.isBusy) return;

    this._viewId = view.id;
    this._activePanelId = null; // Clear panel when switching views
    
    // Use setBusy for visual feedback during heavy pre-render
    this.setBusy(`Lade ${view.title}...`);
    await this.render({ force: true });
    this.clearBusy();
  }

  _setActivePanel(panelId = null) {
    this._activePanelId = panelId ? (getPanel(panelId)?.id ?? null) : null;
    this.render({ force: true });
  }

  _getViewState(viewId = this._viewId) {
    const key = String(viewId ?? this._viewId ?? 'director').trim();
    return this._viewState?.[key] ?? {};
  }

  _setViewState(viewId = this._viewId, patch = {}, { replace = false } = {}) {
    const key = String(viewId ?? this._viewId ?? 'director').trim();
    const current = replace ? {} : (this._viewState?.[key] ?? {});
    this._viewState[key] = { ...current, ...(patch ?? {}) };
    this.render({ force: true });
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.enableAutoRefresh([
      'janus7StateChanged',
      'janus7DateChanged',
      'janus7RelationChanged',
      'janus7StoryHookChanged',
      'janus7Ready',
      'janusCampaignStateUpdated'
    ], 180);
    
    // Attach hotkeys
    window.addEventListener('keydown', this._boundOnKeyDown);
  }

  /** @override */
  async close(options = {}) {
    window.removeEventListener('keydown', this._boundOnKeyDown);
    return super.close(options);
  }

  _onKeyDown(event) {
    // Only handle if this app is in focus or global shortcuts are allowed
    if (event.altKey) {
      switch (event.key.toLowerCase()) {
        case 'a': this._setView('academy'); break;
        case 'd': this._setView('director'); break;
        case 's': this._setView('schedule'); break;
        case 'p': this._setView('people'); break;
        case 't': this._setView('tools'); break;
      }
    }
  }

  setBusy(message = 'Verarbeite...') {
    this.__renderCache.isBusy = true;
    this.__renderCache.busyMessage = message;
    this.render();
  }

  clearBusy() {
    this.__renderCache.isBusy = false;
    this.__renderCache.busyMessage = '';
    this.render();
  }

  /**
   * Refactored Pass 1: Modular Pre-rendering
   * Fetches data models asynchronously but defers HTML rendering to the Handlebars Partials.
   * @override
   */
  async _preRender(options) {
    try {
      await super._preRender(options);
      
      const engine = this._getEngine();
      const view = getView(this._viewId) ?? getView('director');
      const panel = this._activePanelId ? getPanel(this._activePanelId) : null;

      // 1. Fetch View Data
      const viewModel = await this.#buildViewModel(engine, view);
      
      // 2. Fetch Panel Data
      const panelModel = this.#buildPanelModel(engine, panel);

      // 3. Fetch Live Statistics via Bridge (Pass 2 Integration)
      const playerStats = this.#getLivePlayerStats(engine);

      // 4. Fetch Module Content Context (with caching: 5 min TTL)
      const now = Date.now();
      const cache = this.__renderCache._persistent;
      
      if (!cache.moduleContent || (now - cache.lastModuleScanAt > 300000)) {
        cache.moduleContent = await this.#getModuleContentInfo(engine);
        cache.lastModuleScanAt = now;
      }
      const moduleContent = cache.moduleContent;

      // 4b. Deep Status Monitor (with caching: 1 min TTL)
      const activeConditionNames = [...new Set(playerStats.flatMap(p => p.conditions.map(c => c.label)))];
      const needsConditionRefresh = activeConditionNames.some(name => !cache.conditionRules[name]) || (now - cache.lastConditionScanAt > 60000);
      
      if (needsConditionRefresh) {
        cache.conditionRules = await this.#getConditionRules(activeConditionNames);
        cache.lastConditionScanAt = now;
      }
      const conditionRules = cache.conditionRules;

      // 5. Populate Transient Cache
      this.__renderCache = {
        ...this.__renderCache,
        viewId: view.id,
        panelId: panel?.id ?? null,
        viewModel,
        panelModel,
        playerStats,
        moduleContent,
        conditionRules,
        viewPartial: `modules/${MODULE_ID}/templates/shell/views/${view.id}.hbs`,
        panelPartial: panel ? `modules/${MODULE_ID}/templates/shell/panels/default-panel.hbs` : null
      };
    } catch (err) {
      console.error(`[JANUS7] Shell _preRender failed for view "${this._viewId}":`, err);
      // Fallback to director to avoid ghosting if navigation failed
      if (this._viewId !== 'director') {
        this._viewId = 'director';
        return this._preRender(options);
      }
    }
  }
  
  /** @override */
  _onPostRender(context, options) {
    super._onPostRender?.(context, options);
    this._enableDirectorDragDrop();
    
    // Apply Regional Theme
    if (this.__renderCache?.moduleContent?.themes?.length > 0) {
      const activeTheme = this.__renderCache.moduleContent.themes[0];
      if (activeTheme?.color) {
        this.element.style.setProperty('--j7-shell-accent', activeTheme.color);
        this.element.style.setProperty('--j7-shell-header-bg', `${activeTheme.color}22`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Context Building
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fetches raw player statistics via the DSA5 Bridge.
   * Optimized Pass 2: Limits lookup to active students and player characters
   * to avoid O(N) scaling issues in large worlds.
   * @private
   */
  #getLivePlayerStats(engine) {
    const bridge = engine?.bridge?.dsa5;
    if (!bridge?.attributes) return [];
    
    return game.actors
      .filter(a => {
        if (a.type !== 'character') return false;
        const flags = a.flags?.[MODULE_ID] ?? {};
        return flags.role === 'student' || flags.managed || (a.hasPlayerOwner && !a.isToken);
      })
      .slice(0, 20)
      .map(a => {
        const stats = bridge.attributes.getFullSnapshot(a);
        const conditions = bridge.conditions?.getAcademyConditionSnapshot(a) ?? {};
        return {
          ...stats,
          conditions: Object.entries(conditions).filter(([, c]) => c.active).map(([key, c]) => ({
            id: key,
            dsaId: c.dsaConditionId,
            label: game.i18n.localize(`DSA5.CON.${c.dsaConditionId}`) || key,
            value: c.value
          }))
        };
      });
  }

  /**
   * Fetches summary of installed DSA5 module content.
   * (Options 1, 5, 7, 12)
   * @private
   */
  async #getModuleContentInfo(engine) {
    const scanner = engine?.bridge?.dsa5?.scanner;
    if (!scanner) return null;

    return {
      activeModulesCount: scanner.modules.size,
      activeProvidersCount: scanner.providers.size,
      regions: engine.bridge.dsa5.getRegionalContext() ?? [],
      socialLinks: await engine.bridge.dsa5.getSocialLinks() ?? [],
      creatures: await engine.bridge.dsa5.searchModuleBestiary() ?? [],
      companions: await engine.bridge.dsa5.getCompanionData() ?? [],
      calendarEvents: await engine.bridge.dsa5.getModuleCalendarEvents() ?? [],
      assets: await engine.bridge.dsa5.searchModuleAssets() ?? [],
      themes: engine.bridge.dsa5.getRegionalThemes() ?? [],
      hasSocialPacks: scanner.getProvidersByType(scanner.constructor.DSA5SocialProvider || Object.getPrototypeOf(scanner).constructor.DSA5SocialProvider).length > 0
    };
  }

  async #getConditionRules(conditions = []) {
    const engine = this._getEngine();
    const dsa5Bridge = engine?.bridge?.dsa5;
    if (!dsa5Bridge || conditions.length === 0) return {};

    const rules = {};
    for (const cond of conditions) {
      if (rules[cond]) continue;
      const hits = await dsa5Bridge.searchModuleRules(cond);
      if (hits.length > 0) {
        rules[cond] = {
          name: hits[0].name,
          uuid: hits[0].uuid,
          packLabel: hits[0].packLabel
        };
      }
    }
    return rules;
  }

  _getStateTime() {
    const state = this._getEngine()?.core?.state;
    return state?.get?.('time') ?? {};
  }

  _getQuestActorCandidates() {
    const candidates = [
      {
        actorId: 'party',
        actorUuid: null,
        actorLabel: 'Gruppe / Party',
        type: 'party',
        isParty: true
      }
    ];

    for (const actor of game?.actors ?? []) {
      const actorId = actor?.id ?? actor?.uuid ?? null;
      if (!actorId) continue;
      candidates.push({
        actorId,
        actorUuid: actor?.uuid ?? null,
        actorLabel: actor?.name ?? actorId,
        type: actor?.type ?? null,
        isParty: false
      });
    }

    return candidates;
  }

  _buildDirectorRuntimeContext() {
    const engine = this._getEngine();
    const director = engine?.core?.director ?? engine?.director ?? null;
    const runtime = director?.kernel?.getRuntimeSummary?.()
      ?? director?.getRuntimeSummary?.()
      ?? {};
    const prepared = prepareDirectorRuntimeSummary({ engine, logger: engine?.core?.logger ?? console });

    return {
      directorSummary: prepared?.directorSummary ?? { available: !!director },
      directorRuntime: {
        ...prepared?.directorRuntime,
        ...runtime,
        lessonCount: Number(runtime?.lessonCount ?? 0),
        queuedEventCount: Number(runtime?.queuedEventCount ?? 0),
        activeQuestCount: Number(runtime?.activeQuestCount ?? 0),
        lessons: Array.isArray(runtime?.lessons) ? runtime.lessons : [],
        queuedEvents: Array.isArray(runtime?.queuedEvents) ? runtime.queuedEvents : [],
        activeQuests: Array.isArray(runtime?.activeQuests) ? runtime.activeQuests : []
      }
    };
  }

  _buildDirectorWorkflowView(directorRuntime = null) {
    return buildDirectorWorkflowView({
      directorWorkflow: this._directorWorkflow ?? {},
      directorRuntime: directorRuntime ?? this._buildDirectorRuntimeContext().directorRuntime,
      engine: this._getEngine(),
      questCandidates: this._getQuestActorCandidates()
    });
  }

  _buildDirectorRunbookView(directorRuntime = null, directorWorkflow = null) {
    const runtime = directorRuntime ?? this._buildDirectorRuntimeContext().directorRuntime;
    const workflow = directorWorkflow ?? this._buildDirectorWorkflowView(runtime);
    return buildDirectorRunbookView(runtime, workflow);
  }

  _buildHeaderContext(_engine) {
    const time = this._getStateTime();
    const activeView = getView(this._viewId) ?? getView('director');
    return {
      moduleVersion: game?.modules?.get?.('Janus7')?.version ?? 'unknown',
      worldTitle: game?.world?.title ?? game?.world?.id ?? 'World',
      dayName: time?.dayName ?? time?.day ?? '—',
      phaseName: time?.phase ?? time?.slotName ?? '—',
      activeViewTitle: activeView?.title ?? 'Director',
      lastActionResult: this._lastActionResult ? escHtml(this._lastActionResult) : null,
      quickPanels: getQuickPanels().map((panel) => ({
        ...panel,
        datasetActionIndex: 0
      }))
    };
  }

  async #buildViewModel(engine, view) {
    const model = await view?.build?.(engine, this) ?? { cards: [], cardSections: [], tiles: [] };
    return {
      ...model,
      cards: mapViewCards(model.cards ?? []),
      cardSections: (model.cardSections ?? []).map((section) => ({
        ...section,
        cards: mapViewCards(section.cards ?? [])
      })),
      tiles: model.tiles ?? []
    };
  }

  #buildPanelModel(engine, panel) {
    if (!panel) return { metrics: [], items: [], actions: [] };
    const detail = panel.build?.(engine) ?? {};
    return {
      metrics: detail.metrics ?? [],
      items: detail.items ?? [],
      actions: mapActions(panel.actions)
    };
  }

  /**
   * Refactored Pass 1: Synchronous Context Mapping
   * Delegates the view/panel rendering to Handlebars dynamic partials.
   * @override
   */
  _prepareContext(options) {
    const engine = this._getEngine();
    
    // Core summary blocks
    const { directorSummary, directorRuntime } = this._buildDirectorRuntimeContext();
    const directorWorkflow = this._buildDirectorWorkflowView(directorRuntime);
    const directorRunbook = this._buildDirectorRunbookView(directorRuntime, directorWorkflow);

    const activeView = getView(this._viewId) ?? getView('director');
    const breadcrumbs = [
      { label: 'JANUS7', viewId: 'director' },
      { label: activeView.title, viewId: this._viewId, isActive: true }
    ];

    return {
      isReady: !!engine,
      header: this._buildHeaderContext(engine),
      viewNavSections: buildViewNavSections(this._viewId, this),
      appNavSections: buildAppLauncherSections(this._viewId, this),
      activeViewId: this._viewId,
      searchQuery: this._searchQuery,
      breadcrumbs,
      
      // Real-time metrics
      directorSummary,
      directorRuntime,
      directorWorkflow,
      directorRunbook,
      questActorCandidates: this._getQuestActorCandidates(),
      
      // View & Panel State (Delegated to Partials)
      viewPartial: this.__renderCache.viewPartial,
      panelPartial: this.__renderCache.panelPartial,
      isBusy: this.__renderCache.isBusy,
      busyMessage: this.__renderCache.busyMessage,
      view: this.__renderCache.viewModel,
      panel: this.__renderCache.panelModel,
      playerStats: this.__renderCache.playerStats,
      moduleContent: this.__renderCache.moduleContent,
      
      panelOpen: !!this.__renderCache.panelPartial,
      panelTitle: getPanel(this._activePanelId)?.title ?? null,
      shellPaletteHint: 'Power Tools',
      themeClass: JanusConfig.get('uiTheme') || 'theme-standard'
    };
  }

  onSearch(event, target) {
    this._searchQuery = target.value;
    this.render();
  }

  clearSearch(event, target) {
    this._searchQuery = '';
    this.render();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Shell Actions
  // ═══════════════════════════════════════════════════════════════════════════

  async onSelectView(event, target) {
    event?.preventDefault?.();
    const viewId = target?.dataset?.viewId ?? target?.closest('[data-view-id]')?.dataset?.viewId ?? 'director';
    
    // Visual immediate feedback
    const nav = target?.closest?.('.j7-shell__sidebar, .janus-shell__nav') ?? null;
    if (nav) {
      for (const button of nav.querySelectorAll('.j7-shell__nav')) {
        button.classList.toggle('is-active', button.dataset.viewId === viewId);
      }
    }

    await this._setView(viewId);
  }

  async onOpenPanel(event, target) {
    event?.preventDefault?.();
    const panelId = target?.dataset?.panelId ?? null;
    this._setActivePanel(panelId);
  }

  async onClosePanel(event, _target) {
    event?.preventDefault?.();
    this._setActivePanel(null);
  }

  async onTogglePalette(event, _target) {
    event?.preventDefault?.();
    try {
      game?.janus7?.ui?.open?.('commandCenter');
    } catch (err) {
      ui.notifications?.warn?.(`Command Center konnte nicht geöffnet werden: ${err?.message ?? err}`);
    }
  }

  async onCopySeed(event, target) {
    event?.preventDefault?.();
    const box = target?.closest?.('.j7-seed-card');
    const textarea = box?.querySelector?.('textarea');
    const value = textarea?.value ?? textarea?.textContent ?? '';
    if (!value) return;
    try {
      await navigator?.clipboard?.writeText?.(value);
      ui?.notifications?.info?.('Textbaustein kopiert.');
    } catch (_err) {
      ui?.notifications?.warn?.('Fehler beim Kopieren.');
    }
  }

  async onExecuteShellAction(event, target) {
    event?.preventDefault?.();
    const panelId = target?.dataset?.panelId ?? null;
    const actionIndex = Number(target?.dataset?.actionIndex ?? -1);
    const cardIndex = Number(target?.dataset?.cardIndex ?? -1);
    const sectionId = target?.dataset?.sectionId ?? null;
    let descriptor = null;

    if (panelId) {
      const panel = getPanel(panelId);
      descriptor = panel?.actions?.[actionIndex] ?? null;
    } else if (Number.isInteger(cardIndex) && cardIndex >= 0 && Number.isInteger(actionIndex) && actionIndex >= 0) {
      const model = this.__renderCache?.viewModel ?? { cards: [], cardSections: [] };
      if (sectionId) {
        const section = Array.isArray(model?.cardSections) ? model.cardSections.find((entry) => entry?.id === sectionId) : null;
        descriptor = section?.cards?.[cardIndex]?.actions?.[actionIndex] ?? null;
      } else {
        descriptor = model?.cards?.[cardIndex]?.actions?.[actionIndex] ?? null;
      }
    } else if (target?.dataset?.viewId) {
      descriptor = { kind: 'setView', viewId: target.dataset.viewId };
    } else if (target?.dataset?.appKey) {
      descriptor = { kind: 'openApp', appKey: target.dataset.appKey };
    } else if (target?.dataset?.viewStateKey) {
      descriptor = {
        kind: 'setViewState',
        viewId: target?.dataset?.targetViewId ?? this?._viewId ?? 'director',
        key: target.dataset.viewStateKey,
        value: target.dataset.viewStateValue ?? '',
        mode: target.dataset.viewStateMode ?? 'set',
      };
    } else if (target?.dataset?.command) {
      descriptor = { kind: 'command', command: target.dataset.command, dataset: target.dataset };
    }

    if (!descriptor) return;
    const result = await runShellAction(this, descriptor);
    if (result?.summary) this._lastActionResult = result.summary;
    this.refresh?.();
  }

  async onChroniclePickDate(event, _target) {
    event?.preventDefault?.();
    const D2 = foundry?.applications?.api?.DialogV2;
    if (!D2?.prompt) {
      ui.notifications?.warn?.('DialogV2 nicht verfuegbar.');
      return;
    }

    const current = this?._getViewState?.('chronicleBrowser') ?? {};
    const currentDate = String(current?.focusDate ?? '').trim();
    const content = `
      <div class="janus7-card j7-dialog-card-reset">
        <p class="j7-dialog-heading"><strong>Bote-Chronik: BF-Datum waehlen</strong></p>
        <div class="j7-dialog-form-row">
          <label for="janus7-chronicle-date" class="j7-dialog-label-fixed">BF-Datum</label>
          <input type="text" id="janus7-chronicle-date" class="j7-dialog-input-grow" placeholder="1047-05-19" value="${escHtml(currentDate)}" />
        </div>
      </div>
    `;

    const result = await D2.prompt({
      window: { title: 'Bote-Chronik Datum' },
      content,
      ok: { label: 'Datum setzen', icon: 'fas fa-calendar-check' },
      rejectClose: false,
      modal: true,
    }).catch(() => null);
    if (result === null) return;

    const value = document.getElementById('janus7-chronicle-date')?.value?.trim?.() ?? '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      ui.notifications?.warn?.('Format erwartet: JJJJ-MM-TT');
      return;
    }

    this?._setViewState?.('chronicleBrowser', { focusDate: value, offset: 0 });
  }

  async onChronicleSearch(event, _target) {
    event?.preventDefault?.();
    const D2 = foundry?.applications?.api?.DialogV2;
    if (!D2?.prompt) {
      ui.notifications?.warn?.('DialogV2 nicht verfuegbar.');
      return;
    }

    const current = this?._getViewState?.('chronicleBrowser') ?? {};
    const currentSearch = String(current?.search ?? '').trim();
    const content = `
      <div class="janus7-card j7-dialog-card-reset">
        <p class="j7-dialog-heading"><strong>Bote-Chronik: Suche</strong></p>
        <div class="j7-dialog-form-row">
          <label for="janus7-chronicle-search" class="j7-dialog-label-fixed">Suchbegriff</label>
          <input type="text" id="janus7-chronicle-search" class="j7-dialog-input-grow" placeholder="z.B. Fasar, Drache, Wiederaufbau" value="${escHtml(currentSearch)}" />
        </div>
      </div>
    `;

    const result = await D2.prompt({
      window: { title: 'Bote-Chronik Suche' },
      content,
      ok: { label: 'Suche setzen', icon: 'fas fa-search' },
      rejectClose: false,
      modal: true,
    }).catch(() => null);
    if (result === null) return;

    const value = document.getElementById('janus7-chronicle-search')?.value?.trim?.() ?? '';
    this?._setViewState?.('chronicleBrowser', { search: value });
  }

  async onChronicleJumpPeriod(event, _target) {
    event?.preventDefault?.();
    const D2 = foundry?.applications?.api?.DialogV2;
    if (!D2?.prompt) {
      ui.notifications?.warn?.('DialogV2 nicht verfuegbar.');
      return;
    }

    const current = this?._getViewState?.('chronicleBrowser') ?? {};
    const currentDate = String(current?.focusDate ?? '').trim();
    const year = /^\d{4}-\d{2}-\d{2}$/.test(currentDate) ? currentDate.slice(0, 4) : '1047';
    const month = /^\d{4}-\d{2}-\d{2}$/.test(currentDate) ? currentDate.slice(5, 7) : '01';
    const content = `
      <div class="janus7-card j7-dialog-card-reset">
        <p class="j7-dialog-heading"><strong>Bote-Chronik: Monat/Jahr anspringen</strong></p>
        <div class="j7-dialog-form-row">
          <label for="janus7-chronicle-year" class="j7-dialog-label-fixed">Jahr</label>
          <input type="text" id="janus7-chronicle-year" class="j7-dialog-input-grow" placeholder="1047" value="${escHtml(year)}" />
        </div>
        <div class="j7-dialog-form-row">
          <label for="janus7-chronicle-month" class="j7-dialog-label-fixed">Monat</label>
          <input type="text" id="janus7-chronicle-month" class="j7-dialog-input-grow" placeholder="05" value="${escHtml(month)}" />
        </div>
      </div>
    `;

    const result = await D2.prompt({
      window: { title: 'Bote-Chronik Monat/Jahr' },
      content,
      ok: { label: 'Anspringen', icon: 'fas fa-arrow-right' },
      rejectClose: false,
      modal: true,
    }).catch(() => null);
    if (result === null) return;

    const nextYear = document.getElementById('janus7-chronicle-year')?.value?.trim?.() ?? '';
    const nextMonth = document.getElementById('janus7-chronicle-month')?.value?.trim?.() ?? '';
    if (!/^\d{4}$/.test(nextYear) || !/^\d{1,2}$/.test(nextMonth)) {
      ui.notifications?.warn?.('Erwartet: Jahr JJJJ und Monat 1-12.');
      return;
    }

    const normalizedMonth = String(Math.min(12, Math.max(1, Number(nextMonth)))).padStart(2, '0');
    this?._setViewState?.('chronicleBrowser', { focusDate: `${nextYear}-${normalizedMonth}-01`, offset: 0 });
  }

  async onChronicleExportCalendar(event, _target) {
    event?.preventDefault?.();
    if (!game?.user?.isGM) {
      ui.notifications?.warn?.('Nur der GM kann Kalender-Eintraege exportieren.');
      return;
    }
    if (game?.system?.id !== 'dsa5') {
      ui.notifications?.warn?.('Der Export ist nur im DSA5-System verfuegbar.');
      return;
    }

    const focusDate = String(this?.__renderCache?.viewModel?.focusDate ?? '').trim();
    const focusEntries = Array.isArray(this?.__renderCache?.viewModel?.focusDay?.entries)
      ? this.__renderCache.viewModel.focusDay.entries
      : [];
    if (!focusDate || !focusEntries.length) {
      ui.notifications?.warn?.('Am Fokusdatum liegen keine exportierbaren Chronik-Eintraege vor.');
      return;
    }

    const dsa5Date = toChronicleDsa5Date(focusDate);
    if (!dsa5Date) {
      ui.notifications?.warn?.('Das Fokusdatum ist nicht als BF-Datum interpretierbar.');
      return;
    }

    const journals = listCalendarJournals();
    if (!journals.length) {
      ui.notifications?.warn?.('Kein Journal mit dsacalendar-Page gefunden.');
      return;
    }

    const D2 = foundry?.applications?.api?.DialogV2;
    if (!D2?.prompt) {
      ui.notifications?.warn?.('DialogV2 nicht verfuegbar.');
      return;
    }

    const current = this?._getViewState?.('chronicleBrowser') ?? {};
    const preferredJournalId = String(current?.calendarJournalId ?? '').trim();
    const options = journals
      .map((journal) => `<option value="${escHtml(journal.id)}" ${journal.id === preferredJournalId ? 'selected' : ''}>${escHtml(journal.name)}</option>`)
      .join('');
    const content = `
      <div class="janus7-card j7-dialog-card-reset">
        <p class="j7-dialog-heading"><strong>Bote-Chronik in DSA5-Kalender exportieren</strong></p>
        <div class="j7-dialog-form-row">
          <label for="janus7-chronicle-calendar-journal" class="j7-dialog-label-fixed">Kalenderjournal</label>
          <select id="janus7-chronicle-calendar-journal" class="j7-dialog-input-grow">${options}</select>
        </div>
        <p class="j7-dialog-subtext">${escHtml(focusDate)} · ${focusEntries.length} Eintraege am Fokus-Tag</p>
      </div>
    `;

    const result = await D2.prompt({
      window: { title: 'DSA5 Kalender-Export' },
      content,
      ok: { label: 'Exportieren', icon: 'fas fa-calendar-plus' },
      rejectClose: false,
      modal: true,
    }).catch(() => null);
    if (result === null) return;

    const journalId = document.getElementById('janus7-chronicle-calendar-journal')?.value?.trim?.() ?? '';
    if (!journalId) {
      ui.notifications?.warn?.('Kein Kalenderjournal ausgewaehlt.');
      return;
    }

    const calendarSync = new DSA5CalendarSync({ logger: console });
    const page = calendarSync.getCalendarPage(journalId);
    if (!page) {
      ui.notifications?.warn?.('Im ausgewaehlten Journal wurde keine dsacalendar-Page gefunden.');
      return;
    }

    let created = 0;
    let skipped = 0;
    for (const entry of focusEntries) {
      const title = String(entry?.label ?? '').trim();
      const location = String(entry?.location ?? 'Akademie').trim() || 'Akademie';
      if (!title) {
        skipped++;
        continue;
      }
      if (hasCalendarDuplicate(page, { title, dsa5Date, location })) {
        skipped++;
        continue;
      }
      const ok = await calendarSync.addCalendarEventForDate({
        journalId,
        title,
        content: buildChronicleCalendarEntryContent(entry, focusDate),
        dsa5Date,
        location,
        category: 2,
      });
      if (ok) created++;
      else skipped++;
    }

    this?._setViewState?.('chronicleBrowser', { calendarJournalId: journalId });
    this._lastActionResult = `Kalenderexport ${focusDate}: ${created} erstellt, ${skipped} uebersprungen.`;
    if (created > 0) ui.notifications?.info?.(`${created} Kalendereintraege exportiert, ${skipped} uebersprungen.`);
    else ui.notifications?.warn?.(`Keine neuen Kalendereintraege exportiert. ${skipped} uebersprungen.`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Director Native Drag & Drop Logic
  // ═══════════════════════════════════════════════════════════════════════════

  async onChronicleExportMonthCalendar(event, _target) {
    event?.preventDefault?.();
    if (!game?.user?.isGM) {
      ui.notifications?.warn?.('Nur der GM kann Kalender-Eintraege exportieren.');
      return;
    }
    if (game?.system?.id !== 'dsa5') {
      ui.notifications?.warn?.('Der Export ist nur im DSA5-System verfuegbar.');
      return;
    }

    const monthlyAnchors = Array.isArray(this?.__renderCache?.viewModel?.monthlyAnchors)
      ? this.__renderCache.viewModel.monthlyAnchors
      : [];
    const exportDays = monthlyAnchors
      .map((day) => ({
        date: String(day?.date ?? '').trim(),
        entries: Array.isArray(day?.anchorEntries) ? day.anchorEntries : [],
      }))
      .filter((day) => day.date && day.entries.length);
    if (!exportDays.length) {
      ui.notifications?.warn?.('Im aktuellen BF-Monat liegen keine exportierbaren Monatsanker vor.');
      return;
    }

    const current = this?._getViewState?.('chronicleBrowser') ?? {};
    const focusDate = String(this?.__renderCache?.viewModel?.focusDate ?? '').trim();
    const monthLabel = /^\d{4}-\d{2}-\d{2}$/.test(focusDate) ? focusDate.slice(0, 7) : 'aktueller Monat';
    const totalEntries = exportDays.reduce((sum, day) => sum + day.entries.length, 0);
    const journalId = await promptChronicleCalendarJournal({
      preferredJournalId: String(current?.calendarJournalId ?? '').trim(),
      title: 'DSA5 Monatsanker-Export',
      summary: `${monthLabel} · ${exportDays.length} Tage · ${totalEntries} Anker`,
    });
    if (!journalId) return;

    const result = await exportChronicleEntriesToCalendar({ journalId, entriesByDate: exportDays });
    if (!result) return;

    this?._setViewState?.('chronicleBrowser', { calendarJournalId: journalId });
    this._lastActionResult = `Monatsanker-Export ${monthLabel}: ${result.created} erstellt, ${result.skipped} uebersprungen.`;
    if (result.created > 0) ui.notifications?.info?.(`${result.created} Monatsanker exportiert, ${result.skipped} uebersprungen.`);
    else ui.notifications?.warn?.(`Keine neuen Monatsanker exportiert. ${result.skipped} uebersprungen.`);
  }

  async onChronicleSelectCalendarImport(event, _target) {
    event?.preventDefault?.();
    if (game?.system?.id !== 'dsa5') {
      ui.notifications?.warn?.('Der Kalender-Import ist nur im DSA5-System verfuegbar.');
      return;
    }

    const current = this?._getViewState?.('chronicleBrowser') ?? {};
    const journalId = await promptChronicleCalendarJournal({
      preferredJournalId: String(current?.calendarJournalId ?? '').trim(),
      title: 'DSA5 Kalender als Chronikquelle',
      summary: 'Liest Eintraege aus einer dsacalendar-Page und blendet sie in den Chronicle Browser ein.',
    });
    if (!journalId) return;

    this?._setViewState?.('chronicleBrowser', { calendarJournalId: journalId });
    this._lastActionResult = 'DSA5-Kalenderquelle fuer Chronicle Browser gesetzt.';
    ui.notifications?.info?.('DSA5-Kalenderquelle gesetzt.');
  }

  async onChronicleClearCalendarImport(event, _target) {
    event?.preventDefault?.();
    this?._setViewState?.('chronicleBrowser', { calendarJournalId: '' });
    this._lastActionResult = 'DSA5-Kalenderquelle fuer Chronicle Browser entfernt.';
    ui.notifications?.info?.('DSA5-Kalenderquelle entfernt.');
  }

  _enableDirectorDragDrop() {
    const el = this.domElement;
    if (!el || this._directorDnDEnabled) return;
    this._directorDnDEnabled = true;
    el.addEventListener('dragover', (ev) => ev.preventDefault());
    el.addEventListener('drop',     (ev) => this._onDirectorDrop(ev));
  }

  async _onDirectorDrop(ev) {
    ev.preventDefault();
    if (!game?.user?.isGM) { ui.notifications?.warn?.('Nur der GM kann Links setzen.'); return; }

    let data;
    try   { data = TextEditor.getDragEventData(ev); }
    catch { ui.notifications?.warn?.('Drop-Daten konnten nicht gelesen werden.'); return; }

    const uuid = data?.uuid;
    if (!uuid) { ui.notifications?.warn?.('Keine UUID im Drop gefunden.'); return; }

    const doc = await fromUuid(uuid).catch(() => null);
    if (!doc) { ui.notifications?.warn?.('UUID konnte nicht aufgelöst werden.'); return; }

    // Spezifische Drop-Zones definieren wir per data-dropzone="people" etc.
    const dz = ev?.target?.closest?.('.j7-dropzone');
    const zone = dz?.dataset?.dropzone;

    if (zone === 'slot-builder') { this._handleDropSlotBuilder(doc); return; }
    if (zone === 'people')       { await this._handleDropPeople(dz, doc); return; }
    if (zone === 'location')     { await this._handleDropLocation(dz, doc); return; }
    if (zone === 'ki-context')   { this._handleDropKiContext(doc); return; }

    // Backup
    await this._handleDropGeneric(doc, uuid);
  }

  _handleDropSlotBuilder(doc) {
    const list  = (this._slotBuilder ??= []);
    const uuid  = doc.uuid;
    if (!uuid) return;
    if (!list.some((x) => x.uuid === uuid)) {
      list.push({ uuid, kind: doc.documentName ?? 'Document', label: doc.name ?? uuid });
    }
    this.refresh();
  }

  _handleDropKiContext(doc) {
    const list = (this._kiContextItems ??= []);
    const uuid = doc.uuid;
    if (!uuid) return;
    if (list.some((x) => x.uuid === uuid)) {
      ui.notifications?.info?.(`${doc.name} ist bereits im KI-Kontext.`);
      return;
    }
    const data = this._extractDocSnapshot(doc);
    list.push({ uuid, kind: doc.documentName ?? 'Document', label: doc.name ?? uuid, data });
    ui.notifications?.info?.(`KI-Kontext: ${doc.name} hinzugefügt.`);
    this.refresh();
  }

  _extractDocSnapshot(doc) {
    try {
      const dn = doc.documentName;
      if (dn === 'Actor')       return { name: doc.name, type: doc.type, system: doc.system ?? {} };
      if (dn === 'Item')        return { name: doc.name, type: doc.type, system: doc.system ?? {} };
      if (dn === 'Scene')       return { name: doc.name, background: doc.background ?? null };
      if (dn === 'JournalEntry') {
        const firstPage = doc.pages?.contents?.[0];
        return { name: doc.name, content: firstPage?.text?.content?.slice(0, 500) ?? '' };
      }
      return { name: doc.name };
    } catch { return { name: doc.name ?? '?' }; }
  }

  async _handleDropPeople(dz, doc) {
    if (doc.documentName !== 'Actor') { ui.notifications?.warn?.('Hier sind nur Actors erlaubt.'); return; }
    const role = dz?.dataset?.role;
    if (!['teachers', 'students', 'npcs'].includes(role)) return;
    const e = this._getEngine();
    const director = e?.core?.director ?? e?.director;
    const uuid = doc.uuid;
    if (!director?.addActorToRoster) { ui.notifications?.error?.('Director-API für Roster-Mutation nicht verfügbar.'); return; }
    const result = await director.addActorToRoster(role, uuid, { save: true });
    ui.notifications?.info?.(
      result?.added === false
        ? `Zuordnung bereits vorhanden: ${role} â† ${doc.name}`
        : `Zuordnung gespeichert: ${role} â† ${doc.name}`
    );
    this.refresh();
  }

  async _handleDropLocation(dz, doc) {
    const locId = dz?.dataset?.locationId;
    if (!locId) { ui.notifications?.warn?.('Kein aktiver Ort (locationId fehlt).'); return; }
    const kind  = doc.documentName;
    if (!['Scene', 'Playlist', 'JournalEntry'].includes(kind)) {
      ui.notifications?.warn?.('Ort akzeptiert: Scene, Playlist, JournalEntry.'); return;
    }
    const e    = this._getEngine();
    const sync = e?.core?.sync ?? e?.sync;
    if (!sync?.linkEntity) { ui.notifications?.warn?.('Sync nicht verfügbar.'); return; }
    if (kind === 'Scene')        await sync.linkEntity(locId, doc.uuid, { type: 'scenes',    saveState: true });
    if (kind === 'Playlist')     await sync.linkEntity(locId, doc.uuid, { type: 'playlists', saveState: true });
    if (kind === 'JournalEntry') await sync.linkEntity(locId, doc.uuid, { type: 'journals',  saveState: true });
    ui.notifications?.info?.(`Ort verknüpft: ${locId} â† ${kind} (${doc.name})`);
    this.refresh();
  }

  async _handleDropGeneric(doc, uuid) {
    const docName = doc.documentName;
    const suggested = (docName === 'Actor')       ? 'npcs'
      : (docName === 'Scene')       ? 'scenes'
      : (docName === 'Playlist')    ? 'playlists'
      : (docName === 'JournalEntry')? 'journals'
      : (docName === 'Item')        ? 'items'
      : null;

    const buckets = [
      { value: 'npcs',      label: 'NPCs (Actor)' },
      { value: 'pcs',       label: 'PCs (Actor)' },
      { value: 'locations', label: 'Orte (Scene/Journal)' },
      { value: 'scenes',    label: 'Szenen (Scene)' },
      { value: 'playlists', label: 'Playlists (Playlist)' },
      { value: 'journals',  label: 'Journals (JournalEntry)' },
      { value: 'items',     label: 'Items (Item)' },
    ];

    const optionsHtml = buckets.map((b) => `<option value="${b.value}" ${b.value === suggested ? 'selected' : ''}>${b.label}</option>`).join('');

    const content = `<div class="janus7-card j7-dialog-card-reset">
      <p class="j7-dialog-heading"><strong>JANUS7 Link setzen</strong></p>
      <p class="j7-dialog-subtext">Drop: <code>${JanusUI.escape(docName)}</code> â†’ <code>${JanusUI.escape(uuid)}</code></p>
      <div class="j7-dialog-form-row">
        <label class="j7-dialog-label-fixed" for="janus7-dnd-janusKey">JANUS-Key</label>
        <input type="text" id="janus7-dnd-janusKey" name="janusKey" class="j7-dialog-input-grow" placeholder="NPC_ELRIKA_REBENLIEB" />
      </div>
      <div class="j7-dialog-form-row j7-dialog-form-row-spaced">
        <label class="j7-dialog-label-fixed" for="janus7-dnd-bucket">Bucket</label>
        <select id="janus7-dnd-bucket" name="bucket" class="j7-dialog-input-grow">${optionsHtml}</select>
      </div>
    </div>`;

    const D2 = foundry?.applications?.api?.DialogV2;
    if (!D2?.prompt) { ui.notifications?.warn?.('DialogV2 nicht verfügbar. Nutze das Sync-Panel.'); return; }

    const res = await D2.prompt({ window: { title: 'JANUS7 — Drag&Drop Link' }, content, ok: { label: 'Link setzen' }, rejectClose: false, modal: true }).catch(() => null);
    if (res === null) return;

    const keyRaw = document.getElementById('janus7-dnd-janusKey')?.value?.trim?.() ?? '';
    const bucket = document.getElementById('janus7-dnd-bucket')?.value ?? suggested ?? 'npcs';
    if (!keyRaw) { ui.notifications?.warn?.('Kein JANUS-Key angegeben.'); return; }

    const engine = this._getEngine();
    const sync   = engine?.core?.sync ?? engine?.sync;
    if (!sync?.linkEntity) { ui.notifications?.error?.('Sync-Engine nicht verfügbar.'); return; }

    const key = sync.normalizeJanusId ? sync.normalizeJanusId(keyRaw) : keyRaw;
    await sync.linkEntity(key, uuid, { type: bucket, saveState: true });
    ui.notifications?.info?.(`Linked ${key} â†’ ${uuid}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Director Shell Internal Actions
  // ═══════════════════════════════════════════════════════════════════════════

  async onClearSlotBuilder(_event, _target) {
    this._slotBuilder = [];
    this.refresh();
  }

  async onGenerateSlotJournal(_event, _target) {
    const e = this._getEngine();
    if (!e) return false;
    const st = e?.core?.state?.get?.() ?? {};
    const time = st.time ?? {};
    const y = time.year ?? 'Y', tr = time.trimester ?? 1, w = time.week ?? 1, d = time.dayIndex ?? time.day ?? 'D', s = time.slotIndex ?? 'S';
    const slotKey = `SLOT_${y}_T${tr}_W${w}_D${d}_S${s}`;
    const items = this._slotBuilder ?? [];
    if (!items.length) { ui.notifications?.warn?.('Keine Bausteine im Slot-Builder.'); return false; }

    const lines = items.map((x) => `â€¢ <strong>${JanusUI.escape(x.kind)}</strong>: ${JanusUI.escape(x.label)}<br><code>${JanusUI.escape(x.uuid)}</code>`);
    const content = `<h2>Stunde (${JanusUI.escape(slotKey)})</h2><p><em>Generiert aus Slot-Builder.</em></p><hr><div>${lines.join('<hr>')}</div>`;

    const je = await JournalEntry.create({ name: `Stunde — ${slotKey}`, pages: [{ name: 'Inhalt', type: 'text', text: { content, format: 1 } }] });
    if (!je?.uuid) { ui.notifications?.error?.('Journal konnte nicht erstellt werden.'); return false; }

    const sync = e?.core?.sync ?? e?.sync;
    if (sync?.linkEntity) await sync.linkEntity(slotKey, je.uuid, { type: 'journals', saveState: false });

    const director = e?.core?.director ?? e?.director;
    if (!director?.registerSlotJournal) {
      ui.notifications?.error?.('Director-API für Slot-Journal nicht verfügbar.'); return false;
    }
    await director.registerSlotJournal(slotKey, {
      journalUuid: je.uuid,
      items: items.slice(),
      createdAt: new Date().toISOString(),
    }, { save: true });

    ui.notifications?.info?.(`Journal erstellt & verknüpft: ${slotKey}`);
    this._slotBuilder = [];
    this.refresh();
  }

  async onKiSearch(event) {
    event?.preventDefault?.();
    const D2 = foundry?.applications?.api?.DialogV2;
    if (!D2?.prompt) { ui.notifications?.error('DialogV2 nicht verf\u00fcgbar'); return; }

    const content = `
      <div class="janus7-card j7-dialog-card-reset">
        <p class="j7-dialog-heading"><strong><i class="fas fa-brain"></i> KI Knowledge Bridge</strong></p>
        <p class="j7-dialog-subtext">Semantische unscharfe Suche nach Konzepten, Personen oder Zaubern.</p>
        <div class="j7-dialog-form-row">
          <label for="janus7-ki-domain" class="j7-dialog-label-fixed">Such-Domain</label>
          <select id="janus7-ki-domain" class="j7-dialog-input-grow">
            <optgroup label="Hauptkategorien">
              <option value="all">Alles durchsuchen</option>
              <option value="creature.npc">NSCs & Charaktere</option>
              <option value="magic.spell">Zauber & Rituale</option>
              <option value="item.weapon">Waffen & Rüstung</option>
            </optgroup>
            <optgroup label="Spezialgebiete">
              <option value="item.herb">Pflanzen & Alchimie</option>
              <option value="trait.special_ability">Sonderfertigkeiten</option>
              <option value="creature.beast">Bestiarium (Tiere/Monster)</option>
              <option value="journal.lore">Hintergrundwissen (Lore)</option>
            </optgroup>
          </select>
        </div>
        <div class="j7-dialog-form-row">
          <label for="janus7-ki-query" class="j7-dialog-label-fixed">Suchbegriff</label>
          <input type="text" id="janus7-ki-query" class="j7-dialog-input-grow" placeholder="z.B. strenger Zwerg oder Heilzauber" />
        </div>
      </div>
    `;

    // Use a more robust pattern for multi-input prompts in ApplicationV2
    let domain = 'actors';
    let query = '';

    const res = await D2.prompt({
      window: { title: 'Semantische Suche' },
      content,
      ok: { 
        label: 'Suchen', 
        icon: 'fas fa-search',
        callback: (event, target) => {
          const dlg = target.closest('foundry-app, .window-app, .dialog-v2');
          domain = dlg?.querySelector('#janus7-ki-domain')?.value ?? 'all';
          query = dlg?.querySelector('#janus7-ki-query')?.value?.trim() ?? '';
          return 'ok';
        }
      },
      rejectClose: false,
      modal: false
    }).catch(() => null);

    if (res !== 'ok') return;
    
    if (!query) { ui.notifications?.warn('Bitte einen Suchbegriff eingeben.'); return; }

    const searchFn = game?.janus7?.ki?.search;
    if (typeof searchFn !== 'function') { ui.notifications?.error('Knowledge Bridge: Suche nicht verf\u00fcgbar.'); return; }

    this.setBusy(`KI sucht in "${domain}"...`);
    try {
      const results = await searchFn(domain, query);
      const resContent = results.length === 0 
        ? '<p style="padding: 10px;">Keine relevanten Ergebnisse gefunden f\u00fcr Ihre Suchanfrage.</p>'
        : results.map(r => `
            <div class="janus7-card" style="margin-bottom: 5px; padding: 5px; border-left: 3px solid #4dc2d3;">
              <div style="font-weight: bold;">${JanusUI.escape(r.name)}</div>
              <div style="font-size: 0.85em; opacity: 0.8; display: flex; justify-content: space-between;">
                <span>UUID: <code>${JanusUI.escape(r.uuid || r.id || r._id)}</code></span>
                <span>Relevanz: ${Math.round((r.score || 0)*100)}%</span>
              </div>
            </div>
          `).join('');

      await D2.prompt({
        window: { title: `Suchergebnisse: "${query}"` },
        content: `<div style="max-height: 400px; overflow-y: auto;">${resContent}</div>`,
        ok: { label: 'Schlie\u00dfen', icon: 'fas fa-check' },
        rejectClose: false
      }).catch(() => null);
      this.clearBusy();
    } catch(err) {
      this.clearBusy();
      console.error('[JANUS7]', err);
      ui.notifications?.error('Abfrage \u00fcber KI Knowledge Bridge fehlgeschlagen.');
    }
  }

  async onKiGeminiTest(event) {
    event?.preventDefault?.();
    const gemini = game.janus7?.ki?.gemini;
    if (!gemini) {
      ui.notifications?.error('Gemini Service nicht verf\u00fcgbar.');
      return;
    }

    ui.notifications?.info('Verbindung zu Google Gemini wird getestet...');
    const result = await gemini.testConnection();
    
    if (result) {
      ui.notifications?.info('Verbindung erfolgreich! Gemini ist bereit.');
    } else {
      ui.notifications?.error('Verbindung fehlgeschlagen. Bitte API-Key und Internetverbindung pr\u00fcfen.');
    }
  }

  async onKiGenerateConsequences(event, _target) {
    event?.preventDefault?.();
    const input = document.getElementById('j7-ai-input')?.value?.trim();
    if (!input) return ui.notifications.warn('Bitte beschreibe zuerst eine Situation oder Aktion.');

    this._runAiTask('generateConsequences', input);
  }

  async onKiGenerateAtmosphere(event, _target) {
    event?.preventDefault?.();
    const input = document.getElementById('j7-ai-input')?.value?.trim();
    if (!input) return ui.notifications.warn('Bitte beschreibe zuerst eine Situation.');

    this._runAiTask('suggestAtmosphere', input);
  }

  async onKiGenerateVisual(event, _target) {
    event?.preventDefault?.();
    const input = document.getElementById('j7-ai-input')?.value?.trim();
    if (!input) return ui.notifications.warn('Bitte beschreibe zuerst ein Motiv.');

    this._runAiTask('suggestVisual', input);
  }

  async onKiGenerateImage(event, _target) {
    event?.preventDefault?.();
    const input = document.getElementById('j7-ai-input')?.value?.trim();
    if (!input) return ui.notifications.warn('Bitte beschreibe zuerst das gewünschte Motiv.');

    const type = document.getElementById('j7-ai-image-type')?.value || 'scene';
    const gemini = game.janus7?.ki?.gemini;
    const outputBox = document.getElementById('j7-ai-output');
    const resultActions = document.getElementById('j7-ai-result-actions');
    if (!outputBox || !gemini?.isEnabled) return;

    renderAiStatus(outputBox, { iconClass: 'fas fa-magic', message: `Gemini generiert ${type}...` });
    if (resultActions) resultActions.style.display = 'none';

    try {
      const opts = {
        aspectRatio: type === 'scene' ? '16:9' : '1:1',
        filename: `${type}_${Date.now()}.png`
      };
      const imagePath = await gemini.generateAndSaveImage(input, opts);
      renderAiImageResult(outputBox, imagePath);
      if (resultActions) {
        resultActions.style.display = 'flex';
        resultActions.dataset.imagePath = imagePath;
        
        // Toggle visibility of specific apply buttons
        document.getElementById('j7-btn-apply-scene').style.display = type === 'scene' ? 'inline-block' : 'none';
        document.getElementById('j7-btn-apply-portrait').style.display = type === 'portrait' ? 'inline-block' : 'none';
        document.getElementById('j7-btn-apply-icon').style.display = type === 'icon' ? 'inline-block' : 'none';
      }
      ui.notifications.info('Bild erfolgreich generiert.');
    } catch (err) {
      renderAiError(outputBox, err);
    }
  }

  async onKiApplyAsPortrait(event, _target) {
    event?.preventDefault?.();
    const path = document.getElementById('j7-ai-result-actions')?.dataset.imagePath;
    if (!path) return;

    // Use current targeted actor if any, otherwise prompt
    const actor = game.user.targets.size > 0 
      ? game.user.targets.first().actor 
      : canvas.tokens.controlled[0]?.actor;

    if (!actor) return ui.notifications.warn('Bitte markiere zuerst einen Token (NSC).');
    
    await actor.update({ img: path });
    ui.notifications.info(`Porträt für "${actor.name}" aktualisiert.`);
  }

  async onKiApplySceneBackground(event, _target) {
    event?.preventDefault?.();
    const path = document.getElementById('j7-ai-result-actions')?.dataset.imagePath;
    if (!path) return;

    const scene = game.scenes.viewed;
    if (!scene) return ui.notifications.warn('Keine aktive Szene gefunden.');

    await scene.update({ background: { src: path } });
    ui.notifications.info(`Hintergrund für Szene "${scene.name}" aktualisiert.`);
  }

  async onKiApplyAsIcon(event, _target) {
    event?.preventDefault?.();
    const path = document.getElementById('j7-ai-result-actions')?.dataset.imagePath;
    if (!path) return;

    ui.notifications.info('Icon generiert. Du kannst den Pfad nun in Items verwenden: ' + path);
    // Optionally: if a sidebar item is selected or similar.
  }

  async _runAiTask(method, input) {
    const gemini = game.janus7?.ki?.gemini;
    const outputBox = document.getElementById('j7-ai-output');
    if (!outputBox || !gemini?.isEnabled) return;

    this.setBusy('KI analysiert Situation...');
    
    try {
      const result = await gemini[method](input);
      renderAiTextResponse(outputBox, result);
      this.clearBusy();
    } catch (err) {
      this.clearBusy();
      renderAiError(outputBox, err);
    }
  }

  async onKiClearContext() {
    this._kiContextItems = [];
    this.refresh();
  }

  async onKiExportClipboard() {
    const e = game.janus7;
    if (!e?.ki?.exportBundle) return ui.notifications.warn('KI Export Service nicht verf\u00fcgbar.');
    
    try {
      const bundle = await e.ki.exportBundle();
      const text = JSON.stringify(bundle, null, 2);
      await navigator.clipboard.writeText(text);
      ui.notifications.info('KI Bundle in Zwischenablage kopiert.');
    } catch (err) {
      ui.notifications.error('Export fehlgeschlagen: ' + err.message);
    }
  }

  async onKiExportFile() {
    const e = game.janus7;
    if (!e?.ki?.exportBundle) return ui.notifications.warn('KI Export Service nicht verf\u00fcgbar.');
    
    try {
      const bundle = await e.ki.exportBundle();
      const filename = `janus7_ki_export_${Date.now()}.json`;
      saveDataToFile(JSON.stringify(bundle, null, 2), 'text/json', filename);
      ui.notifications.info('Export-Datei wird heruntergeladen...');
    } catch (err) {
      ui.notifications.error('Datei-Export fehlgeschlagen: ' + err.message);
    }
  }

  async onKiPreviewImport() {
    const e = game.janus7;
    if (!e?.ki?.previewImport) return ui.notifications.warn('KI Import Service nicht verf\u00fcgbar.');

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        // Use DialogV2 for preview feedback
        const { DialogV2 } = foundry.applications.api;
        const confirm = await DialogV2.confirm({
          window: { title: 'KI Import Vorschau' },
          content: `<p>M\u00f6chten Sie das KI-Bundle importieren?</p><ul><li>Datens\u00e4tze: ${Object.keys(data).length}</li></ul>`,
          yes: { label: 'Importieren', icon: 'fas fa-download' }
        });

        if (confirm) {
          this.setBusy('KI Bundle wird importiert...');
          await e.ki.applyImport(data);
          this.clearBusy();
          ui.notifications.info('Import erfolgreich abgeschlossen.');
          this.render();
        }
      } catch (err) {
        ui.notifications.error('Import-Vorschau fehlgeschlagen: ' + err.message);
        this.clearBusy();
      }
    };
    input.click();
  }

  async onKiApplyImport() {
    // Falls ein direkter Import aus dem Textfeld o.ä. gewünscht ist
    ui.notifications.info('Bitte nutzen Sie die Import-Vorschau (Datei), um Daten einzuspielen.');
  }

  onOpenUrl(event, target) {
    event?.preventDefault?.();
    const url = target?.dataset?.url || target?.href;
    if (url) window.open(url, '_blank');
    else ui.notifications.warn('Keine Ziel-URL gefunden.');
  }

  _rememberDirectorWorkflow(action, result, { error = null } = {}) {
    const entry = { action, at: new Date().toISOString(), ok: !error, result: result ?? null, error: error ? (error?.message ?? String(error)) : null };
    const prev = this._directorWorkflow ?? { history: [] };
    const history = Array.isArray(prev.history) ? prev.history.slice(0, 9) : [];
    this._directorWorkflow = { lastAction: action, lastRunAt: entry.at, lastResult: result ?? null, lastError: entry.error, history: [entry, ...history] };
  }

  async onStartDirectorDay() {
    const e = this._getEngine();
    const director = e?.core?.director ?? e?.director;
    try {
      const result = await director?.kernel?.startDay({ advanceDay: false, triggerQueuedEvents: true, evaluateSocial: true, generateQuests: true, runLesson: false, save: true });
      this._rememberDirectorWorkflow('startDirectorDay', result);
      ui.notifications?.info?.('Director-Tagesstart ausgeführt.');
      this.refresh();
    } catch(err) {
      ui.notifications?.error("Director Tagesstart fehlgeschlagen.");
    }
  }

  async onDirectorRunLesson(event) {
    event?.preventDefault?.();
    const e = this._getEngine();
    const director = e?.core?.director ?? e?.director;
    try {
      const result = await director?.kernel?.runLesson?.();
      this._rememberDirectorWorkflow('directorRunLesson', result);
      ui.notifications?.info?.('Lektion erfolgreich durchgefuehrt.');
      this.render();
    } catch(err) {
      ui.notifications?.error("Lektions-Lauf fehlgeschlagen.");
    }
  }

  async onDirectorProcessQueue(event) {
    event?.preventDefault?.();
    const e = this._getEngine();
    const director = e?.core?.director ?? e?.director;
    try {
      const result = await director?.kernel?.dequeueQueuedEvents?.({ present: true });
      this._rememberDirectorWorkflow('directorProcessQueue', result);
      ui.notifications?.info?.('Event-Queue verarbeitet.');
      this.render();
    } catch(err) {
      ui.notifications?.error("Queue-Verarbeitung fehlgeschlagen.");
    }
  }

  async onDirectorGenerateQuests(event) {
    event?.preventDefault?.();
    const e = this._getEngine();
    const director = e?.core?.director ?? e?.director;
    try {
      const result = await director?.kernel?.generateQuests?.();
      this._rememberDirectorWorkflow('directorGenerateQuests', result);
      ui.notifications?.info?.('Quest-Kandidaten generiert.');
      this.render();
    } catch(err) {
      ui.notifications?.error("Quest-Generierung fehlgeschlagen.");
    }
  }

  async onDirectorAcceptQuestSuggestion(event, target) {
    event?.preventDefault?.();
    const questId = target?.dataset?.questId;
    if (!questId) return;
    const e = this._getEngine();
    const director = e?.core?.director ?? e?.director;
    try {
      await director?.kernel?.acceptQuest?.(questId);
      ui.notifications?.info?.(`Quest "${questId}" akzeptiert.`);
      this.render();
    } catch(err) {
      ui.notifications?.error("Quest-Annahme fehlgeschlagen.");
    }
  }

  async onDirectorEvaluateSocial(event) {
    event?.preventDefault?.();
    const e = this._getEngine();
    const director = e?.core?.director ?? e?.director;
    try {
      await director?.kernel?.evaluateSocialLinks?.();
      ui.notifications?.info?.('Soziale Dynamik neu berechnet.');
      this.render();
    } catch(err) {
      ui.notifications?.error("Soziale Evaluation fehlgeschlagen.");
    }
  }

  async onDirectorApplyMood(event, target) {
    event?.preventDefault?.();
    const moodId = target?.dataset?.moodId;
    const e = this._getEngine();
    const atmosphere = e?.atmosphere;
    try {
      await atmosphere?.applyMood?.(moodId);
      ui.notifications?.info?.(`Stimmung "${moodId}" angewendet.`);
    } catch(err) {
      ui.notifications?.error("Stimmungs-Wechsel fehlgeschlagen.");
    }
  }

  async onDirectorRunbookNext(event) {
    event?.preventDefault?.();
    const e = this._getEngine();
    const view = this.__renderCache?.viewModel ?? {};
    const suggested = view.suggestedAction;

    if (!suggested || !suggested.action || suggested.action === 'directorRunbookNext') {
      ui.notifications?.info?.('Der Tageslauf ist aktuell auf dem neuesten Stand. Keine weiteren Prioritäten.');
      return;
    }

    try {
      this.setBusy(`Fuehre Runbook-Schritt aus: ${suggested.label}...`);
      // Find the action handler on this instance
      const handler = this[suggested.action];
      if (typeof handler === 'function') {
        await handler.call(this, event, { dataset: suggested });
      } else {
        // Fallback: try to execute via global router if possible, or warn
        ui.notifications?.warn?.(`Aktion "${suggested.action}" konnte nicht automatisch ausgefuehrt werden.`);
      }
    } catch(err) {
      ui.notifications?.error(`Fehler bei Runbook-Schritt: ${err.message}`);
    } finally {
      this.setBusy(false);
      this.render();
    }
  }

}

export default JanusShellApp;

