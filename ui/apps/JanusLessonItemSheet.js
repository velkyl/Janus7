import { moduleTemplatePath } from '../../core/common.js';
import { JANUS_LESSON_SUBTYPE, JANUS_LESSON_DEFAULT_IMG } from '../../scripts/documents/lesson-constants.js';

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

  getData(options={}) {
    const data = super.getData(options);
    const item = this.item;
    data.lessonType = JANUS_LESSON_SUBTYPE;
    data.system = item.system ?? {};
    data.img = item.img || JANUS_LESSON_DEFAULT_IMG;
    data.yearRange = [item.system?.yearMin ?? '', item.system?.yearMax ?? ''];
    data.prettyMechanics = JSON.stringify(item.system?.mechanics ?? {}, null, 2);
    data.prettyScoring = JSON.stringify(item.system?.scoringImpact ?? {}, null, 2);
    data.prettyReferences = JSON.stringify(item.system?.references ?? {}, null, 2);
    data.prettySource = JSON.stringify(item.system?.source ?? {}, null, 2);
    return data;
  }

  async _updateObject(event, formData) {
    const expanded = foundry.utils.expandObject(formData);
    const system = expanded.system ?? {};
    const parseJson = (value, fallback) => {
      if (!value || !String(value).trim()) return fallback;
      try { return JSON.parse(value); } catch (_err) { return fallback; }
    };
    system.tags = String(system.tags ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    system.yearMin = Number.isFinite(Number(system.yearMin)) ? Number(system.yearMin) : null;
    system.yearMax = Number.isFinite(Number(system.yearMax)) ? Number(system.yearMax) : null;
    system.durationSlots = Math.max(1, Number(system.durationSlots) || 1);
    system.mechanics = parseJson(system.mechanicsJson, system.mechanics ?? {});
    system.scoringImpact = parseJson(system.scoringJson, system.scoringImpact ?? {});
    system.references = parseJson(system.referencesJson, system.references ?? {});
    system.source = parseJson(system.sourceJson, system.source ?? {});
    delete system.mechanicsJson;
    delete system.scoringJson;
    delete system.referencesJson;
    delete system.sourceJson;
    expanded.system = system;
    return this.item.update(expanded);
  }
}

export default JanusLessonItemSheet;
