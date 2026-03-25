/**
 * @fileoverview JANUS7 Condition Context Provider - Builds evaluation contexts
 * @module academy/conditions/context-provider
 * @since 0.6.0
 *  Versionsstand wird zentral über module.json geführt.
 * @phase 4b
 */

/**
 * Builds evaluation contexts for condition expressions.
 * 
 * Aggregates data from:
 * - Player state (stress, energy, skills, relations, flags)
 * - Calendar (current time slot)
 * - Academy data (optional future extensions)
 * 
 * @class JanusConditionContextProvider
 * @example
 * const provider = new JanusConditionContextProvider({
 *   state: game.janus7.core.state,
 *   calendar: game.janus7.academy.calendar,
 *   academyData: game.janus7.academy.data,
 *   dsa5Bridge: game.janus7.dsa5
 * });
 * 
 * const context = provider.buildContext('Actor.xyz123');
 * // context: { stress: 5, energy: 10, week: 3, day: 'Praiosstag', ... }
 */
export class JanusConditionContextProvider {
  /**
   * Create a Context Provider instance.
   * 
   * @param {Object} deps - Dependencies (injected)
   * @param {JanusStateCore} deps.state - State manager from Phase 1
   * @param {JanusCalendarEngine} [deps.calendar] - Calendar engine from Phase 4 (optional)
   * @param {AcademyData} deps.academyData - Academy data API from Phase 2
   * @param {DSA5SystemBridge} deps.dsa5Bridge - DSA5 bridge from Phase 3
   */
  constructor({ state, calendar, academyData, dsa5Bridge }) {
    this.state = state;
    this.calendar = calendar;
    this.academyData = academyData;
    this.dsa5Bridge = dsa5Bridge;
  }

  /**
   * Build an evaluation context for an actor.
   * 
   * Merges player state, calendar slot, and other relevant data into
   * a flat object for expression evaluation.
   * 
   * @param {string} actorId - Actor UUID
   * @returns {Object} Evaluation context with all available properties
   * 
   * @example
   * const context = provider.buildContext('Actor.xyz123');
   * // Returns:
   * // {
   * //   stress: 5,
   * //   energy: 10,
   * //   health: 100,
   * //   'playerState.skills.lore': 3,
   * //   'playerState.relations.mentor': 8,
   * //   week: 3,
   * //   day: 'Praiosstag',
   * //   phase: 'Morgens',
   * //   ...
   * // }
   */

buildContext(actorId) {
  const root = this.state.get('') || {};
  const ps = this.state.get(`playerState.${actorId}`) || this.state.get('playerState') || {};
  const academyState = root.academy || {};
  const academyResources = academyState.resources || {};
  const academySchoolStats = academyState.schoolStats || {};
  const slot = this.calendar?.getCurrentSlotRef?.() || root.time || {
    year: 1039,
    trimester: 1,
    week: 1,
    day: 'Praiosstag',
    phase: 'Morgens'
  };

  const ctx = {
    actorId,
    year: slot.year,
    trimester: slot.trimester,
    week: slot.week,
    day: slot.day,
    phase: slot.phase,
    slotName: slot.slotName || slot.phase,
    dayName: slot.dayName || slot.day,
    currentLocationId: academyState.currentLocationId || null,
    stress: Number(academyResources.stress ?? ps.stress ?? 0),
    energy: Number(academyResources.energy ?? ps.energy ?? 0),
    focus: Number(academyResources.focus ?? 0),
    health: Number(ps.health || 0),
    player: {
      schoolStats: { ...academySchoolStats },
      resources: { ...academyResources },
      tags: Array.isArray(academyState.tags) ? [...academyState.tags] : [],
      perks: Array.isArray(academyState.perks) ? [...academyState.perks] : [],
    },
    state: root,
    playerState: {
      ...ps,
      skills: { ...(ps.skills || {}) },
      relations: { ...(ps.relations || {}) },
      flags: { ...(ps.flags || {}) },
    },
    academyState,
    worldState: root,
  };

  const skills = ctx.playerState.skills;
  const relations = ctx.playerState.relations;
  const flags = ctx.playerState.flags;

  for (const [k, v] of Object.entries(skills)) ctx[`playerState.skills.${k}`] = Number(v || 0);
  for (const [k, v] of Object.entries(relations)) ctx[`playerState.relations.${k}`] = Number(v || 0);
  for (const [k, v] of Object.entries(flags)) ctx[`playerState.flags.${k}`] = typeof v === 'boolean' ? (v ? 1 : 0) : Number(v || 0);

  ctx['playerState.skills.lore'] ??= 0;
  ctx['playerState.skills.logic'] ??= 0;
  ctx['playerState.skills.social'] ??= 0;
  ctx['playerState.skills.practical'] ??= 0;
  ctx['playerState.relations.mentor'] ??= 0;
  ctx['playerState.relations.peers'] ??= 0;
  ctx['playerState.flags.mentor_trust'] ??= 0;

  for (const [k, v] of Object.entries(academySchoolStats)) ctx[`player.schoolStats.${k}`] = Number(v || 0);
  for (const [k, v] of Object.entries(academyResources)) ctx[`player.resources.${k}`] = Number(v || 0);
  ctx.player.schoolStats.wissen ??= 0;
  ctx.player.schoolStats.mut ??= 0;
  ctx.player.schoolStats.charme ??= 0;
  ctx.player.schoolStats.disziplin ??= 0;
  ctx.player.resources.stress ??= ctx.stress;
  ctx.player.resources.energy ??= ctx.energy;
  ctx.player.resources.focus ??= ctx.focus;
  ctx.tags = ctx.player.tags;
  ctx.perks = ctx.player.perks;

  return ctx;
}
}
