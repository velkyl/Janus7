/**
 * @file core/index.js
 * @module janus7
 * @phase 1
 *
 * Zweck:
 * Initialisiert den Core (State, Logger, Validator) und registriert zentrale Entry-Points.
 *
 * Architektur:
 * - Diese Datei ist Teil von Phase 1 und darf nur Abhängigkeiten zu Phasen <= 1 haben.
 * - Öffentliche Funktionen/Exports sind JSDoc-dokumentiert, damit JANUS7 langfristig wartbar bleibt.
 *
 * Hinweis:
 * - Keine deprecated Foundry APIs (v13+).
 */
// bootstrapJanusIntegrations removed: phase loading is now handled by scripts/janus.mjs (Single Entry Point)

import { MODULE_ID, MODULE_ABBREV, MODULE_TITLE } from './common.js';
import { JanusLogger } from './logger.js';
import { JanusConfig } from './config.js';
import { JanusStateCore } from './state.js';
import { JanusValidator } from './validator.js';
import { initHookEmitter, emitHook, HOOKS } from './hooks/emitter.js';
import { JanusIO } from './io.js';
import { JanusDirector } from './director.js';
import { runJanusDiagnostics, generateBugReport } from './diagnostics.js';
import { buildDiagnosticSnapshot } from './diagnostics/diagnostic-snapshot.js';
import { installUiWriteGuard } from './guards/ui-write-guard.js';
import { JanusFolderService } from './folder-service.js';
// ---------------------------------------------------------------------------
// Boot-Guard (Hardening)
// Verhindert doppelte Hook-Registrierung bei Reloads / Session-Reconnects.
// ---------------------------------------------------------------------------
// Boot guard moved to scripts/janus.mjs (Single Entry Point, Phase A1).
// core/index.js only provides the Janus7Engine class and JANUS_GLOBAL export.


/**
 * Zentrale Engine-Klasse für JANUS7.
 */

function _janusErrMeta(err) {
  if (err instanceof Error) return { message: err.message, stack: err.stack, name: err.name };
  try { return { message: String(err?.message ?? err), detail: JSON.stringify(err) }; } catch { return { message: String(err) }; }
}

export class Janus7Engine {
  constructor() {
    this.moduleId = MODULE_ID;
    this.title = MODULE_TITLE;

    this.core = {
      logger: null,
      config: JanusConfig,
      state: null,
      validator: null,
      io: null,
      director: null,
      folderService: null
    };
    this.academy = {
      data: null,
      debug: null
    };
    this.bridge = {
      dsa5: null
    };
  }

  /**
   * Init-Hook (Foundry): registriert Settings und richtet Kernobjekte ein.
   */
  init() {
    JanusConfig.registerSettings();
    JanusStateCore.registerSetting();

    // Settings registered — Phase 1 contract fulfilled.

    this.core.logger = new JanusLogger(MODULE_ABBREV);
    JanusConfig.applyToLogger(this.core.logger);
    initHookEmitter(this.core.logger);

    this.core.state = new JanusStateCore({ logger: this.core.logger });
    this.core.validator = new JanusValidator({ logger: this.core.logger });
    this.core.io = new JanusIO({
      state: this.core.state,
      validator: this.core.validator,
      logger: this.core.logger
    });
    this.core.director = new JanusDirector({
      state: this.core.state,
      io: this.core.io,
      config: JanusConfig,
      logger: this.core.logger,
      validator: this.core.validator
    });
    this.core.folderService = new JanusFolderService({ logger: this.core.logger });

    // Dev Guard: warn when UI calls core.state mutators directly (architecture safety-net)
    try {
      const debugLevel = game.settings.get(MODULE_ID, 'debugLevel');
      installUiWriteGuard({
        state: this.core.state,
        logger: this.core.logger,
        enabled: debugLevel === 'debug'
      });
    } catch (_err) {
      // ignore
    }



    // Compatibility alias: some UI/Macros expect `engine.director` or `game.janus7.director`
    // to exist. Canonical location remains `engine.core.director`.
    this.director = this.core.director;
    this.folderService = this.core.folderService;
    this.logger = this.core.logger;
    this.config = this.core.config;
    this.state = this.core.state;
    this.validator = this.core.validator;
    this.io = {
      exportState: (...args) => this.core.io.exportState(...args),
      exportStateAsJSON: (...args) => this.core.io.exportStateAsJSON(...args),
      importStateFromObject: async (...args) => {
        try {
          await this.core.io.importStateFromObject(...args);
          return { ok: true };
        } catch (err) {
          return { ok: false, error: err?.message ?? String(err) };
        }
      },
      importStateFromJSON: async (...args) => {
        try {
          await this.core.io.importStateFromJSON(...args);
          return { ok: true };
        } catch (err) {
          return { ok: false, error: err?.message ?? String(err) };
        }
      }
    };

    // NOTE: AcademyDataApi (Phase 2) and DSA5SystemBridge (Phase 3) are no longer
    // instantiated here. They are injected by scripts/janus.mjs after init() to
    // preserve Phase-1 isolation. Access via engine.academy.data and engine.bridge.dsa5.

    // Diagnostics (Smoke Tests)
    this.diagnostics = {
      lastReport: null,
      run: async (opts = {}) => {
        const rep = await runJanusDiagnostics(this, opts);
        const normalized = {
          ...rep,
          ok: (rep?.summary?.fail ?? 0) === 0,
          checks: Array.isArray(rep?.checks) ? rep.checks : [],
          warnings: Array.isArray(rep?.warnings) ? rep.warnings : [],
          health: (rep?.summary?.fail ?? 0) > 0 ? 'fail' : ((rep?.summary?.warn ?? 0) > 0 ? 'warn' : 'ok')
        };
        this.diagnostics.lastReport = normalized ?? null;
        return normalized;
      },
      report: async (opts = {}) => {
        const rep = await runJanusDiagnostics(this, opts);
        const normalized = {
          ...rep,
          ok: (rep?.summary?.fail ?? 0) === 0,
          checks: Array.isArray(rep?.checks) ? rep.checks : [],
          warnings: Array.isArray(rep?.warnings) ? rep.warnings : [],
          health: (rep?.summary?.fail ?? 0) > 0 ? 'fail' : ((rep?.summary?.warn ?? 0) > 0 ? 'warn' : 'ok')
        };
        this.diagnostics.lastReport = normalized ?? null;
        return normalized;
      },
      getLastReport: () => this.diagnostics.lastReport ?? null,
      snapshot: () => buildDiagnosticSnapshot(this),
      generateBugReport: (opts = {}) => generateBugReport(this, opts)
    };
  }

  /**
   * Entfernt alle von höheren Phasen registrierten Hooks.
   * Iteriert über `_phase5HookIds` (und zukünftig ähnliche Arrays) und
   * ruft `Hooks.off()` auf. Wird beim Engine-Shutdown / Reload aufgerufen.
   */
  cleanupPhaseHooks() {
    const hookArrays = [
      '_phase5HookIds',
      '_phase6HookIds',
      '_phase7HookIds'
    ];
    for (const field of hookArrays) {
      const arr = this[field];
      if (!Array.isArray(arr)) continue;
      for (const entry of arr) {
        try {
          Hooks.off(entry.name, entry.id);
        } catch (_) { /* noop */ }
      }
      this[field] = [];
    }
    this.core?.logger?.debug?.('Phase hooks cleaned up');
  }

  /**
   * Zentrales Cleanup bei Engine-Shutdown oder Modul-Reload.
   * Räumt Phase-Hooks auf, stoppt den Atmosphere-Watchdog etc.
   */
  cleanup() {
    this.cleanupPhaseHooks();

    // Phase 5: Atmosphere Controller destroy
    try {
      this.atmosphere?.controller?.destroy?.();
    } catch (_) { /* noop */ }

    this.core?.logger?.info?.('JANUS7 Engine cleanup complete');
  }

  /**
   * Ready-Hook (Foundry): lädt State und Academy-Daten.
   */
  async ready() {
    this.core.logger?.info?.(`JANUS7 Engine v${game.modules.get(MODULE_ID)?.version} wird gestartet ...`);

    try {
      await this.core.state.init();
      this.core.logger?.debug?.('[JANUS7] ready.step core.state.init ok');
    } catch (err) {
      this.core.logger?.error?.('[JANUS7] ready.step core.state.init failed', _janusErrMeta(err));
      throw err;
    }

    if (this.academy?.data?.init) {
      try {
        await this.academy.data.init();
        this.core.logger?.debug?.('[JANUS7] ready.step academy.data.init ok');
      } catch (err) {
        this.core.logger?.warn?.('[JANUS7] academy.data init fehlgeschlagen – Ready läuft degradiert weiter.', _janusErrMeta(err));
      }
    } else {
      this.core.logger?.warn?.('[JANUS7] academy.data nicht verfügbar, Ready läuft degradiert weiter.');
    }

    // Read-only Debug Helpers (keine SSOT, nur Introspection)
    this.academy.debug = {
      hasLesson: (id) => this.academy.data?.hasLesson?.(id),
      listLessonIds: (limit = 50) => this.academy.data?.listLessonIds?.(limit),
      snapshotLessonById: () => this.academy.data?.snapshotLessonById?.(),
      resolveSlot: (slotRef) => this.simulation?.slotResolver?.resolveSlot?.(slotRef) ?? this.academy?.slotResolver?.resolveSlot?.(slotRef),
      explainSlot: (slotRef) => {
        const res = this.simulation?.slotResolver?.resolveSlot?.(slotRef) ?? this.academy?.slotResolver?.resolveSlot?.(slotRef);
        if (!res) return null;
        const m = res.meta ?? {};
        const parts = [];
        const day = m.dayName ?? m.tsDay ?? slotRef?.day ?? '?';
        const slotId = m.slotId ?? slotRef?.phase ?? '?';
        const reason = m.reason ?? 'unknown';
        parts.push(`reason=${reason}`);
        parts.push(`day=${day}`);
        if (m.academyYear) parts.push(`academyYear=${m.academyYear}`);
        if (m.trimester) parts.push(`trimester=${m.trimester}`);
        if (m.week) parts.push(`week=${m.week}`);
        if (m.phase) parts.push(`phase=${m.phase}`);
        if (m.matchingSessionIds) parts.push(`sessions=${m.matchingSessionIds.length}`);
        if (m.templatesTruncated) parts.push(`truncated=true`);
        parts.push(`lessons=${(res.lessons ?? []).length}`);
        parts.push(`exams=${(res.exams ?? []).length}`);
        parts.push(`events=${(res.events ?? []).length}`);
        return `[JANUS7] SlotExplain: ${parts.join(' | ')}`;
      }
    };

    // Legacy/Convenience alias: game.janus7.debug.*
    this.debug = {
      academy: this.academy.debug
    };

    // Phase 3: DSA5 Bridge initialisieren (nur wenn System dsa5)
    try {
      await this.bridge.dsa5?.init?.();
      this.core.logger?.debug?.('[JANUS7] ready.step bridge.dsa5.init ok');
    } catch (err) {
      this.core.logger?.warn?.('DSA5SystemBridge init fehlgeschlagen', _janusErrMeta(err));
    }
    // Phase 6 Safety Net: ensure UI + Commands are attached when enableUI=true.
    // Reason: Foundry does not await async hook callbacks; Phase 6 integrations may load late or be optional.
    try {
      const enableUI = this.core?.config?.get?.('enableUI') !== false;
      if (enableUI) {
        // Commands should be usable even if UI apps fail to import.
        if (!this.commands) {
          try {
            const cmdMod = await import('../ui/commands/index.js');
            const cmds = cmdMod?.JanusCommands ?? cmdMod?.default;
            if (cmds) this.commands = cmds;
            if (game?.janus7 && !game.janus7.commands && this.commands) game.janus7.commands = this.commands;
          } catch (err) {
            this.core.logger?.warn?.('[Phase6] Commands attach failed', err);
          }
        }

        if (!this.ui) {
          try {
            const uiMod = await import('../ui/index.js');
            const uiRouter = uiMod?.JanusUI ?? uiMod?.default;
            if (uiRouter) this.ui = uiRouter;
            if (game?.janus7 && !game.janus7.ui && this.ui) game.janus7.ui = this.ui;
          } catch (err) {
            this.core.logger?.warn?.('[Phase6] UI attach failed', err);
          }
        }
      }
    } catch (err) {
      this.core.logger?.warn?.('[Phase6] UI/Commands fallback attach failed', err);
    }

    if (this.core.director?.onReady) {
      try {
        await this.core.director.onReady();
        this.core.logger?.debug?.('[JANUS7] ready.step director.onReady ok');
      } catch (err) {
        this.core.logger?.warn?.('[JANUS7] director.onReady failed', _janusErrMeta(err));
      }
    }

    // Sync Engine: lazy-attached, kein Blocking im Start-Pfad
    try {
      const { JanusSyncEngine } = await import('./sync-engine.js');
      this.sync = new JanusSyncEngine({ logger: this.core.logger });
      if (game?.janus7) game.janus7.sync = this.sync;
      this.core.logger?.debug?.('[JANUS7] ready.step sync-engine ok');
    } catch (err) {
      this.core.logger?.warn?.('[Sync] JanusSyncEngine attach failed', _janusErrMeta(err));
    }

    this.core.logger?.info?.('JANUS7 Engine ist bereit.');

    // Phase 7: AI Context builder (attached here so it survives the init refactor)
    const _self = this;
    this.getAiContext = function _getAiContext(opts = {}) {
      const state = _self?.core?.state;
      const moduleVersion = game?.modules?.get?.(MODULE_ID)?.version ?? _self?.version ?? null;
      const snapshot = {
        schemaVersion: 'janus7-ai-context-v1',
        moduleId: _self?.moduleId ?? MODULE_ID,
        moduleVersion,
        date: _self?.calendar?.getCurrentSlotRef?.() ?? state?.get?.('time') ?? null,
        state: (() => {
          try {
            const exported = state?.export?.({ includeMeta: true, includeDiagnostics: true });
            return exported ?? { time: state?.get?.('time') ?? null };
          } catch (err) {
            return { error: 'state.export failed', time: state?.get?.('time') ?? null };
          }
        })(),
        requested: {
          includeDirector: Boolean(opts?.includeDirector),
          includeDiagnostics: Boolean(opts?.includeDiagnostics),
        },
        module: { id: _self?.moduleId ?? MODULE_ID, version: moduleVersion },
      };
      if (opts?.includeDirector) {
        snapshot.director = {
          activeQuest: state?.get?.('quest.active') ?? null,
          activeEvent: state?.get?.('event.active') ?? null,
          flags: state?.get?.('flags') ?? null,
        };
      }
      if (!opts?.includeDiagnostics) {
        try { delete snapshot.state?.diagnostics; } catch (_) {}
      }
      return snapshot;
    };
    // Mirror to core for symmetry
    if (this.core) this.core.getAiContext = this.getAiContext;
    if (game?.janus7) game.janus7.getAiContext = this.getAiContext;

        // Engine-Ready Hook — routed through central emitter (also fires legacy 'janus7Ready')
    try {
      emitHook(HOOKS.ENGINE_READY, this);
      this.core.logger?.debug?.('[JANUS7] ready.step emit ENGINE_READY ok');
    } catch (err) {
      this.core.logger?.error?.('Fehler beim janus7Ready-Hook', _janusErrMeta(err));
    }
  }
}


// ─────────────────────────────────────────────────────────
// JANUS_GLOBAL: shared engine reference (set by scripts/janus.mjs)
// ─────────────────────────────────────────────────────────
/**
 * Shared engine container.
 * Populated by the single entry point (scripts/janus.mjs) during Hooks.once('init').
 * Exported so janus.mjs can import and mutate it.
 */
export const JANUS_GLOBAL = { engine: null };


/**
 * getJanusCore
 *
 * @description
 * Compatibility helper for older modules/components which expect a direct reference
 * to the Phase 1 core services (logger/validator/state/config/io/director).
 *
 * @returns {any|null} The JANUS7 core service container or null if not initialized yet.
 */
export function getJanusCore() {
  const engine = JANUS_GLOBAL.engine ?? globalThis.game?.janus7 ?? null;
  // Preferred: engine.core (service container)
  if (engine?.core) return engine.core;
  // Fallback: some older setups expose the core container directly
  if (engine?.logger || engine?.validator || engine?.state || engine?.config) return engine;
  return null;
}

export function getJanus7() {
  return JANUS_GLOBAL.engine;
}