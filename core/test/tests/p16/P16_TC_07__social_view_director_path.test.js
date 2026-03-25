export default {
  id: 'P16-TC-07',
  title: 'JanusSocialViewApp: Beziehungsänderung geht über academy.social, nicht direkt in State',
  phases: [6],
  kind: 'auto',
  expected: 'game.janus7.academy.social.adjustAttitude ist eine Funktion (Director-Pfad vorhanden).',
  whereToFind: 'ui/apps/JanusSocialViewApp.js → onAdjust, academy/social.js',
  async run({ ctx }) {
    const engine = ctx?.engine ?? game?.janus7;
    const social = engine?.academy?.social;

    if (!social) throw new Error('academy.social nicht verfügbar – Phase 4 nicht initialisiert?');

    // Pflicht-API: adjustAttitude
    if (typeof social.adjustAttitude !== 'function') {
      throw new Error('social.adjustAttitude ist keine Funktion – UI hat keinen gültigen Aufrufpfad');
    }

    // Optional aber erwünscht: getAttitude, listRelationshipsFrom
    const warnings = [];
    if (typeof social.getAttitude !== 'function') warnings.push('social.getAttitude fehlt');
    if (typeof social.listRelationshipsFrom !== 'function') warnings.push('social.listRelationshipsFrom fehlt');

    return {
      ok: true,
      summary: `social.adjustAttitude vorhanden${warnings.length ? ` | Hinweise: ${warnings.join(', ')}` : ''}`
    };
  }
};
