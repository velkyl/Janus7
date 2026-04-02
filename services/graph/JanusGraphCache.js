/**
 * Lightweight in-memory cache for graph query results.
 * Event-driven invalidation beats stale data, unlike human optimism.
 */
export class JanusGraphCache {
  /**
   * Creates a new in-memory graph cache instance.
   */
  constructor() {
    this.store = new Map();
    this.stats = { hits: 0, misses: 0, invalidations: 0, sets: 0 };
    this.lastInvalidatedAt = null;
  }

  /**
   * Builds a stable cache key from a prefix and payload.
   *
   * @param {string} prefix
   * @param {unknown} payload
   * @returns {string}
   */
  _key(prefix, payload) {
    const norm = typeof payload === 'string' ? payload : JSON.stringify(payload ?? null);
    return `${prefix}:${norm}`;
  }

  /**
   * Returns a cached value and updates hit or miss counters.
   *
   * @param {string} prefix
   * @param {unknown} payload
   * @returns {unknown|null}
   */
  get(prefix, payload) {
    const key = this._key(prefix, payload);
    if (this.store.has(key)) {
      this.stats.hits += 1;
      return this.store.get(key);
    }
    this.stats.misses += 1;
    return null;
  }

  /**
   * Stores a cache entry and returns the stored value.
   *
   * @param {string} prefix
   * @param {unknown} payload
   * @param {unknown} value
   * @returns {unknown}
   */
  set(prefix, payload, value) {
    const key = this._key(prefix, payload);
    this.store.set(key, value);
    this.stats.sets += 1;
    return value;
  }

  /**
   * Invalidates all cache entries or only entries matching a prefix.
   *
   * @param {string|null} [prefix]
   * @returns {void}
   */
  invalidate(prefix = null) {
    if (!prefix) {
      this.store.clear();
    } else {
      for (const key of Array.from(this.store.keys())) {
        if (String(key).startsWith(`${prefix}:`) || String(key) === prefix) this.store.delete(key);
      }
    }
    this.stats.invalidations += 1;
    this.lastInvalidatedAt = new Date().toISOString();
  }

  /**
   * Returns cache statistics and current size.
   *
   * @returns {{ size: number, hits: number, misses: number, sets: number, invalidations: number, lastInvalidatedAt: string|null }}
   */
  snapshot() {
    return {
      size: this.store.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      sets: this.stats.sets,
      invalidations: this.stats.invalidations,
      lastInvalidatedAt: this.lastInvalidatedAt
    };
  }
}

export default JanusGraphCache;
