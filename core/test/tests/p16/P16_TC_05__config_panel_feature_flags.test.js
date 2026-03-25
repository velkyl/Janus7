export default {
  id: 'P16-TC-05',
  title: 'JanusConfigPanelApp: Feature-Flags Roundtrip (set → get)',
  phases: [6],
  kind: 'auto',
  expected: 'Alle 4 Feature-Flags (atmosphere, autoMood, beamer, academySimulation) persistieren korrekt.',
  whereToFind: 'ui/apps/JanusConfigPanelApp.js → onSaveFeatureFlags, core/config.js → features',
  async run({ ctx }) {
    const JanusConfig = ctx?.config ?? game?.janus7?.core?.config ?? game?.janus7?.config;
    if (!JanusConfig?.get || !JanusConfig?.set) throw new Error('JanusConfig nicht verfügbar');

    const backup = JanusConfig.get('features') ?? {};
    const testFlags = { atmosphere: true, autoMood: false, beamer: true, academySimulation: false };

    try {
      await JanusConfig.set('features', testFlags);
      const readBack = JanusConfig.get('features');

      const keys = Object.keys(testFlags);
      for (const k of keys) {
        if (readBack[k] !== testFlags[k]) {
          throw new Error(`features.${k}: erwartet ${testFlags[k]}, erhalten ${readBack[k]}`);
        }
      }
    } finally {
      await JanusConfig.set('features', backup);
    }

    return { ok: true, summary: 'Alle 4 Feature-Flags korrekt persistiert' };
  }
};
