/**
 * @file academy/data-api-init.js
 * Loader/bootstrap for AcademyDataApi cache.
 */

import { getJanusCore } from '../core/index.js';
import { emitHook, HOOKS } from '../core/hooks/emitter.js';
import {
  deepFreeze,
  loadDataJson,
  loadJson,
  logReferenceDiagnostics,
  setAcademyCache,
  getAcademyCache,
  validateAcademyDatasets,
  validateExtendedDatasets,
  validateOptionalDataset,
} from './data-api-store.js';
import { applyWorldOverrides, loadWorldOverrides } from './world-editor.js';

export async function initAcademyData() {
  if (getAcademyCache()) return getAcademyCache();

  const core = getJanusCore();
  if (!core?.validator || !core?.logger) {
    throw new Error('JANUS7: Core (validator/logger) ist nicht verfügbar. Stelle sicher, dass Phase 1 geladen ist.');
  }
  const log = core.logger.child('academy:data');

  let lessons, npcs, calendar, locations, events;
  try {
    [lessons, npcs, calendar, locations, events] = await Promise.all([
      loadJson('lessons.json'),
      loadJson('npcs.json'),
      loadJson('calendar.json'),
      loadJson('locations.json'),
      loadJson('events.json'),
    ]);
  } catch (err) {
    log.error('[JANUS7] Kern-Datensatz konnte nicht geladen werden', { err: err?.message ?? err });
    throw new Error(`JANUS7: Academy-Initialisierung fehlgeschlagen — Kern-JSON fehlt oder ist beschädigt. Ursache: ${err?.message ?? err}`);
  }

  const world = loadWorldOverrides();
  if (world?.lessons?.length) lessons.lessons = applyWorldOverrides(lessons.lessons, world.lessons);
  if (world?.npcs?.length) npcs.npcs = applyWorldOverrides(npcs.npcs, world.npcs);
  if (world?.locations?.length) locations.locations = applyWorldOverrides(locations.locations, world.locations);
  if (world?.events?.length) events.events = applyWorldOverrides(events.events, world.events);
  if (world?.calendar && typeof world.calendar === 'object') {
    calendar.meta = world.calendar.meta ?? calendar.meta;
    calendar.entries = world.calendar.entries ?? calendar.entries;
  }

  validateAcademyDatasets(core.validator, lessons, npcs, calendar, locations, events);

  const optionalLoadWarnings = [];
  const loadOptionalDataset = async (loader, rel, { label = rel, fallback = null } = {}) => {
    try {
      return await loader(rel);
    } catch (err) {
      optionalLoadWarnings.push({
        label,
        file: rel,
        message: err?.message ?? String(err),
      });
      return fallback;
    }
  };

  let questIndex = [];
  let eventIndex = [];
  let effectIndex = [];
  let poolIndex = [];
  let eventOptions = [];
  questIndex = await loadOptionalDataset(loadDataJson, 'quests/quest-index.json', { label: 'questIndex', fallback: [] });
  eventIndex = await loadOptionalDataset(loadDataJson, 'events/event-index.json', { label: 'eventIndex', fallback: [] });
  poolIndex = await loadOptionalDataset(loadDataJson, 'events/pool-index.json', { label: 'poolIndex', fallback: [] });
  eventOptions = await loadOptionalDataset(loadDataJson, 'events/options.json', { label: 'eventOptions', fallback: [] });
  effectIndex = await loadOptionalDataset(loadDataJson, 'academy/effects/effect-index.json', { label: 'effectIndex', fallback: [] });

  let spellCurriculum = null;
  let spellsIndex = null;
  let alchemyRecipes = null;
  let lessonGenerator = null;
  let calendarTemplate = null;
  let teachingSessions = null;
  let circles = null;
  let exams = null;
  let examQuestions = null;
  let gradingSchemes = null;
  let subjects = null;
  let apAwards = null;
  spellCurriculum = await loadOptionalDataset(loadJson, 'spell-curriculum.json', { label: 'spellCurriculum' });
  spellsIndex = await loadOptionalDataset(loadJson, 'spells-index.json', { label: 'spellsIndex' });
  alchemyRecipes = await loadOptionalDataset(loadJson, 'alchemy-recipes.json', { label: 'alchemyRecipes' });
  lessonGenerator = await loadOptionalDataset(loadJson, 'lesson-generator.json', { label: 'lessonGenerator' });
  calendarTemplate = await loadOptionalDataset(loadJson, 'calendar-template.json', { label: 'calendarTemplate' });
  teachingSessions = await loadOptionalDataset(loadJson, 'teaching-sessions.json', { label: 'teachingSessions' });
  circles = await loadOptionalDataset(loadJson, 'circles.json', { label: 'circles' });
  exams = await loadOptionalDataset(loadJson, 'exams.json', { label: 'exams' });
  examQuestions = await loadOptionalDataset(loadJson, 'exam-questions.json', { label: 'examQuestions' });
  gradingSchemes = await loadOptionalDataset(loadJson, 'grading-schemes.json', { label: 'gradingSchemes' });
  subjects = await loadOptionalDataset(loadJson, 'subjects.json', { label: 'subjects' });
  apAwards = await loadOptionalDataset(loadJson, 'ap-awards.json', { label: 'apAwards' });

  let library = null;
  library = await loadOptionalDataset(loadJson, 'library.json', { label: 'library' });

  const extensionFiles = Object.freeze({
    assignments: 'academy/extensions/assignments.json',
    sanctuary: 'academy/extensions/sanctuary.json',
    duels: 'academy/extensions/duels.json',
    factions: 'academy/extensions/factions.json',
    harvest_nodes: 'academy/extensions/harvest_nodes.json',
    field_guide_lore: 'academy/extensions/field_guide_lore.json',
    rumors: 'academy/extensions/rumors.json',
    social_links: 'academy/social_links.json',
    milestones: 'academy/milestones.json',
    collections: 'academy/collections.json',
    school_stats: 'academy/school_stats.json',
    resources: 'academy/resources.json',
  });
  const extensions = {};
  for (const [key, rel] of Object.entries(extensionFiles)) {
    extensions[key] = await loadOptionalDataset(loadDataJson, rel, { label: `extension:${key}` });
  }
  validateExtendedDatasets(extensions);

  try {
    if (world?.spellCurriculum && typeof world.spellCurriculum === 'object') spellCurriculum = world.spellCurriculum;
    if (world?.spellsIndex && typeof world.spellsIndex === 'object') spellsIndex = world.spellsIndex;
    if (world?.library && typeof world.library === 'object') {
      library = world.library;
    } else if (library && Array.isArray(library.items) && Array.isArray(world?.libraryItems) && world.libraryItems.length) {
      const byId = new Map(library.items.filter((item) => item && item.id).map((item) => [item.id, item]));
      for (const item of world.libraryItems) {
        if (item?.id) byId.set(item.id, item);
      }
      library.items = Array.from(byId.values());
    }
  } catch (_e) {}

  validateOptionalDataset(core.validator, 'academy.exams', exams, 'exams');
  validateOptionalDataset(core.validator, 'academy.examQuestions', examQuestions, 'exam-questions');
  validateOptionalDataset(core.validator, 'academy.gradingSchemes', gradingSchemes, 'grading-schemes');
  validateOptionalDataset(core.validator, 'academy.library', library, 'library');
  validateOptionalDataset(core.validator, 'academy.alchemyRecipes', alchemyRecipes, 'alchemy-recipes');
  validateOptionalDataset(core.validator, 'academy.calendarTemplate', calendarTemplate, 'calendar-template');
  validateOptionalDataset(core.validator, 'academy.teachingSessions', teachingSessions, 'teaching-sessions');
  validateOptionalDataset(core.validator, 'academy.circles', circles, 'circles');
  validateOptionalDataset(core.validator, 'academy.collections', extensions?.collections, 'collections');
  validateOptionalDataset(core.validator, 'academy.subjects', subjects, 'subjects');
  validateOptionalDataset(core.validator, 'academy.socialLinks', extensions?.social_links, 'social_links');
  validateOptionalDataset(core.validator, 'academy.schoolStats', extensions?.school_stats, 'school_stats');
  validateOptionalDataset(core.validator, 'academy.milestones', extensions?.milestones, 'milestones');
  validateOptionalDataset(core.validator, 'academy.apAwards', apAwards, 'ap-awards');

  const academyReferenceDiagnostics = core.validator?.validateAcademyReferenceIntegrity?.({
    lessons,
    exams,
    examQuestions,
    npcs,
    locations,
    library,
    events,
    circles,
    teachingSessions,
    socialLinks: extensions?.social_links,
    collections: extensions?.collections,
  }, { strict: false }) ?? null;
  logReferenceDiagnostics(log, academyReferenceDiagnostics);
  if (optionalLoadWarnings.length) {
    log.warn('Optional academy datasets unavailable', {
      count: optionalLoadWarnings.length,
      datasets: optionalLoadWarnings,
    });
  }

  const cache = deepFreeze({
    lessons,
    npcs,
    calendar,
    locations,
    events,
    questIndex,
    eventIndex,
    poolIndex,
    eventOptions,
    effectIndex,
    spellCurriculum,
    spellsIndex,
    alchemyRecipes,
    lessonGenerator,
    calendarTemplate,
    teachingSessions,
    circles,
    exams,
    examQuestions,
    gradingSchemes,
    library,
    subjects,
    apAwards,
    extensions,
    validation: { academyReferenceDiagnostics, optionalLoadWarnings },
  });
  setAcademyCache(cache);

  try {
    emitHook(HOOKS.ACADEMY_DATA_RELOADED, {
      source: 'AcademyDataApi.init',
      counts: {
        lessons: lessons?.lessons?.length ?? 0,
        npcs: npcs?.npcs?.length ?? 0,
        locations: locations?.locations?.length ?? 0,
        events: events?.events?.length ?? 0,
        circles: circles?.circles?.length ?? 0,
      },
    });
  } catch (_emitErr) {}

  log.info('AcademyDataApi initialized', {
    lessons: lessons?.lessons?.length ?? 0,
    npcs: npcs?.npcs?.length ?? 0,
    calendar: calendar?.entries?.length ?? 0,
    locations: locations?.locations?.length ?? 0,
    events: events?.events?.length ?? 0,
    circles: circles?.circles?.length ?? 0,
    exams: exams?.exams?.length ?? 0,
    gradingSchemes: Object.keys(gradingSchemes?.schemes ?? {}).length,
  });

  return cache;
}
