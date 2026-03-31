/**
 * @file core/index.js
 * @module janus7
 * @phase 1
 *
 * Purpose:
 * Central Janus7 Engine entry point. Manages service orchestration and lifecycle.
 *
 * Architecture:
 * - Phase-based initialization (Init -> Ready).
 * - Centralized Service Registry via JanusServiceRegistry.
 * - Decoupled loading of feature bridges.
 */

import { MODULE_ID, MODULE_ABBREV, MODULE_TITLE } from './common.js';
import { JanusLogger } from './logger.js';
import { JanusConfig } from './config.js';
import { JanusStateCore } from './state.js';
import { JanusValidator } from './validator.js';
import { initHookEmitter, emitHook, HOOKS } from './hooks/emitter.js';
import { JanusIO } from './io.js';
import { JanusDirector } from './director.js';
import { JanusFolderService } from './folder-service.js';
import { JanusServiceRegistry } from './services/service-registry.js';
import { JanusErrorAggregator } from './error-aggregator.js';
import { installUiWriteGuard } from './guards/ui-write-guard.js';

/**
 * Janus7Engine
 * 
 * Orchestrates all Janus7 services and maintains the unified SSOT.
 */
export class Janus7Engine {
  constructor() {
    this.moduleId = MODULE_ID;
    this.title = MODULE_TITLE;
    /** @type {string|null} */
    this.version = null;

    /** @type {JanusServiceRegistry} */
    this.serviceRegistry = new JanusServiceRegistry();
    /** @type {JanusErrorAggregator} */
    this.errors = new JanusErrorAggregator();

    this.core = {
      logger: null,
      config: JanusConfig,
      state: null,
      validator: null,
      io: null,
      director: null,
      folderService: null
    };
    
    this.academy = { data: null, debug: null };
    this.bridge = { dsa5: null };
    this.services = { registry: this.serviceRegistry };
  }

  /**
   * Registers a service as ready and notifies listeners.
   * @param {string} key 
   * @param {any} instance 
   * @returns {any}
   */
  markServiceReady(key, instance) {
    if (!key || instance == null) return instance;
    this.serviceRegistry.markReady(key, instance);
    this.core.logger?.debug?.(`JANUS7 | Service online: ${key}`);
    return instance;
  }

  /**
   * Marks a service as unavailable.
   * @param {string} key 
   */
  markServiceUnavailable(key) {
    if (!key) return;
    this.serviceRegistry.markUnavailable(key);
  }

  /**
   * Non-blocking wait for a service to become available.
   * @param {string} key 
   * @param {number} [timeoutMs] 
   */
  async waitFor(key, timeoutMs = 10000) {
    return this.serviceRegistry.waitFor(key, { timeoutMs });
  }

  /**
   * Central error recording.
   */
  recordError(phase, context, err, severity = 'error') {
    this.errors?.record?.(phase, context, err, severity);
    return err;
  }

  /**
   * Phase 1 Initialization (Foundry Init Hook)
   * Focuses on settings registration and core object instantiation.
   */
  init() {
    // 1. Register Module Configuration
    this.core.config.registerSettings();
    JanusStateCore.registerSetting();

    // 2. Initialize Infrastructure
    this.core.logger = new JanusLogger(MODULE_ABBREV);
    JanusConfig.applyToLogger(this.core.logger);
    initHookEmitter(this.core.logger);

    // 3. Instantiate Core Logic
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

    // 4. Mirroring for legacy compatibility and shorthand access
    this.logger = this.core.logger;
    this.config = this.core.config;
    this.state = this.core.state;
    this.director = this.core.director;
    this.folderService = this.core.folderService;

    // 5. Write Guard (Debug Mode)
    try {
      const debugLevel = JanusConfig.get('debugLevel');
      if (debugLevel === 'debug') {
        installUiWriteGuard({
          state: this.core.state,
          logger: this.core.logger,
          enabled: true
        });
      }
    } catch (_e) { /* ignore */ }

    // 6. Registry Markers
    this.markServiceReady('core.logger', this.core.logger);
    this.markServiceReady('core.config', this.core.config);
    this.markServiceReady('core.state', this.core.state);
    this.markServiceReady('core.validator', this.core.validator);
    this.markServiceReady('core.director', this.core.director);

    this.logger.info("JANUS7 | Core Engine Services [READY] (Phase 1).");
  }

  /**
   * Phase 2 Readiness (Foundry Ready Hook)
   * Focuses on state loading, persistent validation, and feature bridge activation.
   */
  async ready() {
    this.version = game.modules.get(MODULE_ID)?.version || "?.?.?";
    this.logger.info(`JANUS7 | Engine v${this.version} starting production sequence.`);

    try {
      // Step A: State Loading (Sync Block)
      await this.core.state.init();
      this.logger.debug("JANUS7 | State persistent store loaded.");

      // Step B: Feature Bridges (Async/Degradable)
      await this._activateFeatures();

      // Step C: UI & Integration Attachments (Non-blocking)
      this._attachIntegrations();

      // Step D: Final Readiness Signal
      if (this.core.director?.onReady) {
        await this.core.director.onReady().catch(err => this.logger.warn("Director ready-hook failed", err));
      }

      this.logger.info("JANUS7 | Orchestration complete. System is stable.");
      emitHook(HOOKS.ENGINE_READY, this);

    } catch (err) {
      this.logger.error("JANUS7 | FATAL: Ready sequence aborted.", err);
      if (ui.notifications) ui.notifications.error("JANUS7 Engine initialization failed.");
    }
  }

  /** @private */
  async _activateFeatures() {
    // 1. Academy Data
    if (this.academy?.data?.init) {
      try {
        await this.academy.data.init();
        this.markServiceReady('academy.data', this.academy.data);
      } catch (err) {
        this.recordError('academy.data', 'init', err, 'warn');
        this.logger.warn("JANUS7 | Academy Data failed to initialize.", err);
      }
    }

    // 2. DSA5 System Bridge
    if (this.bridge?.dsa5?.init) {
      try {
        await this.bridge.dsa5.init();
        this.markServiceReady('bridge.dsa5', this.bridge.dsa5);
      } catch (err) {
        this.recordError('bridge.dsa5', 'init', err, 'warn');
        this.logger.warn("JANUS7 | DSA5 Bridge failed to initialize.", err);
      }
    }
  }

  /** @private */
  _attachIntegrations() {
    const enableUI = this.config.get('enableUI') !== false;
    
    if (enableUI) {
        // Commands (Lazy load)
        import('../ui/commands/index.js').then(m => {
            this.commands = m.JanusCommands || m.default;
            if (this.commands) this.markServiceReady('ui.commands', this.commands);
        }).catch(err => this.logger.warn("Commands lazy-load failed", err));

        // UI Framework (Lazy load)
        import('../ui/index.js').then(m => {
            this.ui = m.JanusUI || m.default;
            if (this.ui) this.markServiceReady('ui.router', this.ui);
        }).catch(err => this.logger.warn("UI Module lazy-load failed", err));
    }

    // Sync Engine
    import('./sync-engine.js').then(m => {
        this.sync = new m.JanusSyncEngine({ logger: this.logger });
        this.markServiceReady('sync.engine', this.sync);
    }).catch(err => this.logger.warn("Sync engine lazy-load failed", err));
  }

  /**
   * Cleanup services on module shutdown or reload.
   */
  cleanup() {
    this.logger?.info("JANUS7 | Engine shutdown sequence initiated.");
    
    // Stop atmosphere watchdogs
    try { this.atmosphere?.controller?.destroy?.(); } catch (_) { /* noop */ }
    
    const readyServices = this.serviceRegistry?.getReport?.()?.ready ?? [];
    for (const key of readyServices) {
      this.markServiceUnavailable(key);
    }
    
    this.logger?.info("JANUS7 | Engine cleanup complete.");
  }
}

/**
 * Shared global access point for the engine instance.
 * Initialized by the bootstrap scripts.
 */
export const JANUS_GLOBAL = { engine: null };

/**
 * Compatibility helper for existing macros and UI components.
 */
export function getJanusCore() {
  const engine = JANUS_GLOBAL.engine || globalThis.game?.janus7 || null;
  return engine?.core || engine || null;
}

export function getJanus7() {
  return JANUS_GLOBAL.engine;
}
