import { moduleTemplatePath } from '../../core/common.js';
const { HandlebarsApplicationMixin } = foundry.applications.api;
import { JanusBaseApp } from '../core/base-app.js';
import { ensureLessonDocumentsReady, createEmptyLessonDocument } from '../../scripts/integration/phase2-document-content-integration.js';
import { JANUS_LESSON_SUBTYPE } from '../../scripts/documents/lesson-constants.js';

export class JanusLessonLibraryApp extends HandlebarsApplicationMixin(JanusBaseApp) {
  static _instance = null;
  static showSingleton(options = {}) {
    if (!this._instance) this._instance = new this(options);
    this._instance.render({ force: true, focus: true });
    return this._instance;
  }

  static DEFAULT_OPTIONS = {
    id: 'janus7-lesson-library',
    classes: ['janus7-app', 'janus7-lesson-library'],
    position: { width: 980, height: 760, top: 80, left: 110 },
    window: { title: 'JANUS7 · Lesson Library', icon: 'fas fa-book-open', resizable: true },
    actions: {
      refresh: async function() { this.render({ force: true }); },
      migrate: async function() {
        await ensureLessonDocumentsReady(game?.janus7, { forceSync: true });
        ui.notifications?.info?.('JANUS7: Lesson-Dokumente synchronisiert.');
        this.render({ force: true });
      },
      openLesson: async function(_ev, target) {
        const uuid = target?.dataset?.uuid;
        if (!uuid) return;
        const doc = await fromUuid(uuid);
        return doc?.sheet?.render?.(true);
      },
      createLesson: async function() {
        const doc = await createEmptyLessonDocument();
        return doc?.sheet?.render?.(true);
      }
    }
  };

  static PARTS = {
    main: { template: moduleTemplatePath('templates/apps/lesson-library.hbs') }
  };

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.enableAutoRefresh(['createItem', 'updateItem', 'deleteItem', 'janus7LessonDocumentsReady']);
  }

  async _prepareContext(_options) {
    const docs = game.items?.filter((i) => i.type === JANUS_LESSON_SUBTYPE) ?? [];
    const entries = docs
      .map((item) => ({
        uuid: item.uuid,
        name: item.name,
        subject: item.system?.subject || '—',
        teacherNpcId: item.system?.teacherNpcId || '—',
        year: [item.system?.yearMin ?? '—', item.system?.yearMax ?? '—'].join('–'),
        duration: item.system?.durationSlots ?? 1,
        lessonId: item.system?.lessonId || item.getFlag?.('janus7', 'lessonId') || '—'
      }))
      .sort((a, b) => String(a.subject).localeCompare(String(b.subject), 'de'));

    return {
      count: entries.length,
      entries,
      subtype: JANUS_LESSON_SUBTYPE
    };
  }
}

export default JanusLessonLibraryApp;
