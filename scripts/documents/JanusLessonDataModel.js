import { JANUS_LESSON_DEFAULT_IMG } from './lesson-constants.js';

const fields = foundry.data.fields;

export class JanusLessonDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      lessonId: new fields.StringField({ required: true, blank: false, initial: '' }),
      subject: new fields.StringField({ required: false, initial: '' }),
      teacherNpcId: new fields.StringField({ required: false, initial: '' }),
      teacherUuid: new fields.StringField({ required: false, initial: '' }),
      locationId: new fields.StringField({ required: false, initial: '' }),
      locationUuid: new fields.StringField({ required: false, initial: '' }),
      yearMin: new fields.NumberField({ required: false, integer: true, nullable: true, initial: null }),
      yearMax: new fields.NumberField({ required: false, integer: true, nullable: true, initial: null }),
      durationSlots: new fields.NumberField({ required: false, integer: true, min: 1, initial: 1 }),
      difficulty: new fields.StringField({ required: false, initial: 'normal' }),
      summary: new fields.StringField({ required: false, initial: '' }),
      tags: new fields.ArrayField(new fields.StringField({ required: false, initial: '' }), { required: false, initial: [] }),
      mechanics: new fields.ObjectField({ required: false, initial: {} }),
      scoringImpact: new fields.ObjectField({ required: false, initial: {} }),
      references: new fields.ObjectField({ required: false, initial: {} }),
      source: new fields.ObjectField({ required: false, initial: {} }),
      img: new fields.FilePathField({ required: false, nullable: true, categories: ['IMAGE'], initial: JANUS_LESSON_DEFAULT_IMG })
    };
  }
}

export default JanusLessonDataModel;
