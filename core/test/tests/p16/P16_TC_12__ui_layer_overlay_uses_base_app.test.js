import fs from 'fs';
import path from 'path';

export default {
  id: 'P16-TC-12',
  title: 'UI layer overlay nutzt JanusBaseApp statt rohem ApplicationV2-Hooking',
  phases: [6],
  kind: 'auto',
  expected: 'bridge.js erweitert JanusBaseApp und verwendet kein lokales _hookIds-Array mehr.',
  whereToFind: 'ui/layer/bridge.js',
  async run() {
    const file = path.resolve(process.cwd(), 'ui/layer/bridge.js');
    const src = fs.readFileSync(file, 'utf8');

    if (!src.includes('HandlebarsApplicationMixin(JanusBaseApp)')) {
      throw new Error('Overlay erweitert nicht JanusBaseApp');
    }
    if (src.includes('this._hookIds')) {
      throw new Error('Legacy _hookIds-Hookverwaltung ist noch vorhanden');
    }
    if (src.includes('Hooks.on(topic, () => this.render())')) {
      throw new Error('Legacy direktes Hook->render Pattern ist noch vorhanden');
    }

    return { ok: true, summary: 'Overlay basiert auf JanusBaseApp + Auto-Refresh.' };
  }
};
