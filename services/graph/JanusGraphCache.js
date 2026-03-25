/**
 * Lightweight in-memory cache for graph query results.
 * Event-driven invalidation beats stale data, unlike human optimism.
 */
export class JanusGraphCache {
  constructor() {
    this.store = new Map();
    this.stats = { hits: 0, misses: 0, invalidations: 0, sets: 0 };
    this.lastInvalidatedAt = null;
  }

  _key(prefix, payload) {
    const norm = typeof payload === 'string' ? payload : JSON.stringify(payload ?? null);
    return `${prefix}:${norm}`;
  }

  get(prefix, payload) {
    const key = this._key(prefix, payload);
    if (this.store.has(key)) {
      this.stats.hits += 1;
      return this.store.get(key);
    }
    this.stats.misses += 1;
    return null;
  }

  set(prefix, payload, value) {
    const key = this._key(prefix, payload);
    this.store.set(key, value);
    this.stats.sets += 1;
    return value;
  }

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
