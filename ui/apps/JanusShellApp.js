import { moduleTemplatePath } from '../../core/common.js';
import { JanusConfig } from '../../core/config.js';
import { JanusBaseApp } from '../core/base-app.js';
import { getPanel, getQuickPanels, getPanels } from '../layer/panel-registry.js';
import { getView, getViews } from '../layer/view-registry.js';
import { runShellAction } from '../layer/action-router.js';
import { JanusUI } from '../helpers.js';
import { prepareDirectorRuntimeSummary, buildDirectorRunbookView, buildDirectorWorkflowView } from '../layer/director-context.js';

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
      selectView: JanusShellApp.onSelectView,
      openPanel: JanusShellApp.onOpenPanel,
      closePanel: JanusShellApp.onClosePanel,
      executeShellAction: JanusShellApp.onExecuteShellAction,
      togglePalette: JanusShellApp.onTogglePalette,
      copySeed: JanusShellApp.onCopySeed,

      // Control Panel Extracted Actions
      clearSlotBuilder: JanusShellApp.onClearSlotBuilder,
      generateSlotJournal: JanusShellApp.onGenerateSlotJournal,
      kiClearContext: JanusShellApp.onKiClearContext,
      kiExportClipboard: JanusShellApp.onKiExportClipboard,
      kiExportFile: JanusShellApp.onKiExportFile,
      kiApplyImport: JanusShellApp.onKiApplyImport,
      kiPreviewImport: JanusShellApp.onKiPreviewImport,
      
      startDirectorDay: JanusShellApp.onStartDirectorDay,
      directorRunLesson: JanusShellApp.onDirectorRunLesson,
      directorProcessQueue: JanusShellApp.onDirectorProcessQueue,
      directorGenerateQuests: JanusShellApp.onDirectorGenerateQuests,
      directorAcceptQuestSuggestion: JanusShellApp.onDirectorAcceptQuestSuggestion,
      directorEvaluateSocial: JanusShellApp.onDirectorEvaluateSocial,
      directorApplyMood: JanusShellApp.onDirectorApplyMood,
      directorRunbookNext: JanusShellApp.onDirectorRunbookNext
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

    // Director State
    this._slotBuilder = [];
    this._kiContextItems = [];
    this._directorWorkflow = { lastAction: null, lastRunAt: null, lastResult: null, lastError: null, history: [] };
    this._directorDnDEnabled = false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Shell Core Hooks
  // ═══════════════════════════════════════════════════════════════════════════

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

  _setView(viewId = 'director') {
    this._viewId = getView(viewId)?.id ?? 'director';
    this.refresh?.();
  }

  _setActivePanel(panelId = null) {
    this._activePanelId = panelId ? (getPanel(panelId)?.id ?? null) : null;
    this.refresh?.();
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.enableAutoRefresh([
      'janus7StateChanged',
      'janus7DateChanged',
      'janus7RelationChanged',
      'janus7Ready',
      'janusCampaignStateUpdated' // von Config-Panel
    ], 180);
  }
  
  _onPostRender(context, options) {
    super._onPostRender?.(context, options);
    this._enableDirectorDragDrop();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Context Building
  // ═══════════════════════════════════════════════════════════════════════════

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

  _buildHeaderContext(engine) {
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

  async _renderViewHtml(engine) {
    const view = getView(this._viewId) ?? getView('director');
    // We pass the shell app instance to the build method so that ContextBuilders can read _slotBuilder etc.
    const model = await view?.build?.(engine, this) ?? { cards: [] };
    const path = moduleTemplatePath(`shell/views/${view.id}.hbs`);
    try {
      return await renderHbsTemplate(path, {
        view,
        ...model, // Spread alles, damit views z.B. slotBuilder reinbekommen
        cards: mapViewCards(model.cards ?? []),
        tiles: model.tiles ?? []
      });
    } catch (_) {
      const fallback = moduleTemplatePath('shell/views/director.hbs');
      return renderHbsTemplate(fallback, { view, ...model, cards: mapViewCards(model.cards ?? []), tiles: model.tiles ?? [] });
    }
  }

  async _renderPanelHtml(engine) {
    if (!this._activePanelId) return '';
    const panel = getPanel(this._activePanelId);
    if (!panel) return '';
    const detail = panel.build?.(engine) ?? {};
    return renderHbsTemplate(moduleTemplatePath('shell/panels/default-panel.hbs'), {
      panel,
      metrics: detail.metrics ?? [],
      items: detail.items ?? [],
      actions: mapActions(panel.actions)
    });
  }

  async _prepareContext(_options) {
    const engine = this._getEngine();
    const views = getViews().map((view) => ({
      ...view,
      isActive: view.id === this._viewId
    }));
    const header = this._buildHeaderContext(engine);
    const panel = this._activePanelId ? getPanel(this._activePanelId) : null;
    const questActorCandidates = this._getQuestActorCandidates();
    const { directorSummary, directorRuntime } = this._buildDirectorRuntimeContext();
    const directorWorkflow = this._buildDirectorWorkflowView(directorRuntime);
    const directorRunbook = this._buildDirectorRunbookView(directorRuntime, directorWorkflow);

    return {
      isReady: !!engine,
      header,
      views,
      activeViewId: this._viewId,
      directorSummary,
      directorRuntime,
      directorWorkflow,
      directorRunbook,
      questActorCandidates,
      viewHtml: await this._renderViewHtml(engine),
      panelHtml: await this._renderPanelHtml(engine),
      panelOpen: !!panel,
      panelTitle: panel?.title ?? null,
      shellPaletteHint: 'Ctrl + K -> Command Center'
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Shell Actions
  // ═══════════════════════════════════════════════════════════════════════════

  static async onSelectView(event, target) {
    event?.preventDefault?.();
    const viewId = target?.dataset?.viewId ?? 'director';
    try {
      const nav = target?.closest?.('.j7-shell__sidebar, .janus-shell__nav') ?? null;
      for (const button of nav?.querySelectorAll?.('[data-action="selectView"][data-view-id]') ?? []) {
        const active = (button.dataset.viewId === viewId);
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      }
    } catch (_err) { /* non-blocking DOM sync */ }
    this._setView(viewId);
  }

  static async onOpenPanel(event, target) {
    event?.preventDefault?.();
    const panelId = target?.dataset?.panelId ?? null;
    this._setActivePanel(panelId);
  }

  static async onClosePanel(event, _target) {
    event?.preventDefault?.();
    this._setActivePanel(null);
  }

  static async onTogglePalette(event, _target) {
    event?.preventDefault?.();
    try {
      game?.janus7?.ui?.open?.('commandCenter');
    } catch (err) {
      ui.notifications?.warn?.(`Command Center konnte nicht geöffnet werden: ${err?.message ?? err}`);
    }
  }

  static async onCopySeed(event, target) {
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

  static async onExecuteShellAction(event, target) {
    event?.preventDefault?.();
    const panelId = target?.dataset?.panelId ?? null;
    const actionIndex = Number(target?.dataset?.actionIndex ?? -1);
    const cardIndex = Number(target?.dataset?.cardIndex ?? -1);
    let descriptor = null;

    if (panelId) {
      const panel = getPanel(panelId);
      descriptor = panel?.actions?.[actionIndex] ?? null;
    } else if (Number.isInteger(cardIndex) && cardIndex >= 0 && Number.isInteger(actionIndex) && actionIndex >= 0) {
      const engine = this._getEngine?.() ?? game?.janus7 ?? null;
      const view = getView(this._viewId) ?? getView('director');
      const model = view?.build?.(engine, this) ?? { cards: [] };
      descriptor = model?.cards?.[cardIndex]?.actions?.[actionIndex] ?? null;
    } else if (target?.dataset?.viewId) {
      descriptor = { kind: 'setView', viewId: target.dataset.viewId };
    } else if (target?.dataset?.appKey) {
      descriptor = { kind: 'openApp', appKey: target.dataset.appKey };
    } else if (target?.dataset?.command) {
      descriptor = { kind: 'command', command: target.dataset.command, dataset: target.dataset };
    }

    if (!descriptor) return;
    const result = await runShellAction(this, descriptor);
    if (result?.summary) this._lastActionResult = result.summary;
    this.refresh?.();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Director Native Drag & Drop Logic
  // ═══════════════════════════════════════════════════════════════════════════

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
        ? `Zuordnung bereits vorhanden: ${role} ← ${doc.name}`
        : `Zuordnung gespeichert: ${role} ← ${doc.name}`
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
    ui.notifications?.info?.(`Ort verknüpft: ${locId} ← ${kind} (${doc.name})`);
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
      <p class="j7-dialog-subtext">Drop: <code>${JanusUI.escape(docName)}</code> → <code>${JanusUI.escape(uuid)}</code></p>
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
    ui.notifications?.info?.(`Linked ${key} → ${uuid}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Director Shell Internal Actions
  // ═══════════════════════════════════════════════════════════════════════════

  static async onClearSlotBuilder(event, target) {
    this._slotBuilder = [];
    this.refresh();
  }

  static async onGenerateSlotJournal(event, target) {
    const e = this._getEngine();
    if (!e) return false;
    const st = e?.core?.state?.get?.() ?? {};
    const time = st.time ?? {};
    const y = time.year ?? 'Y', tr = time.trimester ?? 1, w = time.week ?? 1, d = time.dayIndex ?? time.day ?? 'D', s = time.slotIndex ?? 'S';
    const slotKey = `SLOT_${y}_T${tr}_W${w}_D${d}_S${s}`;
    const items = this._slotBuilder ?? [];
    if (!items.length) { ui.notifications?.warn?.('Keine Bausteine im Slot-Builder.'); return false; }

    const lines = items.map((x) => `• <strong>${JanusUI.escape(x.kind)}</strong>: ${JanusUI.escape(x.label)}<br><code>${JanusUI.escape(x.uuid)}</code>`);
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

  static async onKiClearContext() {
    this._kiContextItems = [];
    this.refresh();
  }

  static async onKiExportClipboard() {
    // Implementiere den Export...
    ui.notifications?.info?.('KI Bundle exportiert (WIP)');
  }

  static async onKiExportFile() {
    // File Export
  }

  static async onKiPreviewImport() {}
  static async onKiApplyImport() {}

  _rememberDirectorWorkflow(action, result, { error = null } = {}) {
    const entry = { action, at: new Date().toISOString(), ok: !error, result: result ?? null, error: error ? (error?.message ?? String(error)) : null };
    const prev = this._directorWorkflow ?? { history: [] };
    const history = Array.isArray(prev.history) ? prev.history.slice(0, 9) : [];
    this._directorWorkflow = { lastAction: action, lastRunAt: entry.at, lastResult: result ?? null, lastError: entry.error, history: [entry, ...history] };
  }

  static async onStartDirectorDay() {
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

  static async onDirectorRunLesson() {}
  static async onDirectorProcessQueue() {}
  static async onDirectorGenerateQuests() {}
  static async onDirectorAcceptQuestSuggestion() {}
  static async onDirectorEvaluateSocial() {}
  static async onDirectorApplyMood() {}
  static async onDirectorRunbookNext() {}

}

export default JanusShellApp;
