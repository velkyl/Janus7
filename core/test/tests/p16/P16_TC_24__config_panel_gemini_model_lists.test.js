export default {
  id: 'P16-TC-24',
  title: 'JanusConfigPanelApp: getrennte Gemini-Listen fÃ¼r Text und Bild',
  phases: [6, 7],
  kind: 'auto',
  expected: 'ConfigPanel liefert getrennte Dropdown-Daten fÃ¼r Text- und Bildmodelle und erhÃ¤lt gespeicherte Selektionen.',
  whereToFind: 'ui/apps/JanusConfigPanelApp.js â†’ _prepareContext, core/config.js',
  async run({ ctx }) {
    const App = ctx?.ui?.apps?.configPanel ?? game?.janus7?.ui?.apps?.configPanel;
    const JanusConfig = ctx?.config ?? game?.janus7?.core?.config ?? game?.janus7?.config;
    if (!App) throw new Error('JanusConfigPanelApp nicht registriert');
    if (!JanusConfig?.get || !JanusConfig?.set) throw new Error('JanusConfig nicht verfÃ¼gbar');

    const backup = {
      textModels: JanusConfig.get('availableGeminiTextModels') ?? [],
      imageModels: JanusConfig.get('availableGeminiImageModels') ?? [],
      textModel: JanusConfig.get('geminiTextModel'),
      imageModel: JanusConfig.get('geminiVisualModel')
    };

    try {
      await JanusConfig.set('availableGeminiTextModels', [
        { id: 'models/gemini-2.5-flash', name: 'Gemini 2.5 Flash' }
      ]);
      await JanusConfig.set('availableGeminiImageModels', [
        { id: 'models/imagen-4.0-generate-001', name: 'Imagen 4' }
      ]);
      await JanusConfig.set('geminiTextModel', 'models/gemini-2.5-flash');
      await JanusConfig.set('geminiVisualModel', 'models/imagen-4.0-generate-001');

      const instance = new App();
      const result = await instance._prepareContext({});

      const textOk = Array.isArray(result?.textModels) && result.textModels.some((model) => model.id === 'models/gemini-2.5-flash');
      const imageOk = Array.isArray(result?.imageModels) && result.imageModels.some((model) => model.id === 'models/imagen-4.0-generate-001');
      const selectedOk = result?.currentTextModel === 'models/gemini-2.5-flash'
        && result?.currentVisualModel === 'models/imagen-4.0-generate-001';

      if (!textOk || !imageOk || !selectedOk) {
        throw new Error(`Gemini-Context unvollstÃ¤ndig: textOk=${textOk}, imageOk=${imageOk}, selectedOk=${selectedOk}`);
      }
    } finally {
      await JanusConfig.set('availableGeminiTextModels', backup.textModels);
      await JanusConfig.set('availableGeminiImageModels', backup.imageModels);
      await JanusConfig.set('geminiTextModel', backup.textModel);
      await JanusConfig.set('geminiVisualModel', backup.imageModel);
    }

    return { ok: true, summary: 'ConfigPanel liefert getrennte Gemini-Listen und aktuelle Selektionen' };
  }
};
