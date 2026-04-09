import { emitHook, HOOKS, MODULE_ID } from '../core/public-api.mjs';
import {
  JANUS_LESSON_DEFAULT_IMG,
  JANUS_LESSON_FLAG_SCOPE,
  JANUS_LESSON_FOLDER_NAME,
  JANUS_LESSON_ITEM_TYPE,
  JANUS_LESSON_SHEET_CLASS,
  JANUS_LESSON_SUBTYPE,
  buildLessonBookSystemData,
  buildLessonFlagData,
  getLessonFlagBlock,
  getLessonPayload,
  isJanusLessonDocument,
  isLegacyLessonItemType
} from '../documents/lesson-constants.js';
import { JanusLessonItemSheet } from '../../ui/apps/JanusLessonItemSheet.js';

function getStateNpcMap(engine) {
  return engine?.core?.state?.get?.('actors.npcs') ?? engine?.state?.get?.('actors.npcs') ?? {};
}

function getStateLocationMap(engine) {
  // FIX P2-05: 'locations' existiert nicht im Default-State. Kanonischer Pfad ist 'foundryLinks.locations'.
  return engine?.core?.state?.getPath?.('foundryLinks.locations')
      ?? engine?.core?.state?.get?.('foundryLinks')?.locations
      ?? engine?.state?.getPath?.('foundryLinks.locations')
      ?? {};
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

function lessonPayload(engine, lesson) {
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

function getLessonDocuments() {
  return game.items?.filter?.((item) => isJanusLessonDocument(item)) ?? [];
}

function buildLessonDocumentData({ payload, source = {}, folderId = null, extraFlags = {} } = {}) {
  const flags = getLessonFlagBlock(source);
  const sourceFlags = foundry.utils.deepClone(source?.flags ?? {});
  const moduleFlags = buildLessonFlagData(payload, {
    origin: extraFlags.origin ?? flags.origin ?? 'manual',
    sourceVersion: extraFlags.sourceVersion ?? flags.sourceVersion ?? game.modules?.get(MODULE_ID)?.version ?? 'unknown',
    legacyType: extraFlags.legacyType ?? flags.legacyType ?? null
  });

  return {
    name: source?.name ?? payload.lessonId ?? 'Lesson',
    type: JANUS_LESSON_ITEM_TYPE,
    img: source?.img ?? JANUS_LESSON_DEFAULT_IMG,
    folder: source?.folder ?? folderId ?? null,
    system: buildLessonBookSystemData(payload, source?.system ?? {}),
    flags: foundry.utils.mergeObject(sourceFlags, {
      core: {
        ...(source?.flags?.core ?? {}),
        sheetClass: JANUS_LESSON_SHEET_CLASS
      },
      [JANUS_LESSON_FLAG_SCOPE]: moduleFlags
    }, { inplace: false, recursive: true })
  };
}

async function ensureLessonFolder() {
  const existing = game.folders?.find((f) => f.type === 'Item' && f.name === JANUS_LESSON_FOLDER_NAME);
  if (existing) return existing;
  return Folder.create({ name: JANUS_LESSON_FOLDER_NAME, type: 'Item', color: '#5a7cb8' });
}

async function migrateLegacyLessonDocuments(folder) {
  const seen = new Set();
  const candidates = [];
  const addCandidate = (document) => {
    if (!document) return;
    const source = document?._source ?? document;
    const id = source?._id ?? document?.id ?? null;
    if (!id || seen.has(id)) return;
    const flags = getLessonFlagBlock(source);
    const needsMigration = isLegacyLessonItemType(source?.type)
      || ((source?.type === JANUS_LESSON_ITEM_TYPE) && (flags?.subtype === JANUS_LESSON_SUBTYPE) && (source?.flags?.core?.sheetClass !== JANUS_LESSON_SHEET_CLASS))
      || ((source?.type === JANUS_LESSON_ITEM_TYPE) && flags?.lessonId && !flags?.lessonData);
    if (!needsMigration) return;
    seen.add(id);
    candidates.push(document);
  };

  for (const id of Array.from(game.items?.invalidDocumentIds ?? [])) {
    try {
      addCandidate(game.items.get(id, { invalid: true }));
    } catch (_err) {
      // Ignore ids that vanished while the world was initializing.
    }
  }

  for (const item of getLessonDocuments()) addCandidate(item);

  const updates = candidates.map((document) => {
    const source = document?._source ?? document;
    const flags = getLessonFlagBlock(source);
    const payload = getLessonPayload(source);
    if (!payload.lessonId) payload.lessonId = foundry.utils.randomID();
    return {
      _id: source?._id ?? document?.id,
      ...buildLessonDocumentData({
        payload,
        source,
        folderId: folder?.id ?? null,
        extraFlags: {
          origin: flags.origin ?? (isLegacyLessonItemType(source?.type) ? 'migrated-legacy-type' : 'manual'),
          sourceVersion: flags.sourceVersion ?? game.modules?.get(MODULE_ID)?.version ?? 'unknown',
          legacyType: isLegacyLessonItemType(source?.type) ? String(source.type) : (flags.legacyType ?? null)
        }
      })
    };
  });

  if (updates.length > 0) {
    await Item.updateDocuments(updates, { diff: false, recursive: false });
  }

  return { migrated: updates.length };
}

export function registerLessonDocuments() {
  try {
    const DSC = foundry.applications?.apps?.DocumentSheetConfig ?? globalThis.DocumentSheetConfig;
    if (DSC?.registerSheet) {
      DSC.registerSheet(Item, MODULE_ID, JanusLessonItemSheet, {
        types: [JANUS_LESSON_ITEM_TYPE],
        label: 'JANUS Lesson',
        makeDefault: false,
        canBeDefault: false
      });
      return;
    }
  } catch (_err) { /* fallback below */ }

  try {
    Item.registerSheet(MODULE_ID, JanusLessonItemSheet, {
      types: [JANUS_LESSON_ITEM_TYPE],
      label: 'JANUS Lesson',
      makeDefault: false
    });
  } catch (err) {
    console.warn('[JANUS7] Lesson sheet registration failed', err);
  }
}

export async function createEmptyLessonDocument() {
  const folder = await ensureLessonFolder();
  const lessonId = foundry.utils.randomID();
  const payload = {
    lessonId,
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
  };
  return Item.create({
    name: 'Neue Lesson',
    type: JANUS_LESSON_ITEM_TYPE,
    img: JANUS_LESSON_DEFAULT_IMG,
    folder: folder?.id,
    system: buildLessonBookSystemData(payload),
    flags: {
      core: {
        sheetClass: JANUS_LESSON_SHEET_CLASS
      },
      [JANUS_LESSON_FLAG_SCOPE]: {
        ...buildLessonFlagData(payload, { origin: 'manual' })
      }
    }
  });
}

export async function ensureLessonDocumentsReady(engine, { forceSync = false } = {}) {
  const academyData = engine?.academy?.data ?? engine?.academy?.dataApi ?? game?.janus7?.academy?.data ?? null;
  const lessons = academyData?.getLessons?.() ?? [];
  const folder = await ensureLessonFolder();
  const migration = await migrateLegacyLessonDocuments(folder);
  const existing = getLessonDocuments();
  const byLessonId = new Map(existing.map((item) => [getLessonPayload(item).lessonId, item]));
  let created = 0;
  let updated = 0;
  const toCreate = [];
  const toUpdate = [];

  for (const lesson of lessons) {
    const payload = lessonPayload(engine, lesson);
    const existingDoc = byLessonId.get(lesson.id);
    const data = buildLessonDocumentData({
      payload,
      source: existingDoc?._source ?? {},
      folderId: folder?.id ?? null,
      extraFlags: {
        origin: 'academy-data',
        sourceVersion: game.modules?.get(MODULE_ID)?.version ?? 'unknown'
      }
    });

    if (!existingDoc) {
      data.name = lesson.name || lesson.id;
      toCreate.push(data);
      continue;
    }

    if (forceSync) {
      data._id = existingDoc.id;
      data.name = lesson.name || lesson.id;
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
  }

  engine.academy ??= {};
  engine.academy.documents ??= {};
  engine.academy.documents.lessons = {
    itemType: JANUS_LESSON_ITEM_TYPE,
    subtype: JANUS_LESSON_SUBTYPE,
    sheetClass: JANUS_LESSON_SHEET_CLASS,
    list: () => getLessonDocuments(),
    getByLessonId: (lessonId) => getLessonDocuments().find((item) => getLessonPayload(item).lessonId === lessonId) ?? null,
    ensureReady: (opts = {}) => ensureLessonDocumentsReady(engine, opts)
  };

  emitHook(HOOKS.LESSON_DOCUMENTS_READY, { created, updated, migrated: migration.migrated, total: getLessonDocuments().length });
  return { created, updated, migrated: migration.migrated };
}

export default { registerLessonDocuments, ensureLessonDocumentsReady, createEmptyLessonDocument };
