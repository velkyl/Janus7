export default {
  id: 'P15-TC-16',
  title: 'Control panel diagnostics template contains graph/cache actions',
  phases: [15],
  kind: 'auto',
  expected: 'Template exposes graphInvalidate and graphRebuild actions',
  run: async () => {
    // In Janus7 v0.9.11+, actions are data-driven via panel-registry.js
    const diags = game.janus7.uiLayer?.getQuickPanels?.().find(p => p.id === 'diagnostics')
                ?? game.janus7.services?.registry?.getPanel?.('diagnostics');
    const actions = diags?.actions || [];
    const hasInvalidate = actions.some(a => a.action === 'graphInvalidate');
    const hasRebuild = actions.some(a => a.action === 'graphRebuild');
    const ok = hasInvalidate && hasRebuild;
    return { ok, summary: ok ? 'diagnostics registry actions found' : 'graph diagnostics actions missing in registry' };
  }
};
