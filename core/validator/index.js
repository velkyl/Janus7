/**
 * @file core/validator/index.js
 * @module janus7
 * @phase 1
 *
 * JanusValidator – zentraler Validierungs-Layer für JANUS7.
 *
 * Architektur:
 * - Schemas sind in thematische Module aufgeteilt (schemas-state.js, schemas-academy.js).
 * - Diese Datei enthält nur die Validator-Klasse und die Referenz-Integritäts-Logik.
 * - Importiert von: core/validator.js (Re-Export für Rückwärtskompatibilität)
 */

import {
  STATE_SCHEMA,
  SCORING_ROOT_SCHEMA,
} from './schemas-state.js';

import {
  ACADEMY_LESSONS_SCHEMA,
  ACADEMY_EXAM_QUESTIONS_SCHEMA,
  ACADEMY_CALENDAR_SCHEMA,
  ACADEMY_EXAMS_SCHEMA,
  ACADEMY_GRADING_SCHEMES_SCHEMA,
  ACADEMY_NPCS_SCHEMA,
  ACADEMY_LOCATIONS_SCHEMA,
  ACADEMY_LIBRARY_SCHEMA,
  ACADEMY_EVENTS_SCHEMA,
  ACADEMY_SPELL_CURRICULUM_SCHEMA,
  ACADEMY_ALCHEMY_RECIPES_SCHEMA,
  ACADEMY_LESSON_GENERATOR_SCHEMA,
  ACADEMY_CALENDAR_TEMPLATE_SCHEMA,
  ACADEMY_TEACHING_SESSIONS_SCHEMA,
  ACADEMY_CIRCLES_SCHEMA,
  ACADEMY_COLLECTIONS_SCHEMA,
  ACADEMY_SUBJECTS_SCHEMA,
  ACADEMY_SOCIAL_LINKS_SCHEMA,
  ACADEMY_SCHOOL_STATS_SCHEMA,
  ACADEMY_MILESTONES_SCHEMA,
  ACADEMY_AP_AWARDS_SCHEMA,
} from './schemas-academy.js';

// Re-export für direkte Nutzung der Schemas
export {
  STATE_SCHEMA,
  SCORING_ROOT_SCHEMA,
  ACADEMY_LESSONS_SCHEMA,
  ACADEMY_EXAM_QUESTIONS_SCHEMA,
  ACADEMY_CALENDAR_SCHEMA,
  ACADEMY_EXAMS_SCHEMA,
  ACADEMY_GRADING_SCHEMES_SCHEMA,
  ACADEMY_NPCS_SCHEMA,
  ACADEMY_LOCATIONS_SCHEMA,
  ACADEMY_LIBRARY_SCHEMA,
  ACADEMY_EVENTS_SCHEMA,
  ACADEMY_SPELL_CURRICULUM_SCHEMA,
  ACADEMY_ALCHEMY_RECIPES_SCHEMA,
  ACADEMY_LESSON_GENERATOR_SCHEMA,
  ACADEMY_CALENDAR_TEMPLATE_SCHEMA,
  ACADEMY_TEACHING_SESSIONS_SCHEMA,
  ACADEMY_CIRCLES_SCHEMA,
  ACADEMY_COLLECTIONS_SCHEMA,
  ACADEMY_SUBJECTS_SCHEMA,
  ACADEMY_SOCIAL_LINKS_SCHEMA,
  ACADEMY_SCHOOL_STATS_SCHEMA,
  ACADEMY_MILESTONES_SCHEMA,
  ACADEMY_AP_AWARDS_SCHEMA,
};

// ─── JanusValidator ───────────────────────────────────────────────────────────

/**
 * JanusValidator
 *
 * @description
 * Öffentliche API von JANUS7.
 * Diese Klasse ist Teil der stabilen Oberfläche
 * und wird durch den Testkatalog abgesichert.
 *
 * @remarks
 * - Keine UI-Seiteneffekte
 * - Keine direkten Zugriffe auf Foundry- oder dsa5-Interna außerhalb definierter APIs
 * - Änderungen hier erfordern Anpassungen im Testkatalog
 */
export class JanusValidator {
  /**
   * @param {{ logger?: Console }} [options]
   */
  constructor({ logger } = {}) {
    this.logger = logger ?? console;
    /** @type {Map<string, Record<string, unknown>>} */
    this._schemas = new Map();

    // Phase 1
    this.registerSchema('state', STATE_SCHEMA);

    // Phase 2
    this.registerSchema('academy.calendar', ACADEMY_CALENDAR_SCHEMA);
    this.registerSchema('academy.lessons', ACADEMY_LESSONS_SCHEMA);
    this.registerSchema('academy.exams', ACADEMY_EXAMS_SCHEMA);
    this.registerSchema('academy.gradingSchemes', ACADEMY_GRADING_SCHEMES_SCHEMA);
    this.registerSchema('academy.examQuestions', ACADEMY_EXAM_QUESTIONS_SCHEMA);
    this.registerSchema('academy.npcs', ACADEMY_NPCS_SCHEMA);
    this.registerSchema('academy.locations', ACADEMY_LOCATIONS_SCHEMA);
    this.registerSchema('academy.library', ACADEMY_LIBRARY_SCHEMA);
    this.registerSchema('academy.events', ACADEMY_EVENTS_SCHEMA);
    this.registerSchema('academy.spellCurriculum', ACADEMY_SPELL_CURRICULUM_SCHEMA);
    this.registerSchema('academy.alchemyRecipes', ACADEMY_ALCHEMY_RECIPES_SCHEMA);
    this.registerSchema('academy.lessonGenerator', ACADEMY_LESSON_GENERATOR_SCHEMA);
    this.registerSchema('academy.calendarTemplate', ACADEMY_CALENDAR_TEMPLATE_SCHEMA);
    this.registerSchema('academy.teachingSessions', ACADEMY_TEACHING_SESSIONS_SCHEMA);
    this.registerSchema('academy.circles', ACADEMY_CIRCLES_SCHEMA);
    this.registerSchema('academy.collections', ACADEMY_COLLECTIONS_SCHEMA);
    this.registerSchema('academy.subjects', ACADEMY_SUBJECTS_SCHEMA);
    this.registerSchema('academy.socialLinks', ACADEMY_SOCIAL_LINKS_SCHEMA);
    this.registerSchema('academy.schoolStats', ACADEMY_SCHOOL_STATS_SCHEMA);
    this.registerSchema('academy.milestones', ACADEMY_MILESTONES_SCHEMA);
    this.registerSchema('academy.apAwards', ACADEMY_AP_AWARDS_SCHEMA);
  }

  /**
   * @param {string} key
   * @param {Record<string, unknown>} schema
   * @returns {void}
   */
  registerSchema(key, schema) {
    this._schemas.set(key, schema);
  }

  /**
   * @param {string} key
   * @param {unknown} data
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validate(key, data) {
    const schema = this._schemas.get(key);
    if (!schema) {
      return { valid: true, errors: [] };
    }

    const errors = [];
    this._validateAgainstSchema(schema, data, 'root', errors);

    if (errors.length && this.logger?.warn) {
      this.logger.warn(`Validation for ${key} failed:`, errors);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Assert that data matches a provided schema object.
   * @param {unknown} data
   * @param {Record<string, unknown>} schema
   * @param {string} [label]
   * @returns {true}
   */
  assertSchema(data, schema, label = 'schema') {
    const errors = [];
    this._validateAgainstSchema(schema, data, 'root', errors);
    if (errors.length) {
      const msg = `Validation for ${label} failed: ${errors.join(' | ')}`;
      if (this.logger?.warn) this.logger.warn(msg);
      throw new Error(msg);
    }
    return true;
  }

  /**
   * Validate data against an inline schema object without throwing.
   * @param {unknown} data
   * @param {Record<string, unknown>} schema
   * @param {string} [label]
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validateSchema(data, schema, label = 'schema') {
    const errors = [];
    this._validateAgainstSchema(schema, data, 'root', errors);
    if (errors.length && this.logger?.warn) this.logger.warn(`Validation for ${label} failed:`, errors);
    return { valid: errors.length === 0, errors };
  }

  // ─── Convenience-Methoden ─────────────────────────────────────────────────

  /** @param {unknown} json @returns {{ valid: boolean, errors: string[] }} */
  validateState(json) { return this.validate('state', json); }
  /** @param {unknown} json @returns {{ valid: boolean, errors: string[] }} */
  validateAcademyCalendar(json) { return this.validate('academy.calendar', json); }
  /** @param {unknown} json @returns {{ valid: boolean, errors: string[] }} */
  validateAcademyLessons(json) { return this.validate('academy.lessons', json); }
  /** @param {unknown} json @returns {{ valid: boolean, errors: string[] }} */
  validateAcademyExams(json) { return this.validate('academy.exams', json); }
  /** @param {unknown} json @returns {{ valid: boolean, errors: string[] }} */
  validateAcademyGradingSchemes(json) { return this.validate('academy.gradingSchemes', json); }
  /** @param {unknown} json @returns {{ valid: boolean, errors: string[] }} */
  validateExamQuestions(json) { return this.validate('academy.examQuestions', json); }
  /** @param {unknown} json @returns {{ valid: boolean, errors: string[] }} */
  validateAcademyNPCs(json) { return this.validate('academy.npcs', json); }
  /** @param {unknown} json @returns {{ valid: boolean, errors: string[] }} */
  validateAcademyLocations(json) { return this.validate('academy.locations', json); }
  /** @param {unknown} json @returns {{ valid: boolean, errors: string[] }} */
  validateAcademyLibrary(json) { return this.validate('academy.library', json); }
  /** @param {unknown} json @returns {{ valid: boolean, errors: string[] }} */
  validateAcademyEvents(json) { return this.validate('academy.events', json); }
  /** @param {unknown} json @returns {{ valid: boolean, errors: string[] }} */
  validateAcademySpellCurriculum(json) { return this.validate('academy.spellCurriculum', json); }
  /** @param {unknown} json @returns {{ valid: boolean, errors: string[] }} */
  validateAcademyAlchemyRecipes(json) { return this.validate('academy.alchemyRecipes', json); }
  /** @param {unknown} json @returns {{ valid: boolean, errors: string[] }} */
  validateAcademyLessonGenerator(json) { return this.validate('academy.lessonGenerator', json); }
  /** @param {unknown} json @returns {{ valid: boolean, errors: string[] }} */
  validateAcademyCalendarTemplate(json) { return this.validate('academy.calendarTemplate', json); }
  /** @param {unknown} json @returns {{ valid: boolean, errors: string[] }} */
  validateAcademyTeachingSessions(json) { return this.validate('academy.teachingSessions', json); }
  /** @param {unknown} json @returns {{ valid: boolean, errors: string[] }} */
  validateAcademyCircles(json) { return this.validate('academy.circles', json); }
  /** @param {unknown} json @returns {{ valid: boolean, errors: string[] }} */
  validateAcademyCollections(json) { return this.validate('academy.collections', json); }
  /** @param {unknown} json @returns {{ valid: boolean, errors: string[] }} */
  validateAcademySubjects(json) { return this.validate('academy.subjects', json); }
  /** @param {unknown} json @returns {{ valid: boolean, errors: string[] }} */
  validateAcademySocialLinks(json) { return this.validate('academy.socialLinks', json); }
  /** @param {unknown} json @returns {{ valid: boolean, errors: string[] }} */
  validateAcademySchoolStats(json) { return this.validate('academy.schoolStats', json); }
  /** @param {unknown} json @returns {{ valid: boolean, errors: string[] }} */
  validateAcademyMilestones(json) { return this.validate('academy.milestones', json); }
  /** @param {unknown} json @returns {{ valid: boolean, errors: string[] }} */
  validateAcademyApAwards(json) { return this.validate('academy.apAwards', json); }

  // ─── Referenz-Integritäts-Prüfung ────────────────────────────────────────

  /**
   * Validates cross-dataset references between academy data files.
   *
   * @param {Record<string, unknown>} [datasets]
   * @param {{ strict?: boolean }} [options]
   * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
   */
  validateAcademyReferenceIntegrity(datasets = {}, { strict = false } = {}) {
    const errors = [];
    const warnings = [];
    const lessons = Array.isArray(datasets?.lessons?.lessons) ? datasets.lessons.lessons : [];
    const exams = Array.isArray(datasets?.exams?.exams) ? datasets.exams.exams : [];
    const examQuestionSets = Array.isArray(datasets?.examQuestions?.questionSets) ? datasets.examQuestions.questionSets : [];
    const npcs = Array.isArray(datasets?.npcs?.npcs) ? datasets.npcs.npcs : [];
    const locations = Array.isArray(datasets?.locations?.locations) ? datasets.locations.locations : [];
    const libraryItems = Array.isArray(datasets?.library?.items) ? datasets.library.items : [];
    const events = Array.isArray(datasets?.events?.events) ? datasets.events.events : [];
    const circles = Array.isArray(datasets?.circles?.circles) ? datasets.circles.circles : [];
    const teachingSessions = Array.isArray(datasets?.teachingSessions?.sessions) ? datasets.teachingSessions.sessions : [];
    const socialLinks = Array.isArray(datasets?.socialLinks?.socialLinks) ? datasets.socialLinks.socialLinks : [];
    const collections = Array.isArray(datasets?.collections?.collections) ? datasets.collections.collections : [];
    const questionIds = new Set(examQuestionSets.map((row) => row?.id).filter(Boolean));
    const lessonIds = new Set(lessons.map((row) => row?.id).filter(Boolean));
    const npcIds = new Set(npcs.map((row) => row?.id).filter(Boolean));
    const locationIds = new Set(locations.map((row) => row?.id).filter(Boolean));
    const libraryIds = new Set(libraryItems.map((row) => row?.id).filter(Boolean));
    const eventIds = new Set(events.map((row) => row?.id).filter(Boolean));
    const circleIds = new Set(circles.map((row) => row?.id).filter(Boolean));
    const emit = (bucket, domain, owner, field, ref, details = '') => bucket.push(`${domain} ${owner}: Referenz ${field}=${ref} wurde nicht gefunden${details ? ` (${details})` : ''}.`);
    const npcVariants = (raw) => {
      const id = String(raw ?? '').trim();
      const tail = id.replace(/^npc_/i, '').replace(/^NPC_/i, '').toUpperCase();
      return [id.toUpperCase(), `NPC_${tail}`, `npc_${tail.toLowerCase()}`];
    };
    const check = (set, ref, variants = []) => set.has(ref) || variants.some((candidate) => set.has(candidate));

    for (const lesson of lessons) {
      if (lesson?.teacherNpcId && !check(npcIds, lesson.teacherNpcId, npcVariants(lesson.teacherNpcId))) emit(warnings, 'lesson', lesson?.id ?? '<lesson>', 'teacherNpcId', lesson.teacherNpcId, 'kein NPC mit passender ID im Datensatz');
      for (const libraryItemId of (lesson?.references?.libraryItemIds ?? [])) if (libraryItemId && !libraryIds.has(libraryItemId)) emit(warnings, 'lesson', lesson?.id ?? '<lesson>', 'references.libraryItemIds', libraryItemId, 'kein Bibliothekseintrag vorhanden');
    }
    for (const exam of exams) {
      for (const lessonId of (exam?.lessonIds ?? [])) if (lessonId && !lessonIds.has(lessonId)) emit(warnings, 'exam', exam?.id ?? '<exam>', 'lessonIds', lessonId);
      const qid = exam?.interaction?.questionSetId;
      if (qid && !questionIds.has(qid)) emit(warnings, 'exam', exam?.id ?? '<exam>', 'interaction.questionSetId', qid);
    }
    for (const circle of circles) if (circle?.locationId && !locationIds.has(circle.locationId)) emit(warnings, 'circle', circle?.id ?? '<circle>', 'locationId', circle.locationId);
    for (const row of collections) {
      for (const item of (row?.items ?? [])) if (item?.locationId && !locationIds.has(item.locationId)) emit(warnings, 'collection', row?.id ?? '<collection>', 'items.locationId', item.locationId);
      for (const circleId of (row?.completionReward?.circleIds ?? [])) if (circleId && !circleIds.has(circleId)) emit(warnings, 'collection', row?.id ?? '<collection>', 'completionReward.circleIds', circleId);
    }
    for (const row of socialLinks) {
      if (row?.npcId && !check(npcIds, row.npcId, npcVariants(row.npcId))) emit(errors, 'socialLink', row?.id ?? '<socialLink>', 'npcId', row.npcId);
      for (const rank of (row?.ranks ?? [])) if (rank?.eventTriggerId && !eventIds.has(rank.eventTriggerId)) emit(warnings, 'socialLink', row?.id ?? '<socialLink>', 'ranks.eventTriggerId', rank.eventTriggerId);
    }
    for (const row of teachingSessions) {
      for (const candidate of (row?.npcIdCandidates ?? [])) if (candidate?.npcId && !check(npcIds, candidate.npcId, npcVariants(candidate.npcId))) emit(warnings, 'teachingSession', row?.id ?? '<session>', 'npcIdCandidates.npcId', candidate.npcId);
      for (const candidate of (row?.locationIdCandidates ?? [])) if (candidate?.locationId && !locationIds.has(candidate.locationId)) emit(warnings, 'teachingSession', row?.id ?? '<session>', 'locationIdCandidates.locationId', candidate.locationId);
    }
    if (strict && warnings.length) errors.push(...warnings);
    return { valid: errors.length === 0, errors, warnings };
  }

  // ─── Interne Rekursion ────────────────────────────────────────────────────

  _validateAgainstSchema(schema, value, path, errors) {
    if (value === null) {
      if (schema?.nullable) return;
      errors.push(`${path} darf nicht null sein.`);
      return;
    }

    if (schema && Array.isArray(schema.anyOf)) {
      const variantErrors = [];
      for (const variant of schema.anyOf) {
        const tmp = [];
        this._validateAgainstSchema(variant, value, path, tmp);
        if (tmp.length === 0) return;
        variantErrors.push(tmp);
      }
      const examples = variantErrors.map(v => v[0]).filter(Boolean);
      errors.push(examples.length ? examples.join(' ODER ') : `${path} hat ein ungültiges Format.`);
      return;
    }

    if (Array.isArray(schema.type)) {
      const anyMatch = schema.type.some((t) => {
        const tmp = [];
        this._validateAgainstSchema({ ...schema, type: t }, value, path, tmp);
        return tmp.length === 0;
      });
      if (!anyMatch) {
        errors.push(`${path} muss vom Typ ${schema.type.join(' oder ')} sein.`);
      }
      return;
    }

    switch (schema.type) {
      case 'object': {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push(`${path} muss ein Objekt sein.`);
          return;
        }
        if (schema.required) {
          for (const key of schema.required) {
            const hasKey = (key in value) && value[key] !== undefined;
            if (!hasKey) {
              errors.push(`${path}.${key} ist erforderlich.`);
              continue;
            }
            if (value[key] === null) {
              const propSchema = schema.properties?.[key];
              const nullable = !!propSchema?.nullable;
              if (!nullable) errors.push(`${path}.${key} darf nicht null sein.`);
            }
          }
        }
        if (schema.properties) {
          for (const [key, propSchema] of Object.entries(schema.properties)) {
            if (key in value) {
              this._validateAgainstSchema(propSchema, value[key], `${path}.${key}`, errors);
            }
          }
        }
        if (schema.additionalProperties === false) {
          const allowed = new Set(Object.keys(schema.properties ?? {}));
          for (const k of Object.keys(value)) {
            if (!allowed.has(k)) errors.push(`${path}.${k} ist nicht erlaubt (unknown key).`);
          }
        } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
          const allowed = new Set(Object.keys(schema.properties ?? {}));
          for (const k of Object.keys(value)) {
            if (allowed.has(k)) continue;
            this._validateAgainstSchema(schema.additionalProperties, value[k], `${path}.${k}`, errors);
          }
        }
        break;
      }
      case 'array': {
        if (!Array.isArray(value)) {
          errors.push(`${path} muss ein Array sein.`);
          return;
        }
        if (schema.minItems != null && value.length < schema.minItems) {
          errors.push(`${path} muss mindestens ${schema.minItems} Elemente haben.`);
        }
        if (schema.maxItems != null && value.length > schema.maxItems) {
          errors.push(`${path} darf höchstens ${schema.maxItems} Elemente haben.`);
        }
        if (schema.items) {
          value.forEach((item, idx) => {
            this._validateAgainstSchema(schema.items, item, `${path}[${idx}]`, errors);
          });
        }
        break;
      }
      case 'string': {
        if (typeof value !== 'string') {
          errors.push(`${path} muss ein String sein.`);
          return;
        }
        if (schema.const !== undefined && value !== schema.const) {
          errors.push(`${path} muss exakt "${schema.const}" sein.`);
          return;
        }
        const minLen = schema.minLength;
        if (minLen != null && value.length < minLen) {
          errors.push(`${path} muss mindestens ${minLen} Zeichen lang sein.`);
        }
        if (schema.maxLength != null && value.length > schema.maxLength) {
          errors.push(`${path} darf höchstens ${schema.maxLength} Zeichen lang sein.`);
        }
        if (schema.enum && !schema.enum.includes(value)) {
          errors.push(`${path} muss einer der Werte sein: ${schema.enum.join(', ')}`);
        }
        break;
      }
      case 'number': {
        if (typeof value !== 'number') {
          errors.push(`${path} muss eine Zahl sein.`);
          return;
        }
        if (schema.const !== undefined && value !== schema.const) {
          errors.push(`${path} muss exakt ${schema.const} sein.`);
          return;
        }
        if (schema.min != null && value < schema.min) {
          errors.push(`${path} muss >= ${schema.min} sein.`);
        }
        if (schema.max != null && value > schema.max) {
          errors.push(`${path} muss <= ${schema.max} sein.`);
        }
        break;
      }
      case 'boolean': {
        if (typeof value !== 'boolean') {
          errors.push(`${path} muss ein Boolean sein.`);
          break;
        }
        if (schema.const !== undefined && value !== schema.const) {
          errors.push(`${path} muss exakt ${schema.const} sein.`);
        }
        break;
      }
      default:
        break;
    }
  }
}
