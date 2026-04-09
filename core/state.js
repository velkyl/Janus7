/**
 * @file core/state.js
 * @module janus7
 * @phase 1
 *
 * Purpose:
 * State-Engine: versioned, persistent state with transactions and rollback.
 *
 * Architecture:
 * - Part of Phase 1: Minimal dependencies (Phases <= 1 only).
 * - Public exports are JSDoc-documented for long-term maintainability.
 * - This core service handles Persistence and Locking.
 * - Schema and Migration are decoupled into core/state-schema.js.
 */

import { MODULE_ID } from './common.js';
import { JanusConfig } from './config.js';
import { getModuleVersion } from './version.js';
import { emitHook, HOOKS } from './hooks/emitter.js';
import { DEFAULT_STATE, LEGACY_PATH_ALIASES, migrateStateSchema } from './state-schema.js';

/**
 * @private
 * Unset path helper for Foundry version drift (v12 vs v13).
 */
const UNSET_PATH = foundry?.utils?.unsetProperty
  ?? foundry?.utils?.deleteProperty
  ?? ((obj, path) => {
    if (!obj || typeof path !== 'string' || !path.length) return false;
    const parts = path.split('.');
    const last = parts.pop();
    let cur = obj;
    for (const k of parts) {
      if (!cur || typeof cur !== 'object') return false;
      cur = cur[k];
    }
    if (!cur || typeof cur !== 'object') return false;
    if (!(last in cur)) return false;
    delete cur[last];
    return true;
  });

/**
 * Internal set of already warned legacy paths (prevents console spam).
 * @type {Set<string>}
 */
const _warnedLegacyPaths = new Set();

/**
 * Normalizes a state path alias to its canonical target.
 * @param {string} path - The original path (legacy or canonical).
 * @param {Object} [options]
 * @param {Console|Object} [options.warnLogger] - Logger for sunset warnings.
 * @returns {string} Canonical path.
 */
function normalizeStatePathAlias(path, { warnLogger } = {}) {
  const source = String(path ?? '').trim();
  if (!source) return source;
  for (const [legacyPrefix, canonicalPrefix] of LEGACY_PATH_ALIASES) {
    if (source === legacyPrefix || source.startsWith(legacyPrefix + '.')) {
      const canonical = source === legacyPrefix
        ? canonicalPrefix
        : canonicalPrefix + source.slice(legacyPrefix.length);

      // Sunset-Warning: once per path per session
      if (!_warnedLegacyPaths.has(source)) {
        _warnedLegacyPaths.add(source);
        const msg = `[JANUS7] State: Legacy path "${source}" -> use "${canonical}" instead. This alias will be removed in v1.0.`;
        if (warnLogger?.warn) warnLogger.warn(msg); else console.warn(msg);
      }
      return canonical;
    }
  }
  return source;
}

/**
 * Internal deep comparison for JSON-serializable objects.
 */
function deepEqualJson(a, b) {
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
}

/**
 * JanusStateCore
 * 
 * Centralized State Engine with atomic transaction locking and rollback.
 * Focuses on I/O and Persistence. Schema and Migration are handled by JanusStateSchema.
 */
export class JanusStateCore {
  /** @type {Promise<void>} Private lock for transaction queueing */
  #lock = Promise.resolve();

  /** @type {Set<Function>} Active lock resolvers for forceUnlock recovery */
  #lockResolvers = new Set();

  /** @type {number} Private transaction depth to support nested transactions */
  #transactionDepth = 0;

  /**
   * @param {Object} [deps]
   * @param {import('./logger.js').JanusLogger} [deps.logger]
   */
  constructor({ logger } = {}) {
    this._ready = false;
    /** @type {any} */
    this._state = null;
    this._dirty = false;
    this.logger = logger ?? console;
    this.settingsKey = 'coreState';
    this.legacySettingsKey = 'state';
    this._suppressPersist = false;
    this._legacySyncPending = false;
  }

  /**
   * Registers the World-Settings in Foundry.
   *
   * @returns {void}
   */
  static registerSetting() {
    game.settings.register(MODULE_ID, 'coreState', {
      name: 'JANUS7.State.Name',
      hint: 'JANUS7.State.Hint',
      scope: 'world',
      config: false,
      type: Object,
      default: DEFAULT_STATE
    });

    // Legacy-Key for older worlds (pre v0.3.6.1)
    try {
      if (!game.settings.settings.has(`${MODULE_ID}.state`)) {
        game.settings.register(MODULE_ID, 'state', {
          name: 'JANUS7.State.Legacy.Name',
          hint: 'JANUS7.State.Legacy.Hint',
          scope: 'world',
          config: false,
          type: Object,
          default: null
        });
      }
    } catch (_e) {
      // Defensive: early init phases might not have the settings Map initialized
    }
  }

  /**
   * Initializes the state (loads from db or creates default).
   * @returns {Promise<void>}
   */
  async init() {
    if (this._ready && this._state) return;
    await this.load();
    this._ready = true;
  }

  /** @returns {boolean} True once `load()` completed and `_state` is set. */
  get loaded() { return this._ready === true && this._state != null; }
  /** @returns {boolean} Legacy alias for backwards compatibility. */
  get isLoaded() { return this.loaded; }

  /**
   * Migrates/normalizes the loaded state to the expected schema.
   * Delegates to JanusStateSchema for separation of concerns.
   * @param {Record<string, unknown>} [stateObj]
   * @returns {{changed: boolean, state: Record<string, unknown>}}
   */
  migrateState(stateObj = this._state) {
    const mig = migrateStateSchema(stateObj);
    if (mig.changed) this._dirty = true;
    return mig;
  }

  /**
   * Loads the state from game.settings.
   * Performs an automatic backup and legacy migration if needed.
   * @returns {Promise<void>}
   */
  async load() {
    if (this._ready && this._state) return;

    // --- Pre-Load-Backup ---
    try {
      const storedSetting = game.settings.get(MODULE_ID, this.settingsKey);
      if (storedSetting) {
        const backupKey = `janus7.state.backup.${game.world.id}`;
        localStorage.setItem(backupKey, JSON.stringify({
          ts: new Date().toISOString(),
          version: getModuleVersion(),
          data: storedSetting
        }));
      }
    } catch (err) {
      this.logger?.debug?.('JanusStateCore.load(): Pre-load backup failed', err);
    }

    // 1) Primary state (coreState)
    let stored = game.settings.get(MODULE_ID, this.settingsKey);
    let loadedFromLegacy = false;

    // 2) Migration from legacy 'state' key
    if (!stored) {
      try {
        const legacy = game.settings.get(MODULE_ID, this.legacySettingsKey);
        if (legacy) {
          stored = legacy;
          loadedFromLegacy = true;
          this._legacySyncPending = true;
          this.logger?.info?.('JanusStateCore: Legacy state (state) found - migrating to coreState.');
          this._dirty = true;
        }
      } catch (e) {
        this.logger?.debug?.('JanusStateCore.load(): Legacy state migration check failed', e);
      }
    }

    let isNew = false;
    if (!stored) {
      this._state = foundry.utils.deepClone(DEFAULT_STATE);
      if (!this._state.meta) this._state.meta = {};
      const now = new Date().toISOString();
      this._state.meta.createdAt = now;
      this._state.meta.updatedAt = now;
      
      this._dirty = true;
      isNew = true;
      this.logger?.info?.('JanusStateCore: New state initialized.');
    } else {
      this._state = stored;
      this._dirty = false;
      this.logger?.info?.('JanusStateCore: Existing state loaded.');
    }

    // Schema Migration
    const mig = this.migrateState();
    if (mig?.changed) {
      this._dirty = true;
      this._state = mig.state ?? this._state;
    }

    // Meta-Timestamps
    if (!this._state.meta) this._state.meta = {};
    if (typeof this._state.meta.createdAt !== 'string') {
      this._state.meta.createdAt = new Date().toISOString();
      this._dirty = true;
    }
    if (typeof this._state.meta.updatedAt !== 'string') {
      this._state.meta.updatedAt = this._state.meta.createdAt;
      this._dirty = true;
    }

    // Initial Save if dirty
    if (isNew || this._dirty) {
      try {
        await this.save({ force: true });
      } catch (err) {
        this.logger?.warn?.('JanusStateCore.load(): Initial persistence failed - continuing with memory-only state.', err);
      }
    }

    emitHook(HOOKS.STATE_LOADED, { state: this._state, isNew });
  }

  /**
   * Get a property via dot-notation.
   * @param {string} [path=""]
   * @returns {unknown} A deep-cloned copy if the path points to an object.
   */
  get(path = "") {
    const canonicalPath = normalizeStatePathAlias(path, { warnLogger: this.logger });
    const value = canonicalPath ? foundry.utils.getProperty(this._state, canonicalPath) : this._state;
    if (value && typeof value === "object") return foundry.utils.deepClone(value);
    return value;
  }

  /**
   * Returns a deep-cloned snapshot of the full state tree.
   *
   * @deprecated Use `get("")` instead.
   * @returns {unknown}
   */
  snapshot() { return this.get(""); }

  /**
   * Returns the raw value at a canonical state path without cloning.
   *
   * @param {string} path
   * @returns {unknown}
   * @private
   */
  getPath(path) {
    const canonicalPath = normalizeStatePathAlias(path, { warnLogger: this.logger });
    if (!canonicalPath) return this._state;
    return foundry.utils.getProperty(this._state, canonicalPath);
  }

  /**
   * Sets a value in the state. Returns the new value.
   * @param {string} path
   * @param {unknown} value
   * @returns {unknown}
   */
  set(path, value) {
    const canonicalPath = normalizeStatePathAlias(path, { warnLogger: this.logger });
    const _parts = (canonicalPath ?? '').split('.').filter(Boolean);
    if (_parts.some(p => ['__proto__', 'prototype', 'constructor'].includes(p))) {
      throw new Error(`JanusStateCore.set(): Unsafe path: ${canonicalPath}`);
    }

    const oldValue = this.getPath(canonicalPath);
    if (deepEqualJson(oldValue, value)) return this.getPath(canonicalPath);

    foundry.utils.setProperty(this._state, canonicalPath, value);
    this._touchMeta();

    emitHook(HOOKS.STATE_CHANGED, {
      path: canonicalPath,
      oldValue,
      newValue: this.getPath(canonicalPath),
      state: this._state
    });
    this._emitCampaignStateUpdated({ source: 'set', path: canonicalPath, oldValue, newValue: this.getPath(canonicalPath) });

    return this.getPath(canonicalPath);
  }

  /**
   * Removes a path from the state.
   * @param {string} path 
   * @returns {boolean}
   */
  unset(path) {
    const source = normalizeStatePathAlias(path, { warnLogger: this.logger });
    if (!source) return false;
    
    const oldValue = this.getPath(source);
    const success = UNSET_PATH(this._state, source);
    if (!success) return false;

    this._touchMeta();
    emitHook(HOOKS.STATE_CHANGED, {
      path: source,
      oldValue,
      newValue: undefined,
      state: this._state
    });
    this._emitCampaignStateUpdated({ source: 'unset', path: source, oldValue, newValue: undefined });
    return true;
  }

  /**
   * Overwrites the entire state.
   * @param {Record<string, unknown>} newState
   * @returns {void}
   */
  replace(newState) {
    const oldState = this._state;
    this._state = foundry.utils.deepClone(newState);
    this._touchMeta();

    emitHook(HOOKS.STATE_REPLACED, { oldState, newState: this._state });
    this._emitCampaignStateUpdated({ source: 'replace', oldState, newState: this._state });
  }

  _emitCampaignStateUpdated(context = {}) {
    try {
      emitHook(HOOKS.CAMPAIGN_UPDATED, { state: this._state, ...context });
    } catch (_err) { /* no-op */ }
  }

  _touchMeta() {
    if (!this._state.meta) this._state.meta = {};
    const now = new Date().toISOString();
    if (!this._state.meta.createdAt) this._state.meta.createdAt = now;
    this._state.meta.updatedAt = now;
    this._dirty = true;
  }

  /**
   * Saves the state to the persistent storage.
   * @param {{force?: boolean}} options 
   */
  async save({ force = false } = {}) {
    try {
      this.migrateState();
    } catch (err) {
      this.logger?.warn?.('JanusStateCore.save(): migrateState failed.', err);
    }

    if (this._suppressPersist) return this._state;

    let autoSave = true;
    if (!force) {
      try {
        if (game.settings.settings.has(`${MODULE_ID}.autoSave`)) {
          autoSave = JanusConfig.get('autoSave') !== false;
        }
      } catch (_e) { autoSave = true; }
      if (!autoSave || !this._dirty) return this._state;
    }

    this._touchMeta();
    await game.settings.set(MODULE_ID, this.settingsKey, this._state);

    if (this._legacySyncPending) {
      try {
        await game.settings.set(MODULE_ID, this.legacySettingsKey, this._state);
        this._legacySyncPending = false;
      } catch (_e) { /* ignore */ }
    }
    this._dirty = false;

    emitHook(HOOKS.STATE_SAVED, { state: this._state });
    this._emitCampaignStateUpdated({ source: 'save', state: this._state });

    return this._state;
  }

  /**
   * Führt eine atomare Operation auf dem State aus.
   * Transaktionen sind thread-safe (via Promise-Locking) und unterstützen Rollbacks.
   * 
   * @template T
   * @param {function(JanusStateCore): (T | Promise<T>)} mutator 
   * @param {{silent?: boolean}} opts 
   * @returns {Promise<T>}
   */
  async transaction(mutator, opts = {}) {
    // 1) Handle nesting
    if (this.#transactionDepth > 0) {
      this.#transactionDepth++;
      try {
        return await mutator(this);
      } finally {
        this.#transactionDepth--;
      }
    }

    // 2) Acquire lock (atomic wait)
    const myTurn = this.#lock;
    let myUnlock;
    this.#lock = new Promise((resolve) => {
      myUnlock = resolve;
      this.#lockResolvers.add(myUnlock);
    });

    try {
      await myTurn;
    } catch (err) {
      this.logger?.error?.('JanusStateCore: Lock-Aquisition fehlgeschlagen.', err);
      this.#lockResolvers.delete(myUnlock);
      myUnlock();
      throw err;
    }

    // 3) Execute transaction
    this.#transactionDepth = 1;

    try {
      const snapshot = foundry.utils.deepClone(this._state);
      const wasDirty = this._dirty;

      try {
        const out = await mutator(this);
        return out;
      } catch (err) {
        // Rollback state to previous snapshot
        this._state = snapshot;
        this._dirty = wasDirty;
        
        const isTestRollback = (e) => (e?.name === 'JanusTestRollback' || e?.message === 'JANUS_TEST_ROLLBACK');
        if (isTestRollback(err)) return undefined;

        if (!opts?.silent) this.logger?.error?.('Transaction failed. Rollback executed.', err);
        throw err;
      }
    } finally {
      // 4) Release lock
      this.#transactionDepth = 0;
      this.#lockResolvers.delete(myUnlock);
      myUnlock();
    }
  }

  /**
   * Erzwingt die Freigabe ALLER wartenden Locks.
   * Nur für Notfälle (z.B. Test-Timeouts/Deadlocks), um weitreichende Blockaden zu verhindern.
   */
  forceUnlock() {
    const count = this.#lockResolvers.size;
    if (count > 0) {
      this.logger?.warn?.(`JanusStateCore: Lock wurde gewaltsam freigegeben (${count} Resolver).`);
      for (const res of this.#lockResolvers) {
        try { res(); } catch (_e) { /* ignore */ }
      }
      this.#lockResolvers.clear();
    }
    this.#transactionDepth = 0;
    this.#lock = Promise.resolve();
  }

  get isReady() { return !!this._ready; }
}
