// janus7/ui/index.js
import { JanusControlPanelApp } from './apps/control-panel/JanusControlPanelApp.js';
import { JanusAcademyOverviewApp } from './apps/JanusAcademyOverviewApp.js';
import { JanusScoringViewApp } from './apps/JanusScoringViewApp.js';
import { JanusSocialViewApp } from './apps/JanusSocialViewApp.js';
import { JanusAtmosphereDJApp } from './apps/JanusAtmosphereDJApp.js';
import { JanusStateInspectorApp } from './apps/JanusStateInspectorApp.js';
import { JanusCommandCenterApp } from './apps/JanusCommandCenterApp.js';
import { JanusTestResultApp } from './apps/JanusTestResultApp.js';
import { JanusGuidedManualTestApp } from './apps/JanusGuidedManualTestApp.js';
import { JanusConfigPanelApp } from './apps/JanusConfigPanelApp.js';
import { JanusSyncPanelApp } from './apps/JanusSyncPanelApp.js';
import { JanusAcademyDataStudioApp } from './apps/JanusAcademyDataStudioApp.js';
import { JanusKiBackupManagerApp } from './apps/JanusKiBackupManagerApp.js';
import { JanusKiRoundtripApp } from './apps/ki-roundtrip/JanusKiRoundtripApp.js';
import { JanusLessonLibraryApp } from './apps/JanusLessonLibraryApp.js';
import { JanusShellApp } from './apps/JanusShellApp.js';
import { JanusLibraryBrowserApp } from './apps/JanusLibraryBrowserApp.js';
import { JanusStudentArchiveApp } from './apps/JanusStudentArchiveApp.js';
import { JanusEnrollmentApp } from './apps/JanusEnrollmentApp.js';
import { JanusQuartermasterApp } from './apps/JanusQuartermasterApp.js';
import './layer/bridge.js';
import { JANUS_UI_APP_STATUS, listJanusUiAppStatus } from './app-manifest.js';
import { HOOKS } from '../core/hooks/topics.js';
import { registerRuntimeHook } from '../core/hooks/runtime.js';

// Optional: devtools harness is best-effort and must not block UI init.
let JanusSettingsTestHarnessApp = null;

/**
 * UI Registry / Router for JANUS7.
 * @namespace game.janus7.ui
 */
const _sceneControlContributors = [];

export const JanusUI = {
  apps: {
    controlPanel: JanusControlPanelApp,
    academyOverview: JanusAcademyOverviewApp,
    scoringView: JanusScoringViewApp,
    socialView: JanusSocialViewApp,
    atmosphereDJ: JanusAtmosphereDJApp,
    stateInspector: JanusStateInspectorApp,
    configPanel: JanusConfigPanelApp,
    syncPanel: JanusSyncPanelApp,
    academyDataStudio: JanusAcademyDataStudioApp,
    lessonLibrary: JanusLessonLibraryApp,
    libraryBrowser: JanusLibraryBrowserApp,
    enrollmentScanner: JanusEnrollmentApp,
    studentArchive: JanusStudentArchiveApp,
    quartermaster: JanusQuartermasterApp,
    shell: JanusShellApp,
    JanusShellApp,
    lessons: JanusLessonLibraryApp,
    kiBackupManager: JanusKiBackupManagerApp,
    // Legacy alias key: keeps older macros functional, but UI does not expose it
    aiRoundtrip: JanusKiRoundtripApp,
    kiRoundtrip: JanusKiRoundtripApp,
    commandCenter: JanusCommandCenterApp,
    testResults: JanusTestResultApp,
    guidedManualTests: JanusGuidedManualTestApp,
    ...(JanusSettingsTestHarnessApp ? { settingsTestHarness: JanusSettingsTestHarnessApp } : {})
  },

  open(key, options = {}) {
    const normalizedKey = ({ lessons: 'lessonLibrary', lessonlibrary: 'lessonLibrary' }[String(key)] ?? key);
    const App = this.apps[normalizedKey];
    if (!App) throw new Error(`[JANUS7] Unknown UI app key: ${key}`);
    const inst = (typeof App.showSingleton === 'function') ? App.showSingleton(options) : new App(options);
    try { inst.render?.({ force: true, focus: true }); } catch (_) { try { inst.render?.(true); } catch (_e) {} }
    queueMicrotask(() => {
      try { inst._applyWindowSanity?.(); } catch (_) {}
      try { if (inst.minimized && typeof inst.maximize === 'function') void inst.maximize(); } catch (_) {}
      try { inst.bringToFront?.(); } catch (_) {}
    });
    return inst;
  },

  openControlPanel(options = {}) {
    return this.open('shell', options);
  },

  openShell(options = {}) {
    return this.open('shell', options);
  },

  list() {
    return Object.keys(this.apps);
  },

  appStatus(key = null) {
    if (key == null) return listJanusUiAppStatus();
    return JANUS_UI_APP_STATUS[String(key)] ?? null;
  },

  // -------------------------------------------------------------------------
  // Scene Controls Extension Point (Sprint B)
  // - Foundry core hook remains centralized in scripts/janus.mjs
  // - Higher phases can extend via this registry
  // -------------------------------------------------------------------------
  registerSceneControlsContributor(fn) {
    if (typeof fn !== 'function') return;
    if (_sceneControlContributors.includes(fn)) return;
    _sceneControlContributors.push(fn);
  },

  onSceneControls(controls) {
    for (const fn of _sceneControlContributors) {
      try { fn(controls); } catch (err) {
        (game?.janus7?.core?.logger ?? console).warn?.('[JANUS7][UI] scene controls contributor failed:', err);
      }
    }
  }
};

JanusUI.manifest = JANUS_UI_APP_STATUS;

export default JanusUI;

// Attach UI router onto engine once JANUS7 is ready.
registerRuntimeHook('janus7:ready:ui-index-attach', HOOKS.ENGINE_READY, (engine) => {
  try {
    if (!engine) return;
    engine.ui = JanusUI;

    // Drain any pending contributors registered before UI was attached.
    const pending = engine._pendingSceneControlContribs;
    if (Array.isArray(pending)) {
      for (const fn of pending) JanusUI.registerSceneControlsContributor(fn);
      engine._pendingSceneControlContribs = [];
    }
  } catch (_err) { /* noop */ }
});

// Best-effort: if engine already exists (hot reload), attach immediately.
try {
  if (game?.janus7) game.janus7.ui = JanusUI;
} catch (_err) { /* noop */ }

// ---------------------------------------------------------------------------
// Compat layer for older macros / API surfaces.
// We keep this tiny and harmless.
// ---------------------------------------------------------------------------
function _ensureCompatBindings(engineLike) {
  try {
    const e = engineLike ?? game?.janus7;
    if (!e) return;

    // Legacy macro patterns observed in the wild:
    // - game.janus7.controlPanel.open()
    // - game.janus7.ui.open(...)
    // - game.janus7.open()
    if (!e.controlPanel) e.controlPanel = {};
    if (typeof e.controlPanel.open !== 'function') {
      e.controlPanel.open = (options = {}) => JanusUI.openShell(options);
    }

    if (typeof e.open !== 'function') {
      e.open = (options = {}) => JanusUI.openShell(options);
    }

    // Convenience alias
    if (!e.uiRouter) e.uiRouter = JanusUI;
  } catch (_err) { /* noop */ }
}

registerRuntimeHook('janus7:ready:ui-index-compat', HOOKS.ENGINE_READY, (engine) => _ensureCompatBindings(engine));
try { _ensureCompatBindings(game?.janus7); } catch (_err) { /* noop */ }
