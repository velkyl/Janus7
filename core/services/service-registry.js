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

export class JanusServiceRegistry {
  constructor() {
    /** @type {Map<string, any>} serviceKey → Instanz */
    this._services = new Map();
    /** @type {Map<string, Array<{resolve: Function, reject: Function, timer: any}>>} */
    this._waiters = new Map();
    /** @type {Map<string, number>} serviceKey → Zeitstempel der Registrierung */
    this._readyAt = new Map();
  }

  // ─── Registrierung ────────────────────────────────────────────────────────

  /**
   * Markiert einen Service als bereit und speichert die Instanz.
   * Benachrichtigt alle wartenden waitFor()-Aufrufe.
   *
   * @param {string} key     Eindeutiger Service-Schlüssel (z.B. 'academy.data', 'bridge.dsa5')
   * @param {any}    instance Die Service-Instanz
   */
  markReady(key, instance) {
    if (!key) return;
    this._services.set(key, instance);
    this._readyAt.set(key, Date.now());

    // Wartende Promises auflösen
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
   * Markiert einen Service als nicht mehr verfügbar (z.B. bei Teardown).
   * @param {string} key
   */
  markUnavailable(key) {
    this._services.delete(key);
    this._readyAt.delete(key);

    // Wartende Promises mit null auflösen
    const waiting = this._waiters.get(key);
    if (waiting) {
      for (const { resolve, timer } of waiting) {
        clearTimeout(timer);
        resolve(null);
      }
      this._waiters.delete(key);
    }
  }

  // ─── Zugriff ──────────────────────────────────────────────────────────────

  /**
   * Gibt den Service zurück, wenn er bereits bereit ist.
   * @param {string} key
   * @returns {any|null}
   */
  get(key) {
    return this._services.get(key) ?? null;
  }

  /**
   * Gibt an ob ein Service bereit ist.
   * @param {string} key
   * @returns {boolean}
   */
  isReady(key) {
    return this._services.has(key);
  }

  /**
   * Wartet auf einen Service bis er bereit ist oder ein Timeout erreicht wird.
   *
   * @param {string} key
   * @param {{ timeoutMs?: number, fallback?: any }} [opts]
   * @returns {Promise<any>}
   */
  waitFor(key, { timeoutMs = DEFAULT_TIMEOUT_MS, fallback = null } = {}) {
    // Bereits bereit → sofort auflösen
    if (this._services.has(key)) {
      return Promise.resolve(this._services.get(key));
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        // Aus Waiter-Liste entfernen
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

  // ─── Diagnostics ──────────────────────────────────────────────────────────

  /**
   * Gibt einen Report über alle registrierten und wartenden Services zurück.
   * @returns {{ ready: string[], pending: string[], uptime: Record<string, number> }}
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
