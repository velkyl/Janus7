
import { getQuickPanels } from './panel-registry.js';

export const JanusUiLayerBridge = {
  attach(engine) {
    if (!engine) return;
    engine.uiLayer = engine.uiLayer ?? {};
    engine.uiLayer.getQuickPanels = getQuickPanels;
    engine.uiLayer.openShell = (options = {}) => game?.janus7?.ui?.open?.('shell', options);
    engine.uiLayer.open = engine.uiLayer.openShell;
  },

  registerSceneTools(engine) {
    const contributor = (controls) => {
      const token = Array.isArray(controls)
        ? controls.find((c) => c?.name === 'token')
        : controls?.token;
      const tools = token?.tools;
      if (!tools) return;
      const tool = {
        name: 'openJanusShell',
        title: 'JANUS Shell öffnen',
        icon: 'fas fa-layer-group',
        order: 1,
        button: true,
        visible: !!game?.user?.isGM,
        onChange: () => {
          try { game?.janus7?.ui?.open?.('shell'); } catch (err) { console.warn('[JANUS7][Shell] open failed', err); }
        }
      };
      if (Array.isArray(tools)) {
        if (!tools.some((t) => t?.name === tool.name)) tools.push(tool);
      } else if (!tools[tool.name]) {
        tools[tool.name] = tool;
      }
    };

    if (engine?.ui?.registerSceneControlsContributor) {
      engine.ui.registerSceneControlsContributor(contributor);
    } else {
      engine._pendingSceneControlContribs = engine._pendingSceneControlContribs ?? [];
      engine._pendingSceneControlContribs.push(contributor);
    }
  }
};

Hooks.on('janus7Ready', (engine) => {
  try {
    JanusUiLayerBridge.attach(engine);
    JanusUiLayerBridge.registerSceneTools(engine);
  } catch (err) {
    (engine?.core?.logger ?? console).warn?.('[JANUS7][Shell] bridge attach failed', err);
  }
});

try {
  if (game?.janus7) JanusUiLayerBridge.attach(game.janus7);
} catch (_) {}
