import { JANUS_LESSON_ITEM_TYPE, JANUS_LESSON_SHEET_CLASS, JANUS_LESSON_SUBTYPE } from '../../../../scripts/documents/lesson-constants.js';

export default {
  id: 'P6-TC-19',
  title: 'Lesson item sheet uses DSA5-compatible item type wiring',
  phases: [6],
  kind: 'auto',
  expected: 'Lesson documents use Item type "book", keep a JANUS subtype flag, and do not replace the default book sheet.',
  async run(ctx) {
    const engine = ctx?.engine ?? game?.janus7;
    const lessonDocs = engine?.documents?.lesson ?? null;
    const bookSheetConfig = CONFIG?.Item?.sheetClasses?.[JANUS_LESSON_ITEM_TYPE]?.[JANUS_LESSON_SHEET_CLASS] ?? null;
    const ok = lessonDocs?.itemType === JANUS_LESSON_ITEM_TYPE
      && lessonDocs?.subtype === JANUS_LESSON_SUBTYPE
      && !!bookSheetConfig
      && bookSheetConfig.canBeDefault === false;

    return {
      ok,
      summary: ok ? 'Lesson documents use book+flag wiring.' : 'Lesson document wiring is incomplete or not DSA5-compatible.',
      notes: [
        `itemType=${lessonDocs?.itemType ?? 'n/a'}`,
        `subtype=${lessonDocs?.subtype ?? 'n/a'}`,
        `sheetRegistered=${!!bookSheetConfig}`,
        `canBeDefault=${bookSheetConfig?.canBeDefault ?? 'n/a'}`
      ]
    };
  }
};
