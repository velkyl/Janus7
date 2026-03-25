
import { getPanels, getQuickPanels } from '../../../../ui/layer/panel-registry.js';

export default {
  id: 'P6-TC-22',
  title: 'Shell panel registry is seeded with core panels',
  phases: [6],
  kind: 'auto',
  expected: 'Panel registry contains additive core panels and quick actions',
  run: async () => {
    const panels = getPanels();
    const quick = getQuickPanels().map((p) => p.id);
    const required = ['scoring', 'social', 'atmosphere', 'quests', 'ki', 'sync', 'diagnostics', 'dataStudio'];
    const missing = required.filter((id) => !panels.some((panel) => panel.id === id));
    const ok = missing.length === 0 && quick.includes('scoring') && quick.includes('ki');
    return { ok, summary: ok ? `Panels=${panels.length}` : `Missing=${missing.join(', ')} quick=${quick.join(',')}` };
  }
};
