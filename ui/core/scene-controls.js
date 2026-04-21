/**
 * @file ui/core/scene-controls.js
 * @module janus7/ui
 *
 * Purpose:
 * Centralized Factory for JANUS7 Scene Control Buttons.
 * Extracted from scripts/janus.mjs to keep the entry point lean.
 */

import { HOOKS } from '../../core/hooks/topics.js';

/**
 * Attaches the JANUS7 toolset to the Foundry Scene Controls.
 *
 * @param {object} controls - The controls object from getSceneControlButtons hook
 * @param {object} engine - The JANUS7 engine instance
 */
export function attachJanusSceneControls(controls, engine) {
  if (!game.user?.isGM) return;

  const logger = engine?.core?.logger ?? console;
  const i18n = game?.i18n;
  const localize = (key, fallback) => i18n?.localize?.(key) ?? fallback ?? key;

  const isObject = (value) => !!value && (typeof value === 'object') && !Array.isArray(value);
  const getTopLevelControls = (value) => {
    if (Array.isArray(value)) return value;
    if (isObject(value?.controls)) return value.controls;
    if (Array.isArray(value?.controls)) return value.controls;
    if (isObject(value?.items)) return value.items;
    if (Array.isArray(value?.items)) return value.items;
    if (isObject(value?.data)) return value.data;
    if (Array.isArray(value?.data)) return value.data;
    return value;
  };
  const top = getTopLevelControls(controls);
  const isRecord = isObject(top);
  const isList = Array.isArray(top);
  if (!isRecord && !isList) return;

  const getControlSet = (...names) => {
    if (isRecord) {
      for (const name of names) {
        if (top[name]) return top[name];
      }
      return null;
    }
    return top.find((c) => names.includes(c?.name)) ?? null;
  };

  const openControlPanel = async () => {
    try {
      const uiReg = game?.janus7?.ui;
      if (uiReg?.openShell) return uiReg.openShell();
      if (uiReg?.openControlPanel) return uiReg.openControlPanel();
      const { JanusShellApp } = await import('../apps/JanusShellApp.js');
      const app = JanusShellApp.showSingleton();
      app.render?.({ force: true, focus: true });
      return app;
    } catch (err) {
      logger.error?.('[JANUS7] Scene control openControlPanel fehlgeschlagen:', { message: err?.message });
    }
  };

  const openUiApp = async (key, label = key, options = {}) => {
    try {
      return game?.janus7?.ui?.open?.(key, options);
    } catch (err) {
      logger.error?.(`[JANUS7] Scene control ${label} fehlgeschlagen:`, { message: err?.message });
    }
  };

  const openQuestJournal = async () => {
    try {
      const mod = await import('../../scripts/ui/quest-journal.js');
      new mod.JanusQuestJournal().render({ force: true, focus: true });
      return true;
    } catch (err) {
      logger.error?.('[JANUS7] Scene control questJournal fehlgeschlagen:', { message: err?.message });
      ui.notifications?.error?.('Quest-Journal konnte nicht geöffnet werden.');
      return false;
    }
  };

  const openStoryGraph = async () => {
    try {
      const { StoryGraphApp } = await import('../apps/StoryGraphApp.js');
      new StoryGraphApp().render({ force: true, focus: true });
      return true;
    } catch (err) {
      logger.error?.('[JANUS7] Scene control openStoryGraph fehlgeschlagen:', { message: err?.message });
      ui.notifications?.error?.('Story Graph konnte nicht geöffnet werden.');
      return false;
    }
  };

  const openKiSearch = async () => {
    try {
      const { JanusShellApp } = await import('../apps/JanusShellApp.js');
      JanusShellApp.onKiSearch();
      return true;
    } catch (err) {
      logger.error?.('[JANUS7] openKiSearch fehlgeschlagen:', { message: err?.message });
      return false;
    }
  };

  const runTool = (fn) => (event) => {
    event?.preventDefault?.();
    void fn();
  };

  const toolVisible = !!game?.user?.isGM;

  const janusToolsRecord = {
    openControlPanel: {
      name: 'openControlPanel',
      title: localize('JANUS7.Menu.ControlPanel.Label', 'JANUS Shell öffnen'),
      icon: 'fas fa-cogs',
      order: 0,
      button: true,
      visible: toolVisible,
      onChange: runTool(openControlPanel)
    },
    openMasterDashboard: {
      name: 'openMasterDashboard',
      title: 'Master Dashboard (Balancing / Heat / Rumors)',
      icon: 'fas fa-crown',
      order: 0.5,
      button: true,
      visible: toolVisible,
      onChange: runTool(async () => {
        const { JanusMasterDashboard } = await import('../../scripts/ui/master-dashboard.js');
        new JanusMasterDashboard().render({ force: true, focus: true });
      })
    },
    openAcademyOverview: {
      name: 'openAcademyOverview',
      title: 'Academy Overview öffnen',
      icon: 'fas fa-university',
      order: 1,
      button: true,
      visible: toolVisible,
      onChange: runTool(() => openUiApp('academyOverview', 'academyOverview'))
    },
    openScoringView: {
      name: 'openScoringView',
      title: 'Scoring öffnen',
      icon: 'fas fa-trophy',
      order: 2,
      button: true,
      visible: toolVisible,
      onChange: runTool(() => openUiApp('scoringView', 'scoringView'))
    },
    openSocialView: {
      name: 'openSocialView',
      title: 'Social View öffnen',
      icon: 'fas fa-users',
      order: 3,
      button: true,
      visible: toolVisible,
      onChange: runTool(() => openUiApp('socialView', 'socialView'))
    },
    openStoryGraph: {
      name: 'openStoryGraph',
      title: 'Story Graph öffnen',
      icon: 'fas fa-project-diagram',
      order: 3.5,
      button: true,
      visible: toolVisible,
      onChange: runTool(openStoryGraph)
    },
    openKiSearch: {
      name: 'openKiSearch',
      title: 'KI Semantische Suche',
      icon: 'fas fa-search',
      order: 3.8,
      button: true,
      visible: toolVisible,
      onChange: runTool(openKiSearch)
    },
    openAtmosphereDJ: {
      name: 'openAtmosphereDJ',
      title: 'Atmosphere DJ öffnen',
      icon: 'fas fa-music',
      order: 4,
      button: true,
      visible: toolVisible,
      onChange: runTool(() => openUiApp('atmosphereDJ', 'atmosphereDJ'))
    },
    openQuestJournal: {
      name: 'openQuestJournal',
      title: 'Quest-Journal öffnen',
      icon: 'fas fa-book-open',
      order: 5,
      button: true,
      visible: toolVisible,
      onChange: runTool(openQuestJournal)
    },
    openSyncPanel: {
      name: 'openSyncPanel',
      title: 'Sync Panel öffnen',
      icon: 'fas fa-link',
      order: 12,
      button: true,
      visible: toolVisible,
      onChange: runTool(() => openUiApp('syncPanel', 'syncPanel'))
    },
    openStateInspector: {
      name: 'openStateInspector',
      title: 'State Inspector öffnen',
      icon: 'fas fa-database',
      order: 13,
      button: true,
      visible: toolVisible,
      onChange: runTool(() => openUiApp('stateInspector', 'stateInspector'))
    },
    openConfigPanel: {
      name: 'openConfigPanel',
      title: 'Config Panel öffnen',
      icon: 'fas fa-sliders-h',
      order: 14,
      button: true,
      visible: toolVisible,
      onChange: runTool(() => openUiApp('configPanel', 'configPanel'))
    },
    openAcademyDataStudio: {
      name: 'openAcademyDataStudio',
      title: 'Academy Data Studio öffnen',
      icon: 'fas fa-edit',
      order: 15,
      button: true,
      visible: toolVisible,
      onChange: runTool(() => openUiApp('academyDataStudio', 'academyDataStudio'))
    },
    openSessionPrep: {
      name: 'openSessionPrep',
      title: localize('JANUS7.UI.OpenSessionPrepWizard', 'Session Prep öffnen'),
      icon: 'fas fa-wand-magic-sparkles',
      order: 16,
      button: true,
      visible: toolVisible,
      onChange: runTool(() => openUiApp('shell', 'sessionPrep', { viewId: 'sessionPrep' }))
    },
    openCommandCenter: {
      name: 'openCommandCenter',
      title: 'Power Tools öffnen',
      icon: 'fas fa-terminal',
      order: 17,
      button: true,
      visible: toolVisible,
      onChange: runTool(() => openUiApp('commandCenter', 'commandCenter'))
    },
    openKiBackupManager: {
      name: 'openKiBackupManager',
      title: 'KI-Backups öffnen',
      icon: 'fas fa-life-ring',
      order: 18,
      button: true,
      visible: toolVisible,
      onChange: runTool(() => openUiApp('kiBackupManager', 'kiBackupManager'))
    },
    openKiRoundtrip: {
      name: 'openKiRoundtrip',
      title: 'KI Roundtrip öffnen',
      icon: 'fas fa-brain',
      order: 19,
      button: true,
      visible: toolVisible,
      onChange: runTool(() => openUiApp('kiRoundtrip', 'kiRoundtrip'))
    },
    openTestResults: {
      name: 'openTestResults',
      title: 'Test Results öffnen',
      icon: 'fas fa-vial',
      order: 20,
      button: true,
      visible: toolVisible,
      onChange: runTool(() => openUiApp('testResults', 'testResults'))
    },
    openGuidedManualTests: {
      name: 'openGuidedManualTests',
      title: 'Guided Manual Tests öffnen',
      icon: 'fas fa-route',
      order: 21,
      button: true,
      visible: toolVisible,
      onChange: runTool(() => openUiApp('guidedManualTests', 'guidedManualTests'))
    }
  };

  if (isRecord) {
    top.janus7 ??= {
      name: 'janus7',
      title: localize('JANUS7.Sidebar.Title', 'JANUS7'),
      icon: 'fas fa-university',
      visible: toolVisible,
      activeTool: 'openControlPanel',
      tools: janusToolsRecord
    };
    top.janus7.tools ??= {};
    for (const [toolName, toolData] of Object.entries(janusToolsRecord)) {
      top.janus7.tools[toolName] = toolData;
    }
    top.janus7.visible = toolVisible;
    top.janus7.activeTool ??= 'openControlPanel';
  } else if (isList) {
    const existing = getControlSet('janus7');
    if (!existing) {
      top.push({
        name: 'janus7',
        title: localize('JANUS7.Sidebar.Title', 'JANUS7'),
        icon: 'fas fa-university',
        visible: toolVisible,
        layer: null,
        activeTool: 'openControlPanel',
        tools: Object.values(janusToolsRecord)
      });
    } else {
      existing.title = localize('JANUS7.Sidebar.Title', 'JANUS7');
      existing.icon = 'fas fa-university';
      existing.visible = toolVisible;
      existing.layer = null;
      existing.activeTool = existing.activeTool ?? 'openControlPanel';
      existing.tools = Object.values(janusToolsRecord);
    }
  }

  try {
    engine?.ui?.onSceneControls?.(controls);
  } catch (errInner) {
    logger.warn?.('[JANUS7] ui.onSceneControls delegation failed:', { message: errInner?.message });
  }
}
