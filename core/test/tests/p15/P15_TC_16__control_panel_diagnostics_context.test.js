export default {
  id: 'P15-TC-16',
  title: 'Control panel diagnostics template contains graph/cache actions',
  phases: [15],
  kind: 'auto',
  expected: 'Template exposes graphInvalidate and graphRebuild actions',
  run: async () => {
    const tpl = await fetch('modules/Janus7/templates/apps/control-panel.hbs').then((r) => r.ok ? r.text() : '');
    const ok = tpl.includes('data-action="graphInvalidate"') && tpl.includes('data-action="graphRebuild"');
    return { ok, summary: ok ? 'diagnostics console actions found' : 'graph diagnostics actions missing' };
  }
};
