function _safeString(v){ return String(v ?? '').trim(); }
const MAX_ACTIVITY_HISTORY = 100;
const MAX_PENDING_ENCOUNTERS = 50;

export class JanusActivityEngine {
  constructor({ state, academyData, dsa5Bridge, resourcesEngine, logger }) {
    this.state = state;
    this.academyData = academyData;
    this.dsa5Bridge = dsa5Bridge;
    this.resourcesEngine = resourcesEngine;
    this.logger = logger;
  }

  async performActivity({ actorId = null, locationId, activityType, targetSkill = null }) {
    const mod = (this.academyData?.getLocationActivityModifiers?.(locationId, activityType) ?? [])[0] ?? null;
    if (!mod) return { ok: false, reason: 'no-modifier', locationId, activityType };
    for (const [key, delta] of Object.entries(mod.resourceDelta ?? {})) {
      if ((this.academyData?.getResourcesConfig?.() ?? []).some((cfg) => cfg.id === key)) {
        await this.resourcesEngine.applyResourceDelta(key, Number(delta ?? 0), { reason: `${activityType}@${locationId}` });
      } else if ((this.academyData?.getSchoolStatsConfig?.() ?? []).some((cfg) => cfg.id === key)) {
        await this.resourcesEngine.applySchoolStatDelta(key, Number(delta ?? 0), { reason: `${activityType}@${locationId}` });
      } else {
        this.logger?.warn?.('[JANUS7] ActivityEngine: Unbekannter resourceDelta-Key (Tippfehler in JSON?)', { key, locationId, activityType });
      }
    }
    let roll = null;
    const skill = _safeString(targetSkill || mod.targetSkill);
    if (skill && this.dsa5Bridge?.rollSkill && actorId) {
      try { roll = await this.dsa5Bridge.rollSkill(actorId, skill, { modifier: Number(mod?.rollModifier ?? 0), silent: true }); }
      catch (err) { this.logger?.warn?.('[JANUS7] Activity roll failed', { actorId, skill, message: err?.message }); }
    }
    await this.state.transaction(async (tx) => {
      const history = Array.isArray(tx.get('academy.activityHistory')) ? tx.get('academy.activityHistory') : [];
      history.unshift({ actorId, locationId, activityType, targetSkill: skill || null, rollModifier: Number(mod?.rollModifier ?? 0), at: Date.now() });
      tx.set('academy.activityHistory', history.slice(0, MAX_ACTIVITY_HISTORY));
      if (mod?.randomEncounterPool) {
        const pending = Array.isArray(tx.get('academy.pendingEncounterPools')) ? tx.get('academy.pendingEncounterPools') : [];
        pending.push({ pool: mod.randomEncounterPool, source: `${activityType}@${locationId}`, at: Date.now() });
        tx.set('academy.pendingEncounterPools', pending.slice(-MAX_PENDING_ENCOUNTERS));
      }
    });
    return { ok: true, activityType, locationId, modifier: Number(mod?.rollModifier ?? 0), roll, encounterPool: mod?.randomEncounterPool ?? null };
  }
}
