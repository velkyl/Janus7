
import { JanusConditionContextProvider } from '../scripts/academy/conditions/context-provider.js';
import { compileSafeBoolExpr, safeString as _safeString, toNumber as _toNumber } from '../core/safe-eval.js';

export class JanusRuleEvaluator {
  constructor({ state, calendar, academyData, dsa5Bridge, logger }) {
    this.state = state;
    this.calendar = calendar;
    this.academyData = academyData;
    this.dsa5Bridge = dsa5Bridge;
    this.logger = logger;
    this.contextProvider = new JanusConditionContextProvider({ state, calendar, academyData, dsa5Bridge });
    this._cache = new Map();
  }

  buildContext(actorId = null, extra = {}) {
    return { ...this.contextProvider.buildContext(actorId), ...extra };
  }

  async evaluateCondition(expr, { actorId = null, extra = {} } = {}) {
    const source = _safeString(expr);
    if (!source) return true;
    const ctx = this.buildContext(actorId, extra);
    if (source.startsWith('tag:')) {
      const tag = source.slice(4).trim();
      return Array.isArray(ctx.tags) && ctx.tags.includes(tag);
    }
    if (source.startsWith('check:')) return this.evaluateCheck(source, { actorId, extra });
    if (source.startsWith('roll:')) return this.evaluateCheck(source, { actorId, extra });
    if (!this._cache.has(source)) {
      try { this._cache.set(source, compileSafeBoolExpr(source)); }
      catch (err) {
        this.logger?.warn?.('[JANUS7] RuleEvaluator: expression compile failed', { expr: source, message: err?.message });
        this._cache.set(source, () => false);
      }
    }
    try { return Boolean(this._cache.get(source)(ctx)); }
    catch { return false; }
  }

  async evaluateThreshold(expr, value) {
    const source = _safeString(expr);
    if (!source) return false;
    try {
      const fn = compileSafeBoolExpr(source);
      return Boolean(fn({ value: _toNumber(value) }));
    } catch {
      return false;
    }
  }

  async evaluateCheck(expr, { actorId = null, extra = {} } = {}) {
    const source = _safeString(expr);
    const normalized = source.replace(/^(check|roll):/i, '');
    const m = normalized.match(/^(.+?)\s*([+-]\s*\d+)?(?:\s*\(QS\s*(\d+)\))?$/i);
    if (!m) return false;
    const skill = _safeString(m[1]).replace(/\s+/g, ' ');
    const modifier = _toNumber((m[2] || '').replace(/\s+/g, ''));
    const minQs = _toNumber(m[3] || 1);
    if (!this.dsa5Bridge?.rollSkill || !actorId) {
      const ctx = this.buildContext(actorId, extra);
      return _toNumber(ctx[`player.schoolStats.${skill}`] ?? 0) >= minQs;
    }
    try {
      const result = await this.dsa5Bridge.rollSkill(actorId, skill, { modifier, silent: true });
      return Boolean(result?.success) && Number(result?.quality ?? 1) >= minQs;
    } catch (err) {
      this.logger?.warn?.('[JANUS7] RuleEvaluator: roll/check failed', { expr: source, actorId, message: err?.message });
      return false;
    }
  }
}
