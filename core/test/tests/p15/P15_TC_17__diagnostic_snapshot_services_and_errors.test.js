import { buildDiagnosticSnapshot } from '../../../../core/diagnostics/diagnostic-snapshot.js';

export default {
  id: 'P15-TC-17',
  title: 'Diagnostic snapshot exposes services and aggregated issues',
  phases: [15],
  kind: 'auto',
  expected: 'Snapshot contains service readiness and error summary blocks',
  run: async () => {
    const engine = {
      moduleId: 'janus7',
      core: {
        state: {
          get: () => ({ meta: { version: 'x', schemaVersion: 'y' }, time: {} })
        },
        director: {}
      },
      diagnostics: {
        getLastReport: () => null
      },
      serviceRegistry: {
        getReport: () => ({
          ready: ['core.state', 'ui.router'],
          pending: ['graph'],
          uptime: { 'core.state': 3 }
        })
      },
      errors: {
        getSummary: () => ({
          totalErrors: 1,
          totalWarnings: 1,
          byPhase: { phase6: { errors: 1, warnings: 1 } },
          latest: [
            {
              phase: 'phase6',
              context: 'attach',
              message: 'UI attach warning',
              severity: 'warn',
              timestamp: Date.now()
            }
          ]
        })
      }
    };

    const snapshot = buildDiagnosticSnapshot(engine);
    const ok = Array.isArray(snapshot?.services?.ready)
      && snapshot.services.ready.includes('core.state')
      && snapshot?.errors?.totalErrors === 1
      && snapshot?.errors?.totalWarnings === 1;

    return {
      ok,
      summary: ok ? 'snapshot includes services and aggregated issues' : 'snapshot missing services/errors'
    };
  }
};
