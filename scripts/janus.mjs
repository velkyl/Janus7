/**
 * @file scripts/janus.mjs
 * @module janus7
 * @phase A1 — Single Entry Point
 *
 * Architekturvertrag:
 * - DIESE Datei ist der einzige erlaubte Einstiegspunkt (module.json → esmodules).
 * - NUR diese Datei darf Hooks.on / Hooks.once gegen Foundry-Core-Hooks registrieren.
 * - Alle Phasen-Module werden hier als Setup-Funktionen orchestriert.
 *
 * Import-Regel:
 *   core/   → darf KEINE Hooks.once('init'/'ready') mehr enthalten.
 *   Phasen-Integrationen exportieren setupPhaseX(engine) und werden hier aufgerufen.
 */

// ─── Core Engine (Phase 1) ───────────────────────────────────────────
import { Janus7Engine, JANUS_GLOBAL, getJanus7, getJanusCore } from '../core/index.js';
import { JanusConfig } from '../core/config.js';
import { MODULE_ID, STATE_PATHS, AVENTURIAN_CALENDAR, moduleAssetPath } from '../core/common.js';
import { JanusCapabilities } from '../core/capabilities.js';
import { JanusTimeReactor } from '../services/time/reactor.js';
import { JanusCron } from '../services/cron/JanusCron.js';
import { handleChatMessage } from '../services/chat/cli.js';

import { SceneRegionsBridge } from '../bridges/foundry/SceneRegionsBridge.mjs';
import { JanusShellApp } from '../ui/apps/JanusShellApp.js';
import { registerLessonDocuments, ensureLessonDocumentsReady } from './integration/phase2-document-content-integration.js';
import { JANUS_LESSON_ITEM_TYPE, JANUS_LESSON_SHEET_CLASS, JANUS_LESSON_SUBTYPE } from './documents/lesson-constants.js';

// Sidebar Tab (Foundry v13+)
// - left scene controls are registered here during init/render lifecycle
// - implementation is a small AppV2-based sidebar tab

// ─── Re-exports for backward compatibility (game.janus7.core.*) ───────
export { getJanus7, getJanusCore };

// ─── Boot-Guard: verhindert doppelte Hook-Registrierung ────────────────
const __BOOT_KEY__ = '__janus7_boot_v2__';
globalThis[__BOOT_KEY__] ??= { registered: false };
if (globalThis[__BOOT_KEY__].registered) {
  console.warn('[JANUS7] Duplicate evaluation of scripts/janus.mjs — skipping hook registration.');
}
const _shouldRegister = !globalThis[__BOOT_KEY__].registered;
globalThis[__BOOT_KEY__].registered = true;

const __CORE_HOOKS_KEY__ = '__janus7_core_hook_ids__';
globalThis[__CORE_HOOKS_KEY__] ??= [];

function _registerCoreHook(name, fn) {
  const id = Hooks.on(name, fn);
  globalThis[__CORE_HOOKS_KEY__].push({ name, id });
  return id;
}

function _cleanupCoreHooks() {
  const entries = Array.isArray(globalThis[__CORE_HOOKS_KEY__]) ? globalThis[__CORE_HOOKS_KEY__] : [];
  for (const entry of entries) {
    try { Hooks.off(entry.name, entry.id); } catch (e) { /* noop - hook already off */ }
  }
  globalThis[__CORE_HOOKS_KEY__] = [];
}

// ─── Phase Integration Loaders (dynamic, fail-safe) ────────────────────

/**
 * Dynamically imports phase integration modules based on config flags.
 * Each integration module must export a default setup function.
 * @param {Janus7Engine} engine
 * @returns {Promise<void>}
 */
async function loadPhaseIntegrations(engine) {
  const logger = engine?.core?.logger;

  // ─────────────────────────────────────────────────────────────
  // Phase 2+3: Dependency Injection
  // Imported here (async context) to keep core/index.js Phase-1-clean.
  // ─────────────────────────────────────────────────────────────
  try {
    const [{ default: AcademyDataApi }, { DSA5SystemBridge }] = await Promise.all([
      import('../academy/data-api.js'),
      import('../bridge/dsa5/index.js'),
    ]);
    engine.academy ??= {};
    engine.bridge ??= {};

    engine.academy.data = new AcademyDataApi({
      logger: engine.core.logger,
      validator: engine.core.validator
    });
    if (!engine.academy.dataApi) engine.academy.dataApi = engine.academy.data;
    engine.bridge.dsa5 = new DSA5SystemBridge({
      logger: engine.core.logger,
      academy: engine.academy.data
    });
    engine.dsa5 = engine.bridge.dsa5;
    logger?.debug?.('[JANUS7] Phase 2+3 injiziert (AcademyDataApi, DSA5SystemBridge).');
  } catch (err) {
    _recordIssue(engine, 'phase2-3', 'dependency-injection', err, 'error');
    logger?.error?.('[JANUS7] Phase 2+3 Injection fehlgeschlagen.', { message: err?.message });
  }

  const enabled = {
    simulation: JanusConfig.get('enableSimulation') !== false,
    quest: JanusConfig.get('enableQuestSystem') !== false,
    atmosphere: JanusConfig.get('enableAtmosphere') !== false,
    ui: JanusConfig.get('enableUI') !== false,
    phase7: JanusConfig.get('enablePhase7') !== false,
  };

  logger?.info?.('[JANUS7] Phase integrations activating:', enabled);

  // Phase 4: Simulation (always load; module respects enableSimulation kill-switch)
  try {
    await import('../academy/phase4.js');
    logger?.debug?.('[JANUS7] Phase 4 (Simulation) loaded.');
  } catch (err) {
    _recordIssue(engine, 'phase4', 'module-load', err);
    logger?.warn?.('[JANUS7] Phase 4 failed to load.', { message: err?.message });
  }


  // Phase 5: Atmosphere
  if (enabled.atmosphere) {
    try {
      await import('../atmosphere/phase5.js');
      logger?.debug?.('[JANUS7] Phase 5 (Atmosphere) loaded.');
    } catch (err) {
      _recordIssue(engine, 'phase5', 'module-load', err);
      logger?.warn?.('[JANUS7] Phase 5 failed to load.', { message: err?.message });
    }
  }

  // Phase Quest/Event System
  if (enabled.quest) {
    try {
      await import('../scripts/integration/quest-system-integration.js');
      logger?.debug?.('[JANUS7] Quest/Event integration loaded.');
    } catch (err) {
      _recordIssue(engine, 'quest', 'module-load', err);
      logger?.warn?.('[JANUS7] Quest integration failed to load.', { message: err?.message });
    }
  }

  // Living World: scheduler on top of calendar/date-changed hooks
  if (enabled.simulation) {
    try {
      await import('../scripts/integration/phase4-living-world-integration.js');
      logger?.debug?.('[JANUS7] Phase 4.5 (Living World) loaded.');
    } catch (err) {
      _recordIssue(engine, 'phase4.5', 'module-load', err);
      logger?.warn?.('[JANUS7] Phase 4.5 (Living World) failed to load.', { message: err?.message });
    }
  }

  // Academy Progression: resources, social links, milestones, collections, activities
  if (enabled.simulation) {
    try {
      await import('../scripts/integration/phase4-academy-progression-integration.js');
      logger?.debug?.('[JANUS7] Phase 4.6 (Academy Progression) loaded.');
    } catch (err) {
      _recordIssue(engine, 'phase4.6', 'module-load', err);
      logger?.warn?.('[JANUS7] Phase 4.6 (Academy Progression) failed to load.', { message: err?.message });
    }
  }

  // Phase 6: UI
  if (enabled.ui) {
    try {
      await import('../scripts/integration/phase6-ui-integration.js');
      logger?.debug?.('[JANUS7] Phase 6 (UI) loaded.');
    } catch (err) {
      _recordIssue(engine, 'phase6', 'module-load', err);
      logger?.warn?.('[JANUS7] Phase 6 failed to load.', { message: err?.message });
    }

    // Phase 4 → UI bridge: optional ChatMessage rendering for janus7EventMessage
    // (keeps Phase 4 headless; rendering is a Phase 6 concern)
    try {
      await import('../scripts/integration/phase4-eventmessage-ui.js');
      logger?.debug?.('[JANUS7] Phase 4 EventMessage UI bridge loaded.');
    } catch (err) {
      _recordIssue(engine, 'phase4-eventmessage-ui', 'module-load', err);
      logger?.warn?.('[JANUS7] Phase 4 EventMessage UI bridge failed to load.', { message: err?.message });
    }
  }

  // Phase 7: KI Roundtrip (AI = Legacy Alias, Kill-Switch via enablePhase7)
  if (enabled.phase7) {

    try {
      await import('../scripts/integration/phase7-ki-integration.js');
      logger?.debug?.('[JANUS7] Phase 7 (KI) loaded.');
    } catch (err) {
      _recordIssue(engine, 'phase7', 'module-load', err);
      logger?.warn?.('[JANUS7] Phase 7 (KI) failed to load.', { message: err?.message });
    }
  } else {
    logger?.info?.('[JANUS7] Phase 7 disabled (enablePhase7=false).');
  }

  // Phase 8 Meta-Layer Extensions
  try {
    if (JanusConfig.isFeatureEnabled('thesisManager')) {
      const mod = await import('../extensions/thesis-manager/thesis-manager.js');
      if (mod.bootThesisManager) mod.bootThesisManager();
      logger?.debug?.('[JANUS7] Thesis-Manager loaded.');
    }
  } catch (err) {
    _recordIssue(engine, 'phase8', 'thesisManager-load', err);
    logger?.warn?.('[JANUS7] Thesis-Manager failed to load.', { message: err?.message });
  }

  try {
    if (JanusConfig.isFeatureEnabled('laborInterface')) {
      const mod = await import('../extensions/labor-interface/labor-interface.js');
      if (mod.bootLaborInterface) mod.bootLaborInterface();
      logger?.debug?.('[JANUS7] Labor-Interface loaded.');
    }
  } catch (err) {
    _recordIssue(engine, 'phase8', 'laborInterface-load', err);
    logger?.warn?.('[JANUS7] Labor-Interface failed to load.', { message: err?.message });
  }

  try {
    if (JanusConfig.isFeatureEnabled('doomEngine')) {
      const mod = await import('../extensions/doom-engine/doom-engine.js');
      if (mod.bootDoomEngine) mod.bootDoomEngine();
      logger?.debug?.('[JANUS7] Doom-Engine loaded.');
    }
  } catch (err) {
    _recordIssue(engine, 'phase8', 'doomEngine-load', err);
    logger?.warn?.('[JANUS7] Doom-Engine failed to load.', { message: err?.message });
  }

  // Optional: Test Runner (always best-effort)
  try {
    await import('../scripts/integration/test-runner-integration.js');
    logger?.debug?.('[JANUS7] Test runner integration loaded.');
  } catch (err) {
    _recordIssue(engine, 'test.runner', 'module-load', err);
    logger?.warn?.('[JANUS7] Test runner integration failed to load.', { message: err?.message });
  }

  // ─────────────────────────────────────────────────────────────
  // Graph Service Integration
  // Load the graph service integration last so that it can rely on
  // academy, quest and UI modules being available.  This import
  // registers a janus7Ready hook to attach the graph to the engine.
  try {
    await import('../scripts/integration/graph-service-integration.js');
    logger?.debug?.('[JANUS7] Graph service integration loaded.');
  } catch (err) {
    _recordIssue(engine, 'graph', 'module-load', err);
    logger?.warn?.('[JANUS7] Graph service integration failed to load.', { message: err?.message });
  }
}

function _readyErrMeta(err) {
  if (err instanceof Error) return { name: err.name, message: err.message, stack: err.stack };
  try { return { message: String(err?.message ?? err), detail: JSON.stringify(err) }; } catch { return { message: String(err) }; }
}

function _markReady(engine, key, instance) {
  if (!key || instance == null) return instance ?? null;
  try {
    engine?.markServiceReady?.(key, instance);
  } catch (e) {
    (engine?.core?.logger ?? console).debug?.(`[JANUS7] _markReady failed for key "${key}"`, e);
  }
  return instance;
}

function _recordIssue(engine, phase, context, err, severity = 'warn') {
  try {
    if (severity === 'warn') engine?.recordWarning?.(phase, context, err);
    else engine?.recordError?.(phase, context, err, severity);
  } catch (e) {
    (engine?.core?.logger ?? console).debug?.(`[JANUS7] _recordIssue failed for phase "${phase}" and context "${context}"`, e);
  }
  return err;
}

function runReadySanityCheck(engine) {
  const issues = [];
  if (game?.system?.id !== 'dsa5') {
    issues.push(`Erwartetes System: dsa5, gefunden: ${game?.system?.id ?? 'unknown'}`);
  }
  try {
    const requiredKeys = ['coreState', 'enableUI', 'enablePhase7'];
    for (const key of requiredKeys) {
      if (!game?.settings?.settings?.has?.(`${MODULE_ID}.${key}`)) {
        issues.push(`Fehlendes Setting: ${MODULE_ID}.${key}`);
      }
    }
  } catch (_err) {
    issues.push('Settings-Registry konnte nicht geprüft werden.');
    (engine?.core?.logger ?? console).debug?.('[JANUS7] runReadySanityCheck registry check failed', _err);
  }
  if (issues.length && game?.user?.isGM) {
    ui.notifications?.error?.(`JANUS7 Sanity-Check fehlgeschlagen: ${issues.join(' | ')}`);
  }
  if (issues.length) {
    (engine?.core?.logger ?? console).warn?.('[JANUS7] Ready sanity check failed', { issues });
  }
  return issues;
}

// ─── HOOK: init  (Phase 1 bootstrap) ─────────────────────────────────
if (_shouldRegister) {
  Hooks.once('init', () => {
    try { 
      registerLessonDocuments(); 
      // Optimized Pass 1: Register UI Partials for declarative rendering
      import('./integration/ui-partials.js').then(m => m.registerShellPartials());
    } catch (err) { console.warn('[JANUS7] registerLessonDocuments or partials failed', err); }
    console.log(`
 _______________________________________________________________
 _____ ___  _   _ _   _ ____  ______   __ __     _______ _____
|  ___/ _ \\| | | | \\ | |  _ \\|  _ \\ \\ / / \\ \\   / |_   _|_   _|
| |_ | | | | | | |  \\| | | | | |_) \\ V /   \\ \\ / /  | |   | |
|  _|| |_| | |_| | |\\  | |_| |  _ < | |     \\ V /   | |   | |
|_|   \\___/ \\___/|_| \\_|____/|_| \\_\\|_|      \\_/    |_|   |_|
===============================================================
JANUS7 — Academy Operating System
`);

// Register settings menu only.
// Right sidebar integration was intentionally removed in v0.9.10.9 because
// the full JANUS surface is exposed via the left scene controls toolbar.
try {
  const uiEnabled = JanusConfig.get('enableUI') !== false;
  if (uiEnabled) {
    try {
      game.settings.registerMenu(MODULE_ID, 'janusControlPanel', {
        name: 'JANUS7 Control Panel',
        label: 'Open',
        icon: 'fas fa-cogs',
        type: JanusShellApp,
        restricted: true
      });
    } catch (err) {
      console.warn('[JANUS7] settings.registerMenu failed:', err);
    }
  }
} catch (err) {
  console.warn('[JANUS7] Settings menu registration failed:', err); // pre-logger: console intentional
}

    const engine = new Janus7Engine();

    // Expose globally immediately so integrations can reference it
    JANUS_GLOBAL.engine = engine;
    globalThis.janus7 = engine;
    if (globalThis.game) globalThis.game.janus7 = engine;

    // ─── Phase-X integration: DSA5 system-deep registry ────────────────────────
    // Align with other official modules like dsa5-core or dsa5-bestiary.
    if (game.dsa5?.config) {
      game.dsa5.config.helpContent.push(
        { name: "janus",  command: "/janus",  example: "/janus" },
        { name: "academy", command: "/academy", example: "/academy" }
      );
    }
    if (game.dsa5?.apps) {
      game.dsa5.apps.janus7 = engine;
    }

    // ─── Foundry Core Hook Delegation (Architekturvertrag) ─────────────────
    // Keep Core-Hooks ONLY here; delegate into the system bridge if present.
    _registerCoreHook('modifyTokenAttribute', (data, updates) => {
      try {
        const hb = engine?.bridge?.dsa5?.hooks;
        if (hb?.handleModifyTokenAttribute) hb.handleModifyTokenAttribute(data, updates);
      } catch (_e) {
        (engine?.core?.logger ?? console).debug?.('[JANUS7] modifyTokenAttribute hook handler failed', _e);
      }
    });

    // Stubs so nothing crashes if Phase 4+ is not yet loaded
    engine.simulation = engine.simulation ?? {};
    engine.simulation.calendar = engine.simulation.calendar ?? null;

    // Null test stubs (replaced by test harness if loaded)
    engine.test = engine.test ?? {
      registry: { register() {}, get() { return null; }, list() { return []; } },
      runner: { async runAll() { return []; } }
    };

    // Phase 1: Core Init
    try {
      engine.init();
    } catch (err) {
      _recordIssue(engine, 'core', 'init', err, 'error');
      (engine?.core?.logger ?? console).error?.('[JANUS7] Engine init failed (Phase 1).', { message: err?.message, stack: err?.stack });
    }

    // Director uses game.janus7.calendar.* — set up a live proxy so it routes
    // to the engine that is attached by Phase 4 (academy/phase4.js).
    // ---------------------------------------------------------------------------
    const _calendar = () => engine.simulation?.calendar ?? engine.academy?.calendar ?? null;
    engine.calendar = {
      get currentDay()       { return _calendar()?.currentDay ?? null; },
      get currentWeek()      { return _calendar()?.currentWeek ?? null; },
      get currentTrimester() { return _calendar()?.currentTrimester ?? null; },
      get currentYear()      { return _calendar()?.currentYear ?? null; },
      getCurrentSlotRef: (...a) => _calendar()?.getCurrentSlotRef?.(...a) ?? null,
      advanceSlot:       (...a) => _calendar()?.advanceSlot?.(...a),
      advancePhase:      (...a) => _calendar()?.advancePhase?.(...a),
      advanceDay:        (...a) => _calendar()?.advanceDay?.(...a),
      setSlot: async (di, si) => {
        const cal = _calendar();
        if (cal?.setSlot) return cal.setSlot(di, si);
        const state = engine?.core?.state;
        if (state) await state.transaction(() => {
          state.set(STATE_PATHS.TIME_SLOT_INDEX, Number(si) || 0);
          state.set(STATE_PATHS.TIME_DAY_INDEX,  Number(di) || 0);
        });
      },
      resetToStart: async () => {
        const cal = _calendar();
        if (cal?.resetToStart) return cal.resetToStart();
        const state = engine?.core?.state;
        if (state) await state.transaction(() => {
          state.set(STATE_PATHS.TIME_YEAR, AVENTURIAN_CALENDAR.DEFAULT_START_YEAR); state.set(STATE_PATHS.TIME_TRIMESTER, 1);
          state.set(STATE_PATHS.TIME_WEEK, 1);    state.set(STATE_PATHS.TIME_DAY_INDEX, 0);
          state.set(STATE_PATHS.TIME_SLOT_INDEX, 0);
          state.set(STATE_PATHS.TIME_DAY_NAME, 'Praiosstag'); state.set(STATE_PATHS.TIME_SLOT_NAME, 'Morgens');
        });
      },
    };

    // Back-compat aliases
    engine.engine  = engine;

    // Pre-ready chain: phase integrations (async, stored as promise).
    // Awaited in Hooks.once('ready') before engine.ready() runs — garantiert
    // dass alle Phase-Integrationen vollständig geladen sind, bevor ready() aufgerufen wird.
    const _preReadyStart = Date.now();
    JANUS_GLOBAL.preReady = (async () => {
      await loadPhaseIntegrations(engine);
      const elapsed = Date.now() - _preReadyStart;
      if (elapsed > 5000) {
        (engine?.core?.logger ?? console).warn?.(
          `[JANUS7] loadPhaseIntegrations dauerte ${elapsed}ms — Ladezeit ungewöhnlich hoch.`
        );
      }
    })();

    // Cleanup on world close
    Hooks.once('closingWorld', () => {
      try { 
        engine.cleanup(); 
      } catch (e) {
        console.debug('[JANUS7] worldClosing: engine.cleanup failed', e);
      }
      try { 
        _cleanupCoreHooks(); 
      } catch (e) {
        console.debug('[JANUS7] worldClosing: _cleanupCoreHooks failed', e);
      }
      try { 
        globalThis[__BOOT_KEY__].registered = false; 
      } catch (e) {
        console.debug('[JANUS7] worldClosing: boot-guard reset failed', e);
      }
    });
  });

  // ─── HOOK: ready (Phase 1→6 finalize) ────────────────────────────────
  Hooks.once('ready', async () => {
    const engine = JANUS_GLOBAL.engine;
    if (!engine) return;
    const log = engine?.core?.logger ?? console;

    try {
      log.debug?.('[JANUS7] ready.pipeline start');
      await (JANUS_GLOBAL.preReady ?? Promise.resolve());
      log.debug?.('[JANUS7] ready.step preReady ok');
    } catch (err) {
      _recordIssue(engine, 'ready.pipeline', 'preReady', err, 'error');
      log.error?.('[JANUS7] ready.step preReady failed', _readyErrMeta(err));
      ui.notifications?.error?.('JANUS7 Pre-Ready fehlgeschlagen. Details in der Konsole.');
      return;
    }

    try {
      const sanityIssues = runReadySanityCheck(engine);
      if (sanityIssues.length) {
        _recordIssue(engine, 'ready.pipeline', 'sanity', sanityIssues.join(' | '));
      }
      log.debug?.('[JANUS7] ready.step sanity ok');
    } catch (err) {
      _recordIssue(engine, 'ready.pipeline', 'sanity', err);
      log.warn?.('[JANUS7] ready.step sanity failed', _readyErrMeta(err));
    }

    try {
      if (typeof engine?.ready === 'function') {
        await engine.ready();
      } else {
        log.warn?.('[JANUS7] Engine nicht verfügbar — Init übersprungen');
      }
      log.debug?.('[JANUS7] ready.step engine.ready ok');
    } catch (err) {
      _recordIssue(engine, 'ready.pipeline', 'engine.ready', err, 'error');
      log.error?.('[JANUS7] ready.step engine.ready failed', _readyErrMeta(err));
      ui.notifications?.error?.('JANUS7 konnte engine.ready() nicht vollständig abschließen. Details in der Konsole.');
      return;
    }

    if (!engine.capabilities) {
      try {
        engine.capabilities = new JanusCapabilities(engine);
        Object.freeze(engine.capabilities);
        if (globalThis.game?.janus7) globalThis.game.janus7.capabilities = engine.capabilities;
        _markReady(engine, 'core.capabilities', engine.capabilities);
        log.info?.('[JANUS7] capabilities layer registered');
      } catch (capErr) {
        _recordIssue(engine, 'core.capabilities', 'init', capErr);
        log.warn?.('[JANUS7] capabilities init failed', _readyErrMeta(capErr));
      }
    }

    if (JanusConfig.get('enablePhase7') !== false && !engine?.ki?.exportBundle) {
      try {
        const mod = await import('../scripts/integration/phase7-ki-integration.js');
        mod?.attachPhase7Ki?.(engine);
        log.debug?.('[JANUS7] Phase 7 KI attach ensured after ready.');
      } catch (phase7Err) {
        _recordIssue(engine, 'phase7', 'attach-ensure', phase7Err);
        log.warn?.('[JANUS7] Phase 7 KI attach ensure failed', _readyErrMeta(phase7Err));
      }
    }

    if (!engine._timeReactor) {
      try {
        engine._timeReactor = new JanusTimeReactor(engine);
        engine._timeReactor.register();
        engine.services ??= {};
        engine.services.time ??= {};
        engine.services.time.reactor = engine._timeReactor;
        engine.time ??= {};
        engine.time.reactor = engine._timeReactor;
        _markReady(engine, 'services.time.reactor', engine._timeReactor);
        log.info?.('[JANUS7] TimeReactor registered');
      } catch (reactorErr) {
        _recordIssue(engine, 'services.time.reactor', 'init', reactorErr);
        log.warn?.('[JANUS7] TimeReactor init failed', _readyErrMeta(reactorErr));
      }
    }

    if (!engine._cron) {
      try {
        // A1 FIX: game.settings.get() → JanusConfig.get() (SSOT Gateway)
        const cronWeekly    = JanusConfig.get('cronWeeklyEnabled')    !== false;
        const cronTrimester = JanusConfig.get('cronTrimesterEnabled') !== false;
        engine._cron = new JanusCron({ engine, logger: engine.core?.logger, builtinWeekly: cronWeekly, builtinTrimester: cronTrimester });
        engine._cron.register();
        engine.services ??= {};
        engine.services.cron = engine._cron;
        engine.cron = engine._cron;
        _markReady(engine, 'services.cron', engine._cron);
        log.info?.(`[JANUS7] JanusCron registered (weekly=${cronWeekly}, trimester=${cronTrimester})`);
      } catch (cronErr) {
        _recordIssue(engine, 'services.cron', 'init', cronErr);
        log.warn?.('[JANUS7] JanusCron init failed', _readyErrMeta(cronErr));
      }
    }

try {
  const docSync = await ensureLessonDocumentsReady(engine, { forceSync: false });
  engine.documents ??= {};
  engine.documents.lesson = engine.academy?.documents?.lessons ?? {
    itemType: JANUS_LESSON_ITEM_TYPE,
    subtype: JANUS_LESSON_SUBTYPE,
    sheetClass: JANUS_LESSON_SHEET_CLASS
  };
  _markReady(engine, 'documents.lesson', engine.documents.lesson);
  log.info?.(`[JANUS7] Lesson documents ready (created=${docSync?.created ?? 0}, updated=${docSync?.updated ?? 0}).`);
} catch (lessonDocErr) {
  _recordIssue(engine, 'documents.lesson', 'sync', lessonDocErr);
  log.warn?.('[JANUS7] Lesson document sync failed', _readyErrMeta(lessonDocErr));
}

    if (!engine._sceneRegionsBridge) {
      try {
        engine._sceneRegionsBridge = new SceneRegionsBridge(engine);
        engine._sceneRegionsBridge.register();
        engine.bridges ??= {};
        engine.bridges.foundry ??= {};
        engine.bridges.foundry.sceneRegions = engine._sceneRegionsBridge;
        engine.bridges.sceneRegions = engine._sceneRegionsBridge;
        _markReady(engine, 'bridges.foundry.sceneRegions', engine._sceneRegionsBridge);
        log.info?.('[JANUS7] SceneRegionsBridge registered');
      } catch (bridgeErr) {
        _recordIssue(engine, 'bridges.foundry.sceneRegions', 'init', bridgeErr);
        log.warn?.('[JANUS7] SceneRegionsBridge init failed', _readyErrMeta(bridgeErr));
      }
    }

    // ─── Academy JSON Hot-Reload (Foundry hotReload Hook) ──────────────────
    // Wenn JSON-Dateien im data/-Verzeichnis via Foundry Hot-Reload geändert werden,
    // wird der Academy-Cache invalidiert und neu geladen.
    // Voraussetzung: module.json flags.hotReload.extensions enthält 'json'
    // ─────────────────────────────────────────────────────────────
    _registerCoreHook('hotReload', async ({ path: reloadPath } = {}) => {
      try {
        // Nur reagieren wenn es eine Academy JSON-Datei ist
        const isAcademyJson = typeof reloadPath === 'string'
          && reloadPath.includes('/data/')
          && reloadPath.endsWith('.json')
          && !reloadPath.includes('/tests/');
        if (!isAcademyJson) return;

        const engine = JANUS_GLOBAL.engine;
        const reloadLog = engine?.core?.logger ?? console;
        reloadLog.info?.(`[JANUS7] Hot-Reload: Academy JSON geändert (${reloadPath}) → Cache invalidieren`);

        const { default: AcademyDataApi } = await import('../academy/data-api.js');
        AcademyDataApi.resetCache();
        await AcademyDataApi.init();

        // Downstream-Systeme informieren
        Hooks.callAll('janus7.academy.data.reloaded', { source: 'hotReload', path: reloadPath });
        reloadLog.info?.('[JANUS7] Academy-Daten neu geladen (Hot-Reload abgeschlossen).');
      } catch (hotReloadErr) {
        (JANUS_GLOBAL.engine?.core?.logger ?? console).warn?.(
          '[JANUS7] Academy Hot-Reload fehlgeschlagen', { message: hotReloadErr?.message }
        );
      }
    });

    log.debug?.('[JANUS7] ready.pipeline complete');

    // ─── Phase-X integration: DSA5 Ecosystem Expansion ──────────────────────────
    try {
      if (game.dsa5?.apps?.playerMenu) {
        log.debug?.('[JANUS7] registerSubApp in DSA5 playerMenu');
        game.dsa5.apps.playerMenu.registerSubApp({
          name: "JANUS Student Terminal",
          icon: "fas fa-university",
          render: (_app) => {
             const uiReg = game.janus7?.ui;
             if (uiReg?.openShell) return uiReg.openShell();
             if (uiReg?.openControlPanel) return uiReg.openControlPanel();
          }
        });
      }
      
      // Opt-in for Journal Browser (book index) if localized.
      if (game.dsa5?.apps?.journalBrowser && game.i18n.lang === 'de') {
        log.debug?.('[JANUS7] push to DSA5 journalBrowser');
        game.dsa5.apps.journalBrowser.books.push({
          id: "JanusAcademy",
          name: "JANUS Akademie-Archiv",
          path: moduleAssetPath('data/academy/academy-book-de.json'),
          visible: true
        });
      }
    } catch (ecosystemErr) {
      log.warn?.('[JANUS7] DSA5 ecosystem integration failed (non-critical)', _readyErrMeta(ecosystemErr));
    }
  });

  // ─── HOOK: getSceneControlButtons — zentralisiert hier (Phase A3) ─────
  _registerCoreHook('renderSceneControls', () => {
    try {
      JANUS_GLOBAL.engine?.uiLayer?.refreshGmQuickOverlay?.();
    } catch (e) {
      (JANUS_GLOBAL.engine?.core?.logger ?? console).debug?.('[JANUS7] renderSceneControls overlay refresh failed', e);
    }
  });

  _registerCoreHook('canvasReady', () => {
    try {
      JANUS_GLOBAL.engine?.uiLayer?.refreshGmQuickOverlay?.();
    } catch (e) {
      (JANUS_GLOBAL.engine?.core?.logger ?? console).debug?.('[JANUS7] canvasReady overlay refresh failed', e);
    }
  });

  _registerCoreHook('getSceneControlButtons', (controls) => {
    if (!game.user?.isGM) return;
    try {
      const engine = JANUS_GLOBAL.engine;
      const logger = JANUS_GLOBAL.engine?.core?.logger ?? console;
      const i18n = game?.i18n;
      const localize = (key, fallback) => i18n?.localize?.(key) ?? fallback ?? key;

      const isObject = (value) => !!value && (typeof value === 'object') && !Array.isArray(value);
      const getTopLevelControls = (value) => {
        if (Array.isArray(value)) return value;
        if (isObject(value?.controls)) return value.controls;
        if (Array.isArray(value?.controls)) return value.controls;
        if (isObject(value?.items)) return value.items;
        if (Array.isArray(value?.items)) return value.items;
        if (isObject(value?.data)) return value.data;
        if (Array.isArray(value?.data)) return value.data;
        return value;
      };
      const top = getTopLevelControls(controls);
      const isRecord = isObject(top);
      const isList = Array.isArray(top);
      if (!isRecord && !isList) return;

      const getControlSet = (...names) => {
        if (isRecord) {
          for (const name of names) {
            if (top[name]) return top[name];
          }
          return null;
        }
        return top.find((c) => names.includes(c?.name)) ?? null;
      };

const openControlPanel = async () => {
  try {
    const uiReg = game?.janus7?.ui;
    if (uiReg?.openShell) return uiReg.openShell();
    if (uiReg?.openControlPanel) return uiReg.openControlPanel();
    const { JanusShellApp } = await import('../ui/apps/JanusShellApp.js');
    const app = JanusShellApp.showSingleton();
    app.render?.({ force: true, focus: true });
    return app;
  } catch (err) {
    logger.error?.('[JANUS7] Scene control openControlPanel fehlgeschlagen:', { message: err?.message });
  }
};

const openUiApp = async (key, label = key, options = {}) => {
  try {
    return game?.janus7?.ui?.open?.(key, options);
  } catch (err) {
    logger.error?.(`[JANUS7] Scene control ${label} fehlgeschlagen:`, { message: err?.message });
  }
};

const openQuestJournal = async () => {
  try {
    const mod = await import('../scripts/ui/quest-journal.js');
    new mod.JanusQuestJournal().render({ force: true, focus: true });
    return true;
  } catch (err) {
    logger.error?.('[JANUS7] Scene control questJournal fehlgeschlagen:', { message: err?.message });
    ui.notifications?.error?.('Quest-Journal konnte nicht geöffnet werden.');
    return false;
  }
};

const openStoryGraph = async () => {
  try {
    const { StoryGraphApp } = await import('../ui/apps/StoryGraphApp.js');
    new StoryGraphApp().render({ force: true, focus: true });
    return true;
  } catch (err) {
    logger.error?.('[JANUS7] Scene control openStoryGraph fehlgeschlagen:', { message: err?.message });
    ui.notifications?.error?.('Story Graph konnte nicht ge\u00f6ffnet werden.');
    return false;
  }
};

const openKiSearch = async () => {
  try {
    const { JanusShellApp } = await import('../ui/apps/JanusShellApp.js');
    JanusShellApp.onKiSearch();
    return true;
  } catch (err) {
    logger.error?.('[JANUS7] openKiSearch fehlgeschlagen:', { message: err?.message });
    return false;
  }
};

const runTool = (fn) => (event) => {
  event?.preventDefault?.();
  void fn();
};

const toolVisible = !!game?.user?.isGM;

const janusToolsRecord = {
  openControlPanel: {
    name: 'openControlPanel',
    title: localize('JANUS7.Menu.ControlPanel.Label', 'JANUS Shell öffnen'),
    icon: 'fas fa-cogs',
    order: 0,
    button: true,
    visible: toolVisible,
    onChange: runTool(openControlPanel)
  },
  openMasterDashboard: {
    name: 'openMasterDashboard',
    title: 'Master Dashboard (Balancing / Heat / Rumors)',
    icon: 'fas fa-crown',
    order: 0.5,
    button: true,
    visible: toolVisible,
    onChange: runTool(async () => {
      const { JanusMasterDashboard } = await import('./ui/master-dashboard.js');
      new JanusMasterDashboard().render({ force: true, focus: true });
    })
  },
  openAcademyOverview: {
    name: 'openAcademyOverview',
    title: 'Academy Overview öffnen',
    icon: 'fas fa-university',
    order: 1,
    button: true,
    visible: toolVisible,
    onChange: runTool(() => openUiApp('academyOverview', 'academyOverview'))
  },
  openScoringView: {
    name: 'openScoringView',
    title: 'Scoring öffnen',
    icon: 'fas fa-trophy',
    order: 2,
    button: true,
    visible: toolVisible,
    onChange: runTool(() => openUiApp('scoringView', 'scoringView'))
  },
  openSocialView: {
    name: 'openSocialView',
    title: 'Social View öffnen',
    icon: 'fas fa-users',
    order: 3,
    button: true,
    visible: toolVisible,
    onChange: runTool(() => openUiApp('socialView', 'socialView'))
  },
  openStoryGraph: {
    name: 'openStoryGraph',
    title: 'Story Graph \u00f6ffnen',
    icon: 'fas fa-project-diagram',
    order: 3.5,
    button: true,
    visible: toolVisible,
    onChange: runTool(openStoryGraph)
  },
  openKiSearch: {
    name: 'openKiSearch',
    title: 'KI Semantische Suche',
    icon: 'fas fa-search',
    order: 3.8,
    button: true,
    visible: toolVisible,
    onChange: runTool(openKiSearch)
  },
  openAtmosphereDJ: {
    name: 'openAtmosphereDJ',
    title: 'Atmosphere DJ öffnen',
    icon: 'fas fa-music',
    order: 4,
    button: true,
    visible: toolVisible,
    onChange: runTool(() => openUiApp('atmosphereDJ', 'atmosphereDJ'))
  },
  openQuestJournal: {
    name: 'openQuestJournal',
    title: 'Quest-Journal öffnen',
    icon: 'fas fa-book-open',
    order: 5,
    button: true,
    visible: toolVisible,
    onChange: runTool(openQuestJournal)
  },
  openSyncPanel: {
    name: 'openSyncPanel',
    title: 'Sync Panel öffnen',
    icon: 'fas fa-link',
    order: 12,
    button: true,
    visible: toolVisible,
    onChange: runTool(() => openUiApp('syncPanel', 'syncPanel'))
  },
  openStateInspector: {
    name: 'openStateInspector',
    title: 'State Inspector öffnen',
    icon: 'fas fa-database',
    order: 13,
    button: true,
    visible: toolVisible,
    onChange: runTool(() => openUiApp('stateInspector', 'stateInspector'))
  },
  openConfigPanel: {
    name: 'openConfigPanel',
    title: 'Config Panel öffnen',
    icon: 'fas fa-sliders-h',
    order: 14,
    button: true,
    visible: toolVisible,
    onChange: runTool(() => openUiApp('configPanel', 'configPanel'))
  },
  openAcademyDataStudio: {
    name: 'openAcademyDataStudio',
    title: 'Academy Data Studio öffnen',
    icon: 'fas fa-edit',
    order: 15,
    button: true,
    visible: toolVisible,
    onChange: runTool(() => openUiApp('academyDataStudio', 'academyDataStudio'))
  },
  openSessionPrep: {
    name: 'openSessionPrep',
    title: localize('JANUS7.UI.OpenSessionPrepWizard', 'Session Prep öffnen'),
    icon: 'fas fa-wand-magic-sparkles',
    order: 16,
    button: true,
    visible: toolVisible,
    onChange: runTool(() => openUiApp('shell', 'sessionPrep', { viewId: 'sessionPrep' }))
  },
  openCommandCenter: {
    name: 'openCommandCenter',
    title: 'Power Tools öffnen',
    icon: 'fas fa-terminal',
    order: 17,
    button: true,
    visible: toolVisible,
    onChange: runTool(() => openUiApp('commandCenter', 'commandCenter'))
  },
  openKiBackupManager: {
    name: 'openKiBackupManager',
    title: 'KI-Backups öffnen',
    icon: 'fas fa-life-ring',
    order: 18,
    button: true,
    visible: toolVisible,
    onChange: runTool(() => openUiApp('kiBackupManager', 'kiBackupManager'))
  },
  openKiRoundtrip: {
    name: 'openKiRoundtrip',
    title: 'KI Roundtrip öffnen',
    icon: 'fas fa-brain',
    order: 19,
    button: true,
    visible: toolVisible,
    onChange: runTool(() => openUiApp('kiRoundtrip', 'kiRoundtrip'))
  },
  openTestResults: {
    name: 'openTestResults',
    title: 'Test Results öffnen',
    icon: 'fas fa-vial',
    order: 20,
    button: true,
    visible: toolVisible,
    onChange: runTool(() => openUiApp('testResults', 'testResults'))
  },
  openGuidedManualTests: {
    name: 'openGuidedManualTests',
    title: 'Guided Manual Tests öffnen',
    icon: 'fas fa-route',
    order: 21,
    button: true,
    visible: toolVisible,
    onChange: runTool(() => openUiApp('guidedManualTests', 'guidedManualTests'))
  }
};

if (isRecord) {
  top.janus7 ??= {
    name: 'janus7',
    title: localize('JANUS7.Sidebar.Title', 'JANUS7'),
    icon: 'fas fa-university',
    visible: toolVisible,
    activeTool: 'openControlPanel',
    tools: janusToolsRecord
  };
  top.janus7.tools ??= {};
  for (const [toolName, toolData] of Object.entries(janusToolsRecord)) {
    top.janus7.tools[toolName] = toolData;
  }
  top.janus7.visible = toolVisible;
  top.janus7.activeTool ??= 'openControlPanel';
} else if (isList) {
  const existing = getControlSet('janus7');
  if (!existing) {
    top.push({
      name: 'janus7',
      title: localize('JANUS7.Sidebar.Title', 'JANUS7'),
      icon: 'fas fa-university',
      visible: toolVisible,
      layer: null,
      activeTool: 'openControlPanel',
      tools: Object.values(janusToolsRecord)
    });
  } else {
    existing.title = localize('JANUS7.Sidebar.Title', 'JANUS7');
    existing.icon = 'fas fa-university';
    existing.visible = toolVisible;
    existing.layer = null;
    existing.activeTool = existing.activeTool ?? 'openControlPanel';
    existing.tools = Object.values(janusToolsRecord);
  }
}

      try {
        engine?.ui?.onSceneControls?.(controls);
      } catch (errInner) {
        logger.warn?.('[JANUS7] ui.onSceneControls delegation failed:', { message: errInner?.message });
      }
    } catch (err) {
      (JANUS_GLOBAL.engine?.core?.logger ?? console).warn?.('[JANUS7] getSceneControlButtons Fehler:', { message: err?.message });
    }
  });

  // ─── HOOK: updateWorldTime — zentralisiert hier (Sprint B) ───────────
  _registerCoreHook('updateWorldTime', (...args) => {
    try {
      const engine = JANUS_GLOBAL.engine;
      engine?.time?.onWorldTimeUpdated?.(...args);
      engine?.bridge?.dsa5?.moon?.onWorldTimeUpdated?.(args[0]);
    } catch (err) {
(JANUS_GLOBAL.engine?.core?.logger ?? console).warn?.('[JANUS7] updateWorldTime delegation failed:', { message: err?.message });
    }
  });

  // ─── HOOK: chatMessage — JANUS7 Chat-CLI (/janus ...) ─────────────────
  _registerCoreHook('chatMessage', (chatLog, message, options) => {
    try {
      return handleChatMessage(chatLog, message, options);
    } catch (err) {
      (JANUS_GLOBAL.engine?.core?.logger ?? console).warn?.('[JANUS7] chatMessage handler error', { message: err?.message });
    }
  });
}
