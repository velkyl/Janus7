
export default {
  id: 'P4B-TC-15',
  title: 'Academy Stats Summary verfügbar',
  phases: [2, 4.6],
  kind: 'auto',
  expected: 'buildAcademyStatsSummary liefert Ressourcen- und Schulstat-Werte',
  whereToFind: 'game.janus7.academy.data.buildAcademyStatsSummary()',
  run: async () => {
    const api = game?.janus7?.academy?.data;
    const summary = api?.buildAcademyStatsSummary?.() ?? null;
    const ok = !!(summary && Array.isArray(summary.resources) && Array.isArray(summary.schoolStats));
    return { ok, summary: ok ? 'Academy Stats Summary verfügbar' : 'Academy Stats Summary fehlt' };
  }
};
