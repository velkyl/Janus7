import { moduleAssetPath } from '../../../../core/common.js';

function stripJsComments(source = '') {
  return String(source)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

export default {
  id: 'P6-TC-23',
  title: 'Scene-control fallback rendert die Shell bei fehlendem UI-Registry-Pfad',
  phases: [6],
  kind: 'auto',
  expected: 'openControlPanel() rendert JanusShellApp im Fallback nach showSingleton().',
  whereToFind: 'ui/core/scene-controls.js',
  async run() {
    const response = await fetch(moduleAssetPath('ui/core/scene-controls.js'));
    if (!response.ok) {
      throw new Error(`ui/core/scene-controls.js unreadable (${response.status})`);
    }

    const src = stripJsComments(await response.text());
    const fallbackBlockMatch = src.match(/const openControlPanel = async \(\) => \{([\s\S]*?)\n\s*\};/);
    if (!fallbackBlockMatch) {
      throw new Error('openControlPanel() block not found');
    }

    const block = fallbackBlockMatch[1];
    if (!block.includes('JanusShellApp.showSingleton()')) {
      throw new Error('Fallback no longer instantiates JanusShellApp via showSingleton()');
    }
    if (!/app\.render\?\.\(\{\s*force:\s*true,\s*focus:\s*true\s*\}\)/.test(block)) {
      throw new Error('Fallback does not force-render the singleton shell instance');
    }

    return { ok: true, summary: 'Scene-control fallback renders the shell singleton explicitly.' };
  }
};
