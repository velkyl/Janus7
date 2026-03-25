import { buildDiagnosticSnapshot } from '../../../../core/diagnostics/diagnostic-snapshot.js';

export default {
  id: 'P15-TC-15',
  title: 'Diagnostic snapshot yields stable top-level contract',
  phases: [15],
  kind: 'auto',
  expected: 'Snapshot contains moduleVersion, stateStatus and graph/cache blocks',
  run: async () => {
    const engine = game?.janus7 ?? { moduleId: 'janus7', core: { state: { get: () => ({ meta: { version: 'x', schemaVersion: 'y' }, time: {} }) }, director: {} }, diagnostics: { getLastReport: () => null } };
    const snap = buildDiagnosticSnapshot(engine);
    const ok = !!snap?.moduleVersion && !!snap?.stateStatus && !!snap?.graph?.cache;
    return { ok, summary: ok ? 'snapshot contract ok' : 'snapshot contract missing fields' };
  }
};
