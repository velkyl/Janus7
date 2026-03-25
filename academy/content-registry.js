/**
 * @file academy/content-registry.js
 * Static content registry / lazy loaders for AcademyDataApi.
 */

import { MODULE_ID } from '../core/common.js';
import { getJanusCore } from '../core/index.js';
import { getContentCache, loadDataJson, sanitizePoolFile } from './data-api-store.js';

export async function getContentRegistry(opts = {}) {
  const cache = getContentCache();
  if (cache.reg) return cache.reg;
  if (cache.loading) return cache.loading;

  const logger = opts.logger ?? getJanusCore()?.logger;
  cache.loading = (async () => {
    const mod = await import(`/modules/${MODULE_ID}/scripts/academy/content/content-loader.js`);
    const loader = new mod.JanusContentLoader({ logger });
    const reg = await loader.load();
    cache.reg = reg;
    cache.loading = null;
    return reg;
  })();

  return cache.loading;
}

export async function reloadContentRegistry(opts = {}) {
  const cache = getContentCache();
  cache.reg = null;
  cache.loading = null;
  return getContentRegistry(opts);
}

export async function getQuestById(questId) {
  const id = String(questId ?? '').trim();
  if (!id) throw new Error('getQuest: questId missing');

  try {
    const reg = await getContentRegistry();
    const found = reg?.by?.quest?.get?.(id) ?? reg?.quests?.find?.((row) => row?.questId === id) ?? null;
    if (found) {
      const nodes = reg?.questNodes?.filter?.((node) => node?.questId === id) ?? [];
      return nodes.length ? { ...found, nodes } : found;
    }
    return await loadDataJson(`quests/${id}.json`);
  } catch (_err) {
    return await loadDataJson(`quests/${id}.json`);
  }
}

export async function getEventPoolByName(poolName) {
  const safe = sanitizePoolFile(poolName);

  try {
    const reg = await getContentRegistry();
    if (reg?.by?.pool?.get?.(safe)) return reg.by.pool.get(safe);
    if (reg?.pools && typeof reg.pools === 'object' && !Array.isArray(reg.pools)) {
      return reg.pools[safe] ?? await loadDataJson(`events/pools/${safe}.json`);
    }
    if (Array.isArray(reg?.eventPools)) {
      return reg.eventPools.find((row) => row?.poolName === safe) ?? await loadDataJson(`events/pools/${safe}.json`);
    }
    return await loadDataJson(`events/pools/${safe}.json`);
  } catch (_err) {
    return await loadDataJson(`events/pools/${safe}.json`);
  }
}

export async function getEffectById(effectId) {
  const id = String(effectId ?? '').trim();
  if (!id) throw new Error('getEffect: effectId missing');

  try {
    const reg = await getContentRegistry();
    const found = reg?.by?.effect?.get?.(id) ?? reg?.effects?.find?.((row) => row?.id === id) ?? null;
    if (found) return found;
    return await loadDataJson(`academy/effects/${id}.json`);
  } catch (_err) {
    return await loadDataJson(`academy/effects/${id}.json`);
  }
}
