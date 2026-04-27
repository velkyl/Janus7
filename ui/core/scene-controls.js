/**
 * @file ui/core/scene-controls.js
 * @module janus7/ui
 *
 * Purpose:
 * Centralized Factory for JANUS7 Scene Control Buttons.
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

  // Debug log only if explicitly enabled in config
  if (engine?.core?.config?.get?.('debug')) {
    logger.debug?.('[JANUS7] attachJanusSceneControls triggered', { isRecord, isList });
  }

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
      return false;
    }
  };

  const openKiSearch = async () => {
    try {
      const { JanusShellApp } = await import('../apps/JanusShellApp.js');
      JanusShellApp.showSingleton().onKiSearch();
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
      button: true,
      visible: toolVisible,
      onChange: runTool(openControlPanel)
    },
    openMasterDashboard: {
      name: 'openMasterDashboard',
      title: 'Master Dashboard',
      icon: 'fas fa-crown',
      button: true,
      visible: toolVisible,
      onChange: runTool(async () => {
        const { JanusMasterDashboard } = await import('../../scripts/ui/master-dashboard.js');
        new JanusMasterDashboard().render({ force: true, focus: true });
      })
    },
    openStoryGraph: {
      name: 'openStoryGraph',
      title: 'Story Graph öffnen',
      icon: 'fas fa-project-diagram',
      button: true,
      visible: toolVisible,
      onChange: runTool(openStoryGraph)
    },
    openKiSearch: {
      name: 'openKiSearch',
      title: 'KI Semantische Suche',
      icon: 'fas fa-search',
      button: true,
      visible: toolVisible,
      onChange: runTool(openKiSearch)
    },
    openQuestJournal: {
      name: 'openQuestJournal',
      title: 'Quest-Journal öffnen',
      icon: 'fas fa-book-open',
      button: true,
      visible: toolVisible,
      onChange: runTool(openQuestJournal)
    },
    openDataStudio: {
      name: 'openDataStudio',
      title: 'Academy Data Studio',
      icon: 'fas fa-database',
      button: true,
      visible: toolVisible,
      onChange: runTool(() => openUiApp('academyDataStudio', 'Academy Data Studio'))
    },
    openAtmosphereDJ: {
        name: 'openAtmosphereDJ',
        title: 'Atmosphere DJ öffnen',
        icon: 'fas fa-music',
        button: true,
        visible: toolVisible,
        onChange: runTool(() => openUiApp('atmosphereDJ', 'atmosphereDJ'))
    },
    openSessionPrep: {
      name: 'openSessionPrep',
      title: localize('JANUS7.UI.OpenSessionPrepWizard', 'Session Prep öffnen'),
      icon: 'fas fa-wand-magic-sparkles',
      button: true,
      visible: toolVisible,
      onChange: runTool(() => openUiApp('shell', 'sessionPrep', { viewId: 'sessionPrep' }))
    }
  };


  if (isRecord) {
    top.janus7 ??= {
      name: 'janus7',
      title: localize('JANUS7.Sidebar.Title', 'JANUS7'),
      icon: 'fas fa-university',
      visible: toolVisible,
      tools: {}
    };
    Object.assign(top.janus7.tools, janusToolsRecord);
    top.janus7.visible = toolVisible;
  } else if (isList) {
    const existing = getControlSet('janus7');
    if (!existing) {
      top.push({
        name: 'janus7',
        title: localize('JANUS7.Sidebar.Title', 'JANUS7'),
        icon: 'fas fa-university',
        visible: toolVisible,
        layer: null,
        tools: Object.values(janusToolsRecord)
      });
    } else {
      existing.visible = toolVisible;
      existing.tools = Object.values(janusToolsRecord);
    }

    // Shortcut to Token Controls
    const token = getControlSet('token');
    if (token) {
      token.tools ??= [];
      if (!token.tools.some(t => t.name === 'openJanusShellShortcut')) {
        token.tools.push({
          name: 'openJanusShellShortcut',
          title: 'JANUS Shell (Shortcut)',
          icon: 'fas fa-layer-group',
          button: true,
          onChange: openControlPanel
        });
      }
    }
  }

  try {
    engine?.ui?.onSceneControls?.(controls);
  } catch (errInner) {
    logger.warn?.('[JANUS7] ui.onSceneControls delegation failed:', { message: errInner?.message });
  }
}
