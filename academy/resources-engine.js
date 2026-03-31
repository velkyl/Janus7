import { emitHook, HOOKS } from '../core/hooks/emitter.js';

import { JanusConfig } from '../core/config.js';

function _safeString(v){ return String(v ?? '').trim(); }
function _clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

const MAX_QUEUED_EVENTS = JanusConfig?.get?.('maxQueuedEvents') ?? 200;
const MAX_RESOURCE_HISTORY = JanusConfig?.get?.('maxResourceHistory') ?? 100;

export class JanusResourcesEngine {
  constructor({ state, academyData, logger }) {
    this.state = state;
    this.academyData = academyData;
    this.logger = logger;
  }

  async ensureDefaults() {
    const configs = this.academyData?.getResourcesConfig?.() ?? [];
    const stats = this.academyData?.getSchoolStatsConfig?.() ?? [];
    await this.state.transaction(async (tx) => {
      const resources = tx.get('academy.resources') ?? {};
      const schoolStats = tx.get('academy.schoolStats') ?? {};
      const tags = Array.isArray(tx.get('academy.tags')) ? tx.get('academy.tags') : [];
      const perks = Array.isArray(tx.get('academy.perks')) ? tx.get('academy.perks') : [];
      const queued = Array.isArray(tx.get('academy.runtimeQueuedEvents')) ? tx.get('academy.runtimeQueuedEvents') : [];
      for (const cfg of configs) {
        const key = _safeString(cfg?.id);
        if (!key) continue;
        if (!Number.isFinite(resources[key])) resources[key] = Number(cfg?.min ?? 0);
      }
      for (const cfg of stats) {
        const key = _safeString(cfg?.id);
        if (!key) continue;
        if (!Number.isFinite(schoolStats[key])) schoolStats[key] = Number(cfg?.min ?? 0);
      }
      tx.set('academy.resources', resources);
      tx.set('academy.schoolStats', schoolStats);
      tx.set('academy.tags', tags);
      tx.set('academy.perks', perks);
      tx.set('academy.runtimeQueuedEvents', queued.slice(-MAX_QUEUED_EVENTS));
    });
  }

  async applyResourceDelta(resourceId, delta, { reason = 'resource-delta' } = {}) {
    const key = _safeString(resourceId);
    const cfg = (this.academyData?.getResourcesConfig?.() ?? []).find((row) => _safeString(row?.id) === key) ?? null;
    if (!cfg || !key) return { ok: false, reason: 'unknown-resource' };
    let after = null;
    await this.state.transaction(async (tx) => {
      const resources = tx.get('academy.resources') ?? {};
      const history = Array.isArray(tx.get('academy.resourceHistory')) ? tx.get('academy.resourceHistory') : [];
      const before = Number(resources[key] ?? cfg?.min ?? 0);
      after = _clamp(before + Number(delta ?? 0), Number(cfg?.min ?? 0), Number(cfg?.max ?? 10));
      resources[key] = after;
      history.unshift({ resourceId: key, reason, delta: Number(delta ?? 0), after, at: Date.now() });
      tx.set('academy.resources', resources);
      tx.set('academy.resourceHistory', history.slice(0, MAX_RESOURCE_HISTORY));
    });
    await this.checkThresholds(key, after);
    emitHook(HOOKS.RESOURCE_CHANGED, { resourceId: key, value: after, reason });
    return { ok: true, resourceId: key, value: after };
  }

  async applySchoolStatDelta(statId, delta, { reason = 'school-stat-delta' } = {}) {
    const key = _safeString(statId);
    const cfg = (this.academyData?.getSchoolStatsConfig?.() ?? []).find((row) => _safeString(row?.id) === key) ?? null;
    if (!cfg || !key) return { ok: false, reason: 'unknown-stat' };
    let after = null;
    await this.state.transaction(async (tx) => {
      const schoolStats = tx.get('academy.schoolStats') ?? {};
      const history = Array.isArray(tx.get('academy.schoolStatHistory')) ? tx.get('academy.schoolStatHistory') : [];
      const before = Number(schoolStats[key] ?? cfg?.min ?? 0);
      after = _clamp(before + Number(delta ?? 0), Number(cfg?.min ?? 0), Number(cfg?.max ?? 10));
      schoolStats[key] = after;
      history.unshift({ statId: key, reason, delta: Number(delta ?? 0), after, at: Date.now() });
      tx.set('academy.schoolStats', schoolStats);
      tx.set('academy.schoolStatHistory', history.slice(0, MAX_RESOURCE_HISTORY));
    });
    emitHook(HOOKS.RESOURCE_CHANGED, { statId: key, value: after, reason });
    return { ok: true, statId: key, value: after };
  }

  async checkThresholds(resourceId = null, currentValue = null) {
    const configs = this.academyData?.getResourcesConfig?.() ?? [];
    await this.state.transaction(async (tx) => {
      const resources = tx.get('academy.resources') ?? {};
      const queued = Array.isArray(tx.get('academy.runtimeQueuedEvents')) ? tx.get('academy.runtimeQueuedEvents') : [];
      const thresholds = tx.get('academy.resourceThresholds') ?? {};
      for (const cfg of configs) {
        const id = _safeString(cfg?.id);
        if (resourceId && id !== resourceId) continue;
        const value = currentValue == null ? Number(resources[id] ?? 0) : Number(currentValue);
        for (const threshold of (cfg?.thresholdEvents ?? [])) {
          const marker = `${id}:${threshold.at}:${threshold.eventId}`;
          if (value >= Number(threshold?.at ?? Infinity) && !thresholds[marker]) {
            thresholds[marker] = Date.now();
            queued.push({ eventId: threshold.eventId, source: 'resource-threshold', resourceId: id, at: Date.now() });
          }
        }
      }
      tx.set('academy.resourceThresholds', thresholds);
      tx.set('academy.runtimeQueuedEvents', queued.slice(-MAX_QUEUED_EVENTS));
    });
  }
}
