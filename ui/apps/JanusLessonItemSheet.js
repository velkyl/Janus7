import { moduleTemplatePath } from '../../core/common.js';
import {
  JANUS_LESSON_DEFAULT_IMG,
  JANUS_LESSON_FLAG_SCOPE,
  JANUS_LESSON_SHEET_CLASS,
  JANUS_LESSON_SUBTYPE,
  buildLessonBookSystemData,
  buildLessonFlagData,
  getLessonPayload
} from '../../scripts/documents/lesson-constants.js';

const ItemSheetBase = foundry?.appv1?.sheets?.ItemSheet ?? foundry?.applications?.sheets?.ItemSheet ?? null;

if (!ItemSheetBase) {
  throw new Error('[JANUS7] foundry.appv1.sheets.ItemSheet is unavailable. JanusLessonItemSheet requires Foundry DocumentSheet support.');
}

export class JanusLessonItemSheet extends ItemSheetBase {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['janus7', 'sheet', 'lesson-item-sheet'],
      width: 760,
      height: 680,
      template: moduleTemplatePath('templates/items/lesson-sheet.hbs')
    });
  }

  getData(options = {}) {
    const data = super.getData(options);
    const lesson = getLessonPayload(this.item);
    data.lessonType = JANUS_LESSON_SUBTYPE;
    data.system = lesson;
    data.img = this.item.img || JANUS_LESSON_DEFAULT_IMG;
    data.yearRange = [lesson.yearMin ?? '', lesson.yearMax ?? ''];
    data.prettyMechanics = JSON.stringify(lesson.mechanics ?? {}, null, 2);
    data.prettyScoring = JSON.stringify(lesson.scoringImpact ?? {}, null, 2);
    data.prettyReferences = JSON.stringify(lesson.references ?? {}, null, 2);
    data.prettySource = JSON.stringify(lesson.source ?? {}, null, 2);
    return data;
  }

  async _updateObject(_event, formData) {
    const expanded = foundry.utils.expandObject(formData);
    const lesson = foundry.utils.mergeObject(getLessonPayload(this.item), expanded.system ?? {}, { inplace: false, recursive: true });
    const parseErrors = [];
    const parseJson = (value, fallback, label) => {
      if (!value || !String(value).trim()) return fallback;
      try {
        return JSON.parse(value);
      } catch (err) {
        parseErrors.push(`${label}: ${err?.message ?? String(err)}`);
        return fallback;
      }
    };

    lesson.tags = String(lesson.tags ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    lesson.yearMin = Number.isFinite(Number(lesson.yearMin)) ? Number(lesson.yearMin) : null;
    lesson.yearMax = Number.isFinite(Number(lesson.yearMax)) ? Number(lesson.yearMax) : null;
    lesson.durationSlots = Math.max(1, Number(lesson.durationSlots) || 1);
    lesson.mechanics = parseJson(lesson.mechanicsJson, lesson.mechanics ?? {}, 'Mechanics JSON');
    lesson.scoringImpact = parseJson(lesson.scoringJson, lesson.scoringImpact ?? {}, 'Scoring JSON');
    lesson.references = parseJson(lesson.referencesJson, lesson.references ?? {}, 'References JSON');
    lesson.source = parseJson(lesson.sourceJson, lesson.source ?? {}, 'Source JSON');

    if (parseErrors.length) {
      const itemName = this.item?.name ?? 'lesson';
      const message = `Lesson sheet update aborted for "${itemName}": ${parseErrors.join(' | ')}`;
      ui?.notifications?.error?.(`[JANUS7] ${message}`);
      throw new Error(message);
    }

    delete lesson.mechanicsJson;
    delete lesson.scoringJson;
    delete lesson.referencesJson;
    delete lesson.sourceJson;

    return this.item.update({
      name: expanded.name ?? this.item.name,
      img: expanded.img ?? this.item.img ?? JANUS_LESSON_DEFAULT_IMG,
      system: buildLessonBookSystemData(lesson, this.item.system ?? {}),
      flags: foundry.utils.mergeObject(foundry.utils.deepClone(this.item.flags ?? {}), {
        core: {
          ...(this.item.flags?.core ?? {}),
          sheetClass: JANUS_LESSON_SHEET_CLASS
        },
        [JANUS_LESSON_FLAG_SCOPE]: buildLessonFlagData(lesson, {
          origin: this.item.getFlag(JANUS_LESSON_FLAG_SCOPE, 'origin') ?? 'manual',
          sourceVersion: this.item.getFlag(JANUS_LESSON_FLAG_SCOPE, 'sourceVersion') ?? game.modules?.get(JANUS_LESSON_FLAG_SCOPE)?.version ?? 'unknown',
          legacyType: this.item.getFlag(JANUS_LESSON_FLAG_SCOPE, 'legacyType') ?? null
        })
      }, { inplace: false, recursive: true })
    }, { diff: false });
  }
}

export default JanusLessonItemSheet;
