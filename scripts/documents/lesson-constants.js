import { MODULE_ID } from '../../core/common.js';

export const JANUS_LESSON_SUBTYPE = `${MODULE_ID}.lesson`;
export const JANUS_LESSON_ITEM_TYPE = 'book';
export const JANUS_LESSON_FOLDER_NAME = 'JANUS7 Lessons';
export const JANUS_LESSON_FLAG_SCOPE = MODULE_ID;
export const JANUS_LESSON_DEFAULT_IMG = 'icons/svg/book.svg';
export const JANUS_LESSON_SHEET_CLASS = `${MODULE_ID}.JanusLessonItemSheet`;

function deepClone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

function asObject(value) {
  return value && (typeof value === 'object') && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? [...value] : [];
}

export function isLegacyLessonItemType(type) {
  return String(type ?? '').trim().toLowerCase() === String(JANUS_LESSON_SUBTYPE).trim().toLowerCase();
}

export function getLessonFlagBlock(document) {
  const source = document?._source ?? document ?? {};
  return asObject(source?.flags?.[JANUS_LESSON_FLAG_SCOPE]);
}

export function isJanusLessonDocument(document) {
  const source = document?._source ?? document ?? {};
  const flags = getLessonFlagBlock(source);
  if (String(source?.type ?? '') === JANUS_LESSON_ITEM_TYPE && flags?.subtype === JANUS_LESSON_SUBTYPE) return true;
  if (String(source?.type ?? '') === JANUS_LESSON_ITEM_TYPE && flags?.lessonId) return true;
  return isLegacyLessonItemType(source?.type);
}

export function getLessonPayload(document) {
  const source = document?._source ?? document ?? {};
  const flags = getLessonFlagBlock(source);
  const lessonData = asObject(flags?.lessonData);
  const system = asObject(source?.system);

  return {
    lessonId: String(lessonData.lessonId ?? flags.lessonId ?? system.lessonId ?? ''),
    subject: String(lessonData.subject ?? system.subject ?? ''),
    teacherNpcId: String(lessonData.teacherNpcId ?? system.teacherNpcId ?? ''),
    teacherUuid: String(lessonData.teacherUuid ?? system.teacherUuid ?? ''),
    locationId: String(lessonData.locationId ?? system.locationId ?? ''),
    locationUuid: String(lessonData.locationUuid ?? system.locationUuid ?? ''),
    yearMin: Number.isFinite(Number(lessonData.yearMin)) ? Number(lessonData.yearMin) : (Number.isFinite(Number(system.yearMin)) ? Number(system.yearMin) : null),
    yearMax: Number.isFinite(Number(lessonData.yearMax)) ? Number(lessonData.yearMax) : (Number.isFinite(Number(system.yearMax)) ? Number(system.yearMax) : null),
    durationSlots: Math.max(1, Number(lessonData.durationSlots ?? system.durationSlots) || 1),
    difficulty: String(lessonData.difficulty ?? system.difficulty ?? 'normal'),
    summary: String(lessonData.summary ?? system.summary ?? ''),
    tags: asArray(lessonData.tags ?? system.tags),
    mechanics: deepClone(lessonData.mechanics ?? system.mechanics ?? {}),
    scoringImpact: deepClone(lessonData.scoringImpact ?? system.scoringImpact ?? {}),
    references: deepClone(lessonData.references ?? system.references ?? {}),
    source: deepClone(lessonData.source ?? system.source ?? {})
  };
}

export function buildLessonFlagData(payload = {}, extra = {}) {
  const lessonData = getLessonPayload({
    flags: {
      [JANUS_LESSON_FLAG_SCOPE]: {
        lessonData: payload,
        lessonId: payload?.lessonId ?? extra?.lessonId
      }
    }
  });

  return {
    subtype: JANUS_LESSON_SUBTYPE,
    lessonId: lessonData.lessonId,
    lessonData,
    ...extra
  };
}

export function buildLessonBookSystemData(payload = {}, existingSystem = {}) {
  const lessonData = getLessonPayload({
    flags: {
      [JANUS_LESSON_FLAG_SCOPE]: {
        lessonData: payload,
        lessonId: payload?.lessonId
      }
    },
    system: existingSystem
  });
  const system = asObject(existingSystem);

  return {
    description: {
      value: lessonData.summary || system?.description?.value || ''
    },
    gmdescription: {
      value: system?.gmdescription?.value || ''
    },
    category: lessonData.subject || system.category || '',
    author: lessonData.teacherNpcId || system.author || '',
    pages: lessonData.durationSlots ? String(lessonData.durationSlots) : (system.pages || ''),
    releaseDate: system.releaseDate || '',
    language: system.language || '',
    quality: Number(system.quality) || 0,
    rule: system.rule || '',
    legality: Number(system.legality) || 0,
    availability: system.availability || '',
    format: Number(system.format) || 0,
    exemplarType: Number(system.exemplarType) || 0,
    otherNames: system.otherNames || '',
    exemplar: system.exemplar || '',
    storage: system.storage || '',
    special: lessonData.lessonId || system.special || '',
    price: {
      value: Number(system?.price?.value) || 0
    },
    quantity: {
      value: Math.max(1, Number(system?.quantity?.value) || 1)
    },
    weight: {
      value: Number(system?.weight?.value) || 0
    },
    effect: {
      value: system?.effect?.value || '',
      attributes: system?.effect?.attributes || ''
    },
    parent_id: system.parent_id || '',
    tradeLocked: Boolean(system.tradeLocked)
  };
}
