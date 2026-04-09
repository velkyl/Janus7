import { emitHook, HOOKS } from '../core/hooks/emitter.js';

function _safeString(v){ return String(v ?? '').trim(); }

export class JanusMilestoneEngine {
  constructor({ state, academyData, ruleEvaluator, logger }) {
    this.state = state;
    this.academyData = academyData;
    this.ruleEvaluator = ruleEvaluator;
    this.logger = logger;
  }

  _readEvaluationValue(expr) {
    const source = _safeString(expr);
    if (!source) return null;
    if (source === 'state.scoring.eleviumPoints') return Number(this.state.get('academy.scoring.eleviumPoints') ?? 0);
    return Number(this.state.get(source.replace(/^state\./, '')) ?? 0);
  }

  async evaluateMilestone(milestoneId) {
    const milestone = this.academyData?.getMilestone?.(milestoneId);
    if (!milestone) return { ok: false, reason: 'unknown-milestone' };
    const resolved = this.state.get(`academy.milestones.${milestone.id}.resolved`);
    if (resolved) return { ok: true, skipped: true, reason: 'already-resolved' };
    const value = this._readEvaluationValue(milestone.evaluationExpr);
    let hit = null;
    for (const outcome of (milestone?.outcomes ?? [])) {
      if (await this.ruleEvaluator.evaluateThreshold(outcome.condition, value)) { hit = outcome; break; }
    }
    if (!hit) return { ok: true, resolved: false, value };
    await this.state.transaction(async (tx) => {
      const row = tx.get(`academy.milestones.${milestone.id}`) ?? {};
      const tags = Array.isArray(tx.get('academy.tags')) ? tx.get('academy.tags') : [];
      row.resolved = true;
      row.outcomeId = hit.id;
      row.grantedTags = Array.isArray(hit?.grantTags) ? [...hit.grantTags] : [];
      for (const tag of (hit?.grantTags ?? [])) if (!tags.includes(tag)) tags.push(tag);
      tx.set(`academy.milestones.${milestone.id}`, row);
      tx.set('academy.tags', tags);
    });
    emitHook(HOOKS.MILESTONE_RESOLVED, { milestoneId: milestone.id, outcomeId: hit.id, value });
    return { ok: true, resolved: true, value, outcomeId: hit.id };
  }

  async evaluateAll() {
    const results = [];
    for (const row of (this.academyData?.getMilestones?.() ?? [])) {
      results.push(await this.evaluateMilestone(row.id));
    }
    return results;
  }
}
