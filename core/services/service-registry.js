/**
 * @file core/services/service-registry.js
 * @module janus7
 * @phase 1
 *
 * JanusServiceRegistry
 *
 * Zweck:
 *   Zentrale Service-Readiness-Verwaltung für die JANUS7 Engine.
 *   Ersetzt die verstreuten Null-Guards ("engine.academy?.data", "engine.bridge?.dsa5")
 *   durch eine formale Service-Tracking-Schicht.
 *
 * Verwendung:
 *   // Service als verfügbar markieren (in phase-integration.js):
 *   registry.markReady('academy.data', apiInstance);
 *
 *   // Service abrufen (sofort oder mit Timeout):
 *   const api = registry.get('academy.data');               // sofort (null wenn nicht bereit)
 *   const api = await registry.waitFor('academy.data');     // wartet max. 10s
 *
 *   // Readiness-Report (für Diagnostics):
 *   const report = registry.getReport();
 *
 * Architektur:
 *   - Keine UI-Seiteneffekte
 *   - Keine direkten Foundry-Abhängigkeiten
 *   - Singleton über Engine-Instanz (engine.services.registry)
 */

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * @typedef {object} JanusServiceWaiter
 * @property {(value: unknown|null) => void} resolve
 * @property {(reason?: unknown) => void} reject
 * @property {ReturnType<typeof setTimeout>} timer
 */

/**
 * @typedef {object} JanusServiceReport
 * @property {string[]} ready
 * @property {string[]} pending
 * @property {Record<string, number>} uptime
 */

/**
 * Tracks service readiness, waiting consumers, and uptime metadata for the engine.
 */
export class JanusServiceRegistry {
  constructor() {
    /** @type {Map<string, unknown>} */
    this._services = new Map();
    /** @type {Map<string, JanusServiceWaiter[]>} */
    this._waiters = new Map();
    /** @type {Map<string, number>} */
    this._readyAt = new Map();
  }

  /**
   * Marks a service as ready, stores its instance, and resolves pending waiters.
   *
   * @param {string} key
   * @param {unknown} instance
   * @returns {void}
   */
  markReady(key, instance) {
    if (!key) return;
    this._services.set(key, instance);
    this._readyAt.set(key, Date.now());

    const waiting = this._waiters.get(key);
    if (waiting) {
      for (const { resolve, timer } of waiting) {
        clearTimeout(timer);
        resolve(instance);
      }
      this._waiters.delete(key);
    }
  }

  /**
   * Marks a service as unavailable and resolves pending waiters with `null`.
   *
   * @param {string} key
   * @returns {void}
   */
  markUnavailable(key) {
    this._services.delete(key);
    this._readyAt.delete(key);

    const waiting = this._waiters.get(key);
    if (waiting) {
      for (const { resolve, timer } of waiting) {
        clearTimeout(timer);
        resolve(null);
      }
      this._waiters.delete(key);
    }
  }

  /**
   * Returns a ready service instance when available.
   *
   * @param {string} key
   * @returns {unknown|null}
   */
  get(key) {
    return this._services.get(key) ?? null;
  }

  /**
   * Checks whether a service key is currently ready.
   *
   * @param {string} key
   * @returns {boolean}
   */
  isReady(key) {
    return this._services.has(key);
  }

  /**
   * Waits for a service to become ready or returns the configured fallback on timeout.
   *
   * @param {string} key
   * @param {{ timeoutMs?: number, fallback?: unknown }} [opts]
   * @returns {Promise<unknown>}
   */
  waitFor(key, { timeoutMs = DEFAULT_TIMEOUT_MS, fallback = null } = {}) {
    if (this._services.has(key)) {
      return Promise.resolve(this._services.get(key));
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const waiting = this._waiters.get(key);
        if (waiting) {
          const idx = waiting.findIndex((w) => w.timer === timer);
          if (idx !== -1) waiting.splice(idx, 1);
        }
        this._cleanupWaiters(key);

        if (fallback !== undefined) {
          resolve(fallback);
        } else {
          reject(new Error(`[JANUS7] ServiceRegistry: Timeout nach ${timeoutMs}ms – Service '${key}' nicht bereit.`));
        }
      }, timeoutMs);

      const waiters = this._waiters.get(key) ?? [];
      waiters.push({ resolve, reject, timer });
      this._waiters.set(key, waiters);
    });
  }

  /** @private */
  _cleanupWaiters(key) {
    const waiting = this._waiters.get(key);
    if (waiting && waiting.length === 0) {
      this._waiters.delete(key);
    }
  }

  /**
   * Returns a diagnostics report for ready, pending, and uptime-tracked services.
   *
   * @returns {JanusServiceReport}
   */
  getReport() {
    const now = Date.now();
    const uptime = {};
    for (const [key, ts] of this._readyAt) {
      uptime[key] = Math.round((now - ts) / 1000);
    }
    return {
      ready: Array.from(this._services.keys()),
      pending: Array.from(this._waiters.keys()),
      uptime,
    };
  }
}
