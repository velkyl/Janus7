export default {
  id: 'P16-TC-02',
  title: 'JanusScoringViewApp verwendet static PARTS (nicht DEFAULT_OPTIONS.template)',
  phases: [6],
  kind: 'auto',
  expected: 'static PARTS.main.template existiert; DEFAULT_OPTIONS hat kein "template"-Feld.',
  whereToFind: 'ui/apps/JanusScoringViewApp.js',
  async run({ ctx }) {
    const App = ctx?.ui?.apps?.scoringView ?? game?.janus7?.ui?.apps?.scoringView;
    if (!App) throw new Error('JanusScoringViewApp nicht registriert');

    // PARTS muss vorhanden sein
    const parts = App.PARTS ?? App.DEFAULT_OPTIONS?.PARTS;
    if (!parts?.main?.template) {
      throw new Error('static PARTS.main.template fehlt – Template wird nicht gerendert (Foundry v13 Bug)');
    }

    // DEFAULT_OPTIONS darf kein top-level "template" haben (deprecated path)
    const hasDeprecatedTemplate = !!App.DEFAULT_OPTIONS?.template;
    if (hasDeprecatedTemplate) {
      throw new Error('DEFAULT_OPTIONS.template ist gesetzt – wird von HandlebarsApplicationMixin ignoriert');
    }

    return { ok: true, summary: `PARTS.main.template = "${parts.main.template}"` };
  }
};
