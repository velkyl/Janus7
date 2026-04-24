
import { getQuickPanels, getPanel } from './panel-registry.js';
import { HOOKS } from '../../core/hooks/topics.js';
import { registerRuntimeHook } from '../../core/hooks/runtime.js';
import { JanusConfig } from '../../core/config.js';
import { JanusProfileRegistry } from '../../core/profiles/index.js';
import { moduleAssetPath } from '../../core/common.js';
import { JanusBaseApp } from '../core/base-app.js';

const GM_OVERLAY_ID = 'janus7-gm-quick-overlay';

const { HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * JANUS7 GM Quick Access Overlay (ApplicationV2)
 * High-performance, profile-aware GM controls.
 */
class JanusGmQuickOverlayApp extends HandlebarsApplicationMixin(JanusBaseApp) {
  constructor(options = {}) {
    super(options);
    this.engine = null;
    this._overlayContext = { time: {}, scoring: {}, profile: { name: 'JANUS7' }, status: { hasAlert: false } };
    this.enableAutoRefresh?.([HOOKS.STATE_CHANGED, HOOKS.DATE_CHANGED, HOOKS.SCORE_CHANGED], 80);
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    id: GM_OVERLAY_ID,
    classes: ['janus7-gm-overlay', 'janus7-v13-ui'],
    tag: 'section',
    window: {
      frame: true,
      positioned: true,
      title: 'JANUS7 GM Quick Access',
      resizable: false,
      minimizable: true
    },
    actions: {
      openShell: this._onOpenShell,
      advanceSlot: this._onAdvanceSlot,
      advanceDay: this._onAdvanceDay,
      openScoring: this._onOpenScoring,
      executeContextAction: this._onExecuteContextAction
    }
  };

  /** @override */
  static PARTS = {
    content: {
      template: moduleAssetPath('templates/ui/gm-overlay.hbs')
    }
  };

  attach(engine) {
    this.engine = engine ?? null;
    if (this._shouldShow()) {
      this.render({ force: true });
      return;
    }
    this.close();
  }

  detach() {
    this.close();
    this.engine = null;
  }

  _shouldShow() {
    return !!this.engine && !!game?.user?.isGM && (JanusConfig.get('enableUI') !== false);
  }

  /** @override */
  async _preRender(options) {
    await super._preRender?.(options);
    this._overlayContext = this.#buildOverlayContext();
  }

  /** @override */
  _prepareContext(_options) {
    return this._overlayContext;
  }

  #buildOverlayContext() {
    try {
      const director = this.engine?.director;
      if (!director) return { time: {}, scoring: {}, profile: { name: 'JANUS7' }, status: { hasAlert: false } };

      const profile = JanusProfileRegistry.getActive();
      const timeRef = director.time.getRef() ?? {};
      const summary = director.getRuntimeSummary() ?? {};
      const circles = summary.scoring?.topCircles || [];
      const maxScore = Math.max(100, ...circles.map((entry) => Number(entry.score || 0)));

      const topCircles = circles.map((c) => {
        const score = Number(c.score || 0);
        return {
          ...c,
          progress: Math.min(100, Math.round((score / maxScore) * 100))
        };
      });

      return {
        profile: {
          id: profile?.id || 'default',
          name: profile?.name || 'JANUS7'
        },
        time: {
          day: timeRef.dayName || '---',
          phase: timeRef.slotName || '---',
          week: timeRef.week || '0',
          year: timeRef.year || '1039'
        },
        scoring: {
          leader: summary.scoring?.leader || 'Keine Daten',
          topCircles: topCircles.length ? topCircles : []
        },
        status: {
          hasAlert: (summary.activeQuestCount || 0) > 0
        },
        contextActions: this.#buildContextActions(director)
      };
    } catch (err) {
      this._getLogger?.().warn?.('[JANUS7][Overlay] context build failed', err);
      return { time: {}, scoring: {}, profile: { name: 'JANUS7' }, status: { hasAlert: false } };
    }
  }

  #buildContextActions(director) {
    const actions = [];
    const activeScene = game.scenes.active;
    
    if (activeScene) {
      // Find location associated with scene
      const api = game.janus7?.academy?.data;
      const locations = (api?.isReady ? api.listLocationIds?.(200) : []) || [];
      const location = locations
        .map(id => game.janus7.academy.data.getLocation(id))
        .find(loc => (loc.foundrySceneId === activeScene.id) || (loc.sceneId === activeScene.id) || (loc.name === activeScene.name));

      if (location) {
        actions.push({
          command: 'applyLocationMood',
          label: 'Mood',
          icon: 'fas fa-music',
          title: `Atmosphäre für ${location.name} setzen`,
          dataset: { locationId: location.id }
        });
      }
    }

    // Add generic actions based on time
    const time = director.time.getRef() || {};
    if (time.slotName === 'Nacht') {
      actions.push({
        command: 'advanceDay',
        label: 'Tag beginnen',
        icon: 'fas fa-sun',
        title: 'Nächsten Tag einleiten',
        dataset: {}
      });
    }

    return actions;
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  static _onOpenShell(event) {
    game.janus7.ui.open('shell');
  }

  static async _onAdvanceSlot(event) {
    const director = game.janus7.director;
    if (director?.time?.advanceSlot) {
      await director.time.advanceSlot({ save: true });
      ui.notifications.info('JANUS7: Zeitschlitz vorgerückt.');
    }
  }

  static async _onAdvanceDay(event) {
    const director = game.janus7.director;
    if (director?.time?.advanceDay) {
      await director.time.advanceDay({ save: true });
      ui.notifications.info('JANUS7: Tag vorgerückt.');
    }
  }

  static _onOpenScoring(event) {
    game.janus7.ui.open('shell', { viewId: 'tools' });
  }

  static async _onExecuteContextAction(event, target) {
    const command = target.dataset.command;
    const dataset = JSON.parse(target.dataset.dataset || '{}');
    const { JanusCommands } = await import('../commands/index.js');
    const fn = JanusCommands[command];
    if (typeof fn === 'function') {
      await fn(dataset);
    } else {
      ui.notifications.warn(`Befehl nicht gefunden: ${command}`);
    }
  }

  refresh(force = true) {
    return this.render({ force: !!force });
  }

  remove() {
    return this.close();
  }
}

const JanusGmQuickOverlay = new JanusGmQuickOverlayApp();


export const JanusUiLayerBridge = {
  attach(engine) {
    if (!engine) return;
    engine.uiLayer = engine.uiLayer ?? {};
    engine.uiLayer.getQuickPanels = getQuickPanels;
    engine.uiLayer.getPanel = getPanel;
    engine.uiLayer.openShell = (options = {}) => game?.janus7?.ui?.open?.('shell', options);
    engine.uiLayer.open = engine.uiLayer.openShell;
    engine.uiLayer.refreshGmQuickOverlay = () => JanusGmQuickOverlay.refresh();
    engine.uiLayer.removeGmQuickOverlay = () => JanusGmQuickOverlay.remove();
    JanusGmQuickOverlay.attach(engine);
  },

  registerSceneTools(engine) {
    const contributor = (controls) => {
      const token = Array.isArray(controls)
        ? controls.find((c) => c?.name === 'token')
        : controls?.token;
      const tools = token?.tools;
      if (!tools) return;
      const tool = {
        name: 'openJanusShell',
        title: 'JANUS Shell öffnen',
        icon: 'fas fa-layer-group',
        order: 1,
        button: true,
        visible: !!game?.user?.isGM,
        onChange: () => {
          try { game?.janus7?.ui?.open?.('shell'); } catch (err) { console.warn('[JANUS7][Shell] open failed', err); }
        }
      };
      if (Array.isArray(tools)) {
        if (!tools.some((t) => t?.name === tool.name)) tools.push(tool);
      } else if (!tools[tool.name]) {
        tools[tool.name] = tool;
      }
    };

    if (engine?.ui?.registerSceneControlsContributor) {
      engine.ui.registerSceneControlsContributor(contributor);
    } else {
      engine._pendingSceneControlContribs = engine._pendingSceneControlContribs ?? [];
      engine._pendingSceneControlContribs.push(contributor);
    }
  }
};

registerRuntimeHook('janus7:ready:ui-layer-bridge', HOOKS.ENGINE_READY, (engine) => {
  try {
    JanusUiLayerBridge.attach(engine);
    JanusUiLayerBridge.registerSceneTools(engine);
  } catch (err) {
    (engine?.core?.logger ?? console).warn?.('[JANUS7][Shell] bridge attach failed', err);
  }
});

try {
  if (game?.janus7) JanusUiLayerBridge.attach(game.janus7);
} catch (_) {}
