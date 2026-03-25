/**
 * @file academy/data-api.js
 * @module janus7/academy/data-api
 *
 * Read-only Academy Data API facade.
 * Welle 2 split: loading/bootstrap, world-edit helpers, content-registry and readers
 * were extracted into dedicated modules to keep this file focused and below the
 * Korrekturplan size gate.
 */

import { clone, getAcademyCache, resetAcademyCache, resetContentCache } from './data-api-store.js';
import { initAcademyData } from './data-api-init.js';
import { getContentRegistry, reloadContentRegistry, getQuestById, getEventPoolByName, getEffectById } from './content-registry.js';
import {
  listManagedRecords,
  getManagedRecordByUuid,
  validateManagedRecord,
  saveManagedRecord as saveManagedRecordImpl,
} from './world-editor.js';
import {
  findCalendarEntries,
  getCalendarEntryByDay,
  listEventsForDay,
  getValidation,
  getLessons,
  getLesson,
  getNpcs,
  getNpc,
  getLocations,
  getLocation,
  getCalendarEntries,
  getCalendarEntry,
  getEvents,
  getEvent,
  getCircles,
  getCircle,
  getExams,
  getExam,
  getExamQuestionSets,
  getExamQuestionSet,
  getLibraryItems,
  getSpellsIndex,
  getAlchemyRecipeItems,
  getCalendarConfig,
  getTeachingSessionsForSlot,
  getVirtualCalendarEntriesForDay,
  getSpellCurriculum,
  getAlchemyRecipes,
  getLessonGenerator,
  getCalendarTemplate,
  getTeachingSessions,
  getQuestIndex,
  getEventIndex,
  getEffectIndex,
  getExtendedDataset,
  getAssignments,
  getSanctuaryUpgrades,
  getDuels,
  getFactions,
  getHarvestNodes,
  getFieldGuidePages,
  getRumors,
  getSocialLinks,
  getSocialLink,
  getMilestones,
  getMilestone,
  getCollections,
  getCollection,
  getSchoolStatsConfig,
  getResourcesConfig,
  getLocationActivityModifiers,
  buildQuestSummary,
  buildRumorBoard,
  buildFactionStanding,
  buildSocialLinksSummary,
  buildCollectionsSummary,
  buildMilestonesSummary,
  buildAcademyStatsSummary,
  buildEventContext,
  exportAcademyData,
} from './data-api-readers.js';

export class AcademyDataApi {
  constructor(_opts = {}) {
    this._opts = _opts;
    this._logger = _opts?.logger ?? null;
    this._lessonByIdCache = null;
    this._examByIdCache = null;
    this._npcByIdCache = null;
    this._locationByIdCache = null;
  }

  findCalendarEntries(query = {}) { return findCalendarEntries(query); }
  getCalendarEntryByDay(slotRef) { return getCalendarEntryByDay(slotRef); }
  listEventsForDay(slotRef) { return listEventsForDay(slotRef); }

  async init() { await AcademyDataApi.init(); return this; }
  get isReady() { return AcademyDataApi.isReady; }
  get validation() { return AcademyDataApi.getValidation(); }
  get lessonById() { return this._lessonByIdCache ??= new Map(this.getLessons().map((row) => [row.id, row])); }
  get examById() { return this._examByIdCache ??= new Map(this.getExams().map((row) => [row.id, row])); }
  get npcById() { return this._npcByIdCache ??= new Map(this.getNpcs().map((row) => [row.id, row])); }
  get locationById() { return this._locationByIdCache ??= new Map(this.getLocations().map((row) => [row.id, row])); }
  async getContentRegistry(opts = {}) { return AcademyDataApi.getContentRegistry(opts); }
  async reloadContentRegistry(opts = {}) { return AcademyDataApi.reloadContentRegistry(opts); }
  hasLesson(id) { return !!AcademyDataApi.getLesson(id); }
  listLessonIds(limit = 50) { return AcademyDataApi.getLessons().slice(0, Math.max(0, limit)).map((row) => row.id); }
  listNpcIds(limit = 50) { return AcademyDataApi.getNpcs().slice(0, Math.max(0, limit)).map((row) => row.id); }
  listLocationIds(limit = 50) { return AcademyDataApi.getLocations().slice(0, Math.max(0, limit)).map((row) => row.id); }

  getLessons() { return AcademyDataApi.getLessons(); }
  getLesson(id) { return AcademyDataApi.getLesson(id); }
  getNpcs() { return AcademyDataApi.getNpcs(); }

  // ─── Convenience-Filter (v0.9.12.30) ───────────────────────────────────
  /** Alle NPCs mit role === 'student'. */
  listStudents() { try { return this.getNpcs().filter((n) => n?.role === 'student'); } catch { return []; } }
  /** Alle NPCs mit role === 'teacher'. */
  listTeachers() { try { return this.getNpcs().filter((n) => n?.role === 'teacher'); } catch { return []; } }
  /** Alle NPCs mit role === 'staff'. */
  listStaff()    { try { return this.getNpcs().filter((n) => n?.role === 'staff');    } catch { return []; } }
  /** Alias für getCircles() — ergonomischere Benennung. */
  listCircles()  { return this.getCircles(); }

  // ─── NPC Alias-Methoden (v0.9.12.33) ───────────────────────────────────
  /** Alias für getNpcs() — listNpcs() (camelCase, wird in fate-tracker etc. genutzt). */
  listNpcs()  { try { return this.getNpcs(); } catch { return []; } }
  /** Alias für getNpcs() — listNPCs() (Großschreibung, in diagnostics/connector). */
  listNPCs()  { try { return this.getNpcs(); } catch { return []; } }

  // ─── NPC Write Stubs (v0.9.12.32) ──────────────────────────────────────
  // NPCs sind statische JSON-Daten. Direkte Mutation ist nicht persistierbar.
  // Diese Methoden schreiben in einen In-Memory-Override-Cache, der für die
  // laufende Session gilt. Für dauerhafte Änderungen: JSON-Dateien anpassen.

  /**
   * Setzt ein Feld auf einem NPC (Session-Override, nicht dauerhaft).
   * @param {string} npcId
   * @param {string} field
   * @param {*} value
   */
  setNpcField(npcId, field, value) {
    if (!this._npcOverrides) this._npcOverrides = {};
    if (!this._npcOverrides[npcId]) this._npcOverrides[npcId] = {};
    this._npcOverrides[npcId][field] = value;
    this._logger?.debug?.(`[AcademyDataApi] setNpcField: ${npcId}.${field} = ${value} (session-only)`);
  }

  /**
   * Aktualisiert mehrere Felder eines NPCs (Session-Override, nicht dauerhaft).
   * @param {string} npcId
   * @param {object} updates
   */
  updateNpc(npcId, updates) {
    if (!this._npcOverrides) this._npcOverrides = {};
    this._npcOverrides[npcId] = { ...(this._npcOverrides[npcId] ?? {}), ...updates };
    this._logger?.debug?.(`[AcademyDataApi] updateNpc: ${npcId}`, updates);
  }

  /**
   * Gibt NPC mit Session-Overrides zurück.
   * @param {string} id
   * @returns {object|null}
   */
  getNpc(id) {
    const base = AcademyDataApi.getNpc(id);
    if (!base) return null;
    const overrides = this._npcOverrides?.[id] ?? {};
    return Object.keys(overrides).length ? { ...base, ...overrides } : base;
  }

  // ─── Exam-Query-Methoden (v0.9.12.31) ──────────────────────────────────
  /**
   * Alle Prüfungen für eine gegebene Lektion (lessonId in exam.lessonIds).
   * @param {string} lessonId
   * @returns {Array}
   */
  listExamsByLesson(lessonId) {
    if (!lessonId) return [];
    return this.getExams().filter((e) => Array.isArray(e.lessonIds) ? e.lessonIds.includes(lessonId) : e.lessonId === lessonId);
  }

  /**
   * Fragesatz für eine Prüfung (erste passende ExamQuestionSet-Gruppe).
   * @param {string} examId
   * @returns {object|null}
   */
  getQuestionSetForExam(examId) {
    if (!examId) return null;
    return this.getExamQuestionSets().find((qs) => qs.examId === examId || qs.id === examId) ?? null;
  }

  /**
   * Gibt true zurück, wenn die Prüfung vom Typ 'mcq' oder 'multiple_choice' ist.
   * @param {string} examId
   * @returns {boolean}
   */
  isMultipleChoiceExam(examId) {
    const exam = this.getExam(examId);
    if (!exam) return false;
    const t = String(exam.type ?? '').toLowerCase();
    return t === 'mcq' || t === 'multiple_choice' || t === 'multiple-choice';
  }
  getLocations() { return AcademyDataApi.getLocations(); }
  getLocation(id) { return AcademyDataApi.getLocation(id); }
  getCalendarEntries() { return AcademyDataApi.getCalendarEntries(); }
  getCalendarEntry(id) { return AcademyDataApi.getCalendarEntry(id); }
  getEvents() { return AcademyDataApi.getEvents(); }
  getEvent(id) { return AcademyDataApi.getEvent(id); }
  getCircles() { return AcademyDataApi.getCircles(); }
  getCircle(id) { return AcademyDataApi.getCircle(id); }
  getExams() { return AcademyDataApi.getExams(); }
  getExam(id) { return AcademyDataApi.getExam(id); }
  getExamQuestionSets() { return AcademyDataApi.getExamQuestionSets(); }
  getExamQuestionSet(id) { return AcademyDataApi.getExamQuestionSet(id); }
  getCalendarConfig() { return AcademyDataApi.getCalendarConfig(); }
  getTeachingSessionsForSlot(slotRef = {}) { return AcademyDataApi.getTeachingSessionsForSlot(slotRef); }
  async loadLessons() { return this.getLessons(); }
  async loadNpcs() { return this.getNpcs(); }
  async loadLocations() { return this.getLocations(); }
  async loadSpellIndex() { return this.getSpellsIndex(); }
  getVirtualCalendarEntriesForDay(dayRef) { return AcademyDataApi.getVirtualCalendarEntriesForDay(dayRef); }
  getSpellCurriculum() { return AcademyDataApi.getSpellCurriculum(); }
  getAlchemyRecipes() { return AcademyDataApi.getAlchemyRecipes(); }
  getLibrary() { return AcademyDataApi.getLibraryItems(); }
  getSpellsIndex() { return AcademyDataApi.getSpellsIndex(); }
  getLessonGenerator() { return AcademyDataApi.getLessonGenerator(); }
  getCalendarTemplate() { return AcademyDataApi.getCalendarTemplate(); }
  getTeachingSessions() { return AcademyDataApi.getTeachingSessions(); }
  getSocialLinks() { return AcademyDataApi.getSocialLinks(); }
  getSocialLink(id) { return AcademyDataApi.getSocialLink(id); }
  getMilestones() { return AcademyDataApi.getMilestones(); }
  getMilestone(id) { return AcademyDataApi.getMilestone(id); }
  getCollections() { return AcademyDataApi.getCollections(); }
  getCollection(id) { return AcademyDataApi.getCollection(id); }
  getSchoolStatsConfig() { return AcademyDataApi.getSchoolStatsConfig(); }
  getResourcesConfig() { return AcademyDataApi.getResourcesConfig(); }
  buildQuestSummary(state = null) { return AcademyDataApi.buildQuestSummary(state); }
  buildRumorBoard(state = null) { return AcademyDataApi.buildRumorBoard(state); }
  buildFactionStanding(state = null) { return AcademyDataApi.buildFactionStanding(state); }
  buildSocialLinksSummary(state = null) { return AcademyDataApi.buildSocialLinksSummary(state); }
  buildCollectionsSummary(state = null) { return AcademyDataApi.buildCollectionsSummary(state); }
  buildMilestonesSummary(state = null) { return AcademyDataApi.buildMilestonesSummary(state); }
  buildAcademyStatsSummary(state = null) { return AcademyDataApi.buildAcademyStatsSummary(state); }
  buildEventContext(state = null) { return AcademyDataApi.buildEventContext(state); }
  snapshotLessonById(id) { const lesson = AcademyDataApi.getLesson(id); return lesson ? clone(lesson) : null; }

  static async init() { return initAcademyData(); }
  static listManagedRecords(domainId) { return listManagedRecords(domainId); }
  static getManagedRecordByUuid(uuid) { return getManagedRecordByUuid(uuid); }
  static validateManagedRecord(domainId, record) { return validateManagedRecord(domainId, record); }
  static async saveManagedRecord(payload = {}) {
    return saveManagedRecordImpl({
      ...payload,
      onReload: async () => {
        this.resetCache();
        await this.init();
      },
    });
  }

  listManagedRecords(domainId) { return this.constructor.listManagedRecords(domainId); }
  getManagedRecordByUuid(uuid) { return this.constructor.getManagedRecordByUuid(uuid); }
  validateManagedRecord(domainId, record) { return this.constructor.validateManagedRecord(domainId, record); }
  async saveManagedRecord(payload = {}) { return this.constructor.saveManagedRecord(payload); }

  static resetCache() { resetAcademyCache(); resetContentCache(); }
  static get isReady() { return !!getAcademyCache(); }
  static getValidation() { return getValidation(); }
  static getLessons() { return getLessons(); }
  static getLesson(id) { return getLesson(id); }
  static getNpcs() { return getNpcs(); }
  static getNpc(id) { return getNpc(id); }
  static getLocations() { return getLocations(); }
  static getLocation(id) { return getLocation(id); }
  static getCalendarEntries() { return getCalendarEntries(); }
  static getCalendarEntry(id) { return getCalendarEntry(id); }
  static getEvents() { return getEvents(); }
  static getEvent(id) { return getEvent(id); }
  static getCircles() { return getCircles(); }
  static getCircle(id) { return getCircle(id); }
  static getExams() { return getExams(); }
  static getExam(id) { return getExam(id); }
  static getExamQuestionSets() { return getExamQuestionSets(); }
  static getExamQuestionSet(id) { return getExamQuestionSet(id); }
  static getLibraryItems() { return getLibraryItems(); }
  static getSpellsIndex() { return getSpellsIndex(); }
  static getAlchemyRecipeItems() { return getAlchemyRecipeItems(); }
  static getCalendarConfig() { return getCalendarConfig(); }
  static getTeachingSessionsForSlot(slotRef = {}) { return getTeachingSessionsForSlot(slotRef); }
  static getVirtualCalendarEntriesForDay(dayRef) { return getVirtualCalendarEntriesForDay(dayRef); }
  static getSpellCurriculum() { return getSpellCurriculum(); }
  static getAlchemyRecipes() { return getAlchemyRecipes(); }
  static getLessonGenerator() { return getLessonGenerator(); }
  static getCalendarTemplate() { return getCalendarTemplate(); }
  static getTeachingSessions() { return getTeachingSessions(); }
  static async getContentRegistry(opts = {}) { return getContentRegistry(opts); }
  static async reloadContentRegistry(opts = {}) { return reloadContentRegistry(opts); }
  static getQuestIndex() { return getQuestIndex(); }
  static async getQuest(questId) { return getQuestById(questId); }
  static getEventIndex() { return getEventIndex(); }
  static async getEventPool(poolName) { return getEventPoolByName(poolName); }
  static getEffectIndex() { return getEffectIndex(); }
  static async getEffect(effectId) { return getEffectById(effectId); }
  static getExtendedDataset(key) { return getExtendedDataset(key); }
  static getAssignments() { return getAssignments(); }
  static getSanctuaryUpgrades() { return getSanctuaryUpgrades(); }
  static getDuels() { return getDuels(); }
  static getFactions() { return getFactions(); }
  static getHarvestNodes() { return getHarvestNodes(); }
  static getFieldGuidePages() { return getFieldGuidePages(); }
  static getRumors() { return getRumors(); }
  static getSocialLinks() { return getSocialLinks(); }
  static getSocialLink(id) { return getSocialLink(id); }
  static getMilestones() { return getMilestones(); }
  static getMilestone(id) { return getMilestone(id); }
  static getCollections() { return getCollections(); }
  static getCollection(id) { return getCollection(id); }
  static getSchoolStatsConfig() { return getSchoolStatsConfig(); }
  static getResourcesConfig() { return getResourcesConfig(); }
  static getLocationActivityModifiers(locationId, activityType = null) { return getLocationActivityModifiers(locationId, activityType); }
  static buildQuestSummary(state = null) { return buildQuestSummary(state); }
  static buildRumorBoard(state = null) { return buildRumorBoard(state); }
  static buildFactionStanding(state = null) { return buildFactionStanding(state); }
  static buildSocialLinksSummary(state = null) { return buildSocialLinksSummary(state); }
  static buildCollectionsSummary(state = null) { return buildCollectionsSummary(state); }
  static buildMilestonesSummary(state = null) { return buildMilestonesSummary(state); }
  static buildAcademyStatsSummary(state = null) { return buildAcademyStatsSummary(state); }
  static buildEventContext(state = null) { return buildEventContext(state); }
  static export() { return exportAcademyData(); }
}

export default AcademyDataApi;
