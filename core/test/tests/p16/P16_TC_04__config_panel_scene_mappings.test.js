export default {
  id: 'P16-TC-04',
  title: 'JanusConfigPanelApp: sceneMappings werden über JanusConfig.set/get gespeichert',
  phases: [6],
  kind: 'auto',
  expected: 'game.settings.get("janus7","sceneMappings") reflektiert den über JanusConfig.set gesetzten Wert.',
  whereToFind: 'ui/apps/JanusConfigPanelApp.js → onSaveSceneMaps, core/config.js',
  async run({ ctx }) {
    const JanusConfig = ctx?.config ?? game?.janus7?.core?.config ?? game?.janus7?.config;
    if (!JanusConfig?.get || !JanusConfig?.set) {
      throw new Error('JanusConfig API (get/set) nicht verfügbar');
    }

    // Backup
    const backup = JanusConfig.get('sceneMappings') ?? {};

    const testMappings = { beamer: 'Scene.testUUID001', mainHall: 'Scene.testUUID002' };

    try {
      await JanusConfig.set('sceneMappings', testMappings);
      const readBack = JanusConfig.get('sceneMappings');

      if (readBack?.beamer !== testMappings.beamer) {
        throw new Error(`sceneMappings.beamer erwartet "${testMappings.beamer}", erhalten "${readBack?.beamer}"`);
      }
      if (readBack?.mainHall !== testMappings.mainHall) {
        throw new Error(`sceneMappings.mainHall erwartet "${testMappings.mainHall}", erhalten "${readBack?.mainHall}"`);
      }
    } finally {
      // Restore
      await JanusConfig.set('sceneMappings', backup);
    }

    return { ok: true, summary: 'sceneMappings korrekt gelesen und geschrieben via JanusConfig' };
  }
};
