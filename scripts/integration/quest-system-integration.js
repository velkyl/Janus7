/**
 * Quest System Integration for JANUS7
 * Integrates Quest/Event engines and UI components into JANUS7
 */

import { JanusQuestJournal } from '../ui/quest-journal.js';
import { JanusEventPopup } from '../ui/event-popup.js';
import { JanusDevPanel } from '../ui/dev-panel.js';
import { JanusContentLoader } from '../academy/content/content-loader.js';
import { JanusEffectAdapter } from '../academy/effects/effect-adapter.js';
import { JanusConditionContextProvider } from '../academy/conditions/context-provider.js';
import { JanusConditionEvaluator } from '../academy/conditions/condition-evaluator.js';
import { JanusEventsEngineExtended as JanusEventsEngine } from '../academy/events/event-engine.js';
import { JanusQuestEngine } from '../academy/quests/quest-engine.js';
import { HOOKS, registerRuntimeHook } from '../core/public-api.mjs';

/** @returns {import('../../core/logger.js').JanusLogger|Console} */
const _qlog = () => game?.janus7?.core?.logger ?? console;
/**
 * Initialize Quest System Integration
 */
export class QuestSystemIntegration {
  static async initialize(engine) {
    _qlog().info?.('[JANUS7] Initializing Quest System...');

    // Register UI Components
    CONFIG.janus7Quest = {
      ui: {
        QuestJournal: JanusQuestJournal,
        EventPopup: JanusEventPopup,
        DevPanel: JanusDevPanel
      }
    };

    // Register Scene Controls via UI extension point (Sprint B)
    // NOTE: Foundry core hook getSceneControlButtons stays in scripts/janus.mjs.
    this.registerSceneControlsContributor(engine);

    // Setup Hooks
    this.setupHooks();

    // Initialize Engines
    await this.initializeEngines(engine);

    _qlog().info?.('[JANUS7] Quest System initialized');
  }

  /**
   * Register a SceneControls contributor without touching Foundry core hooks.
   * @param {any} engine
   */
  static registerSceneControlsContributor(engine) {
    const contributor = (controls) => {
      try {
        // Normalize Foundry controls payload (v11–v13)
        const list = Array.isArray(controls)
          ? controls
          : (controls?.controls ?? controls?.items ?? controls?.data ?? []);
        const tokenControls = Array.isArray(list) ? list.find((c) => c?.name === 'token') : null;
        if (!tokenControls) return;
        if (!Array.isArray(tokenControls.tools)) {
          tokenControls.tools = tokenControls.tools ? Array.from(tokenControls.tools) : [];
        }

        tokenControls.tools.push({
          name: 'janus7-quest-journal',
          title: 'JANUS7 Quests',
          icon: 'fas fa-book-open',
          visible: true,
          onClick: () => {
            try {
              const journal = new JanusQuestJournal();
              journal.render(true);
            } catch (e) {
              _qlog().error?.('[JANUS7] Quest Journal open failed:', e);
            }
          }
        });

        tokenControls.tools.push({
          name: 'janus7-quest-dev-panel',
          title: 'JANUS7 Quest Dev Panel',
          icon: 'fas fa-wrench',
          visible: true,
          onClick: () => {
            try {
              const panel = new JanusDevPanel();
              // ApplicationV2 expects an options object, not a boolean.
              panel.render({ force: true });
            } catch (e) {
              _qlog().error?.('[JANUS7] Quest Dev Panel open failed:', e);
            }
          }
        });
      } catch (err) {
        _qlog().warn?.('[JANUS7] Quest scene controls contributor failed:', err);
      }
    };

    // UI may not be attached yet (depends on load order). Queue if needed.
    if (engine?.ui?.registerSceneControlsContributor) {
      engine.ui.registerSceneControlsContributor(contributor);
    } else {
      engine._pendingSceneControlContribs = engine._pendingSceneControlContribs ?? [];
      engine._pendingSceneControlContribs.push(contributor);
    }
  }

  static setupHooks() {
    // Auto-show event popup when event is presented
    registerRuntimeHook('janus7:quest:event-shown', HOOKS.EVENT_SHOWN, async ({eventId, actorId, event}) => {
      // FIX P0-02: game.user kann während früher Hooks noch null sein.
      if (game?.user?.isGM) {
        const popup = new JanusEventPopup({eventId, actorId, event});
        // ApplicationV2 expects an options object, not a boolean.
        popup.render({ force: true });
      }
    });

    // FIX P0-03: Quest-Notifications wurden hier UND in quest-journal.js doppelt registriert.
    // Diese Hooks werden entfernt — quest-journal.js ist der kanonische Ort für UI-Notifications.
    // (quest-system-integration.js ist der Engine-Layer, nicht der UI-Layer.)
  }

  static async initializeEngines(engine) {
    const logger = engine.core?.logger;
    const state = engine.core?.state;
    const validator = engine.core?.validator;
    const io = engine.core?.io;
    const calendar = engine.simulation?.calendar;
    const dsa5Bridge = engine.bridge?.dsa5;

    if (!state) {
      _qlog().error?.('[JANUS7] Quest System: State Manager nicht gefunden!');
      return;
    }

    // FIX P1-06: engine.academy.data NIEMALS mit {} überschreiben wenn es bereits
    // eine AcademyDataApi-Instanz ist. Ein leeres {} zerstoert die API still.
    // Nur initialisieren wenn academy oder academy.data völlig fehlt (null/undefined).
    if (!engine.academy) {
      engine.academy = {};
    }
    if (!engine.academy.data) {
      // Nur als letzter Notfall-Fallback — normalerweise setzt Phase 3 academy.data.
      _qlog().warn?.('[JANUS7] Quest System: engine.academy.data fehlt nach Phase 3. Quest-Content-Laden degradiert.');
      engine.academy.data = { _placeholder: true };
    }

    // Load content via AcademyDataApi first, fallback to direct loader. Because of course duplicate loaders are how bugs breed.
    try {
      const contentRegistry = await engine.academy.data.getContentRegistry({ logger });
      engine.academy.data.content = contentRegistry;
      _qlog().info?.('[JANUS7] Quest content loaded via AcademyDataApi:', {
        quests: contentRegistry.quests?.length || 0,
        events: contentRegistry.events?.length || 0,
        effects: contentRegistry.effects?.length || 0
      });
    } catch (err) {
      _qlog().warn?.('[JANUS7] Quest content loading via AcademyDataApi failed, fallback to direct loader.', err);
      try {
        const contentLoader = new JanusContentLoader({io, logger});
        const contentRegistry = await contentLoader.load();
        engine.academy.data.content = contentRegistry;
      } catch (innerErr) {
        _qlog().error?.('[JANUS7] Quest content loading failed:', innerErr);
      }
    }

    // Initialize engines
    const effectAdapter = new JanusEffectAdapter({
      state,
      validator,
      logger,
      registry: engine.academy.data.content
    });

    const contextProvider = new JanusConditionContextProvider({
      state,
      calendar,
      academyData: engine.academy.data,
      dsa5Bridge
    });

    const conditionEvaluator = new JanusConditionEvaluator({
      contextProvider,
      dsa5Bridge,
      logger
    });

    const eventsEngine = new JanusEventsEngine({
      state,
      logger,
      academyData: engine.academy.data,
      calendar,
      conditions: conditionEvaluator,
      effects: effectAdapter
    });

    const questsEngine = new JanusQuestEngine({
      state,
      logger,
      academyData: engine.academy.data,
      events: eventsEngine,
      conditions: conditionEvaluator,
      effects: effectAdapter,
      social: engine.simulation?.social ?? engine.academy?.social ?? engine.social,
      scoring: engine.simulation?.scoring ?? engine.academy?.scoring ?? engine.scoring
    });

    // Attach to engine
    engine.academy.effects = effectAdapter;
    engine.academy.conditions = conditionEvaluator;
    engine.academy.events = eventsEngine;
    engine.academy.quests = questsEngine;
    engine.simulation = engine.simulation ?? {};
    engine.simulation.effects = engine.simulation.effects ?? effectAdapter;
    engine.simulation.conditions = engine.simulation.conditions ?? conditionEvaluator;
    engine.simulation.events = engine.simulation.events ?? eventsEngine;
    engine.simulation.quests = engine.simulation.quests ?? questsEngine;

    // FIX P3-04: game.janus7Quest war außerhalb des etablierten game.janus7.*-Namespaces.
    // Jetzt im kanonischen Namespace unter game.janus7.quest exposiert.
    const questApi = {
      openJournal: () => new JanusQuestJournal().render({ force: true }),
      openDevPanel: () => new JanusDevPanel().render({ force: true }),
      showEvent: (eventId, actorId, event) => new JanusEventPopup({eventId, actorId, event}).render({ force: true })
    };
    // Primärer Namespace
    if (game?.janus7) game.janus7.quest = questApi;
    // Legacy-Alias für bestehende Makros die game.janus7Quest nutzen.
    game.janus7Quest = questApi;

    logger?.debug?.('[JANUS7] Quest summaries prepared', {
      activeQuests: engine.academy.data.buildQuestSummary?.().filter?.((q) => q.status === 'active')?.length ?? 0,
      rumors: engine.academy.data.buildRumorBoard?.().length ?? 0,
      factions: engine.academy.data.buildFactionStanding?.().length ?? 0
    });
    ui.notifications.info('JANUS7 Quest System geladen');
  }
}

// Initialize on janus7Ready hook
registerRuntimeHook('janus7:ready:quest-system', HOOKS.ENGINE_READY, async (engine) => {
  try {
    await QuestSystemIntegration.initialize(engine);
  } catch (err) {
    _qlog().error?.('[JANUS7] Quest System Integration failed:', err);
  }
});
