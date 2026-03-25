import { emitHook, HOOKS } from '../../core/hooks/emitter.js';
import { MODULE_ID } from '../../core/common.js';
import JanusLessonDataModel from '../documents/JanusLessonDataModel.js';
import { JANUS_LESSON_DEFAULT_IMG, JANUS_LESSON_FLAG_SCOPE, JANUS_LESSON_FOLDER_NAME, JANUS_LESSON_SUBTYPE } from '../documents/lesson-constants.js';
import { JanusLessonItemSheet } from '../../ui/apps/JanusLessonItemSheet.js';

function getStateNpcMap(engine) {
  return engine?.core?.state?.get?.('actors.npcs') ?? engine?.state?.get?.('actors.npcs') ?? {};
}

function getStateLocationMap(engine) {
  return engine?.core?.state?.get?.('locations') ?? engine?.state?.get?.('locations') ?? {};
}

function toTeacherUuid(engine, lesson) {
  const npcs = getStateNpcMap(engine);
  const raw = npcs?.[lesson?.teacherNpcId];
  if (!raw) return '';
  return String(raw).startsWith('Actor.') ? String(raw) : `Actor.${raw}`;
}

function toLocationUuid(engine, lesson) {
  const locations = getStateLocationMap(engine);
  const raw = locations?.[lesson?.locationId] || locations?.[lesson?.defaultLocationId];
  if (!raw) return '';
  return String(raw).startsWith('Scene.') ? String(raw) : `Scene.${raw}`;
}

function lessonSystemData(engine, lesson) {
  return {
    lessonId: lesson.id,
    subject: lesson.subject ?? '',
    teacherNpcId: lesson.teacherNpcId ?? '',
    teacherUuid: toTeacherUuid(engine, lesson),
    locationId: lesson.locationId ?? lesson.defaultLocationId ?? '',
    locationUuid: toLocationUuid(engine, lesson),
    yearMin: Array.isArray(lesson.yearRange) ? (Number(lesson.yearRange[0]) || null) : null,
    yearMax: Array.isArray(lesson.yearRange) ? (Number(lesson.yearRange[1]) || null) : null,
    durationSlots: Math.max(1, Number(lesson.durationSlots) || 1),
    difficulty: lesson.mechanics?.checks?.[0]?.difficulty ?? 'normal',
    summary: lesson.summary ?? '',
    tags: Array.isArray(lesson.tags) ? lesson.tags : [],
    mechanics: lesson.mechanics ?? {},
    scoringImpact: lesson.scoringImpact ?? {},
    references: lesson.references ?? {},
    source: foundry.utils.deepClone(lesson ?? {}),
    img: JANUS_LESSON_DEFAULT_IMG
  };
}

async function ensureLessonFolder() {
  const existing = game.folders?.find((f) => f.type === 'Item' && f.name === JANUS_LESSON_FOLDER_NAME);
  if (existing) return existing;
  return Folder.create({ name: JANUS_LESSON_FOLDER_NAME, type: 'Item', color: '#5a7cb8' });
}

export function registerLessonDocuments() {
  CONFIG.Item.dataModels ??= {};
  CONFIG.Item.dataModels[JANUS_LESSON_SUBTYPE] = JanusLessonDataModel;

  try {
    const DSC = foundry.applications?.apps?.DocumentSheetConfig ?? globalThis.DocumentSheetConfig;
    if (DSC?.registerSheet) {
      DSC.registerSheet(Item, MODULE_ID, JanusLessonItemSheet, {
        types: [JANUS_LESSON_SUBTYPE],
        label: 'JANUS Lesson',
        makeDefault: true
      });
      return;
    }
  } catch (_err) { /* fallback below */ }

  try {
    Items.registerSheet(MODULE_ID, JanusLessonItemSheet, {
      types: [JANUS_LESSON_SUBTYPE],
      label: 'JANUS Lesson',
      makeDefault: true
    });
  } catch (err) {
    console.warn('[JANUS7] Lesson sheet registration failed', err);
  }
}

export async function createEmptyLessonDocument() {
  const folder = await ensureLessonFolder();
  return Item.create({
    name: 'Neue Lesson',
    type: JANUS_LESSON_SUBTYPE,
    img: JANUS_LESSON_DEFAULT_IMG,
    folder: folder?.id,
    system: {
      lessonId: foundry.utils.randomID(),
      subject: '',
      teacherNpcId: '',
      teacherUuid: '',
      locationId: '',
      locationUuid: '',
      yearMin: null,
      yearMax: null,
      durationSlots: 1,
      difficulty: 'normal',
      summary: '',
      tags: [],
      mechanics: {},
      scoringImpact: {},
      references: {},
      source: {}
    },
    flags: {
      [JANUS_LESSON_FLAG_SCOPE]: {
        lessonId: foundry.utils.randomID(),
        origin: 'manual'
      }
    }
  });
}

export async function ensureLessonDocumentsReady(engine, { forceSync = false } = {}) {
  const academyData = engine?.academy?.data ?? engine?.academy?.dataApi ?? game?.janus7?.academy?.data ?? null;
  const lessons = academyData?.getLessons?.() ?? [];
  const folder = await ensureLessonFolder();
  const existing = game.items.filter((i) => i.type === JANUS_LESSON_SUBTYPE);
  const byLessonId = new Map(existing.map((i) => [i.getFlag(JANUS_LESSON_FLAG_SCOPE, 'lessonId') ?? i.system?.lessonId, i]));
  let created = 0;
  let updated = 0;
  const toUpdate = [];

  const toCreate = [];
  const toUpdate = [];

  for (const lesson of lessons) {
    const data = {
      name: lesson.name || lesson.id,
      type: JANUS_LESSON_SUBTYPE,
      img: JANUS_LESSON_DEFAULT_IMG,
      folder: folder?.id,
      system: lessonSystemData(engine, lesson),
      flags: {
        [JANUS_LESSON_FLAG_SCOPE]: {
          lessonId: lesson.id,
          origin: 'academy-data',
          sourceVersion: game.modules?.get(MODULE_ID)?.version ?? 'unknown'
        }
      }
    };

    const existingDoc = byLessonId.get(lesson.id);
    if (!existingDoc) {
      toCreate.push(data);
      continue;
    }

    if (forceSync) {
      data._id = existingDoc.id;
      toUpdate.push(data);
    }
  }

  if (toCreate.length > 0) {
    await Item.createDocuments(toCreate, { keepId: false });
    created += toCreate.length;
  }

  if (toUpdate.length > 0) {
    await Item.updateDocuments(toUpdate);
    updated += toUpdate.length;
      toUpdate.push({ _id: existingDoc.id, ...data });
      updated += 1;
    }
  }

  if (toUpdate.length > 0) {
    await Item.updateDocuments(toUpdate);
  }

  engine.academy ??= {};
  engine.academy.documents ??= {};
  engine.academy.documents.lessons = {
    subtype: JANUS_LESSON_SUBTYPE,
    list: () => game.items.filter((i) => i.type === JANUS_LESSON_SUBTYPE),
    getByLessonId: (lessonId) => game.items.find((i) => i.type === JANUS_LESSON_SUBTYPE && (i.getFlag(JANUS_LESSON_FLAG_SCOPE, 'lessonId') === lessonId || i.system?.lessonId === lessonId)) ?? null,
    ensureReady: (opts = {}) => ensureLessonDocumentsReady(engine, opts)
  };

  emitHook(HOOKS.LESSON_DOCUMENTS_READY, { created, updated, total: game.items.filter((i) => i.type === JANUS_LESSON_SUBTYPE).length });
  return { created, updated };
}

export default { registerLessonDocuments, ensureLessonDocumentsReady, createEmptyLessonDocument };
