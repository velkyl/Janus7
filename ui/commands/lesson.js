/**
 * @file ui/commands/lesson.js
 * @module janus7/ui/commands
 * @phase 6
 *
 * Lektion & Prüfungs-Commands.
 * Steuern den `RollScoringConnector` (aktive Lektion/Prüfung im State),
 * sodass Würfelergebnisse dem richtigen Kontext zugeordnet werden.
 *
 * Alle Mutationen gehen über den Connector – kein direktes State-Set im UI-Layer.
 * GM-only via _checkPermission.
 *
 * Chat-CLI Beispiele:
 *   /janus lesson.start lessonId=LES_Y1_T1_ARKAN_01
 *   /janus lesson.clear
 *   /janus lesson.status
 *   /janus exam.start examId=EXAM_MAG_BASICS_01
 *   /janus exam.clear
 */

import { _checkPermission, _engine, _wrap } from './_shared.js';

function _connector() {
  const engine = _engine();
  const connector = engine?.academy?.rollConnector ?? null;
  if (!connector) throw new Error('RollScoringConnector nicht verfügbar (Phase 4 geladen?)');
  return connector;
}

function _state() {
  const engine = _engine();
  const state = engine?.core?.state;
  if (!state) throw new Error('State nicht verfügbar');
  return state;
}

export const lessonCommands = {
  /**
   * Setzt die aktive Lektion im State.
   * dataset.lessonId: LessonId
   */
  'lesson.start': (dataset = {}) => _wrap('lesson.start', async () => {
    if (!_checkPermission('lesson.start')) return { success: false, cancelled: true };
    const lessonId = String(dataset.lessonId ?? dataset._arg0 ?? '').trim();
    if (!lessonId) throw new Error('lessonId fehlt. Syntax: /janus lesson.start lessonId=LES_...');
    await _connector().setActiveLesson(lessonId);
    ui.notifications?.info?.(`JANUS7: Aktive Lektion → ${lessonId}`);
    return { success: true, lessonId };
  }),

  /**
   * Beendet aktive Lektion/Prüfung.
   */
  'lesson.clear': (_dataset = {}) => _wrap('lesson.clear', async () => {
    if (!_checkPermission('lesson.clear')) return { success: false, cancelled: true };
    await _connector().clearActive();
    ui.notifications?.info?.('JANUS7: Aktive Lektion/Prüfung beendet.');
    return { success: true };
  }),

  /**
   * Zeigt aktive Lektion/Prüfung aus dem State.
   */
  'lesson.status': (_dataset = {}) => _wrap('lesson.status', () => {
    const sim = _state().get?.('simulation') ?? _state().get?.('academy') ?? {};
    const result = {
      activeLessonId: sim?.activeLessonId ?? null,
      activeExamId:   sim?.activeExamId   ?? null,
    };
    const msg = result.activeLessonId
      ? `Aktive Lektion: ${result.activeLessonId}`
      : result.activeExamId
      ? `Aktive Prüfung: ${result.activeExamId}`
      : 'Keine aktive Lektion/Prüfung.';
    ui.notifications?.info?.(`JANUS7: ${msg}`);
    return Promise.resolve(result);
  }),

  /**
   * Setzt die aktive Prüfung.
   * dataset.examId: ExamId
   */
  'exam.start': (dataset = {}) => _wrap('exam.start', async () => {
    if (!_checkPermission('exam.start')) return { success: false, cancelled: true };
    const examId = String(dataset.examId ?? dataset._arg0 ?? '').trim();
    if (!examId) throw new Error('examId fehlt. Syntax: /janus exam.start examId=EXAM_...');
    await _connector().setActiveExam(examId);
    ui.notifications?.info?.(`JANUS7: Aktive Prüfung → ${examId}`);
    return { success: true, examId };
  }),

  /**
   * Beendet aktive Prüfung.
   */
  'exam.clear': (_dataset = {}) => _wrap('exam.clear', async () => {
    if (!_checkPermission('exam.clear')) return { success: false, cancelled: true };
    await _connector().clearActive();
    ui.notifications?.info?.('JANUS7: Prüfung beendet.');
    return { success: true };
  }),
};

export default lessonCommands;
