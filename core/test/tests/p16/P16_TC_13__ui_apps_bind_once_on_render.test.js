import { moduleAssetPath } from '../../../../core/common.js';

const TARGETS = [
  ['ui/apps/JanusAtmosphereDJApp.js', 'janusAtmosphereBindings'],
  ['ui/apps/JanusConfigPanelApp.js', 'janusConfigBindings'],
  ['ui/apps/JanusLibraryBrowserApp.js', 'janusLibraryBindings'],
  ['ui/apps/JanusStudentArchiveApp.js', 'janusArchiveBindings']
];

export default {
  id: 'P16-TC-13',
  title: 'UI apps guard render-time bindings against duplication',
  phases: [6],
  kind: 'auto',
  expected: '_onRender uses root-level binding guards so listeners are not reattached on every render.',
  whereToFind: 'ui/apps/JanusAtmosphereDJApp.js, ui/apps/JanusConfigPanelApp.js, ui/apps/JanusLibraryBrowserApp.js, ui/apps/JanusStudentArchiveApp.js',
  async run() {
    const missing = [];

    for (const [path, marker] of TARGETS) {
      const response = await fetch(moduleAssetPath(path));
      if (!response.ok) {
        missing.push(`${path}: unreadable (${response.status})`);
        continue;
      }
      const src = await response.text();
      if (!src.includes(`dataset.${marker}`)) {
        missing.push(`${path}: guard ${marker} fehlt`);
      }
    }

    if (missing.length) {
      throw new Error(missing.join(' | '));
    }

    return { ok: true, summary: 'Render-time bindings sind in den Ziel-Apps guardiert.' };
  }
};
