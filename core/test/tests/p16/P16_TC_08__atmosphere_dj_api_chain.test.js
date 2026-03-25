export default {
  id: 'P16-TC-08',
  title: 'JanusAtmosphereDJApp: Vollständige API-Kette (controller.applyMood, listMoods, status)',
  phases: [6],
  kind: 'auto',
  expected: 'atmosphere.controller hat: applyMood, listMoods, status, setMasterVolume, stopAll.',
  whereToFind: 'ui/apps/JanusAtmosphereDJApp.js → _prepareContext, atmosphere/controller.js',
  async run({ ctx }) {
    const engine = ctx?.engine ?? game?.janus7;
    const controller = engine?.atmosphere?.controller;

    if (!controller) throw new Error('atmosphere.controller nicht verfügbar – Phase 5 aktiv?');

    const requiredMethods = ['applyMood', 'listMoods', 'status', 'setMasterVolume', 'stopAll'];
    const missing = requiredMethods.filter(m => typeof controller[m] !== 'function');

    if (missing.length) {
      throw new Error(`Fehlende Controller-Methoden: ${missing.join(', ')}`);
    }

    // listMoods muss Array zurückgeben
    const moods = controller.listMoods?.() ?? null;
    if (!Array.isArray(moods)) throw new Error('listMoods() gibt kein Array zurück');

    // status muss Objekt zurückgeben
    const status = controller.status?.();
    if (!status || typeof status !== 'object') throw new Error('status() gibt kein Objekt zurück');

    return {
      ok: true,
      summary: `API vollständig | ${moods.length} Moods verfügbar | activeMood: "${status.currentMoodId ?? status.activeMood ?? 'none'}"`
    };
  }
};
