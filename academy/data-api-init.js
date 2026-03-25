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

  const [lessons, npcs, calendar, locations, events] = await Promise.all([
    loadJson('lessons.json'),
    loadJson('npcs.json'),
    loadJson('calendar.json'),
    loadJson('locations.json'),
    loadJson('events.json'),
  ]);

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

  let questIndex = [];
  let eventIndex = [];
  let effectIndex = [];
  let poolIndex = [];
  let eventOptions = [];
  try { questIndex = await loadDataJson('quests/quest-index.json'); } catch (err) { log.warn('Quests index missing (phase2 optional)', err); }
  try { eventIndex = await loadDataJson('events/event-index.json'); } catch (err) { log.warn('Events index missing (phase2 optional)', err); }
  try { poolIndex = await loadDataJson('events/pool-index.json'); } catch (err) { log.warn('Pool index missing (phase2 optional)', err); }
  try { eventOptions = await loadDataJson('events/options.json'); } catch (err) { log.warn('Event options missing (phase2 optional)', err); }
  try { effectIndex = await loadDataJson('academy/effects/effect-index.json'); } catch (err) { log.warn('Effects index missing (phase2 optional)', err); }

  let spellCurriculum = null;
  let spellsIndex = null;
  let alchemyRecipes = null;
  let lessonGenerator = null;
  let calendarTemplate = null;
  let teachingSessions = null;
  let circles = null;
  let exams = null;
  let examQuestions = null;
  let subjects = null;
  let apAwards = null;
  try { spellCurriculum = await loadJson('spell-curriculum.json'); } catch (_e) {}
  try { spellsIndex = await loadJson('spells-index.json'); } catch (_e) {}
  try { alchemyRecipes = await loadJson('alchemy-recipes.json'); } catch (_e) {}
  try { lessonGenerator = await loadJson('lesson-generator.json'); } catch (_e) {}
  try { calendarTemplate = await loadJson('calendar-template.json'); } catch (_e) {}
  try { teachingSessions = await loadJson('teaching-sessions.json'); } catch (_e) {}
  try { circles = await loadJson('circles.json'); } catch (_e) {}
  try { exams = await loadJson('exams.json'); } catch (_e) {}
  try { examQuestions = await loadJson('exam-questions.json'); } catch (_e) {}
  try { subjects = await loadJson('subjects.json'); } catch (_e) {}
  try { apAwards = await loadJson('ap-awards.json'); } catch (_e) {}

  let library = null;
  try { library = await loadJson('library.json'); } catch (_e) {}

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
    try { extensions[key] = await loadDataJson(rel); } catch (_e) { extensions[key] = null; }
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
    library,
    subjects,
    apAwards,
    extensions,
    validation: { academyReferenceDiagnostics },
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
  });

  return cache;
}
