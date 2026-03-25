import { emitHook, HOOKS } from '../core/hooks/emitter.js';

function _safeString(v){ return String(v ?? '').trim(); }
const MAX_QUEUED_EVENTS = 200;

export class JanusSocialEngine {
  constructor({ state, academyData, ruleEvaluator, logger }) {
    this.state = state;
    this.academyData = academyData;
    this.ruleEvaluator = ruleEvaluator;
    this.logger = logger;
  }

  async evaluateForActor(actorId = 'party') {
    const links = this.academyData?.getSocialLinks?.() ?? [];
    if (!links.length) return { advanced: [] };
    const advanced = [];
    for (const link of links) {
      const current = this.state.get(`academy.socialLinks.${link.id}.rank`) ?? 0;
      const next = (Array.isArray(link?.ranks) ? link.ranks : []).find((r) => Number(r?.level) === Number(current) + 1);
      if (!next) continue;
      const unlocked = await this.ruleEvaluator.evaluateCondition(next.unlockCondition, { actorId });
      if (!unlocked) continue;
      await this.state.transaction(async (tx) => {
        const row = tx.get(`academy.socialLinks.${link.id}`) ?? { rank: 0, perks: [], seenRankEvents: [] };
        const queued = Array.isArray(tx.get('academy.runtimeQueuedEvents')) ? tx.get('academy.runtimeQueuedEvents') : [];
        const globalPerks = Array.isArray(tx.get('academy.perks')) ? tx.get('academy.perks') : [];
        row.rank = Number(next.level);
        row.lastAdvancedDay = tx.get('time.totalDaysPassed') ?? null;
        row.perks = Array.isArray(row.perks) ? row.perks : [];
        for (const perkId of (next.perkIds ?? [])) if (!row.perks.includes(perkId)) row.perks.push(perkId);
        row.pendingEventId = next.eventTriggerId ?? null;
        row.seenRankEvents = Array.isArray(row.seenRankEvents) ? row.seenRankEvents : [];
        if (next.eventTriggerId && !row.seenRankEvents.includes(next.eventTriggerId)) {
          queued.push({ eventId: next.eventTriggerId, source: 'social-link', linkId: link.id, at: Date.now() });
          row.seenRankEvents.push(next.eventTriggerId);
        }
        for (const perkId of (next.perkIds ?? [])) if (!globalPerks.includes(perkId)) globalPerks.push(perkId);
        tx.set(`academy.socialLinks.${link.id}`, row);
        tx.set('academy.perks', globalPerks);
        tx.set('academy.runtimeQueuedEvents', queued.slice(-MAX_QUEUED_EVENTS));
      });
      advanced.push({ socialLinkId: link.id, rank: next.level, eventTriggerId: next.eventTriggerId ?? null });
      emitHook(HOOKS.SOCIAL_LINK_CHANGED, { socialLinkId: link.id, rank: next.level });
    }
    return { advanced };
  }
}
