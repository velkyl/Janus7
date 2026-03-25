import { moduleTemplatePath } from '../../../core/common.js';
import { JanusConfig } from '../../../core/config.js';
/**
 * @file ui/apps/control-panel/JanusControlPanelApp.js
 * @module janus7/ui
 *
 * JANUS7 Director / Control Panel (ApplicationV2)
 *
 * Status: canonical GM frontend. Legacy tab-renderer files under ./tabs are currently disconnected audit artifacts.
 *
 * Zentrale Oberfläche für den GM. Alle JANUS7-Oberflächen sind über den
 * Director erreichbar (Toolbar + Übersicht-Tab + Schnellzugriff).
 *
 * Tabs:
 *   overview   — Zeitsteuerung, Jetzt-Anzeige, Alle Oberflächen
 *   schedule   — Slot-Builder (Drag&Drop → Journal generieren)
 *   quests     — Quest-Journal + Vorschläge
 *   people     — Lehrkräfte / Schüler / NPCs (Drag&Drop: Actors)
 *   places     — Orte (Drag&Drop: Scene/Playlist/Journal)
 *   ki         — KI-Kontext (Drag&Drop → contextHints), Export/Import, Vorschau
 *   sync       — Foundry-Links + öffnet JanusSyncPanelApp
 *   system     — Kill Switches, Tests, Config
 *   diagnostics— Build-Info, Engine-Status, AI-Context-Preview
 *
 * Drag & Drop:
 *   - Alle Tabs: generischer Dialog (JANUS-Key + Bucket)
 *   - data-dropzone="slot-builder"  → Slot-Builder-Liste (_slotBuilder)
 *   - data-dropzone="people"        → State academy.roster[role]
 *   - data-dropzone="location"      → Sync-Engine Link (scenes/playlists/journals)
 *   - data-dropzone="ki-context"    → _kiContextItems (KI contextHints)
 */

const { HandlebarsApplicationMixin } = foundry.applications.api;

import { JanusBaseApp } from '../../core/base-app.js';
import { JanusUI } from '../../helpers.js';
import { buildDiagnosticsView } from './diagnostics-context.js';
import { buildLocationsView, buildPeopleView, buildKiContext, buildSyncView, buildAiPreviewContext, buildSystemView } from './context-builders.js';
import { getQuestStartCandidates, prepareDirectorRuntimeSummary, buildDirectorRunbookView, buildDirectorWorkflowView, buildQuestSuggestionsFallback } from './director-context.js';
import { CONTROL_PANEL_ACTIONS } from './control-panel-actions.js';

/** @param {any} ctx */
function resolveEngine(ctx) {
  if (ctx && typeof ctx._getEngine === 'function') return ctx._getEngine();
  return globalThis.game?.janus7 ?? null;
}

/** @typedef {{id:string,name:string,type?:string,zone?:string,city?:string,defaultMoodKey?:string,foundry?:any}} LocationView */

export class JanusControlPanelApp extends HandlebarsApplicationMixin(JanusBaseApp) {
  static _instance = null;

  static showSingleton(options = {}) {
    if (!this._instance) this._instance = new this(options);
    this._instance.render({ force: true, focus: true });
    queueMicrotask(() => {
      try { this._instance?._applyWindowSanity?.(); } catch (_) {}
      try { if (this._instance?.minimized && typeof this._instance.maximize === 'function') void this._instance.maximize(); } catch (_) {}
      try { this._instance?.bringToFront?.(); } catch (_) {}
    });
    return this._instance;
  }

  static DEFAULT_OPTIONS = {
    ...JanusBaseApp.DEFAULT_OPTIONS,
    id: 'janus7-control-panel',
    classes: ['janus7-app', 'janus7-control-panel', 'j7-control-panel'],
    position: { width: 1020, height: 760, top: 70, left: 90 },
    window: {
      title: 'JANUS7 · Director / Control Panel',
      icon: 'fas fa-cogs',
      resizable: true,
      minimizable: true
    },
    tabs: [{ navSelector: '.janus7-tabs', contentSelector: '.janus7-tab-container', initial: 'overview' }],

    actions: CONTROL_PANEL_ACTIONS
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Template
  // ═══════════════════════════════════════════════════════════════════════════



  _configureRenderOptions(options) {
    options = super._configureRenderOptions?.(options ?? {}) ?? (options ?? {});
    options.window ??= {};
    options.window.title = 'JANUS7 · Director / Control Panel';
    return options;
  }

  static PARTS = {
    main: { template: moduleTemplatePath('templates/apps/control-panel.hbs') }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Constructor & Instance State
  // ═══════════════════════════════════════════════════════════════════════════

  constructor(options = {}) {
    super(options);
    this._activeTab        = 'overview';
    /** @type {Array<{uuid:string, kind:string, label:string}>} Slot-Builder Items */
    this._slotBuilder      = [];
    /** @type {Array<{uuid:string, kind:string, label:string, data?:any}>} KI-Kontext-Items */
    this._kiContextItems   = [];
    /** @type {{lastAction:string|null,lastRunAt:string|null,lastResult:any,lastError:string|null,history:Array<any>}} */
    this._directorWorkflow = { lastAction: null, lastRunAt: null, lastResult: null, lastError: null, history: [] };
    /** @type {boolean} Drag-Drop handler einmal registriert */
    this._directorDnDEnabled = false;
    this.enableAutoRefresh(['janusCampaignStateUpdated']);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Context Preparation
  // ═══════════════════════════════════════════════════════════════════════════

  /** @override */
  async _prepareContext(options = {}) {
    const ctx = await super._prepareContext(options);
    ctx.isGM          = !!game?.user?.isGM;
    ctx.phase7Enabled = JanusConfig.get('enablePhase7') !== false;

    const e     = resolveEngine(this);
    const state = e?.core?.state?.get?.() ?? {};
    const time  = state.time ?? {};

    // Time / Slot
    const calendar     = e?.academy?.calendar;
    const slotRef      = calendar?.getCurrentSlotRef?.(time) ?? { year: time.year, trimester: time.trimester ?? 1, week: time.week, day: time.day, phase: time.phase };
    const slotLabel    = calendar?.getCurrentSlotLabel?.(time) ?? `${slotRef.day ?? '?'} • ${slotRef.phase ?? '?'}`;
    const slotPos      = calendar?.getCurrentSlotPosition?.(time) ?? null;
    const slotPosLabel = slotPos
      ? `${slotPos.dayName ?? slotRef.day ?? '?'} • ${slotPos.phaseName ?? slotRef.phase ?? '?'} • Slot ${slotPos.slotIndex ?? '?'}`
      : `${slotRef.day ?? '?'} • ${slotRef.phase ?? '?'} • Slot ${time.slotIndex ?? '?'}`;

    const slotResolution = await e?.academy?.slotResolver?.resolveSlot?.(slotRef) ?? { lessons: [], exams: [], events: [] };

    // Today entries
    const todayEntriesRaw = calendar?.getCalendarEntriesForDay?.(time) ?? [];
    const academyData     = e?.academy?.data;
    const todayEntries    = todayEntriesRaw.map((entry) => {
      let title = '';
      if (entry.type === 'lesson')  title = academyData?.getLesson?.(entry.lessonId)?.title ?? entry.lessonId ?? 'Lesson';
      else if (entry.type === 'exam') title = academyData?.getExam?.(entry.examId)?.title ?? entry.examId ?? 'Exam';
      else if (entry.type === 'event') title = academyData?.getEvent?.(entry.eventId)?.title ?? entry.eventId ?? 'Event';
      else title = String(entry.type ?? 'Entry');
      return { ...entry, title };
    });

    const timeBar = {
      dayName: time?.dayName ?? slotPos?.dayName ?? slotRef?.day ?? '—',
      phaseName: time?.slotName ?? slotPos?.phaseName ?? slotRef?.phase ?? '—'
    };
    const today = {
      items: todayEntries.map((entry) => ({
        id: entry.id ?? entry.lessonId ?? entry.examId ?? entry.eventId ?? null,
        time: entry.time ?? entry.phase ?? entry.slotName ?? entry.day ?? slotLabel,
        type: entry.type ?? 'entry',
        title: entry.title ?? '—',
        where: entry.location ?? entry.room ?? entry.where ?? '—',
        teacher: entry.teacher ?? entry.teacherName ?? '—',
        desc: entry.description ?? entry.desc ?? ''
      }))
    };

    // Current slot
    let current = { hasEntry: false, kind: 'none', title: '', meta: slotLabel, teacher: '—', room: '—', desc: '' };
    const currentEntry = calendar?.getCalendarEntryForCurrentSlot?.(time) ?? null;
    if (currentEntry) {
      const t = todayEntries.find((x) => x.id === currentEntry.id) ?? null;
      current = { hasEntry: true, kind: currentEntry.type, title: t?.title ?? '—', meta: slotLabel, teacher: t?.teacher ?? '—', room: t?.where ?? '—', desc: t?.desc ?? '' };
    } else if (slotResolution?.lessons?.length) {
      const l = slotResolution.lessons[0];
      current = { hasEntry: true, kind: 'lesson', title: l.title ?? l.subject ?? 'Lesson', meta: slotLabel, teacher: l.teacher ?? '—', room: l.location ?? l.room ?? '—', desc: l.description ?? '' };
    } else if (slotResolution?.events?.length) {
      const ev0 = slotResolution.events[0];
      current = { hasEntry: true, kind: 'event', title: ev0.title ?? 'Event', meta: slotLabel, teacher: '—', room: ev0.location ?? '—', desc: ev0.description ?? '' };
    } else if (slotResolution?.exams?.length) {
      const ex0 = slotResolution.exams[0];
      current = { hasEntry: true, kind: 'exam', title: ex0.title ?? 'Exam', meta: slotLabel, teacher: ex0.teacher ?? '—', room: ex0.location ?? '—', desc: ex0.description ?? '' };
    }

    const { locations, locationView } = buildLocationsView({ state, academyData });

    const peopleView = buildPeopleView({ state, actors: game?.actors });
    const questActorCandidates = this._getQuestStartCandidates(peopleView);

    // ── KI Tab Context ───────────────────────────────────────────────────────
    const kiContext = await buildKiContext({
      app: this,
      engine: e,
      isGM: ctx.isGM,
      phase7Enabled: ctx.phase7Enabled,
    });

    // ── Sync Tab Context ─────────────────────────────────────────────────────
    const syncView = buildSyncView({ state });

    // ── Director Kernel Summary ──────────────────────────────────────────────
    const { directorSummary, directorRuntime } = this._prepareDirectorRuntimeSummary();
    const directorWorkflow = this._buildDirectorWorkflowView(directorRuntime, questActorCandidates);
    const directorRunbook = this._buildDirectorRunbookView(directorRuntime, directorWorkflow);

    // ── AI Preview (Diagnostics) ─────────────────────────────────────────────
    const { aiPreview, aiPreviewJson } = buildAiPreviewContext({
      engine: e,
      moduleVersion: game?.modules?.get?.('Janus7')?.version ?? '?'
    });

    // ── System ──────────────────────────────────────────────────────────────
    const cfg  = e?.core?.config;
    const getS = (key, fb = false) => { try { return game?.settings?.get?.('janus7', key) ?? cfg?.get?.(key) ?? fb; } catch { return fb; } };
    const system = buildSystemView({ engine: e, getSetting: getS });
    const diagnosticsView = await buildDiagnosticsView({
      engine: e,
      state,
      aiPreview,
      directorRuntime,
      getSetting: getS,
      cachedReport: this._diagnosticsReport ?? null,
    });

    return {
      ...ctx,
      version: e?.version ?? game?.modules?.get?.('Janus7')?.version ?? 'unknown',
      time, timeBar, slotRef, slotLabel, slotPos, slotPosLabel,
      current, today, todayEntries, slotResolution,
      directorSummary, directorRuntime, directorWorkflow, directorRunbook,
      locations, locationView, peopleView, questActorCandidates,
      slotBuilder: { items: (this._slotBuilder ?? []).slice(0, 12) },
      kiContext,
      syncView,
      aiPreview, aiPreviewJson,
      diagnosticsView,
      system,
    };
  }


  _getQuestStartCandidates(peopleView = null) {
    return getQuestStartCandidates({ peopleView, userCharacter: game?.user?.character ?? null });
  }

  async _chooseQuestStartActor() {
    const candidates = this._getQuestStartCandidates();
    const preferred = candidates[0] ?? { uuid: 'party', label: 'Gruppe / Party', source: 'fallback' };
    return preferred;
  }



  async _runDirectorNextAction() {
    const runtime = this._lastDirectorRuntime ?? this._prepareDirectorRuntimeSummary?.()?.directorRuntime ?? {};
    const workflow = this._buildDirectorWorkflowView(runtime, this._getQuestStartCandidates());
    const nextAction = workflow?.nextAction?.action ?? null;
    if (!nextAction) {
      const result = { ok: false, reason: 'no-next-action' };
      this._rememberDirectorWorkflow('directorRunbookNext', result);
      ui.notifications?.info?.('Director-Runbook: Keine weitere empfohlene Aktion.');
      return result;
    }
    if (nextAction === 'directorRunbookNext') throw new Error('Runbook verweist rekursiv auf sich selbst');
    const actionFn = this.constructor?.DEFAULT_OPTIONS?.actions?.[nextAction];
    if (typeof actionFn !== 'function') throw new Error(`Director-Aktion nicht gefunden: ${nextAction}`);
    const result = await actionFn.call(this, null);
    return { ok: true, action: nextAction, result };
  }

  async _applyDirectorMood() {
    const e = resolveEngine(this);
    const controller = e?.atmosphere?.controller ?? e?.atmosphere;
    if (!controller?.applyMood) return { ok: false, reason: 'atmosphere-unavailable' };

    const state = e?.core?.state?.get?.() ?? {};
    const time = state.time ?? {};
    const calendar = e?.academy?.calendar;
    const slotRef = calendar?.getCurrentSlotRef?.(time) ?? { day: time.day, phase: time.phase };
    const currentLocationId = state?.academy?.currentLocationId ?? null;
    const academyData = e?.academy?.data;
    const location = currentLocationId ? academyData?.getLocation?.(currentLocationId) ?? null : null;

    let mood = controller.resolveMoodForLocation?.(currentLocationId) ?? null;
    if (!mood) mood = controller.resolveMoodForSlot?.(slotRef) ?? null;
    if (!mood && location?.defaultMoodKey) mood = { id: location.defaultMoodKey, name: location.defaultMoodKey };
    const moodId = mood?.id ?? mood?.moodId ?? location?.defaultMoodKey ?? null;
    if (!moodId) return { ok: false, reason: 'no-mood-match', locationId: currentLocationId ?? null, slot: slotRef };

    const applied = await controller.applyMood(moodId, { broadcast: true, force: true, reason: 'director-runbook' });
    return { ok: !!applied, moodId, moodLabel: mood?.name ?? moodId, locationId: currentLocationId ?? null, slot: slotRef };
  }

  _prepareDirectorRuntimeSummary() {
    const result = prepareDirectorRuntimeSummary({ engine: resolveEngine(this), logger: this._getLogger() });
    this._lastDirectorSummary = result.directorSummary;
    this._lastDirectorRuntime = result.directorRuntime;
    return result;
  }

  _buildDirectorRunbookView(directorRuntime = {}, directorWorkflow = {}) {
    return buildDirectorRunbookView(directorRuntime, directorWorkflow);
  }

  _rememberDirectorWorkflow(action, result, { error = null } = {}) {
    const entry = {
      action,
      at: new Date().toISOString(),
      ok: !error,
      result: result ?? null,
      error: error ? (error?.message ?? String(error)) : null,
    };
    const prev = this._directorWorkflow ?? { history: [] };
    const history = Array.isArray(prev.history) ? prev.history.slice(0, 9) : [];
    this._directorWorkflow = {
      lastAction: action,
      lastRunAt: entry.at,
      lastResult: result ?? null,
      lastError: entry.error,
      history: [entry, ...history],
    };
  }

  _buildDirectorWorkflowView(directorRuntime = {}, questActorCandidates = null) {
    return buildDirectorWorkflowView({
      directorWorkflow: this._directorWorkflow ?? {},
      directorRuntime,
      engine: resolveEngine(this),
      questCandidates: Array.isArray(questActorCandidates) ? questActorCandidates : this._getQuestStartCandidates(),
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Render Hooks
  // ═══════════════════════════════════════════════════════════════════════════

  _onPostRender(context, options) {
    super._onPostRender?.(context, options);
    this._enableDirectorDragDrop();
  }

  /** @override — ApplicationV2, called after every render */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    if (!root?.querySelector) return;

    const applyTab = (tabId) => {
      if (!tabId) return;
      this._activeTab = tabId;
      root.querySelectorAll('.janus7-tabs [data-tab]').forEach((a) => {
        const active = a.dataset.tab === tabId;
        a.classList.toggle('active', active);
        a.setAttribute('aria-selected', active ? 'true' : 'false');
        a.setAttribute('tabindex', active ? '0' : '-1');
      });
      root.querySelectorAll('.janus7-tab-container .tab[data-tab]').forEach((p) => {
        const active = p.dataset.tab === tabId;
        p.classList.toggle('active', active);
        p.hidden = !active;
      });
    };

    const tabs = Array.from(root.querySelectorAll('.janus7-tabs [data-tab]'));
    const panels = Array.from(root.querySelectorAll('.janus7-tab-container .tab[data-tab]'));
    root.querySelector('.janus7-tabs')?.setAttribute('role', 'tablist');
    tabs.forEach((tabEl, idx) => {
      const tabId = tabEl.dataset.tab;
      const panel = panels.find((p) => p.dataset.tab === tabId);
      tabEl.setAttribute('role', 'tab');
      tabEl.setAttribute('tabindex', idx === 0 ? '0' : '-1');
      if (panel) {
        const panelId = `janus7-panel-${tabId}`;
        panel.id = panelId;
        panel.setAttribute('role', 'tabpanel');
        tabEl.setAttribute('aria-controls', panelId);
      }
    });

    applyTab(this._activeTab ?? 'overview');
    this._applyDynamicUiTokens(root);

    if (!root._janus7TabsBound) {
      root._janus7TabsBound = true;
      tabs.forEach((el, index) => {
        el.addEventListener('click', (ev) => { ev.preventDefault(); applyTab(el.dataset.tab); });
        el.addEventListener('keydown', (ev) => {
          const currentIndex = tabs.indexOf(el);
          if (currentIndex < 0) return;
          let nextIndex = null;
          if (ev.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
          else if (ev.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          else if (ev.key === 'Home') nextIndex = 0;
          else if (ev.key === 'End') nextIndex = tabs.length - 1;
          else if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            applyTab(el.dataset.tab);
            return;
          }
          if (nextIndex == null) return;
          ev.preventDefault();
          const nextEl = tabs[nextIndex];
          tabs.forEach((t) => t.setAttribute('tabindex', '-1'));
          nextEl?.setAttribute('tabindex', '0');
          nextEl?.focus();
        });
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Drag & Drop
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

    // Spezifische Drop-Zones
    const dz = ev?.target?.closest?.('.j7-dropzone');
    const zone = dz?.dataset?.dropzone;

    if (zone === 'slot-builder') { this._handleDropSlotBuilder(doc); return; }
    if (zone === 'people')       { await this._handleDropPeople(dz, doc); return; }
    if (zone === 'location')     { await this._handleDropLocation(dz, doc); return; }
    if (zone === 'ki-context')   { this._handleDropKiContext(doc); return; }

    // Generischer Dialog (außerhalb benannter Zones)
    await this._handleDropGeneric(doc, uuid);
  }

  // ── Drop Handler ──────────────────────────────────────────────────────────

  /** Slot-Builder: beliebige Dokumente ansammeln */
  _handleDropSlotBuilder(doc) {
    const list  = (this._slotBuilder ??= []);
    const uuid  = doc.uuid;
    if (!uuid) return;
    if (!list.some((x) => x.uuid === uuid)) {
      list.push({ uuid, kind: doc.documentName ?? 'Document', label: doc.name ?? uuid });
    }
    this.render({ force: true });
  }

  /** KI-Kontext: alle Dokument-Typen, inkl. kompakter Snapshot-Daten */
  _handleDropKiContext(doc) {
    const list = (this._kiContextItems ??= []);
    const uuid = doc.uuid;
    if (!uuid) return;
    if (list.some((x) => x.uuid === uuid)) {
      ui.notifications?.info?.(`${doc.name} ist bereits im KI-Kontext.`);
      return;
    }
    // Kompakter Snapshot für den KI-Export
    const data = this._extractDocSnapshot(doc);
    list.push({ uuid, kind: doc.documentName ?? 'Document', label: doc.name ?? uuid, data });
    ui.notifications?.info?.(`KI-Kontext: ${doc.name} hinzugefügt.`);
    this.render({ force: true });
  }

  /** Extrahiert relevante Daten aus einem Foundry-Dokument für KI-Kontext */
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

  /** People: nur Actors */
  async _handleDropPeople(dz, doc) {
    if (doc.documentName !== 'Actor') { ui.notifications?.warn?.('Hier sind nur Actors erlaubt.'); return; }
    const role = dz?.dataset?.role;
    if (!['teachers', 'students', 'npcs'].includes(role)) return;
    const e = resolveEngine(this);
    const director = e?.core?.director ?? e?.director;
    const uuid = doc.uuid;
    if (!director?.addActorToRoster) { ui.notifications?.error?.('Director-API für Roster-Mutation nicht verfügbar.'); return; }
    const result = await director.addActorToRoster(role, uuid, { save: true });
    ui.notifications?.info?.(
      result?.added === false
        ? `Zuordnung bereits vorhanden: ${role} ← ${doc.name}`
        : `Zuordnung gespeichert: ${role} ← ${doc.name}`
    );
    this.render({ force: true });
  }

  /** Ort: Scene/Playlist/Journal verknüpfen */
  async _handleDropLocation(dz, doc) {
    const locId = dz?.dataset?.locationId;
    if (!locId) { ui.notifications?.warn?.('Kein aktiver Ort (locationId fehlt).'); return; }
    const kind  = doc.documentName;
    if (!['Scene', 'Playlist', 'JournalEntry'].includes(kind)) {
      ui.notifications?.warn?.('Ort akzeptiert: Scene, Playlist, JournalEntry.'); return;
    }
    const e    = resolveEngine(this);
    const sync = e?.core?.sync ?? e?.sync;
    if (!sync?.linkEntity) { ui.notifications?.warn?.('Sync nicht verfügbar.'); return; }
    if (kind === 'Scene')        await sync.linkEntity(locId, doc.uuid, { type: 'scenes',    saveState: true });
    if (kind === 'Playlist')     await sync.linkEntity(locId, doc.uuid, { type: 'playlists', saveState: true });
    if (kind === 'JournalEntry') await sync.linkEntity(locId, doc.uuid, { type: 'journals',  saveState: true });
    ui.notifications?.info?.(`Ort verknüpft: ${locId} ← ${kind} (${doc.name})`);
    this.render({ force: true });
  }

  /** Generisch: Dialog mit JANUS-Key + Bucket */
  async _handleDropGeneric(doc, uuid) {
    const docName   = doc.documentName;
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

    const optionsHtml = buckets.map((b) =>
      `<option value="${b.value}" ${b.value === suggested ? 'selected' : ''}>${b.label}</option>`
    ).join('');

    const content = `<div class="janus7-card j7-dialog-card-reset">
      <p class="j7-dialog-heading"><strong>JANUS7 Link setzen</strong></p>
      <p class="j7-dialog-subtext">Drop: <code>${this._escape(docName)}</code> → <code>${this._escape(uuid)}</code></p>
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

    const engine = resolveEngine(this);
    const sync   = engine?.core?.sync ?? engine?.sync;
    if (!sync?.linkEntity) { ui.notifications?.error?.('Sync-Engine nicht verfügbar.'); return; }

    const key = sync.normalizeJanusId ? sync.normalizeJanusId(keyRaw) : keyRaw;
    await sync.linkEntity(key, uuid, { type: bucket, saveState: true });
    ui.notifications?.info?.(`Linked ${key} → ${uuid}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // KI Bundle Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Baut das KI-Bundle: Standard engine.ki.exportBundle() + contextHints aus _kiContextItems.
   * @param {any} engine
   * @returns {Promise<object>}
   */
  async _buildKiBundle(engine) {
    let bundle = {};
    try { bundle = await (engine?.capabilities?.ki ?? engine?.ki)?.exportBundle?.() ?? {}; } catch (_) {}
    const hints = (this._kiContextItems ?? []).map((item) => ({
      uuid:  item.uuid,
      kind:  item.kind,
      label: item.label,
      data:  item.data ?? null,
    }));
    if (hints.length > 0) bundle.contextHints = hints;
    return bundle;
  }

  async _confirmKiApply() {
    const D2 = foundry?.applications?.api?.DialogV2;
    if (!D2?.confirm) return true;
    try {
      return await D2.confirm({
        window:  { title: 'KI-Import anwenden?' },
        content: '<p>Willst du den KI-Patch anwenden? Der State wird transaktional geändert (Rollback bei Fehler).</p>',
        yes:     { label: 'Anwenden', icon: 'fas fa-check' },
        no:      { label: 'Abbrechen' },
        rejectClose: false,
        modal: true
      });
    } catch { return false; }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Slot-Builder + Journal
  // ═══════════════════════════════════════════════════════════════════════════

  _ensureSlotBuilder() { this._slotBuilder ??= []; return this._slotBuilder; }

  _getCurrentSlotKey(engine, time) {
    const t  = time ?? engine?.core?.state?.get?.()?.time ?? {};
    const y  = t.year ?? 'Y';
    const tr = t.trimester ?? 1;
    const w  = t.week ?? 1;
    const d  = t.dayIndex ?? t.day ?? 'D';
    const s  = t.slotIndex ?? 'S';
    return `SLOT_${y}_T${tr}_W${w}_D${d}_S${s}`;
  }

  async _generateJournalForCurrentSlot() {
    const e = resolveEngine(this);
    if (!e) return false;
    const st      = e?.core?.state?.get?.() ?? {};
    const time    = st.time ?? {};
    const slotKey = this._getCurrentSlotKey(e, time);
    const items   = this._ensureSlotBuilder();
    if (!items.length) { ui.notifications?.warn?.('Keine Bausteine im Slot-Builder.'); return false; }

    const lines   = items.map((x) => `• <strong>${JanusUI.escape(x.kind)}</strong>: ${JanusUI.escape(x.label)}<br><code>${JanusUI.escape(x.uuid)}</code>`);
    const content = `<h2>Stunde (${JanusUI.escape(slotKey)})</h2><p><em>Generiert aus Slot-Builder im Director.</em></p><hr><div>${lines.join('<hr class="j7-dialog-divider-faint">')}</div>`;

    const je = await JournalEntry.create({ name: `Stunde — ${slotKey}`, pages: [{ name: 'Inhalt', type: 'text', text: { content, format: 1 } }] });
    if (!je?.uuid) { ui.notifications?.error?.('Journal konnte nicht erstellt werden.'); return false; }

    const sync = e?.core?.sync ?? e?.sync;
    if (sync?.linkEntity) await sync.linkEntity(slotKey, je.uuid, { type: 'journals', saveState: false });

    const director = e?.core?.director ?? e?.director;
    if (!director?.registerSlotJournal) {
      ui.notifications?.error?.('Director-API für Slot-Journal-Mutation nicht verfügbar.');
      return false;
    }
    await director.registerSlotJournal(slotKey, {
      journalUuid: je.uuid,
      items: items.slice(),
      createdAt: new Date().toISOString(),
    }, { save: true });

    ui.notifications?.info?.(`Journal erstellt & verknüpft: ${slotKey}`);
    this._slotBuilder = [];
    this.render({ force: true });
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Quest Suggestions
  // ═══════════════════════════════════════════════════════════════════════════

  _buildQuestSuggestionsFallback(engine) {
    return buildQuestSuggestionsFallback(engine);
  }

  async _openQuestSuggestionsDialog(suggestions) {
    const D2  = foundry?.applications?.api?.DialogV2;
    const esc = (s) => JanusUI.escape(String(s ?? ''));
    const rows = (suggestions ?? []).map((s, i) => `
      <div class="form-group">
        <label><strong>${esc(s.title ?? `Vorschlag ${i+1}`)}</strong></label>
        <textarea name="sug_${i}" rows="4">${esc(s.hook ?? '')}</textarea>
      </div>`).join('');
    const content = `<form class="janus7-quest-suggestions">${rows || '<p class="muted">Keine Vorschläge.</p>'}</form>`;
    if (D2?.prompt) { await D2.prompt({ window: { title: 'JANUS7 — Quest‑Vorschläge' }, content, ok: { label: 'OK' }, rejectClose: false, modal: true }); return true; }
    return await Dialog.prompt({ title: 'JANUS7 — Quest‑Vorschläge', content, label: 'OK' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Util
  // ═══════════════════════════════════════════════════════════════════════════

  _escape(str) { return JanusUI.escape ? JanusUI.escape(String(str ?? '')) : String(str ?? '').replace(/[<>&"']/g, (c) => ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;' }[c])); }
}
