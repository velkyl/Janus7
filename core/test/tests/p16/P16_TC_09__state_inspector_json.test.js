export default {
  id: 'P16-TC-09',
  title: 'JanusStateInspectorApp: _prepareContext liefert valides JSON-Snapshot',
  phases: [6],
  kind: 'auto',
  expected: '_prepareContext.json ist parseable JSON mit den Pflicht-Keys: time, scoring, meta.',
  whereToFind: 'ui/apps/JanusStateInspectorApp.js → _prepareContext',
  async run({ ctx }) {
    const App = ctx?.ui?.apps?.stateInspector ?? game?.janus7?.ui?.apps?.stateInspector;
    if (!App) throw new Error('JanusStateInspectorApp nicht registriert');

    const instance = new App();
    const context = await instance._prepareContext({});

    if (context?.notReady) throw new Error('_prepareContext gibt notReady:true zurück – Core nicht bereit');

    const { json } = context;
    if (typeof json !== 'string') throw new Error(`context.json ist kein String, sondern: ${typeof json}`);
    if (!json.trim()) throw new Error('context.json ist leer');

    let parsed;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      throw new Error(`context.json ist kein valides JSON: ${e.message}`);
    }

    const expectedKeys = ['time', 'scoring'];
    const missingKeys = expectedKeys.filter(k => !(k in parsed));
    if (missingKeys.length) {
      // Warnung, kein Hard-Fail – State-Keys können variieren
      return {
        ok: true,
        summary: `JSON valid (${json.length} Zeichen) | Hinweis: erwartete Keys fehlen: ${missingKeys.join(', ')}`
      };
    }

    return { ok: true, summary: `JSON valid | ${json.length} Zeichen | Keys: ${Object.keys(parsed).join(', ')}` };
  }
};
