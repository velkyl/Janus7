/**
 * @file core/validator.js
 * @module janus7
 * @phase 1
 *
 * Zweck:
 * Rückwärtskompatibilitäts-Re-Export für JanusValidator.
 *
 * Architektur:
 * - Diese Datei war ursprünglich ein monolithisches 1291-Zeilen-Modul.
 * - Refaktoriert in thematische Module unter core/validator/:
 *     core/validator/schemas-state.js   → STATE_SCHEMA + SCORING_ROOT_SCHEMA
 *     core/validator/schemas-academy.js → ACADEMY_*_SCHEMA (20 Schemas)
 *     core/validator/index.js           → JanusValidator Klasse + Referenz-Integritäts-Logik
 *
 * - Alle bisherigen Imports auf 'core/validator.js' funktionieren unverändert.
 * - Neue Imports sollten direkt 'core/validator/index.js' verwenden.
 *
 * Hinweis:
 * - Keine deprecated Foundry APIs (v13+).
 */

export { JanusValidator } from './validator/index.js';
export {
  STATE_SCHEMA,
  SCORING_ROOT_SCHEMA,
} from './validator/schemas-state.js';
export {
  ACADEMY_LESSONS_SCHEMA,
  ACADEMY_EXAM_QUESTIONS_SCHEMA,
  ACADEMY_CALENDAR_SCHEMA,
  ACADEMY_EXAMS_SCHEMA,
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
} from './validator/schemas-academy.js';
