import { JanusCommandCenterApp } from '../../../../ui/apps/JanusCommandCenterApp.js';

export default {
  id: 'P6-TC-24',
  title: 'Command Center: Kategorie-Filter aktualisiert Ansicht',
  phases: [6],
  kind: 'auto',
  expected: 'Der Filter setzt _selectedCategory und ruft render({ force: true }) fehlerfrei auf.',
  whereToFind: 'ui/apps/JanusCommandCenterApp.js',
  async run(ctx) {
    const engine = ctx?.engine ?? game?.janus7;
    let app = null;
    try {
      app = await engine?.ui?.openCommandCenter?.({ focus: false });
      if (!app) {
        app = new JanusCommandCenterApp();
        await app.render({ force: true, focus: false });
      }
      if (!app) return { ok: false, summary: 'App konnte nicht initialisiert werden.' };

      const fakeEvent = { preventDefault: () => {} };
      const fakeTarget = { dataset: { categoryId: 'doctor' } };

      await JanusCommandCenterApp._onFilterCategory.call(app, fakeEvent, fakeTarget);

      if (app._selectedCategory !== 'doctor') {
        return { ok: false, summary: `Kategorie nicht gesetzt: got "${app._selectedCategory}"` };
      }

      return { ok: true, summary: 'Kategorie "doctor" gesetzt und gerendert.' };
    } catch (e) {
      return { ok: false, summary: 'Fehler: ' + (e?.message ?? String(e)) };
    } finally {
      if (app?.close) await app.close({ force: true });
    }
  }
};
