import { emitHook, HOOKS } from '../core/hooks/emitter.js';

function _safeString(v){ return String(v ?? '').trim(); }

export class JanusCollectionEngine {
  constructor({ state, academyData, ruleEvaluator, resourcesEngine, logger }) {
    this.state = state;
    this.academyData = academyData;
    this.ruleEvaluator = ruleEvaluator;
    this.resourcesEngine = resourcesEngine;
    this.logger = logger;
  }

  async attemptDiscovery({ collectionId, itemId, actorId = null }) {
    const collection = this.academyData?.getCollection?.(collectionId);
    if (!collection) return { ok: false, reason: 'unknown-collection' };
    const item = (collection.items ?? []).find((row) => _safeString(row?.id) === _safeString(itemId));
    if (!item) return { ok: false, reason: 'unknown-item' };
    const success = await this.ruleEvaluator.evaluateCheck(item.discoveryCheck, { actorId });
    if (!success) return { ok: true, discovered: false };
    await this.state.transaction(async (tx) => {
      const row = tx.get(`academy.collections.${collection.id}`) ?? { foundItemIds: [], completed: false };
      row.foundItemIds = Array.isArray(row.foundItemIds) ? row.foundItemIds : [];
      if (!row.foundItemIds.includes(item.id)) row.foundItemIds.push(item.id);
      if (!row.completed && row.foundItemIds.length >= (collection.items?.length ?? Infinity)) {
        row.completed = true;
        row.title = collection?.completionReward?.title ?? null;
        if (Number.isFinite(collection?.completionReward?.ap)) row.ap = Number(collection.completionReward.ap);
      }
      tx.set(`academy.collections.${collection.id}`, row);
    });
    if (Number.isFinite(collection?.completionReward?.ap)) {
      await this.resourcesEngine.applySchoolStatDelta('wissen', 1, { reason: `collection:${collection.id}` });
    }
    emitHook(HOOKS.COLLECTION_UPDATED, { collectionId: collection.id, itemId: item.id });
    return { ok: true, discovered: true };
  }
}
