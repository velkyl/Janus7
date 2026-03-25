/**
 * @file discovery/search-engine.js
 * @module janus7/discovery
 *
 * Lightweight search engine with:
 * - wildcard support (*, ?)
 * - fuzzy-ish ranking (substring + token prefix + Levenshtein)
 *
 * This is a Fuse.js-compatible placeholder in spirit, not in API.
 * When you decide to vendor Fuse.js, swap this implementation behind the same methods.
 */

function _norm(str) {
  return String(str ?? '').toLowerCase().normalize('NFKD');
}

function _lev(a, b) {
  a = _norm(a);
  b = _norm(b);
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function _wildcardToRegex(q) {
  const escaped = String(q ?? '').replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const rx = '^' + escaped.replace(/\*/g, '.*').replace(/\?/g, '.') + '$';
  return new RegExp(rx, 'i');
}

/**
 * @typedef {object} SearchDoc
 * @property {string} id
 * @property {string} name
 * @property {string} [uuid]
 * @property {string} [type]
 * @property {any} [data]
 */

export class JanusSearchEngine {
  constructor() {
    /** @type {Map<string, SearchDoc[]>} */
    this._indexes = new Map();
  }

  /**
   * @param {string} domain
   * @param {SearchDoc[]} docs
   */
  setIndex(domain, docs) {
    this._indexes.set(domain, Array.isArray(docs) ? docs : []);
  }

  /**
   * @param {string} domain
   * @param {string} query
   * @param {object} [opts]
   * @param {number} [opts.limit]
   * @param {boolean} [opts.wildcard]
   * @returns {Array<{doc: SearchDoc, score: number}>}
   */
  search(domain, query, { limit = 10, wildcard = true } = {}) {
    const docs = this._indexes.get(domain) ?? [];
    const q = String(query ?? '').trim();
    if (!q) return [];

    const isWildcard = wildcard && /[\*\?]/.test(q);
    const rx = isWildcard ? _wildcardToRegex(q) : null;

    const nq = _norm(q);
    const tokens = nq.split(/\s+/).filter(Boolean);

    const scored = [];

    for (const doc of docs) {
      const name = String(doc?.name ?? '');
      const nn = _norm(name);
      let score = 0;

      if (isWildcard) {
        if (!rx.test(name)) continue;
        score += 100;
      } else {
        if (nn === nq) score += 120;
        if (nn.includes(nq)) score += 90;
        // token prefix
        for (const t of tokens) {
          if (!t) continue;
          if (nn.startsWith(t)) score += 25;
          if (nn.includes(t)) score += 12;
        }
        // Levenshtein: reward close matches for short queries
        const d = _lev(nn, nq);
        const maxLen = Math.max(nn.length, nq.length);
        const similarity = maxLen ? (1 - d / maxLen) : 0;
        score += Math.round(similarity * 30);
        if (score < 15) continue; // cheap cutoff
      }

      scored.push({ doc, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, Math.max(1, limit));
  }
}

export default JanusSearchEngine;
