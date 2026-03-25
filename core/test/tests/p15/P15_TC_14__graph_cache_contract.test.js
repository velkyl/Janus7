import { JanusGraphCache } from '../../../../services/graph/JanusGraphCache.js';

export default {
  id: 'P15-TC-14',
  title: 'Graph cache stores, hits and invalidates query results',
  phases: [15],
  kind: 'auto',
  expected: 'Cache hit/miss counters and invalidation behave deterministically',
  run: async () => {
    const cache = new JanusGraphCache();
    const miss = cache.get('q', { a: 1 });
    cache.set('q', { a: 1 }, ['x']);
    const hit = cache.get('q', { a: 1 });
    cache.invalidate('q');
    const after = cache.get('q', { a: 1 });
    const stats = cache.snapshot();
    const ok = miss === null && Array.isArray(hit) && hit[0] === 'x' && after === null && stats.invalidations >= 1;
    return { ok, summary: ok ? `cache ok (${stats.hits} hits/${stats.misses} misses)` : 'cache contract broken', notes: [JSON.stringify(stats)] };
  }
};
