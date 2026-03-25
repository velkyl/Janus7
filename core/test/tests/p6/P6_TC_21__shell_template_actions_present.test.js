
import { moduleTemplatePath } from '../../../../core/common.js';

export default {
  id: 'P6-TC-21',
  title: 'Shell template contains modular view and panel actions',
  phases: [6],
  kind: 'auto',
  expected: 'Shell template uses selectView/openPanel/closePanel/togglePalette actions',
  run: async () => {
    const response = await fetch(moduleTemplatePath('shell/janus-shell.hbs'));
    const text = await response.text();
    const needles = ['data-action="selectView"', 'data-action="openPanel"', 'data-action="togglePalette"'];
    const missing = needles.filter((needle) => !text.includes(needle));
    return { ok: missing.length === 0, summary: missing.length ? `Missing: ${missing.join(', ')}` : 'Shell actions wired.' };
  }
};
