import { JanusAssetResolver } from '../../../../core/services/asset-resolver.js';

export default {
  id: 'P15-TC-13',
  title: 'Asset resolver returns canonical module paths',
  phases: [15],
  kind: 'auto',
  expected: 'modules/Janus7/* paths are normalized through JanusAssetResolver',
  run: async () => {
    const asset = JanusAssetResolver.asset('data/x.json');
    const template = JanusAssetResolver.template('/apps/control-panel.hbs');
    const ok = asset === '/modules/Janus7/data/x.json' && template === '/modules/Janus7/templates/apps/control-panel.hbs';
    return { ok, summary: ok ? 'Resolver canonical' : `asset=${asset} template=${template}` };
  }
};
