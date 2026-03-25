
import { moduleTemplatePath } from '../../core/common.js';
import { JanusBaseApp } from '../core/base-app.js';
import { getPanel, getQuickPanels, getPanels } from '../layer/panel-registry.js';
import { getView, getViews } from '../layer/view-registry.js';
import { runShellAction } from '../layer/action-router.js';

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

export class JanusShellApp extends HandlebarsApplicationMixin(JanusBaseApp) {
  static DEFAULT_OPTIONS = {
    id: 'janus7-shell',
    classes: ['janus7-app', 'janus7-shell'],
    position: { width: 1320, height: 860, left: 40, top: 40 },
    window: {
      title: 'JANUS7 · Shell Layer',
      resizable: true,
      minimizable: true
    },
    actions: {
      selectView: JanusShellApp.onSelectView,
      openPanel: JanusShellApp.onOpenPanel,
      closePanel: JanusShellApp.onClosePanel,
      executeShellAction: JanusShellApp.onExecuteShellAction,
      togglePalette: JanusShellApp.onTogglePalette
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
  }

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
      'janus7Ready'
    ], 180);
  }

  _getStateTime() {
    const state = this._getEngine()?.core?.state;
    return state?.get?.('time') ?? {};
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
    const model = view?.build?.(engine) ?? { cards: [] };
    const path = moduleTemplatePath(`shell/views/${view.id}.hbs`);
    try {
      return await renderHbsTemplate(path, {
        view,
        cards: model.cards ?? [],
        tiles: model.tiles ?? []
      });
    } catch (_) {
      const fallback = moduleTemplatePath('shell/views/director.hbs');
      return renderHbsTemplate(fallback, { view, cards: model.cards ?? [], tiles: model.tiles ?? [] });
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
    return {
      isReady: !!engine,
      header,
      views,
      activeViewId: this._viewId,
      viewHtml: await this._renderViewHtml(engine),
      panelHtml: await this._renderPanelHtml(engine),
      panelOpen: !!panel,
      panelTitle: panel?.title ?? null,
      shellPaletteHint: '⌘/Ctrl + K → Command Center'
    };
  }

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

  static async onExecuteShellAction(event, target) {
    event?.preventDefault?.();
    const panelId = target?.dataset?.panelId ?? null;
    const actionIndex = Number(target?.dataset?.actionIndex ?? -1);
    let descriptor = null;

    if (panelId) {
      const panel = getPanel(panelId);
      descriptor = panel?.actions?.[actionIndex] ?? null;
    } else if (target?.dataset?.viewId) {
      descriptor = { kind: 'setView', viewId: target.dataset.viewId };
    }

    if (!descriptor) return;
    const result = await runShellAction(this, descriptor);
    if (result?.summary) this._lastActionResult = result.summary;
    this.refresh?.();
  }
}

export default JanusShellApp;
