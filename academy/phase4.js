import { moduleAssetPath } from '../core/common.js';
/**
 * @file academy/phase4.js
 * @module janus7
 * @phase 4
 *
 * Phase 4 Integration Layer:
 * - Instantiates simulation engines (calendar, scoring, social)
 * - Attaches them to `engine.academy` and compatibility aliases on `engine.*`
 *
 * IMPORTANT:
 * - Must not be required by core directly (loaded via scripts/janus.mjs).
 * - Must be resilient: if a user disables simulation, we simply skip init.
 */

import { JanusConfig } from '../core/config.js';
import { JanusCalendarEngine } from './calendar.js';
import { JanusScoringEngine } from './scoring.js';
import { JanusSocialEngine } from './social.js';
import { JanusLearningProgress } from './learning-progress.js';
import { JanusFateTracker } from './fate-tracker.js';
import { JanusCircleAssignment } from './circle-assignment.js';
import { JanusLessonBuffManager } from './lesson-buff-manager.js';
import { JanusExamsEngine } from './exams.js';
import { JanusLessonsEngine } from './lessons.js';
import { RollScoringConnector } from './roll-scoring-connector.js';
import { JanusSocialSync } from './social-sync.js';
import { JanusExamConditionHooks } from './exam-condition-hooks.js';
import { HOOKS } from '../core/hooks/topics.js';
import { registerRuntimeHook } from '../core/hooks/runtime.js';

/**
 * Attach Phase-4 engines on janus7Ready.
 * We use `Hooks.on` (not once) so a manual re-init (future) could re-run.
 */
registerRuntimeHook('janus7:ready:academy-phase4', HOOKS.ENGINE_READY, async (engine) => {
  const baseLogger = engine?.core?.logger ?? console;
  try {
    // Respect kill-switch.
    let enabled = true;
    try { enabled = JanusConfig.get('enableSimulation') !== false; } catch { /* ignore */ }
    // BUG FIX #6: engine.logger, engine.state, engine.academyData existieren NICHT als
    // Top-Level-Properties. Korrekte Pfade: engine.core.logger, engine.core.state, engine.academy.data.
    // (Einziger Top-Level-Alias: engine.director = engine.core.director)
    const logger      = engine?.core?.logger;
    const state       = engine?.core?.state;
    const academyData = engine?.academy?.data;

    if (!enabled) {
      logger?.info?.('[JANUS7] Phase 4 (Simulation) disabled via setting enableSimulation=false.');
      return;
    }

    if (!state) {
      logger?.warn?.('[JANUS7] Phase 4 init skipped: engine.core.state missing.');
      return;
    }

    const registerResults = {};
    const safeRegister = (service, name) => {
      if (!service) {
        registerResults[name] = null;
        return false;
      }
      if (typeof service.register !== 'function') {
        logger?.warn?.(`[JANUS7] Phase 4: ${name} hat keine register()-Methode. Initialisierung läuft degradiert weiter.`);
        registerResults[name] = 'missing-register';
        return false;
      }
      try {
        service.register();
        registerResults[name] = true;
        return true;
      } catch (err) {
        logger?.warn?.(`[JANUS7] Phase 4: ${name}.register() fehlgeschlagen (non-fatal)`, { err: err?.message ?? err });
        registerResults[name] = false;
        return false;
      }
    };

    // ---------------------------------------------------------------------
    // Engines
    // ---------------------------------------------------------------------
    const calendar = new JanusCalendarEngine({ state, academyData, logger });

    // BUG FIX #1: enableWorldTimeSync() wurde nie aufgerufen → _worldSync.enabled = false immer.
    // Config-Werte werden hier ausgelesen und die Synchronisation aktiviert.
    try {
      const syncEnabled  = JanusConfig.get('syncWithDSA5Calendar') ?? true;
      const slotSeconds  = JanusConfig.get('calendarSlotSeconds')  ?? 8640;
      calendar.enableWorldTimeSync({ enabled: syncEnabled, slotSeconds });
      logger?.debug?.(`[JANUS7] CalendarSync: enabled=${syncEnabled}, slotSeconds=${slotSeconds}`);
      if (syncEnabled) {
        calendar.syncFromWorldTime({ force: true }).catch((syncErr) => {
          logger?.warn?.('[JANUS7] CalendarSync: Initialer Pull aus Foundry worldTime fehlgeschlagen.', {
            err: syncErr?.message ?? syncErr
          });
        });
      }
    } catch (settingsErr) {
      logger?.warn?.('[JANUS7] CalendarSync: Konnte Sync-Config nicht lesen, Sync deaktiviert.', { err: settingsErr });
    }

    registerRuntimeHook('janus7:academy-phase4:dsa-calendar-sync', HOOKS.DSA_CALENDAR_UPDATED, async () => {
      try {
        if (!calendar?._worldSync?.enabled) return;
        await calendar.syncFromWorldTime({ force: true });
      } catch (syncErr) {
        logger?.warn?.('[JANUS7] CalendarSync: Pull nach DSA-Kalenderupdate fehlgeschlagen.', {
          err: syncErr?.message ?? syncErr
        });
      }
    });

    const scoring = new JanusScoringEngine({ state, academyData, logger });
    const social  = new JanusSocialEngine({ state, academyData, logger });

    // ---------------------------------------------------------------------
    // Base attachments first.
    // Optional services must never prevent calendar/scoring/social exposure.
    // ---------------------------------------------------------------------
    engine.academy = engine.academy ?? {};
    engine.simulation = engine.simulation ?? {};

    engine.academy.calendar = calendar;
    engine.academy.scoring  = scoring;
    engine.academy.social   = social;

    engine.simulation.calendar = calendar;
    engine.simulation.scoring  = scoring;
    engine.simulation.social   = social;

    // Compatibility aliases (NOTE P3-02)
    // engine.academy.scoring / engine.simulation.scoring / engine.scoring zeigen auf dieselbe Instanz.
    // Dreifach-Alias entstand historisch. Neuer Code soll engine.academy.* bevorzugen.
    // Geplante Bereinigung der Top-Level-Aliases (engine.scoring etc.) in v1.0.
    engine.calendar = calendar;
    engine.scoring  = scoring;
    engine.social   = social;
    engine?.markServiceReady?.('simulation.calendar', calendar);
    engine?.markServiceReady?.('simulation.scoring', scoring);
    engine?.markServiceReady?.('simulation.social', social);

    // ── Neue Phase-4-Engines (Audit v3) ────────────────────────────────────
    const bridge  = engine?.bridge?.dsa5 ?? null;

    // SocialSync: nach bridge-Deklaration initialisieren (benötigt bridge)
    try {
      const socialSync = new JanusSocialSync({ bridge, socialEngine: social, academyData, logger });
      safeRegister(socialSync, 'socialSync');
      engine.academy.socialSync = socialSync;
      engine?.markServiceReady?.('academy.socialSync', socialSync);
      logger?.debug?.('[JANUS7] Phase 4: JanusSocialSync verdrahtet (nach bridge-Init).');
    } catch (syncErr) {
      engine?.recordWarning?.('phase4', 'socialSync.init', syncErr);
      logger?.warn?.('[JANUS7] Phase 4: JanusSocialSync init fehlgeschlagen (non-fatal)', { err: syncErr?.message });
    }

    let learningProgress = null;
    let fateTracker = null;
    let circleAssignment = null;
    let lessonBuffManager = null;

    if (bridge) {
      learningProgress = new JanusLearningProgress({ bridge, scoring, academyData, logger });
      try {
      // FIX P1-02: fetch() Fehler (404/CORS) wurden lautlos mit () => null geschluckt.
      // Zusätzliches Logging damit Konfigurationslücken auffallen.
      const apAwardsCfg = await fetch(moduleAssetPath('data/academy/ap-awards.json'))
        .then(r => r.ok ? r.json() : null)
        .catch(err => { logger?.warn?.('[JANUS7] Phase 4: ap-awards.json nicht ladbar:', err?.message); return null; });
      if (apAwardsCfg) learningProgress.loadConfig(apAwardsCfg);
      } catch { /* non-fatal */ }
      safeRegister(learningProgress, 'learningProgress');

      fateTracker = new JanusFateTracker({ bridge, scoring, academyData, logger });
      try {
      const fateScoringCfg = await fetch(moduleAssetPath('data/academy/fate-scoring.json'))
        .then(r => r.ok ? r.json() : null)
        .catch(err => { logger?.warn?.('[JANUS7] Phase 4: fate-scoring.json nicht ladbar:', err?.message); return null; });
      if (fateScoringCfg) fateTracker.loadConfig(fateScoringCfg);
      } catch { /* non-fatal */ }
      safeRegister(fateTracker, 'fateTracker');

      circleAssignment = new JanusCircleAssignment({ bridge, state, academyData, logger });
      safeRegister(circleAssignment, 'circleAssignment');

      lessonBuffManager = new JanusLessonBuffManager({ bridge, academyData, logger });
      try {
        const teacherBonusesCfg = await fetch(moduleAssetPath('data/academy/teacher-bonuses.json'))
          .then(r => r.ok ? r.json() : null)
          .catch(err => { logger?.warn?.('[JANUS7] Phase 4: teacher-bonuses.json nicht ladbar:', err?.message); return null; });
        if (teacherBonusesCfg) lessonBuffManager.loadBonuses(teacherBonusesCfg);
        // Kein manuelles register() hier — safeRegister() ruft es auf
      } catch { /* non-fatal */ }
      safeRegister(lessonBuffManager, 'lessonBuffManager');
    } else {
      engine?.recordWarning?.('phase4', 'bridge.missing', 'DSA5 bridge unavailable for extended simulation');
      logger?.warn?.('[JANUS7] Phase 4: DSA5-Bridge nicht verfügbar. Erweiterte Simulation läuft degradiert.');
    }

    engine.academy.learningProgress = learningProgress;
    engine.academy.fateTracker = fateTracker;
    engine.academy.circleAssignment = circleAssignment;
    // Compat alias mit syncAll()-Adapter: Tests nutzen circleSync.syncAll(...)
    // -> delegiert auf assignAllStudents({ dryRun, overwrite })
    engine.academy.circleSync = circleAssignment
      ? Object.assign(Object.create(circleAssignment), {
          syncAll({ dryRun = false, overwriteManual = false } = {}) {
            return circleAssignment.assignAllStudents({ dryRun, overwrite: overwriteManual });
          }
        })
      : null;
    engine.academy.lessonBuffManager = lessonBuffManager;
    engine?.markServiceReady?.('academy.learningProgress', learningProgress);
    engine?.markServiceReady?.('academy.fateTracker', fateTracker);
    engine?.markServiceReady?.('academy.circleAssignment', circleAssignment);
    engine?.markServiceReady?.('academy.lessonBuffManager', lessonBuffManager);

    // ExamConditionHooks: verbindet Prüfungsergebnisse mit Timed Conditions
    let examConditionHooks = null;
    if (bridge) {
      try {
        examConditionHooks = new JanusExamConditionHooks({ bridge, logger });
        if (safeRegister(examConditionHooks, 'examConditionHooks')) {
          engine.academy.examConditionHooks = examConditionHooks;
          engine?.markServiceReady?.('academy.examConditionHooks', examConditionHooks);
          logger?.debug?.('[JANUS7] Phase 4: JanusExamConditionHooks verdrahtet.');
        } else {
          engine.academy.examConditionHooks = null;
        }
      } catch (echErr) {
        engine?.recordWarning?.('phase4', 'examConditionHooks.init', echErr);
        logger?.warn?.('[JANUS7] Phase 4: JanusExamConditionHooks init fehlgeschlagen (non-fatal)', { err: echErr?.message });
        registerResults.examConditionHooks = false;
      }
    } else {
      registerResults.examConditionHooks = null;
    }

    // ── Exams + Lessons + RollScoringConnector ──────────────────────────
    // Wurden bisher nicht in phase4 verdrahtet. Nachholen:
    let exams = null;
    let lessons = null;
    let rollConnector = null;
    try {
      exams = new JanusExamsEngine({ state, academyData, scoring, calendar, logger });

      // Wire GroupExamMixin: adds triggerGroupExam() to the running exams instance.
      // Dynamic import avoids circular dependencies with group-exam.js.
      try {
        const { GroupExamMixin } = await import('./group-exam.js');
        Object.assign(exams, GroupExamMixin);
        logger?.debug?.('[JANUS7] Phase 4: GroupExamMixin verdrahtet (exams.triggerGroupExam verfügbar).');
      } catch (mixinErr) {
        logger?.warn?.('[JANUS7] Phase 4: GroupExamMixin konnte nicht geladen werden (non-fatal)', { err: mixinErr?.message });
      }

      lessons = new JanusLessonsEngine({ state, academyData, calendar, logger });

      rollConnector = new RollScoringConnector({
        scoring,
        exams,
        lessons,
        calendar,
        state,
        bridge: bridge ?? null,
        logger,
      });
      safeRegister(rollConnector, 'rollConnector');

      engine.academy.exams         = exams;
      engine.academy.lessons       = lessons;
      engine.academy.rollConnector = rollConnector;
      engine?.markServiceReady?.('academy.exams', exams);
      engine?.markServiceReady?.('academy.lessons', lessons);
      engine?.markServiceReady?.('academy.rollConnector', rollConnector);

      // Compatibility aliases
      engine.exams   = exams;
      engine.lessons = lessons;

      logger?.debug?.('[JANUS7] Phase 4: exams/lessons/rollConnector verdrahtet.');
    } catch (connErr) {
      engine?.recordWarning?.('phase4', 'rollConnector.init', connErr);
      logger?.warn?.('[JANUS7] Phase 4: RollScoringConnector init fehlgeschlagen (non-fatal)', { err: connErr?.message });
    }

    logger?.info?.('[JANUS7] Phase 4 register summary', registerResults);
    logger?.debug?.('[JANUS7] Phase 4 Simulation initialisiert (calendar/scoring/social/learningProgress/fateTracker/circleAssignment/lessonBuffManager).');
  } catch (err) {
    engine?.recordError?.('phase4', 'integration', err);
    baseLogger.error?.('[JANUS7] Phase 4 Integration failed:', err);
  }
});
