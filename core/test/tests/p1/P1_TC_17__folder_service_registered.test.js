export default {
  id: 'P1-TC-17',
  title: 'Folder service registered',
  phases: [1],
  kind: 'auto',
  expected: 'game.janus7.core.folderService exists and exposes ensure/get helpers.',
  async run(ctx) {
    const engine = ctx?.engine ?? game?.janus7;
    const svc = engine?.core?.folderService ?? engine?.folderService ?? null;
    const functions = ['ensureFolder', 'ensureFolderPath', 'resolveFolder'];
    const available = functions.filter((fn) => typeof svc?.[fn] === 'function');
    const ok = !!svc && available.length >= 1;
    return { ok, summary: ok ? `FolderService verfügbar (${available.join(', ')})` : 'FolderService fehlt', notes: [`hasService=${!!svc}`] };
  }
};
