
import { getQuickPanels } from './panel-registry.js';
import { HOOKS } from '../../core/hooks/topics.js';
import { registerRuntimeHook } from '../../core/hooks/runtime.js';
import { JanusConfig } from '../../core/config.js';
import { JanusProfileRegistry } from '../../core/profiles/index.js';

const GM_OVERLAY_ID = 'janus7-gm-quick-overlay';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * JANUS7 GM Quick Access Overlay (ApplicationV2)
 * High-performance, profile-aware GM controls.
 */
class JanusGmQuickOverlayApp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this._engine = null;
    this._hookIds = [];
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
      openScoring: this._onOpenScoring
    }
  };

  /** @override */
  static PARTS = {
    content: {
      template: 'modules/Janus7/templates/ui/gm-overlay.hbs'
    }
  };

  attach(engine) {
    this._engine = engine ?? null;
    if (this._shouldShow()) {
      this.render({ force: true });
      this._setupHooks();
    }
  }

  detach() {
    this.close();
    this._engine = null;
    this._clearHooks();
  }

  _shouldShow() {
    return !!this._engine && !!game?.user?.isGM && (JanusConfig.get('enableUI') !== false);
  }

  /** @override */
  _onClose() {
    this._clearHooks();
  }

  _setupHooks() {
    this._clearHooks();
    const topics = [HOOKS.STATE_CHANGED, HOOKS.DATE_CHANGED, HOOKS.SCORE_CHANGED];
    for (const topic of topics) {
      const id = Hooks.on(topic, () => this.render());
      this._hookIds.push({ topic, id });
    }
  }

  _clearHooks() {
    for (const hook of this._hookIds) {
      Hooks.off(hook.topic, hook.id);
    }
    this._hookIds = [];
  }

  /** @override */
  async _prepareContext(options) {
    const director = this._engine?.director;
    if (!director) return { time: {}, scoring: {}, profile: { name: 'JANUS7' } };

    const profile = JanusProfileRegistry.getActive();
    const timeRef = director.time.getRef() ?? {};
    const summary = director.getRuntimeSummary() ?? {};
    
    // Calculate scoring progress for bars (top 3 circles)
    const topCircles = (summary.scoring?.topCircles || []).map(c => {
      const score = Number(c.score || 0);
      const max = Math.max(100, ...summary.scoring.topCircles.map(x => Number(x.score)));
      return {
          ...c,
          progress: Math.min(100, Math.round((score / max) * 100))
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
      }
    };
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
