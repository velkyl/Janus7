import { emitHook, HOOKS } from "../core/hooks/emitter.js";
import { JanusConditionContextProvider } from "../scripts/academy/conditions/context-provider.js";
import { compileSafeBoolExpr, safeString } from "../core/safe-eval.js";

const MAX_LIVING_WORLD_HISTORY = 50;
const MAX_SOCIAL_EVENT_HISTORY = 24;

function normalizeTagList(tags) {
  return Array.isArray(tags)
    ? tags.map((tag) => safeString(tag).toLowerCase()).filter(Boolean)
    : [];
}

function buildWeekKey(current = {}) {
  return `${Number(current?.year ?? 0)}-${Number(current?.trimester ?? 0)}-${Number(current?.week ?? 0)}`;
}

function hashKey(input = '') {
  let hash = 0;
  const value = String(input ?? '');
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function roleKeyForNpc(npc = {}) {
  const direct = safeString(npc?.role).toLowerCase();
  if (direct) return direct;
  const tags = normalizeTagList(npc?.tags);
  if (tags.includes('student')) return 'student';
  if (tags.includes('teacher')) return 'teacher';
  return 'npc';
}

function compileExpr(expr, logger) {
  const raw = safeString(expr);
  if (!raw) return () => true;
  try {
    return compileSafeBoolExpr(raw);
  } catch (err) {
    logger?.warn?.("[JANUS7] LivingWorld: Ausdruck konnte nicht kompiliert werden", { expr: raw, message: err?.message });
    return () => false;
  }
}

export class JanusAssignmentSimulationEngine {
  constructor({ state, academyData, logger }) {
    this.state = state;
    this.academyData = academyData;
    this.logger = logger;
  }

  async onDayPassed({ absoluteDay }) {
    const assignments = this.academyData?.getAssignments?.() ?? [];
    if (!assignments.length) return { seeded: 0 };
    let seeded = 0;
    await this.state.transaction(async (state) => {
      const bucket = foundry.utils.deepClone(state.get("academy.assignments") ?? {});
      for (const row of assignments) {
        const id = safeString(row?.id);
        if (!id || bucket[id]) continue;
        bucket[id] = {
          status: "available",
          title: row?.title ?? id,
          issuerId: row?.issuerId ?? null,
          availableAtDay: absoluteDay,
          completedAtDay: null
        };
        seeded += 1;
      }
      state.set("academy.assignments", bucket);
    });
    return { seeded };
  }
}

export class JanusFactionSimulationEngine {
  constructor({ state, academyData, logger }) {
    this.state = state;
    this.academyData = academyData;
    this.logger = logger;
  }

  async onWeekPassed({ current }) {
    const factions = this.academyData?.getFactions?.() ?? [];
    if (!factions.length) return { touched: 0 };
    let touched = 0;
    await this.state.transaction(async (state) => {
      const academyFactions = foundry.utils.deepClone(state.get("academy.factions") ?? {});
      for (const faction of factions) {
        const id = safeString(faction?.id);
        if (!id) continue;
        const bucket = academyFactions[id] ?? { points: 0, reputation: 0, history: [] };
        const basePoints = faction?.type === "house" ? 1 : 0;
        bucket.points = Number(bucket.points ?? 0) + basePoints;
        bucket.reputation = Number(bucket.reputation ?? 0) + 1;
        bucket.lastAdvancedWeek = `${current?.year ?? 0}-${current?.trimester ?? 0}-${current?.week ?? 0}`;
        bucket.history = Array.isArray(bucket.history) ? bucket.history : [];
        bucket.history.unshift({
          kind: "weekly",
          at: Date.now(),
          week: current?.week ?? null,
          deltaPoints: basePoints,
          deltaReputation: 1
        });
        academyFactions[id] = bucket;
        touched += 1;
      }
      state.set("academy.factions", academyFactions);
    });
    return { touched };
  }
}


export class JanusSocialRelationshipSimulationEngine {
  constructor({ state, academyData, social, logger }) {
    this.state = state;
    this.academyData = academyData;
    this.social = social;
    this.logger = logger;
  }

  _getNpc(npcId) {
    return this.academyData?.getNpc?.(npcId) ?? null;
  }

  _getNpcName(npcId) {
    return this._getNpc(npcId)?.name ?? npcId ?? 'Unbekannt';
  }

  _buildSocialContext(entry, tags = []) {
    const fromNpc = this._getNpc(entry?.fromId);
    const toNpc = this._getNpc(entry?.toId);
    const fromRole = roleKeyForNpc(fromNpc);
    const toRole = roleKeyForNpc(toNpc);
    const studentArc = tags.some((tag) => ['der_aussenseiter', 'die_rivalin', 'die_vorzeige_scholarin', 'die_stille', 'kampfmagier'].includes(tag));

    if (fromRole === 'student' && toRole === 'student') {
      if (tags.some((tag) => ['rivalry', 'jealousy', 'tension'].includes(tag)) || studentArc) {
        return {
          kind: 'peer-rivalry',
          title: 'Jahrgangsrivalitaet verschaerft sich',
          bondTitle: 'Jahrgangsbande festigen sich',
          frictionBias: 8,
          bondBias: 3
        };
      }
      return {
        kind: 'peer-network',
        title: 'Schuelerbeziehung verschiebt sich',
        bondTitle: 'Schuelernetzwerk verdichtet sich',
        frictionBias: 4,
        bondBias: 4
      };
    }

    if (fromRole === 'teacher' && toRole === 'teacher') {
      return {
        kind: 'faculty-politics',
        title: 'Kollegiumspolitik bewegt sich',
        bondTitle: 'Kollegiale Allianz vertieft sich',
        frictionBias: 5,
        bondBias: 5
      };
    }

    if ((fromRole === 'teacher' && toRole === 'student') || (fromRole === 'student' && toRole === 'teacher')) {
      return {
        kind: 'mentor-line',
        title: 'Mentorenspannung nimmt zu',
        bondTitle: 'Mentorenlinie stabilisiert sich',
        frictionBias: 3,
        bondBias: 6
      };
    }

    return {
      kind: 'npc-network',
      title: 'Beziehungsdynamik verschiebt sich',
      bondTitle: 'Beziehung vertieft sich',
      frictionBias: 2,
      bondBias: 2
    };
  }

  _listNpcRelationships() {
    const relationships = this.social?.listAllRelationships?.() ?? [];
    return relationships
      .filter((entry) => entry?.fromId && entry?.toId)
      .filter((entry) => this.academyData?.getNpc?.(entry.fromId) && this.academyData?.getNpc?.(entry.toId));
  }

  _buildCandidate(entry, weekKey) {
    const tags = normalizeTagList(entry?.tags);
    const value = Number(entry?.value ?? 0);
    const pairKey = `${entry?.fromId}->${entry?.toId}`;
    const scoreBase = Math.abs(value) + (hashKey(`${weekKey}:${pairKey}`) % 11);
    const rivalryLike = tags.some((tag) => ['rivalry', 'jealousy', 'tension'].includes(tag));
    const bondLike = tags.some((tag) => ['mentor', 'trust', 'care', 'favor', 'ally', 'respect'].includes(tag));
    const socialContext = this._buildSocialContext(entry, tags);

    if (rivalryLike || value <= -15) {
      return {
        ...entry,
        eventType: 'friction',
        category: socialContext.kind,
        delta: -1,
        score: scoreBase + 10 + Number(socialContext?.frictionBias ?? 0),
        title: socialContext.title,
        summary: `${this._getNpcName(entry?.fromId)} und ${this._getNpcName(entry?.toId)} geraten erneut aneinander.`
      };
    }
    if (bondLike || value >= 15) {
      return {
        ...entry,
        eventType: 'bond',
        category: socialContext.kind,
        delta: 1,
        score: scoreBase + 8 + Number(socialContext?.bondBias ?? 0),
        title: socialContext.bondTitle,
        summary: `${this._getNpcName(entry?.fromId)} und ${this._getNpcName(entry?.toId)} finden unabhaengig von den Spielern naeher zusammen.`
      };
    }
    return null;
  }

  async onWeekPassed({ current }) {
    const weekKey = buildWeekKey(current);
    const root = foundry.utils.deepClone(this.state.get('academy.social.livingEvents') ?? { history: [], lastProcessedWeekKey: null });
    if (root?.lastProcessedWeekKey === weekKey) return { generated: 0, skipped: true, reason: 'already-processed' };

    const candidates = this._listNpcRelationships()
      .map((entry) => this._buildCandidate(entry, weekKey))
      .filter(Boolean)
      .sort((a, b) => Number(b?.score ?? 0) - Number(a?.score ?? 0) || String(a?.fromId ?? '').localeCompare(String(b?.fromId ?? ''), 'de'))
      .slice(0, 2);

    const generated = [];
    for (const candidate of candidates) {
      const previousValue = Number(this.social?.getAttitude?.(candidate.fromId, candidate.toId) ?? 0);
      const newValue = await this.social.adjustAttitude(candidate.fromId, candidate.toId, candidate.delta, {
        tags: candidate.tags,
        meta: {
          reason: 'living-world-social',
          autonomous: true,
          weekKey,
          eventType: candidate.eventType
        }
      });
      generated.push({
        weekKey,
        at: new Date().toISOString(),
        type: candidate.eventType,
        category: candidate.category ?? 'npc-network',
        title: candidate.title,
        summary: candidate.summary,
        fromId: candidate.fromId,
        toId: candidate.toId,
        fromName: this._getNpcName(candidate.fromId),
        toName: this._getNpcName(candidate.toId),
        delta: Number(candidate.delta ?? 0),
        previousValue,
        newValue,
        tags: normalizeTagList(candidate.tags)
      });
    }

    await this.state.transaction(async (state) => {
      const bucket = foundry.utils.deepClone(state.get('academy.social.livingEvents') ?? { history: [], lastProcessedWeekKey: null });
      bucket.lastProcessedWeekKey = weekKey;
      bucket.history = Array.isArray(bucket.history) ? bucket.history : [];
      if (generated.length) bucket.history.unshift(...generated);
      bucket.history = bucket.history.slice(0, MAX_SOCIAL_EVENT_HISTORY);
      state.set('academy.social.livingEvents', bucket);
    });

    return { generated: generated.length, skipped: false, weekKey, items: generated };
  }
}

export class JanusRumorSimulationEngine {
  constructor({ state, academyData, calendar, logger }) {
    this.state = state;
    this.academyData = academyData;
    this.calendar = calendar;
    this.logger = logger;
    this._exprCache = new Map();
    this._contextProvider = new JanusConditionContextProvider({ state, calendar, academyData });
  }

  canSpread(rumor) {
    const expr = safeString(rumor?.spreadExpr);
    if (!expr) return true;
    if (!this._exprCache.has(expr)) this._exprCache.set(expr, compileExpr(expr, this.logger));
    const ctx = this._contextProvider.buildContext(null);
    return !!this._exprCache.get(expr)(ctx);
  }

  async onDayPassed({ absoluteDay }) {
    const rumors = this.academyData?.getRumors?.() ?? [];
    if (!rumors.length) return { activated: 0, expired: 0 };
    let activated = 0;
    let expired = 0;
    await this.state.transaction(async (state) => {
      const academyRumors = foundry.utils.deepClone(state.get("academy.rumors") ?? {});
      for (const rumor of rumors) {
        const id = safeString(rumor?.id);
        if (!id) continue;
        const live = academyRumors[id] ?? null;
        if (!live && this.canSpread(rumor)) {
          academyRumors[id] = {
            status: "active",
            active: true,
            availableAtDay: absoluteDay,
            expiresAtDay: Number.isFinite(rumor?.decayDays) ? absoluteDay + Number(rumor.decayDays) : null
          };
          activated += 1;
          continue;
        }
        if (live?.active && Number.isFinite(live?.expiresAtDay) && absoluteDay >= Number(live.expiresAtDay)) {
          academyRumors[id] = { ...live, active: false, status: "expired", expiredAtDay: absoluteDay };
          expired += 1;
        }
      }
      state.set("academy.rumors", academyRumors);
    });
    return { activated, expired };
  }
}

export class JanusSanctuarySimulationEngine {
  constructor({ state, academyData, logger }) {
    this.state = state;
    this.academyData = academyData;
    this.logger = logger;
  }

  async onDayPassed({ absoluteDay }) {
    const stations = this.academyData?.getSanctuaryUpgrades?.() ?? [];
    await this.state.transaction(async (state) => {
      const sanctuary = foundry.utils.deepClone(state.get("academy.sanctuary") ?? {
        progress: 0,
        supplies: 0,
        unlockedStations: [],
        lastAdvancedDay: null
      });
      sanctuary.progress = Number(sanctuary.progress ?? 0) + 1;
      sanctuary.supplies = Number(sanctuary.supplies ?? 0) + 1;
      sanctuary.lastAdvancedDay = absoluteDay;
      if (stations.length && sanctuary.progress % 7 === 0) {
        sanctuary.unlockedStations = Array.isArray(sanctuary.unlockedStations) ? sanctuary.unlockedStations : [];
        const next = stations[sanctuary.unlockedStations.length] ?? null;
        if (next?.id) sanctuary.unlockedStations.push(next.id);
      }
      state.set("academy.sanctuary", sanctuary);
    });
    return { ok: true };
  }
}

export class JanusLivingWorldScheduler {
  constructor({ state, academyData, calendar, logger, assignmentEngine, factionEngine, rumorEngine, sanctuaryEngine, socialDynamicsEngine }) {
    this.state = state;
    this.academyData = academyData;
    this.calendar = calendar;
    this.logger = logger;
    this.assignmentEngine = assignmentEngine;
    this.factionEngine = factionEngine;
    this.rumorEngine = rumorEngine;
    this.sanctuaryEngine = sanctuaryEngine;
    this.socialDynamicsEngine = socialDynamicsEngine;
    this._processing = false;
  }

  absoluteDay(ref = {}) {
    const time = this.state?.get?.("time") ?? {};
    if (Number.isFinite(time?.totalDaysPassed)) return Number(time.totalDaysPassed);
    const tri = Math.max(1, Number(ref?.trimester ?? time?.trimester ?? 1));
    const week = Math.max(1, Number(ref?.week ?? time?.week ?? 1));
    const dayIndex = Math.max(0, Number(ref?.dayIndex ?? time?.dayIndex ?? 0));
    const weeksPerTrimester = Number(this.calendar?.config?.weeksPerTrimester ?? 12);
    return ((tri - 1) * weeksPerTrimester * 7) + ((week - 1) * 7) + dayIndex;
  }

  async onDateChanged({ previous, current, reason } = {}) {
    if (this._processing) return { skipped: true, reason: "reentrant" };
    this._processing = true;
    try {
      const dayChanged = !!previous && !!current && (
        Number(previous?.year) !== Number(current?.year) ||
        Number(previous?.trimester) !== Number(current?.trimester) ||
        Number(previous?.week) !== Number(current?.week) ||
        Number(previous?.dayIndex) !== Number(current?.dayIndex)
      );
      const weekChanged = !!previous && !!current && (
        Number(previous?.year) !== Number(current?.year) ||
        Number(previous?.trimester) !== Number(current?.trimester) ||
        Number(previous?.week) !== Number(current?.week)
      );
      const absoluteDay = this.absoluteDay(current);
      const summary = { dayChanged, weekChanged, absoluteDay, reason, ran: [] };

      if (dayChanged) {
        summary.ran.push({ engine: "assignments", ...(await this.assignmentEngine.onDayPassed({ previous, current, absoluteDay, reason })) });
        summary.ran.push({ engine: "rumors", ...(await this.rumorEngine.onDayPassed({ previous, current, absoluteDay, reason })) });
        summary.ran.push({ engine: "sanctuary", ...(await this.sanctuaryEngine.onDayPassed({ previous, current, absoluteDay, reason })) });
      }
      if (weekChanged) {
        summary.ran.push({ engine: "factions", ...(await this.factionEngine.onWeekPassed({ previous, current, absoluteDay, reason })) });
        if (this.socialDynamicsEngine?.onWeekPassed) {
          summary.ran.push({ engine: "socialDynamics", ...(await this.socialDynamicsEngine.onWeekPassed({ previous, current, absoluteDay, reason })) });
        }
      }

      await this.state.transaction(async (state) => {
        const livingWorld = foundry.utils.deepClone(state.get("academy.livingWorld") ?? { history: [] });
        livingWorld.lastTick = {
          reason,
          absoluteDay,
          at: Date.now(),
          dayChanged,
          weekChanged
        };
        livingWorld.history = Array.isArray(livingWorld.history) ? livingWorld.history : [];
        livingWorld.history.unshift(livingWorld.lastTick);
        livingWorld.history = livingWorld.history.slice(0, MAX_LIVING_WORLD_HISTORY);
        state.set("academy.livingWorld", livingWorld);
      });

      emitHook(HOOKS.CAMPAIGN_UPDATED, { domain: "livingWorld", summary });
      return summary;
    } finally {
      this._processing = false;
    }
  }
}
