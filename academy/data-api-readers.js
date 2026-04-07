/**
 * @file academy/data-api-readers.js
 * Read/query helpers extracted from AcademyDataApi.
 */

import { getJanusCore } from '../core/index.js';
import {
  normalizeAventurianDayToWeekday,
  mapCalendarPhaseToTeachingSlotId,
  mapTeachingSlotIdToCalendarPhase,
  chooseExistingPhase,
} from './teaching-session-bridge.js';
import { clone, getAcademyCache, getContentCache, unready } from './data-api-store.js';

export function findCalendarEntries(query = {}) {
  const cache = getAcademyCache();
  const entries = cache?.calendar?.entries ?? [];
  return entries.filter((entry) => Object.entries(query).every(([key, value]) => entry[key] === value));
}

export function getCalendarEntryByDay(slotRef) {
  if (!slotRef) return null;
  const entries = getCalendarEntries();
  const canonical = entries.find((entry) => {
    if (slotRef.year !== undefined && entry.year !== slotRef.year) return false;
    if (slotRef.day !== undefined && entry.day !== slotRef.day) return false;
    if (slotRef.phase !== undefined && entry.phase !== slotRef.phase) return false;
    return true;
  }) ?? null;
  if (canonical) return canonical;

  try {
    const year = Number(slotRef.year);
    const trimester = Number(slotRef.trimester);
    const week = Number(slotRef.week);
    const day = String(slotRef.day ?? '').trim();
    const phase = String(slotRef.phase ?? '').trim();
    if (!Number.isFinite(year) || !Number.isFinite(trimester) || !Number.isFinite(week) || !day || !phase) return null;
    const virtualDay = getVirtualCalendarEntriesForDay({ year, trimester, week, day });
    return virtualDay.find((entry) => String(entry.phase) === phase) ?? null;
  } catch (_err) {
    return null;
  }
}

export function listEventsForDay(slotRef) {
  if (!slotRef) return [];
  const events = getAcademyCache()?.events?.events ?? [];
  return events.filter((event) => Array.isArray(event?.calendarRefs) && event.calendarRefs.some((ref) => {
    if (slotRef.year !== undefined && ref.year !== slotRef.year) return false;
    if (slotRef.day !== undefined && ref.day !== slotRef.day) return false;
    if (slotRef.phase !== undefined && ref.phase !== slotRef.phase) return false;
    return true;
  }));
}

export function getValidation() {
  return getAcademyCache()?.validation ?? null;
}

export function getLessons() {
  const cache = getAcademyCache();
  if (!cache) throw new Error('AcademyDataApi not initialized. Call AcademyDataApi.init() first.');
  return cache.lessons.lessons;
}

export function getLesson(id) {
  const cache = getAcademyCache();
  if (!cache) throw new Error('AcademyDataApi not initialized. Call AcademyDataApi.init() first.');
  return cache.lessons.lessons.find((row) => row.id === id) ?? null;
}

export function getNpcs() {
  const cache = getAcademyCache();
  if (!cache) throw new Error('AcademyDataApi not initialized. Call AcademyDataApi.init() first.');
  return cache.npcs.npcs;
}

export function getNpc(id) {
  const cache = getAcademyCache();
  if (!cache) throw new Error('AcademyDataApi not initialized. Call AcademyDataApi.init() first.');
  return cache.npcs.npcs.find((row) => row.id === id) ?? null;
}

export function getLocations() {
  const cache = getAcademyCache();
  if (!cache) return unready('getLocations', []);
  return cache.locations.locations;
}

export function getLocation(id) {
  const cache = getAcademyCache();
  if (!cache) return unready('getLocation', null);
  return cache.locations.locations.find((row) => row.id === id) ?? null;
}

export function getCalendarEntries() {
  const cache = getAcademyCache();
  if (!cache) return unready('getCalendarEntries', []);
  return cache.calendar.entries;
}

export function getCalendarEntry(id) {
  const cache = getAcademyCache();
  if (!cache) throw new Error('AcademyDataApi not initialized. Call AcademyDataApi.init() first.');
  return cache.calendar.entries.find((row) => row.id === id) ?? null;
}

export function getEvents() {
  const cache = getAcademyCache();
  if (!cache) throw new Error('AcademyDataApi not initialized. Call AcademyDataApi.init() first.');
  return cache.events.events;
}

export function getEvent(id) {
  const cache = getAcademyCache();
  if (!cache) throw new Error('AcademyDataApi not initialized. Call AcademyDataApi.init() first.');
  return cache.events.events.find((row) => row.id === id) ?? null;
}

export function getCircles() {
  const cache = getAcademyCache();
  if (!cache) throw new Error('AcademyDataApi not initialized. Call AcademyDataApi.init() first.');
  return cache.circles?.circles ?? [];
}

export function getCircle(id) {
  const cache = getAcademyCache();
  if (!cache) throw new Error('AcademyDataApi not initialized. Call AcademyDataApi.init() first.');
  return (cache.circles?.circles ?? []).find((row) => row.id === id) ?? null;
}

export function getExams() {
  const cache = getAcademyCache();
  if (!cache) throw new Error('AcademyDataApi not initialized. Call AcademyDataApi.init() first.');
  return cache.exams?.exams ?? [];
}

export function getExam(id) {
  const cache = getAcademyCache();
  if (!cache) throw new Error('AcademyDataApi not initialized. Call AcademyDataApi.init() first.');
  return (cache.exams?.exams ?? []).find((row) => row.id === id) ?? null;
}

export function getGradingSchemes() {
  const cache = getAcademyCache();
  if (!cache) throw new Error('AcademyDataApi not initialized. Call AcademyDataApi.init() first.');
  return cache.gradingSchemes?.schemes ?? {};
}

export function getGradingScheme(id) {
  const schemes = getGradingSchemes();
  const key = String(id ?? '').trim();
  if (!key) return null;
  return schemes[key] ?? null;
}

export function getDefaultGradingSchemeId() {
  const cache = getAcademyCache();
  if (!cache) throw new Error('AcademyDataApi not initialized. Call AcademyDataApi.init() first.');
  const explicitId = String(cache.gradingSchemes?.defaultSchemeId ?? cache.gradingSchemes?.meta?.defaultSchemeId ?? '').trim();
  const schemes = cache.gradingSchemes?.schemes ?? {};
  if (explicitId && schemes[explicitId]) return explicitId;
  if (schemes.punin_standard) return 'punin_standard';
  return Object.keys(schemes)[0] ?? null;
}

export function getDefaultExamGradingScheme() {
  const schemeId = getDefaultGradingSchemeId();
  const scheme = schemeId ? getGradingScheme(schemeId) : null;
  const grades = Array.isArray(scheme?.grades) ? scheme.grades : [];
  return grades.map((grade) => ({
    id: grade?.id ?? 'unknown',
    label: grade?.name ?? grade?.id ?? 'Unbekannt',
    minPercent: Number(grade?.minScore ?? 0),
    color: grade?.color ?? null,
    bonus: Number.isFinite(Number(grade?.bonus)) ? Number(grade.bonus) : null,
  }));
}

export function getExamQuestionSets() {
  const cache = getAcademyCache();
  if (!cache) throw new Error('AcademyDataApi not initialized. Call AcademyDataApi.init() first.');
  return cache.examQuestions?.questionSets ?? cache.examQuestions?.questions ?? [];
}

export function getExamQuestionSet(id) {
  const cache = getAcademyCache();
  if (!cache) throw new Error('AcademyDataApi not initialized. Call AcademyDataApi.init() first.');
  const questionSets = cache.examQuestions?.questionSets ?? cache.examQuestions?.questions ?? [];
  return questionSets.find((row) => row.id === id) ?? null;
}

export function getLibraryItems() {
  const cache = getAcademyCache();
  if (!cache) throw new Error('AcademyDataApi not initialized.');
  return cache.library?.items ?? [];
}

export function getSpellsIndex() {
  const cache = getAcademyCache();
  if (!cache) throw new Error('AcademyDataApi not initialized.');
  return cache.spellsIndex?.spells ?? [];
}

export function getAlchemyRecipeItems() {
  const cache = getAcademyCache();
  if (!cache) throw new Error('AcademyDataApi not initialized.');
  return cache.alchemyRecipes?.recipes ?? cache.alchemyRecipes ?? [];
}

export function getCalendarConfig() {
  const cache = getAcademyCache();
  if (!cache) throw new Error('AcademyDataApi not initialized. Call AcademyDataApi.init() first.');
  const template = cache.calendarTemplate;
  if (!template) return null;
  return { days: template.days, timeSlots: template.timeSlots, plans: template.plans };
}

export function getTeachingSessionsForSlot(slotRef = {}) {
  const cache = getAcademyCache();
  if (!cache) throw new Error('AcademyDataApi not initialized. Call AcademyDataApi.init() first.');
  const sessions = cache.teachingSessions?.sessions;
  if (!Array.isArray(sessions) || !sessions.length) return [];

  const dayKey = normalizeAventurianDayToWeekday(slotRef.day) ?? String(slotRef.day ?? '').trim();
  const slotId = mapCalendarPhaseToTeachingSlotId(slotRef.phase) ?? String(slotRef.phase ?? '').trim();

  let out = [];
  if (dayKey && slotId) {
    out = sessions.filter((row) => String(row.day).trim().toUpperCase() === String(dayKey).trim().toUpperCase()
      && String(row.slotId).trim().toUpperCase() === String(slotId).trim().toUpperCase());
  }
  if (!out.length && dayKey) {
    out = sessions.filter((row) => String(row.day).trim().toUpperCase() === String(dayKey).trim().toUpperCase());
  }
  return out;
}

export function getVirtualCalendarEntriesForDay(dayRef) {
  const cache = getAcademyCache();
  if (!cache) throw new Error('AcademyDataApi not initialized. Call AcademyDataApi.init() first.');
  const sessions = cache.teachingSessions?.sessions;
  if (!Array.isArray(sessions) || !sessions.length) return [];

  const year = Number(dayRef?.year);
  const trimester = Number(dayRef?.trimester);
  const week = Number(dayRef?.week);
  const day = String(dayRef?.day ?? '').trim();
  const slotOrder = Array.isArray(dayRef?.slotOrder) ? dayRef.slotOrder : null;
  if (!Number.isFinite(year) || !Number.isFinite(trimester) || !Number.isFinite(week) || !day) return [];

  const dayKey = normalizeAventurianDayToWeekday(day) ?? day;
  const dayKeyUp = String(dayKey).trim().toUpperCase();
  const daySessions = sessions.filter((row) => String(row.day).trim().toUpperCase() === dayKeyUp);
  if (!daySessions.length) return [];

  return daySessions.reduce((out, session) => {
    const basePhase = mapTeachingSlotIdToCalendarPhase(session.slotId);
    const phase = chooseExistingPhase(slotOrder, [basePhase].filter(Boolean)) ?? basePhase;
    if (!phase) return out;
    out.push({
      id: `VIRT_${year}_${trimester}_${week}_${day}_${phase}_${session.id}`,
      year,
      trimester,
      week,
      day,
      phase,
      type: session.type ?? 'lesson',
      title: session.subject ?? session.id,
      subject: session.subject ?? null,
      teacher: session.teacher ?? null,
      room: session.room ?? null,
      start: session.start ?? null,
      end: session.end ?? null,
      slotId: session.slotId ?? null,
      _virtual: true,
    });
    return out;
  }, []);
}

export function getSpellCurriculum() { return getAcademyCache()?.spellCurriculum ?? null; }
export function getAlchemyRecipes() { return getAcademyCache()?.alchemyRecipes ?? null; }
export function getLessonGenerator() { return getAcademyCache()?.lessonGenerator ?? null; }
export function getCalendarTemplate() { return getAcademyCache()?.calendarTemplate ?? null; }
export function getTeachingSessions() { return getAcademyCache()?.teachingSessions ?? null; }

export function getQuestIndex() { return getAcademyCache()?.questIndex ?? []; }
export function getEventIndex() { return getAcademyCache()?.eventIndex ?? []; }
export function getEffectIndex() { return getAcademyCache()?.effectIndex ?? []; }

export function getExtendedDataset(key) {
  return getAcademyCache()?.extensions?.[String(key ?? '').trim()] ?? null;
}

export function getAssignments() { return getExtendedDataset('assignments')?.assignments ?? []; }
export function getSanctuaryUpgrades() { return getExtendedDataset('sanctuary')?.stations ?? []; }
export function getDuels() { return getExtendedDataset('duels')?.ranks ?? []; }
export function getFactions() { return getExtendedDataset('factions')?.factions ?? []; }
export function getHarvestNodes() { return getExtendedDataset('harvest_nodes')?.nodes ?? []; }
export function getFieldGuidePages() { return getExtendedDataset('field_guide_lore')?.pages ?? []; }
export function getRumors() { return getExtendedDataset('rumors')?.rumors ?? []; }
export function getSocialLinks() { return getExtendedDataset('social_links')?.socialLinks ?? []; }
export function getSocialLink(id) {
  const key = String(id ?? '').trim();
  return getSocialLinks().find((row) => String(row?.id ?? '') === key) ?? null;
}
export function getMilestones() { return getExtendedDataset('milestones')?.milestones ?? []; }
export function getMilestone(id) {
  const key = String(id ?? '').trim();
  return getMilestones().find((row) => String(row?.id ?? '') === key) ?? null;
}
export function getCollections() { return getExtendedDataset('collections')?.collections ?? []; }
export function getCollection(id) {
  const key = String(id ?? '').trim();
  return getCollections().find((row) => String(row?.id ?? '') === key) ?? null;
}
export function getSchoolStatsConfig() { return getExtendedDataset('school_stats')?.stats ?? []; }
export function getResourcesConfig() { return getExtendedDataset('resources')?.resources ?? []; }
export function getMechanicGates() { return getExtendedDataset('mechanic_gates')?.gates ?? []; }
export function getMechanicGate(id) {
  const key = String(id ?? '').trim();
  return getMechanicGates().find((row) => String(row?.id ?? '') === key) ?? null;
}
export function getPoolIndex() { return getAcademyCache()?.poolIndex ?? []; }

export function getLocationActivityModifiers(locationId, activityType = null) {
  const key = String(locationId ?? '').trim();
  const type = activityType == null ? null : String(activityType).trim();
  const row = (getAcademyCache()?.locations?.locations ?? []).find((loc) => String(loc?.id ?? '') === key) ?? null;
  const modifiers = Array.isArray(row?.activityModifiers) ? row.activityModifiers : [];
  return type ? modifiers.filter((modifier) => String(modifier?.activityType ?? '') === type) : modifiers;
}

export function buildQuestSummary(state = null) {
  const source = state?.questStates
    ?? state?.academy?.quests
    ?? state
    ?? getJanusCore()?.state?.get('questStates')
    ?? getJanusCore()?.state?.get('academy.quests')
    ?? {};
  const reg = getContentCache().reg;
  const entries = [];
  for (const [actorId, quests] of Object.entries(source || {})) {
    for (const [questId, questState] of Object.entries(quests || {})) {
      const def = reg?.by?.quest?.get?.(questId) ?? null;
      entries.push({
        actorId,
        questId,
        title: def?.title ?? questId,
        status: questState?.status ?? 'unknown',
        currentNodeId: questState?.currentNodeId ?? null,
        deadlineDays: def?.deadlineDays ?? null,
        startedAt: questState?.startedAt ?? null,
        historyCount: Array.isArray(questState?.history) ? questState.history.length : 0,
      });
    }
  }
  return entries;
}

export function buildRumorBoard(state = null) {
  const root = state ?? getJanusCore()?.state?.get() ?? {};
  const heard = root?.academy?.rumorsHeard ?? {};
  const liveRumors = root?.academy?.rumors ?? {};
  return getRumors().map((rumor) => {
    const live = liveRumors?.[rumor.id] ?? null;
    return {
      id: rumor.id,
      text: rumor.text,
      truthLevel: rumor.truthLevel ?? null,
      decayDays: rumor.decayDays ?? null,
      unlockedByEventId: rumor.unlockedByEventId ?? null,
      heard: Boolean(heard?.[rumor.id]),
      active: Boolean(live?.active ?? false),
      status: live?.status ?? 'dormant',
      availableAtDay: live?.availableAtDay ?? null,
      expiresAtDay: live?.expiresAtDay ?? null,
    };
  });
}

export function buildFactionStanding(state = null) {
  const standings = state?.academy?.factions ?? getJanusCore()?.state?.get('academy.factions') ?? {};
  return getFactions().map((faction) => ({
    id: faction.id,
    name: faction.name,
    type: faction.type,
    points: Number(standings?.[faction.id]?.points ?? 0),
    reputation: Number(standings?.[faction.id]?.reputation ?? 0),
    rivalry: faction.rivalry ?? null,
    perks: Array.isArray(faction.perks) ? faction.perks : [],
  }));
}

export function buildSocialLinksSummary(state = null) {
  const root = state ?? getJanusCore()?.state?.get() ?? {};
  const social = root?.academy?.socialLinks ?? {};
  return getSocialLinks().map((link) => ({
    id: link.id,
    npcId: link.npcId,
    arcana: link.arcana ?? null,
    rank: Number(social?.[link.id]?.rank ?? 0),
    maxRank: Number(link?.maxRank ?? (Array.isArray(link?.ranks) ? link.ranks.length : 0)),
    pendingEventId: social?.[link.id]?.pendingEventId ?? null,
    perks: Array.isArray(social?.[link.id]?.perks) ? social[link.id].perks : [],
  }));
}

export function buildCollectionsSummary(state = null) {
  const root = state ?? getJanusCore()?.state?.get() ?? {};
  const collectionsState = root?.academy?.collections ?? {};
  return getCollections().map((collection) => {
    const row = collectionsState?.[collection.id] ?? {};
    const foundItemIds = Array.isArray(row?.foundItemIds) ? row.foundItemIds : [];
    const total = Array.isArray(collection?.items) ? collection.items.length : 0;
    return {
      id: collection.id,
      name: collection.name,
      foundItemIds,
      found: foundItemIds.length,
      total,
      completed: Boolean(row?.completed),
      title: row?.title ?? collection?.completionReward?.title ?? null,
    };
  });
}

export function buildMilestonesSummary(state = null) {
  const root = state ?? getJanusCore()?.state?.get() ?? {};
  const milestonesState = root?.academy?.milestones ?? {};
  return getMilestones().map((milestone) => ({
    id: milestone.id,
    name: milestone.name,
    resolved: Boolean(milestonesState?.[milestone.id]?.resolved),
    outcomeId: milestonesState?.[milestone.id]?.outcomeId ?? null,
    grantedTags: Array.isArray(milestonesState?.[milestone.id]?.grantedTags) ? milestonesState[milestone.id].grantedTags : [],
  }));
}

export function buildAcademyStatsSummary(state = null) {
  const root = state ?? getJanusCore()?.state?.get() ?? {};
  const academy = root?.academy ?? {};
  const resources = academy?.resources ?? {};
  const schoolStats = academy?.schoolStats ?? {};
  return {
    resources: getResourcesConfig().map((cfg) => ({
      id: cfg.id,
      label: cfg.label ?? cfg.id,
      min: Number(cfg.min ?? 0),
      max: Number(cfg.max ?? 10),
      value: Number(resources?.[cfg.id] ?? 0),
    })),
    schoolStats: getSchoolStatsConfig().map((cfg) => ({
      id: cfg.id,
      label: cfg.label ?? cfg.id,
      min: Number(cfg.min ?? 0),
      max: Number(cfg.max ?? 10),
      value: Number(schoolStats?.[cfg.id] ?? 0),
    })),
    tags: Array.isArray(academy?.tags) ? academy.tags : [],
    perks: Array.isArray(academy?.perks) ? academy.perks : [],
  };
}

export function buildEventContext(state = null) {
  const time = state?.time ?? getJanusCore()?.state?.get('time') ?? {};
  return {
    time: clone(time),
    activeLocationId: state?.academy?.currentLocationId ?? getJanusCore()?.state?.get('academy.currentLocationId') ?? null,
    availableRumors: buildRumorBoard(state).filter((row) => !row.heard),
    activeQuests: buildQuestSummary(state).filter((row) => row.status === 'active'),
    socialLinks: buildSocialLinksSummary(state),
    collections: buildCollectionsSummary(state),
    academyStats: buildAcademyStatsSummary(state),
  };
}

export function exportAcademyData() {
  const cache = getAcademyCache();
  if (!cache) throw new Error('AcademyDataApi not initialized. Call AcademyDataApi.init() first.');
  return {
    lessons: clone(cache.lessons),
    npcs: clone(cache.npcs),
    calendar: clone(cache.calendar),
    locations: clone(cache.locations),
    events: clone(cache.events),
    questIndex: clone(cache.questIndex ?? []),
    eventIndex: clone(cache.eventIndex ?? []),
    poolIndex: clone(cache.poolIndex ?? []),
    eventOptions: clone(cache.eventOptions ?? []),
    effectIndex: clone(cache.effectIndex ?? []),
    extensions: clone(cache.extensions ?? {}),
  };
}
